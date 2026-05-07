import { mysqlTable, varchar, char } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffMembersTable = mysqlTable("staff_members", {
  id: char("id", { length: 12 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 100 }),
  color: varchar("color", { length: 20 }).notNull().default("#6b7280"),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembersTable).omit({ id: true });
export const selectStaffMemberSchema = createSelectSchema(staffMembersTable);
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembersTable.$inferSelect;
