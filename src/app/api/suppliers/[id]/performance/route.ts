import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const pos = await db.purchaseOrder.findMany({
    where: { supplierId: id, status: { in: ["RECEIVED", "SENT"] } },
    include: {
      lineItems: { include: { ingredient: { select: { name: true, costPerUnit: true, unit: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  type PurchaseOrder = (typeof pos)[number];
  const received = pos.filter((p: PurchaseOrder) => p.status === "RECEIVED");
  const onTime = received.filter(
    (p: PurchaseOrder) => p.expectedAt && p.receivedAt && p.receivedAt <= p.expectedAt
  );
  const onTimePct = received.length > 0 ? Math.round((onTime.length / received.length) * 100) : null;

  // Price variance: compare PO unit price vs current ingredient costPerUnit
  const priceVariances: { name: string; poPricePct: number }[] = [];
  for (const po of pos) {
    for (const li of po.lineItems) {
      const current = li.ingredient.costPerUnit;
      if (current > 0) {
        priceVariances.push({
          name: li.ingredient.name,
          poPricePct: Math.round(((li.unitPrice - current) / current) * 100),
        });
      }
    }
  }

  const avgPriceVariance =
    priceVariances.length > 0
      ? Math.round(priceVariances.reduce((s: number, v) => s + v.poPricePct, 0) / priceVariances.length)
      : null;

  return NextResponse.json({
    totalOrders: pos.length,
    receivedOrders: received.length,
    onTimePct,
    avgPriceVariancePct: avgPriceVariance,
    recentPos: pos.slice(0, 5).map((p: (typeof pos)[number]) => ({
      id: p.id,
      status: p.status,
      createdAt: p.createdAt,
      expectedAt: p.expectedAt,
      receivedAt: p.receivedAt,
      total: p.lineItems.reduce((s: number, l: (typeof p.lineItems)[number]) => s + l.quantity * l.unitPrice, 0),
    })),
  });
}
