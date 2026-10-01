import { bigint, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { productsTable } from "./products";
import { salesTable } from "./sales";
export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  total: bigint("total", { mode: "number" }).notNull(),
});
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });
export type SaleItemRecord = typeof saleItemsTable.$inferSelect;