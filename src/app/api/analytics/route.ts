import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

function rangeStart(range: string): Date {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function convertUnit(qty: number, from: string, to: string): number {
  if (from === to) return qty;
  const w: Record<string, number> = { KG: 1, G: 0.001, LB: 0.4536, OZ: 0.02835 };
  const v: Record<string, number> = { L: 1, ML: 0.001, CUP: 0.2366, TBSP: 0.01479, TSP: 0.004929 };
  if (w[from] && w[to]) return (qty * w[from]) / w[to];
  if (v[from] && v[to]) return (qty * v[from]) / v[to];
  return qty;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const from = rangeStart(range);
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [paidOrders, orderItems, ingredients, fohItems, wasteTxns, recipes] = await Promise.all([
    db.order.findMany({
      where: { restaurantId, status: "PAID", closedAt: { gte: from } },
      select: { id: true, total: true, closedAt: true, type: true },
      take: 5000,
    }),
    db.orderItem.findMany({
      where: {
        order: { restaurantId, status: "PAID", closedAt: { gte: from } },
        status: { not: "VOID" },
      },
      select: {
        quantity: true,
        unitPrice: true,
        menuItem: { select: { name: true, category: true } },
      },
      take: 5000,
    }),
    db.ingredient.findMany({
      where: { restaurantId, active: true },
      select: { id: true, name: true, category: true, currentStock: true, costPerUnit: true, parLevel: true, reorderPoint: true },
    }),
    db.fohItem.findMany({
      where: { restaurantId, active: true },
      select: { currentStock: true, costPerUnit: true },
    }),
    db.stockTransaction.findMany({
      where: { restaurantId, type: "WASTE", createdAt: { gte: from } },
      select: { quantity: true, itemId: true, itemType: true },
    }),
    db.recipe.findMany({
      where: { restaurantId, active: true },
      select: {
        name: true,
        sellingPrice: true,
        servings: true,
        ingredients: {
          select: {
            quantity: true,
            unit: true,
            ingredient: { select: { costPerUnit: true, unit: true, yieldRate: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Daily sales ──
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().split("T")[0], { revenue: 0, orders: 0 });
  }
  for (const o of paidOrders) {
    if (!o.closedAt) continue;
    const key = o.closedAt.toISOString().split("T")[0];
    const entry = dailyMap.get(key);
    if (entry) { entry.revenue += o.total; entry.orders += 1; }
  }
  const dailySales = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date: date.slice(5), // MM-DD
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
  }));

  // ── Summary ──
  type PaidOrder = (typeof paidOrders)[number];
  const totalRevenue = paidOrders.reduce((s: number, o: PaidOrder) => s + o.total, 0);
  const totalOrders = paidOrders.length;
  const todayRevenue = paidOrders
    .filter((o: PaidOrder) => o.closedAt && o.closedAt >= today)
    .reduce((s: number, o: PaidOrder) => s + o.total, 0);

  // ── Top / bottom items ──
  const itemMap = new Map<string, { name: string; category: string; qty: number; revenue: number }>();
  for (const item of orderItems) {
    const key = item.menuItem.name;
    if (!itemMap.has(key)) itemMap.set(key, { name: key, category: item.menuItem.category, qty: 0, revenue: 0 });
    const e = itemMap.get(key)!;
    e.qty += item.quantity;
    e.revenue += item.quantity * item.unitPrice;
  }
  const sorted = Array.from(itemMap.values()).sort((a: { qty: number }, b: { qty: number }) => b.qty - a.qty);
  type SortedItem = (typeof sorted)[number];
  const topItems = sorted.slice(0, 10).map((i: SortedItem) => ({ ...i, revenue: Math.round(i.revenue * 100) / 100 }));
  const bottomItems = sorted.length > 5 ? sorted.slice(-5).reverse() : [];

  // ── Stock valuation ──
  type Ingredient = (typeof ingredients)[number];
  type FohItem = (typeof fohItems)[number];
  const kitchenValue = ingredients.reduce((s: number, i: Ingredient) => s + i.currentStock * i.costPerUnit, 0);
  const fohValue = fohItems.reduce((s: number, i: FohItem) => s + i.currentStock * i.costPerUnit, 0);
  const lowStock = ingredients.filter((i: Ingredient) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length;
  const outOfStock = ingredients.filter((i: Ingredient) => i.currentStock <= 0).length;

  // ── Waste by category ──
  type WasteTxn = (typeof wasteTxns)[number];
  const kitchenWaste = wasteTxns.filter((t: WasteTxn) => t.itemType === "KITCHEN");
  type WasteIngredient = { id: string; category: string; costPerUnit: number };
  const wasteIngredients: WasteIngredient[] = kitchenWaste.length > 0
    ? await db.ingredient.findMany({
        where: { id: { in: kitchenWaste.map((t: (typeof kitchenWaste)[number]) => t.itemId) } },
        select: { id: true, category: true, costPerUnit: true },
      })
    : [];
  const wMap = new Map(wasteIngredients.map((i: WasteIngredient) => [i.id, i]));
  const wasteCatMap = new Map<string, { qty: number; cost: number }>();
  for (const tx of kitchenWaste) {
    const ing = wMap.get(tx.itemId);
    if (!ing) continue;
    const cat = ing.category;
    if (!wasteCatMap.has(cat)) wasteCatMap.set(cat, { qty: 0, cost: 0 });
    const e = wasteCatMap.get(cat)!;
    e.qty += tx.quantity;
    e.cost += tx.quantity * ing.costPerUnit;
  }
  const wasteReport = Array.from(wasteCatMap.entries())
    .map(([category, v]) => ({ category, qty: Math.round(v.qty * 100) / 100, cost: Math.round(v.cost * 100) / 100 }))
    .sort((a: { cost: number }, b: { cost: number }) => b.cost - a.cost);

  // ── Recipe food costs ──
  type Recipe = (typeof recipes)[number];
  type RecipeIng = Recipe["ingredients"][number];
  const recipeFoodCosts = recipes
    .filter((r: Recipe) => r.sellingPrice > 0)
    .map((r: Recipe) => {
      const totalCost = r.ingredients.reduce((s: number, ri: RecipeIng) => {
        const conv = convertUnit(ri.quantity, ri.unit, ri.ingredient.unit);
        const eff = conv / (ri.ingredient.yieldRate ?? 1);
        return s + eff * ri.ingredient.costPerUnit;
      }, 0);
      const costPerServing = r.servings > 0 ? totalCost / r.servings : 0;
      const foodCostPct = r.sellingPrice > 0 ? (costPerServing / r.sellingPrice) * 100 : 0;
      return {
        name: r.name,
        sellingPrice: r.sellingPrice,
        costPerServing: Math.round(costPerServing * 100) / 100,
        foodCostPct: Math.round(foodCostPct * 10) / 10,
      };
    })
    .sort((a: { foodCostPct: number }, b: { foodCostPct: number }) => b.foodCostPct - a.foodCostPct)
    .slice(0, 15);

  return NextResponse.json({
    summary: {
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: totalOrders,
      avgOrder: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      revenueToday: Math.round(todayRevenue * 100) / 100,
    },
    dailySales,
    topItems,
    bottomItems,
    recipeFoodCosts,
    stockValuation: {
      kitchenValue: Math.round(kitchenValue * 100) / 100,
      fohValue: Math.round(fohValue * 100) / 100,
      totalValue: Math.round((kitchenValue + fohValue) * 100) / 100,
      lowStock,
      outOfStock,
    },
    wasteReport,
    ordersByType: {
      dineIn: paidOrders.filter((o: PaidOrder) => o.type === "DINE_IN").length,
      takeaway: paidOrders.filter((o: PaidOrder) => o.type === "TAKEAWAY").length,
    },
  });
}
