import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";
import { maybeCreateAutoPo } from "@/lib/autoOrder";
import { maybeCreateUrgentPrep } from "@/lib/autoPrep";
import { notify } from "@/lib/notify";

const adjustSchema = z.object({
  itemType: z.enum(["KITCHEN", "FOH"]),
  itemId: z.string(),
  type: z.enum(["IN", "OUT", "WASTE", "ADJUST"]),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");

  const txs = await db.stockTransaction.findMany({
    where: {
      restaurantId,
      ...(itemType ? { itemType: itemType as never } : {}),
      ...(itemId ? { itemId } : {}),
    },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(txs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const userId = session.user.id;

  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itemType, itemId, type, quantity, notes } = parsed.data;

  const tx = await db.$transaction(async (prisma: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const transaction = await prisma.stockTransaction.create({
      data: { restaurantId, itemType, itemId, type, quantity, notes: notes ?? null, createdById: userId },
      include: { createdBy: { select: { name: true } } },
    });

    const delta = type === "IN" ? quantity : -quantity;

    if (itemType === "KITCHEN") {
      await prisma.ingredient.update({
        where: { id: itemId },
        data: { currentStock: { increment: delta } },
      });
    } else {
      await prisma.fohItem.update({
        where: { id: itemId },
        data: { currentStock: { increment: delta } },
      });
    }

    return transaction;
  });

  if (itemType === "KITCHEN" && (type === "OUT" || type === "WASTE")) {
    const ingredient = await db.ingredient.findUnique({ where: { id: itemId } });
    if (ingredient) {
      const stock = ingredient.currentStock;
      if (stock <= 0) {
        notify(restaurantId, "OUT_OF_STOCK", "Ingredient Out of Stock",
          `${ingredient.name} is now out of stock (${stock.toFixed(2)} ${ingredient.unit}).`,
          "/stock/kitchen"
        ).catch(() => null);
      } else if (stock <= ingredient.reorderPoint) {
        notify(restaurantId, "LOW_STOCK", "Low Stock Alert",
          `${ingredient.name} is low (${stock.toFixed(2)} ${ingredient.unit}, reorder point: ${ingredient.reorderPoint} ${ingredient.unit}).`,
          "/stock/kitchen"
        ).catch(() => null);
      }
      setImmediate(() => { maybeCreateAutoPo(itemId).catch(() => null); });
      setImmediate(() => { maybeCreateUrgentPrep(itemId, stock).catch(() => null); });
    }
  }

  return NextResponse.json(tx, { status: 201 });
}
