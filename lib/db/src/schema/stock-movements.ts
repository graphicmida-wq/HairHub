import { mysqlTable, varchar, text, char, decimal, index } from "drizzle-orm/mysql-core";

// One row per stock change. No foreign keys on purpose: the history must survive
// the deletion of a product, client or appointment, so names are snapshotted.
export const stockMovementsTable = mysqlTable(
  "stock_movements",
  {
    id: char("id", { length: 12 }).primaryKey(),
    productId: char("product_id", { length: 12 }).notNull(),
    productName: varchar("product_name", { length: 200 }).notNull(),
    productBrand: varchar("product_brand", { length: 100 }).notNull().default(""),
    reason: varchar("reason", { length: 30 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 3 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
    date: varchar("date", { length: 10 }).notNull(),
    time: varchar("time", { length: 5 }).notNull(),
    clientId: char("client_id", { length: 12 }),
    clientName: varchar("client_name", { length: 200 }),
    appointmentId: char("appointment_id", { length: 12 }),
    saleId: char("sale_id", { length: 12 }),
    note: text("note"),
    userId: char("user_id", { length: 12 }),
    userName: varchar("user_name", { length: 100 }),
    createdAt: varchar("created_at", { length: 40 }).notNull(),
  },
  (t) => [
    index("idx_stock_movements_date").on(t.date),
    index("idx_stock_movements_product").on(t.productId),
    index("idx_stock_movements_appointment").on(t.appointmentId),
    index("idx_stock_movements_sale").on(t.saleId),
  ],
);

export type StockMovementRow = typeof stockMovementsTable.$inferSelect;
