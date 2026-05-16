import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { type: true } });
  if (restaurant?.type !== "CENTRAL_KITCHEN") {
    return NextResponse.json({ error: "Only available for Central Kitchen restaurants" }, { status: 403 });
  }

  // Aggregate demand from SUBMITTED + APPROVED requests
  const requests = await db.distributionRequest.findMany({
    where: { centralKitchenId: restaurantId, status: { in: ["SUBMITTED", "APPROVED"] } },
    include: {
      fromRestaurant: { select: { id: true, name: true } },
      items: { include: { ckIngredient: { select: { id: true, name: true, unit: true, currentStock: true } } } },
    },
  });

  // Aggregate by ingredient name
  const demandMap = new Map<string, {
    ingredientName: string;
    unit: string;
    currentStock: number;
    totalQty: number;
    byRestaurant: { name: string; qty: number; status: string }[];
  }>();

  for (const req of requests) {
    for (const item of req.items) {
      const key = item.ingredientName;
      if (!demandMap.has(key)) {
        demandMap.set(key, {
          ingredientName: item.ingredientName,
          unit: item.unit,
          currentStock: item.ckIngredient.currentStock,
          totalQty: 0,
          byRestaurant: [],
        });
      }
      const entry = demandMap.get(key)!;
      const qty = item.approvedQty ?? item.requestedQty;
      entry.totalQty += qty;
      entry.byRestaurant.push({ name: req.fromRestaurant.name, qty, status: req.status });
    }
  }

  type DemandEntry = NonNullable<ReturnType<typeof demandMap.get>>;
  const demand = Array.from(demandMap.values())
    .sort((a: DemandEntry, b: DemandEntry) => b.totalQty - a.totalQty)
    .map((d: DemandEntry) => ({
      ...d,
      totalQty: Math.round(d.totalQty * 100) / 100,
      shortfall: Math.max(0, Math.round((d.totalQty - d.currentStock) * 100) / 100),
    }));

  return NextResponse.json(demand);
}
