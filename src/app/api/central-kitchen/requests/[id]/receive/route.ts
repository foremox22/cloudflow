import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({
  receivedQtys: z.record(z.string(), z.number()), // itemId → receivedQty
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
    where: { id, fromRestaurantId: restaurantId },
    include: { items: { include: { ckIngredient: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "DISPATCHED") return NextResponse.json({ error: "Must be DISPATCHED first" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { receivedQtys } = parsed.data;

  await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    for (const [itemId, qty] of Object.entries(receivedQtys)) {
      type RequestItem = (typeof request.items)[number];
      const item = request.items.find((i: RequestItem) => i.id === itemId);
      if (!item || qty <= 0) continue;

      // Find matching ingredient in this restaurant by name
      let localIngredient = await tx.ingredient.findFirst({
        where: { restaurantId, name: item.ingredientName },
      });

      // Auto-create if not found
      if (!localIngredient) {
        localIngredient = await tx.ingredient.create({
          data: {
            restaurantId,
            name: item.ingredientName,
            category: item.ckIngredient.category,
            unit: item.ckIngredient.unit,
            costPerUnit: item.ckIngredient.costPerUnit,
            currentStock: 0,
          },
        });
      }

      // Increment stock
      await tx.ingredient.update({
        where: { id: localIngredient.id },
        data: { currentStock: { increment: qty } },
      });

      // Record stock transaction
      await tx.stockTransaction.create({
        data: {
          restaurantId,
          itemType: "KITCHEN",
          itemId: localIngredient.id,
          type: "IN",
          quantity: qty,
          referenceId: request.id,
          notes: `Received from Central Kitchen`,
          createdById: session.user.id,
        },
      });

      await tx.distributionItem.update({ where: { id: itemId }, data: { receivedQty: qty } });
    }

    await tx.distributionRequest.update({
      where: { id },
      data: { status: "RECEIVED", updatedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}
