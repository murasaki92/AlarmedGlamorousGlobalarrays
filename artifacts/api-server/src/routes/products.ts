import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { CreateProductBody, CreateProductResponse, UpdateProductBody, UpdateProductParams, UpdateProductResponse, ArchiveProductParams, ArchiveProductResponse, ListProductsResponse } from "@workspace/api-zod";
const router = Router();
router.get("/products", async (_req, res): Promise<void> => {
  res.json(ListProductsResponse.parse(await db.select().from(productsTable).orderBy(asc(productsTable.id))));
});
router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim() || !parsed.data.category.trim()) {
    res.status(400).json({ error: "Nama, kategori, dan harga produk harus valid." }); return;
  }
  const [product] = await db.insert(productsTable).values({ ...parsed.data, name: parsed.data.name.trim(), category: parsed.data.category.trim() }).returning();
  res.status(201).json(CreateProductResponse.parse(product));
});
router.put("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success || !parsed.data.name.trim() || !parsed.data.category.trim()) {
    res.status(400).json({ error: "Data produk tidak valid." }); return;
  }
  const [product] = await db.update(productsTable).set({ ...parsed.data, name: parsed.data.name.trim(), category: parsed.data.category.trim() }).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Produk tidak ditemukan." }); return; }
  res.json(UpdateProductResponse.parse(product));
});
router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = ArchiveProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID produk tidak valid." }); return; }
  const [product] = await db.update(productsTable).set({ active: false }).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Produk tidak ditemukan." }); return; }
  res.json(ArchiveProductResponse.parse(product));
});
export default router;