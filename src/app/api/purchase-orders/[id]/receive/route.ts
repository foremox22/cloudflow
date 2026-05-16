import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({
  receivedQtys: z.record(z.string(), z.number().min(0)).optional(),
  actualPrices: z.record(z.string(), z.number().min(0)).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { receivedQtys, actualPrices } = parsed.data;

  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { lineItems: { include: { ingredient: true } } },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["APPROVED", "SENT"].includes(po.status)) {
    return NextResponse.json({ error: "Only APPROVED or SENT orders can be received" }, { status: 400 });
  }

  // Collect price alerts before the transaction mutates costPerUnit
  const priceAlerts: Array<{ type: "INGREDIENT_PRICE_INCREASE" | "INGREDIENT_OVERPRICE"; title: string; body: string }> = [];

  for (const li of po.lineItems) {
    const confirmedPrice = actualPrices?.[li.id] ?? li.unitPrice;
    const oldPrice = li.ingredient.costPerUnit ?? li.unitPrice;
    if (oldPrice > 0 && confirmedPrice !== oldPrice) {
      const pctChange = (confirmedPrice - oldPrice) / oldPrice;
      if (pctChange > 0.15) {
        priceAlerts.push({
          type: "INGREDIENT_OVERPRICE",
          title: "Ingredient Overpriced",
          body: `${li.ingredient.name} price increased by ${(pctChange * 100).toFixed(1)}% (${oldPrice.toFixed(2)} → ${confirmedPrice.toFixed(2)} per ${li.ingredient.unit}). Please review with the owner.`,
        });
      } else if (pctChange > 0.05) {
        priceAlerts.push({
          type: "INGREDIENT_PRICE_INCREASE",
          title: "Ingredient Price Increase",
          body: `${li.ingredient.name} price increased by ${(pctChange * 100).toFixed(1)}% (${oldPrice.toFixed(2)} → ${confirmedPrice.toFixed(2)} per ${li.ingredient.unit}).`,
        });
      }
    }
  }

  await db.$transaction(async (prisma: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    for (const li of po.lineItems) {
      const qty = receivedQtys?.[li.id] ?? li.quantity;
      if (qty <= 0) continue;

      const confirmedPrice = actualPrices?.[li.id] ?? li.unitPrice;

      await prisma.poLineItem.update({
        where: { id: li.id },
        data: { receivedQty: qty },
      });

      await prisma.ingredient.update({
        where: { id: li.ingredientId },
        data: {
          currentStock: { increment: qty },
          costPerUnit: confirmedPrice,
          priceEstimated: false,
        },
      });

      await prisma.stockTransaction.create({
        data: {
          restaurantId: po.restaurantId,
          itemType: "KITCHEN",
          itemId: li.ingredientId,
          type: "IN",
          quantity: qty,
          referenceId: po.id,
          notes: `PO received: #${po.id.slice(-8).toUpperCase()} — cost updated to ${confirmedPrice.toFixed(2)}`,
          createdById: userId,
        },
      });
    }

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
  });

  // Fire price alerts after transaction commits
  for (const alert of priceAlerts) {
    notify(po.restaurantId, alert.type, alert.title, alert.body, "/suppliers").catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
