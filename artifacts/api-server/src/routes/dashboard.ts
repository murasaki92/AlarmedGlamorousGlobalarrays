import { Router } from "express";
import { desc, gte } from "drizzle-orm";
import { db, salesTable } from "@workspace/db";
import { GetDashboardQueryParams, GetDashboardResponse } from "@workspace/api-zod";
import { hydrateSales } from "../lib/sale-service";
import { periodStarts, jakartaDay, daysBetween } from "../lib/periods";
const router = Router();
router.get("/dashboard", async (req, res): Promise<void> => {
  const params = GetDashboardQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: "Periode tidak valid." }); return; }
  const starts = periodStarts();
  const earliest = new Date(Math.min(starts.month.getTime(), starts.week.getTime()));
  const records = await db.select().from(salesTable).where(gte(salesTable.createdAt, earliest)).orderBy(desc(salesTable.createdAt));
  const all = await hydrateSales(records);
  const start = starts[params.data.period ?? "week"];
  const selected = all.filter(s => new Date(s.createdAt) >= start && new Date(s.createdAt) < starts.tomorrow);
  const revenueFor = (date: Date) => all.filter(s => new Date(s.createdAt) >= date && new Date(s.createdAt) < starts.tomorrow).reduce((n, s) => n + s.total, 0);
  const revenue = selected.reduce((n, s) => n + s.total, 0);
  const payments = ["cash", "qris", "transfer", "ewallet", "card"].map(method => ({
    method, revenue: selected.filter(s => s.paymentMethod === method).reduce((n, s) => n + s.total, 0),
    count: selected.filter(s => s.paymentMethod === method).length,
  }));
  const products = new Map<number, { productId: number; name: string; quantity: number; revenue: number }>();
  let itemCount = 0;
  for (const sale of selected) for (const item of sale.items) {
    itemCount += item.quantity;
    const summary = products.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, revenue: 0 };
    summary.quantity += item.quantity; summary.revenue += item.total;
    products.set(item.productId, summary);
  }
  const daily = daysBetween(start, starts.tomorrow).map(date => {
    const sales = selected.filter(s => jakartaDay(new Date(s.createdAt)) === date);
    return { date, revenue: sales.reduce((n, s) => n + s.total, 0), count: sales.length };
  });
  const recent = await db.select().from(salesTable).orderBy(desc(salesTable.createdAt), desc(salesTable.id)).limit(5);
  res.json(GetDashboardResponse.parse({
    todayRevenue: revenueFor(starts.today), weekRevenue: revenueFor(starts.week), monthRevenue: revenueFor(starts.month),
    revenue, transactionCount: selected.length, itemCount,
    averageTransaction: selected.length ? Math.round(revenue / selected.length) : 0,
    payments, products: [...products.values()].sort((a, b) => b.quantity - a.quantity),
    daily, recentSales: await hydrateSales(recent),
  }));
});
export default router;