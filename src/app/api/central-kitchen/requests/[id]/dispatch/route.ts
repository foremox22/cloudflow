import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({
  dispatchedQtys: z.record(z.string(), z.number()), // itemId → dispatchedQty
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.distributionRequest.findFirst({
    where: { id, centralKitchenId: restaurantId },
    include: { items: { include: { ckIngredient: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "APPROVED") return NextResponse.json({ error: "Must be APPROVED first" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dispatchedQtys } = parsed.data;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const [itemId, qty] of Object.entries(dispatchedQtys)) {
      const item = request.items.find((i) => i.id === itemId);
      if (!item || qty <= 0) continue;

      // Deduct from CK ingredient stock
      await tx.ingredient.update({
        where: { id: item.ckIngredientId },
        data: { currentStock: { decrement: qty } },
      });

      // Record stock transaction for CK
      await tx.stockTransaction.create({
        data: {
          restaurantId,
          itemType: "KITCHEN",
          itemId: item.ckIngredientId,
          type: "OUT",
          quantity: qty,
          referenceId: request.id,
          notes: `Dispatched to ${request.fromRestaurantId}`,
          createdById: session.user.id,
        },
      });

      await tx.distributionItem.update({ where: { id: itemId }, data: { dispatchedQty: qty } });
    }

    await tx.distributionRequest.update({
      where: { id },
      data: { status: "DISPATCHED", updatedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}
