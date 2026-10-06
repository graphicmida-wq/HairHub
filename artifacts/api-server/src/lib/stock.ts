/**
 * Stock movements: every change to a product's stock goes through here and
 * leaves a row in stock_movements (product, signed quantity, causale, when, who).
 *
 * - Sales and service usage are tied to an appointment and kept in sync with it:
 *   the appointment's products are the target, its movements are what was already
 *   booked, and the difference is written as new movements (and applied to stock).
 * - Over-the-counter sales group their lines under a saleId.
 * - Manual edits of a product's quantity are logged after the fact.
 */
import type { Request } from "express";
import {
  dbDeleteStockMovements,
  dbGetAppointmentIdsWithMovements,
  dbGetAppointments,
  dbGetClient,
  dbGetClients,
  dbGetProduct,
  dbGetProducts,
  dbGetStockMovement,
  dbGetUser,
  dbInsertStockMovements,
  dbListStockMovements,
  dbUpdateAppointmentMovementsMeta,
  dbUpdateProduct,
  newId,
  type NewStockMovement,
  type ProductRecord,
  type StockReason,
  type StockUnit,
} from "../data/db";
import { logger } from "./logger";

type Product = ProductRecord;
type Appointment = Awaited<ReturnType<typeof dbGetAppointments>>[number];

export const MANUAL_REASONS: StockReason[] = [
  "rifornimento",
  "giacenza_iniziale",
  "reso",
  "rettifica",
  "danneggiato",
  "altro",
];

export interface Actor {
  userId: string | null;
  userName: string | null;
}

export async function actorFrom(req: Request): Promise<Actor> {
  if (!req.user) return { userId: null, userName: null };
  const user = await dbGetUser(req.user.sub);
  return { userId: req.user.sub, userName: user?.name?.trim() || req.user.username };
}

/** Today's date and time on the salon's clock, whatever the server timezone. */
export function nowInSalon(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isZero = (n: number) => Math.abs(n) < 0.005;

function isWeightTracked(p: Product): boolean {
  return p.unitSize != null && p.unitSize > 0 && p.stockGrams != null;
}

/** Unit in which a product is consumed during a service: g/ml if tracked by weight. */
function usageUnit(p: Product): StockUnit {
  if (!isWeightTracked(p)) return "pz";
  return p.unitType === "ml" ? "ml" : "g";
}

function stockSnapshot(p: Product): { amount: number; unit: StockUnit; pieces: number } {
  return isWeightTracked(p)
    ? { amount: p.stockGrams!, unit: usageUnit(p), pieces: p.quantity }
    : { amount: p.quantity, unit: "pz", pieces: p.quantity };
}

/** Move the product's stock by a signed quantity (never below zero). */
async function applyStockDelta(productId: string, quantity: number, unit: StockUnit) {
  const p = await dbGetProduct(productId);
  if (!p || isZero(quantity)) return;
  if (isWeightTracked(p)) {
    const amount = unit === "pz" ? quantity * p.unitSize! : quantity;
    await dbUpdateProduct(productId, { stockGrams: round2(Math.max(0, p.stockGrams! + amount)) });
  } else if (unit === "pz") {
    await dbUpdateProduct(productId, { quantity: Math.max(0, Math.round(p.quantity + quantity)) });
  }
  // A g/ml movement on a product no longer tracked by weight can't be converted: logged only.
}

/** Signed total of the rows per product and unit. */
function netByProduct(rows: { productId: string; unit: string; quantity: number }[]) {
  const totals = new Map<string, { productId: string; unit: StockUnit; quantity: number }>();
  for (const r of rows) {
    const key = `${r.productId}|${r.unit}`;
    const t = totals.get(key) ?? { productId: r.productId, unit: r.unit as StockUnit, quantity: 0 };
    t.quantity += r.quantity;
    totals.set(key, t);
  }
  return [...totals.values()];
}

/** Insert the rows, then move stock once per product/unit. */
async function recordMovements(rows: NewStockMovement[], options: { applyStock: boolean }) {
  const inserted = await dbInsertStockMovements(rows);
  if (options.applyStock) {
    for (const t of netByProduct(rows)) await applyStockDelta(t.productId, t.quantity, t.unit);
  }
  return inserted;
}

// ── Appointments ──────────────────────────────────────────────────────────────

interface Line {
  productId: string;
  reason: StockReason;
  unit: StockUnit;
  unitPrice: number | null;
  quantity: number;
}

const lineKey = (l: Omit<Line, "quantity">) => `${l.productId}|${l.reason}|${l.unit}|${l.unitPrice ?? ""}`;

function addLine(map: Map<string, Line>, line: Line) {
  const key = lineKey(line);
  const existing = map.get(key);
  if (existing) existing.quantity += line.quantity;
  else map.set(key, { ...line });
}

/** What a completed appointment takes out of the stock (negative quantities). */
async function appointmentTarget(appt: Appointment, getProduct: (id: string) => Promise<Product | undefined>) {
  const target = new Map<string, Line>();
  if (appt.status !== "completato") return target;
  for (const used of appt.usedProducts ?? []) {
    if (!(used.quantityUsed > 0)) continue;
    const p = await getProduct(used.productId);
    if (!p) continue;
    addLine(target, { productId: used.productId, reason: "uso_servizio", unit: usageUnit(p), unitPrice: null, quantity: -used.quantityUsed });
  }
  for (const sold of appt.soldProducts ?? []) {
    if (!(sold.quantity > 0)) continue;
    addLine(target, { productId: sold.productId, reason: "vendita", unit: "pz", unitPrice: sold.unitPrice, quantity: -sold.quantity });
  }
  return target;
}

function productCache() {
  const cache = new Map<string, Product | undefined>();
  return async (id: string) => {
    if (!cache.has(id)) cache.set(id, await dbGetProduct(id));
    return cache.get(id);
  };
}

function clientLabel(c: { firstName: string; lastName: string } | undefined): string | null {
  return c ? `${c.firstName} ${c.lastName}`.trim() || null : null;
}

/**
 * Bring the appointment's movements (and the stock) in line with its current
 * products and status. Idempotent: calling it twice changes nothing the second time.
 * Pass `removed` when the appointment is being deleted.
 */
export async function syncAppointmentStock(appt: Appointment, actor: Actor, options: { removed?: boolean } = {}) {
  const getProduct = productCache();
  const existing = await dbListStockMovements({ appointmentId: appt.id });
  const target = options.removed
    ? new Map<string, Line>()
    : await appointmentTarget(appt, getProduct);
  if (target.size === 0 && existing.length === 0) return;

  const booked = new Map<string, Line>();
  const names = new Map<string, { name: string; brand: string }>();
  for (const m of existing) {
    addLine(booked, {
      productId: m.productId,
      reason: m.reason as StockReason,
      unit: m.unit as StockUnit,
      unitPrice: m.unitPrice,
      quantity: m.quantity,
    });
    names.set(m.productId, { name: m.productName, brand: m.productBrand });
  }

  const client = await dbGetClient(appt.clientId);
  const clientName = clientLabel(client);

  const note = existing.length === 0
    ? null
    : options.removed
      ? "Storno: appuntamento eliminato"
      : appt.status !== "completato"
        ? "Storno: appuntamento non più completato"
        : "Correzione appuntamento";

  const rows: NewStockMovement[] = [];
  for (const key of new Set([...target.keys(), ...booked.keys()])) {
    const want = target.get(key);
    const have = booked.get(key);
    const diff = round2((want?.quantity ?? 0) - (have?.quantity ?? 0));
    if (isZero(diff)) continue;
    const line = (want ?? have)!;
    const p = await getProduct(line.productId);
    const snapshot = p ? { name: p.name, brand: p.brand } : names.get(line.productId);
    rows.push({
      productId: line.productId,
      productName: snapshot?.name ?? "Prodotto eliminato",
      productBrand: snapshot?.brand ?? "",
      reason: line.reason,
      quantity: diff,
      unit: line.unit,
      unitPrice: line.unitPrice,
      date: appt.date,
      time: appt.time,
      clientId: appt.clientId,
      clientName,
      appointmentId: appt.id,
      note,
      userId: actor.userId,
      userName: actor.userName,
    });
  }
  if (rows.length > 0) await recordMovements(rows, { applyStock: true });

  // A rescheduled or reassigned appointment carries its movements along.
  const stale = existing.some(m => m.date !== appt.date || m.time !== appt.time || m.clientId !== appt.clientId);
  if (stale && !options.removed) {
    await dbUpdateAppointmentMovementsMeta(appt.id, { date: appt.date, time: appt.time, clientId: appt.clientId, clientName });
  }
}

/**
 * Appointments completed before the movement history existed: write their
 * products into the history once, without touching stock (it was already
 * handled back then). Safe to run at every start-up.
 */
export async function backfillAppointmentMovements() {
  const done = await dbGetAppointmentIdsWithMovements();
  const appointments = (await dbGetAppointments()).filter(a => a.status === "completato" && !done.has(a.id));
  if (appointments.length === 0) return;

  const products = new Map((await dbGetProducts()).map(p => [p.id, p]));
  const getProduct = async (id: string) => products.get(id);
  const clients = new Map((await dbGetClients()).map(c => [c.id, c]));

  const rows: NewStockMovement[] = [];
  for (const appt of appointments) {
    const target = await appointmentTarget(appt, getProduct);
    for (const line of target.values()) {
      const p = products.get(line.productId);
      if (!p) continue;
      rows.push({
        productId: line.productId,
        productName: p.name,
        productBrand: p.brand,
        reason: line.reason,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        date: appt.date,
        time: appt.time,
        clientId: appt.clientId,
        clientName: clientLabel(clients.get(appt.clientId)),
        appointmentId: appt.id,
      });
    }
  }
  await recordMovements(rows, { applyStock: false });
  logger.info({ appointments: appointments.length, movements: rows.length }, "Backfilled stock movements from completed appointments");
}

// ── Over-the-counter sales ────────────────────────────────────────────────────

export class StockError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function createSale(input: {
  date: string;
  time: string;
  clientId?: string | null;
  note?: string | null;
  items: { productId: string; quantity: number; unitPrice: number }[];
}, actor: Actor) {
  const client = input.clientId ? await dbGetClient(input.clientId) : undefined;
  if (input.clientId && !client) throw new StockError(400, "Cliente non trovato");

  const saleId = newId();
  const rows: NewStockMovement[] = [];
  for (const item of input.items) {
    const p = await dbGetProduct(item.productId);
    if (!p) throw new StockError(400, "Prodotto non trovato");
    rows.push({
      productId: p.id,
      productName: p.name,
      productBrand: p.brand,
      reason: "vendita",
      quantity: -item.quantity,
      unit: "pz",
      unitPrice: item.unitPrice,
      date: input.date,
      time: input.time,
      clientId: client?.id ?? null,
      clientName: clientLabel(client),
      saleId,
      note: input.note?.trim() || null,
      userId: actor.userId,
      userName: actor.userName,
    });
  }
  return recordMovements(rows, { applyStock: true });
}

/** Cancel a sale with reversing movements on the same day, so its stock goes back. */
export async function cancelSale(saleId: string, actor: Actor) {
  const lines = await dbListStockMovements({ saleId });
  if (lines.length === 0) throw new StockError(404, "Vendita non trovata");

  const net = new Map<string, Line & { first: (typeof lines)[number] }>();
  for (const m of lines) {
    const key = `${m.productId}|${m.unitPrice ?? ""}`;
    const n = net.get(key);
    if (n) n.quantity += m.quantity;
    else net.set(key, { productId: m.productId, reason: "vendita", unit: m.unit as StockUnit, unitPrice: m.unitPrice, quantity: m.quantity, first: m });
  }
  const open = [...net.values()].filter(n => !isZero(n.quantity));
  if (open.length === 0) throw new StockError(409, "Questa vendita è già stata annullata");

  const now = nowInSalon();
  const [y, mo, d] = now.date.split("-");
  const rows: NewStockMovement[] = open.map(n => ({
    productId: n.productId,
    productName: n.first.productName,
    productBrand: n.first.productBrand,
    reason: "vendita",
    quantity: round2(-n.quantity),
    unit: n.unit,
    unitPrice: n.unitPrice,
    date: n.first.date,
    time: n.first.time,
    clientId: n.first.clientId,
    clientName: n.first.clientName,
    saleId,
    note: `Annullata il ${d}/${mo}/${y} alle ${now.time}`,
    userId: actor.userId,
    userName: actor.userName,
  }));
  return recordMovements(rows, { applyStock: true });
}

// ── Deleting movements ────────────────────────────────────────────────────────

/**
 * Delete a movement entered by mistake (or for a test) as if it never happened:
 * its quantity is taken back out of (or put back into) the product's stock. A
 * counter sale goes away whole, every line and any cancellation of it. Movements
 * of an appointment can't be deleted: they follow the appointment (they would be
 * written again at its next change), so they are corrected by editing it.
 */
export async function deleteMovement(id: string): Promise<number> {
  const m = await dbGetStockMovement(id);
  if (!m) throw new StockError(404, "Movimento non trovato");
  if (m.appointmentId) {
    throw new StockError(409, "Questo movimento viene da un appuntamento: per correggerlo modifica l'appuntamento");
  }
  const rows = m.saleId ? await dbListStockMovements({ saleId: m.saleId }) : [m];
  await dbDeleteStockMovements(rows.map(r => r.id));
  // A product deleted in the meantime has no stock left to correct (skipped)
  for (const t of netByProduct(rows)) await applyStockDelta(t.productId, -t.quantity, t.unit);
  return rows.length;
}

/**
 * Before deleting a product: drop its history too (manual movements and its lines
 * of counter sales). Its appointment movements stay with their appointments.
 */
export async function deleteProductHistory(productId: string): Promise<number> {
  const rows = (await dbListStockMovements({ productId })).filter(m => !m.appointmentId);
  await dbDeleteStockMovements(rows.map(r => r.id));
  return rows.length;
}

// ── Manual product edits ──────────────────────────────────────────────────────

export async function logInitialStock(p: Product, actor: Actor) {
  const s = stockSnapshot(p);
  if (isZero(s.amount)) return;
  await recordMovements([{
    productId: p.id,
    productName: p.name,
    productBrand: p.brand,
    reason: "giacenza_iniziale",
    quantity: s.amount,
    unit: s.unit,
    ...nowInSalon(),
    userId: actor.userId,
    userName: actor.userName,
  }], { applyStock: false });
}

/** Log the stock difference between two versions of a product (already saved). */
export async function logProductStockChange(
  before: Product,
  after: Product,
  reason: StockReason | undefined,
  note: string | null | undefined,
  actor: Actor,
) {
  const b = stockSnapshot(before);
  const a = stockSnapshot(after);
  // Switching between pieces and g/ml only re-expresses the stock: compare pieces then.
  const sameUnit = a.unit === b.unit;
  const diff = round2(sameUnit ? a.amount - b.amount : a.pieces - b.pieces);
  if (isZero(diff)) return;
  await recordMovements([{
    productId: after.id,
    productName: after.name,
    productBrand: after.brand,
    reason: reason && MANUAL_REASONS.includes(reason) ? reason : "rettifica",
    quantity: diff,
    unit: sameUnit ? a.unit : "pz",
    ...nowInSalon(),
    note: note?.trim() || null,
    userId: actor.userId,
    userName: actor.userName,
  }], { applyStock: false });
}
