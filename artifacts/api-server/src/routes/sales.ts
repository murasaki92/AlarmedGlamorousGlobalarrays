import { Router } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db, productsTable, salesTable, saleItemsTable } from "@workspace/db";
import { CreateSaleBody, CreateSaleResponse, ListSalesResponse } from "@workspace/api-zod";
import { formatSale, hydrateSales, SaleValidationError } from "../lib/sale-service";
const router = Router();
router.get("/sales", async (_req, res): Promise<void> => {
  res.json(ListSalesResponse.parse(await hydrateSales(await db.select().from(salesTable).orderBy(desc(salesTable.createdAt), desc(salesTable.id)))));
});
router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Periksa produk, jumlah, diskon, dan metode pembayaran." }); return; }
  const input = parsed.data;
  try {
    const sale = await db.transaction(async tx => {
      // Serialize retries of the same checkout, including concurrent requests.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.requestId}))`);
      const [existing] = await tx.select().from(salesTable).where(eq(salesTable.requestId, input.requestId));
      if (existing) {
        const items = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, existing.id));
        return formatSale(existing, items);
      }
      const ids = input.items.map(i => i.productId);
      if (new Set(ids).size !== ids.length) throw new SaleValidationError("Produk yang sama harus digabung dalam satu baris.");
      const products = await tx.select().from(productsTable).where(inArray(productsTable.id, ids)).for("share");
      const items = input.items.map(item => {
        const product = products.find(p => p.id === item.productId && p.active);
        if (!product) throw new SaleValidationError("Produk tidak tersedia. Muat ulang daftar produk.");
        return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, total: product.price * item.quantity };
      });
      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      if (input.discountType === "percent" && input.discountValue > 100) throw new SaleValidationError("Diskon persentase maksimal 100%.");
      const discount = input.discountType === "percent" ? Math.round(subtotal * input.discountValue / 100) : input.discountValue;
      if (discount > subtotal) throw new SaleValidationError("Diskon tidak boleh melebihi subtotal.");
      const [saved] = await tx.insert(salesTable).values({
        requestId: input.requestId, paymentMethod: input.paymentMethod, subtotal, discount,
        total: subtotal - discount, note: input.note ?? "",
      }).returning();
      const savedItems = await tx.insert(saleItemsTable).values(items.map(i => ({ ...i, saleId: saved!.id }))).returning();
      return formatSale(saved!, savedItems);
    });
    res.status(201).json(CreateSaleResponse.parse(sale));
  } catch (err) {
    if (err instanceof SaleValidationError) { res.status(400).json({ error: err.message }); return; }
    throw err;
  }
});
export default router;