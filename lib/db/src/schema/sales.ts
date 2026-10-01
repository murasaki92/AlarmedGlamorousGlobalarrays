import { bigint, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  paymentMethod: text("payment_method").notNull(),
  subtotal: bigint("subtotal", { mode: "number" }).notNull(),
  discount: bigint("discount", { mode: "number" }).notNull(),
  total: bigint("total", { mode: "number" }).notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type SaleRecord = typeof salesTable.$inferSelect;