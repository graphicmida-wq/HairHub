import * as React from "react";
import type { Client } from "@workspace/api-client-react";
import { useListAppointments, useListClientFormulas, useListProducts, useListServices } from "@workspace/api-client-react";
import { useIsMobile } from "../hooks/use-mobile";
import { addMinsToTime } from "../lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";

function clientLabel(c: Client): string {
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

export function ClientInfoPanel({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}) {
  const isMobile = useIsMobile();
  const clientId = client?.id;

  const { data: formulas = [] } = useListClientFormulas(
    clientId ? { clientId } : undefined,
    { query: ({ enabled: open && !!clientId, staleTime: 10_000 } as any) },
  );

  const { data: appointments = [] } = useListAppointments({
    query: ({ enabled: open && !!clientId, staleTime: 10_000 } as any),
  });

  const { data: products = [] } = useListProducts({
    query: ({ enabled: open && !!clientId, staleTime: 10_000 } as any),
  });

  const { data: services = [] } = useListServices({
    query: ({ enabled: open && !!clientId, staleTime: 10_000 } as any),
  });

  const recentAppointments = React.useMemo(() => {
    if (!clientId) return [];
    return appointments
      .filter((a) => a.clientId === clientId)
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, 8);
  }, [appointments, clientId]);

  const usedProductsSummary = React.useMemo(() => {
    if (!clientId) return [];
    const totals = new Map<string, number>();
    for (const a of appointments) {
      if (a.clientId !== clientId) continue;
      for (const up of a.usedProducts ?? []) {
        totals.set(up.productId, (totals.get(up.productId) ?? 0) + up.quantityUsed);
      }
    }
    const out = Array.from(totals.entries())
      .map(([productId, quantityUsed]) => {
        const p = products.find((x) => x.id === productId);
        return { productId, name: p?.name ?? productId, quantityUsed };
      })
      .sort((a, b) => b.quantityUsed - a.quantityUsed);
    return out.slice(0, 10);
  }, [appointments, clientId, products]);

  const content = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-stone-900 truncate">{client ? clientLabel(client) : ""}</p>
            <p className="text-sm text-stone-500">{client?.phone ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Note</p>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-700 whitespace-pre-wrap min-h-12">
          {client?.notes?.trim() ? client.notes : "—"}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Formule</p>
        {formulas.length === 0 ? (
          <div className="text-sm text-stone-500">—</div>
        ) : (
          <div className="flex flex-col gap-2">
            {formulas.slice(0, 8).map((f) => (
              <div key={f.id} className="border border-stone-200 rounded-xl p-3 bg-white">
                <p className="text-sm font-semibold text-stone-900 truncate">{f.name}</p>
                {f.notes ? <p className="text-xs text-stone-500 mt-1 whitespace-pre-wrap">{f.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ultimi appuntamenti</p>
        {recentAppointments.length === 0 ? (
          <div className="text-sm text-stone-500">—</div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentAppointments.map((a) => {
              const serviceRows = (a.serviceIds ?? []).map((sid, idx) => {
                const service = services.find((s) => s.id === sid);
                const listPrice = a.serviceListPrices?.[idx] ?? service?.price ?? 0;
                const appliedPrice = a.servicePrices?.[idx] ?? listPrice;
                return {
                  id: `${a.id}-${sid}-${idx}`,
                  name: service?.name ?? "Servizio",
                  listPrice,
                  appliedPrice,
                };
              });
              const servicesTotal = serviceRows.reduce((sum, row) => sum + row.appliedPrice, 0);
              const soldTotal = (a.soldProducts ?? []).reduce(
                (sum, product) => sum + product.quantity * product.unitPrice,
                0,
              );
              return (
                <div key={a.id} className="border border-stone-200 rounded-xl p-3 bg-white">
                  <p className="text-sm font-semibold text-stone-900">
                    {a.date} · {a.time} → {addMinsToTime(a.time, a.durationMins)}
                  </p>
                  {serviceRows.length === 0 ? (
                    <p className="text-xs text-stone-500 mt-1 truncate">—</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1">
                      {serviceRows.map((row) => (
                        <div key={row.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-stone-700 truncate">
                            {row.name} <span className="text-stone-400">(listino {row.listPrice}€)</span>
                          </span>
                          <span className="text-stone-900 font-medium shrink-0">{row.appliedPrice}€</span>
                        </div>
                      ))}
                      <div className="pt-1 mt-1 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-stone-500">Totale servizi</span>
                        <span className="text-stone-900 font-medium">{servicesTotal}€</span>
                      </div>
                      {soldTotal > 0 ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">Prodotti venduti</span>
                          <span className="text-stone-900 font-medium">{soldTotal}€</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Prodotti</p>
        {usedProductsSummary.length === 0 ? (
          <div className="text-sm text-stone-500">—</div>
        ) : (
          <div className="flex flex-col gap-2">
            {usedProductsSummary.map((p) => (
              <div key={p.productId} className="flex items-center justify-between gap-3 border border-stone-200 rounded-xl px-3 py-2 bg-white">
                <span className="text-sm text-stone-800 truncate">{p.name}</span>
                <span className="text-xs text-stone-500 shrink-0">{p.quantityUsed}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Chiudi
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Scheda cliente</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Scheda cliente</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
