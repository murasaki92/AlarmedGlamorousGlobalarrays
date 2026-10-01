import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
});
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type Product = typeof productsTable.$inferSelect;