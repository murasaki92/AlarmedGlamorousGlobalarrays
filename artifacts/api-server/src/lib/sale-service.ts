import { db, saleItemsTable, type SaleRecord, type SaleItemRecord } from "@workspace/db";
import { inArray } from "drizzle-orm";
export function formatSale(sale: SaleRecord, items: SaleItemRecord[]) {
  return {
    id: sale.id, number: `TRX-${String(sale.id).padStart(5, "0")}`,
    createdAt: sale.createdAt.toISOString(), paymentMethod: sale.paymentMethod,
    subtotal: sale.subtotal, discount: sale.discount, total: sale.total, note: sale.note,
    items: items.map(({ productId, name, price, quantity, total }) => ({ productId, name, price, quantity, total })),
  };
}
export async function hydrateSales(sales: SaleRecord[]) {
  if (!sales.length) return [];
  const items = await db.select().from(saleItemsTable).where(inArray(saleItemsTable.saleId, sales.map(s => s.id)));
  const bySale = new Map<number, SaleItemRecord[]>();
  for (const item of items) bySale.set(item.saleId, [...(bySale.get(item.saleId) ?? []), item]);
  return sales.map(s => formatSale(s, bySale.get(s.id) ?? []));
}
export class SaleValidationError extends Error {}