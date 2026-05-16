import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const INCLUDE = {
  fromRestaurant: { select: { id: true, name: true } },
  centralKitchen: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { ckIngredient: { select: { id: true, name: true, unit: true, currentStock: true, category: true } } } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.distributionRequest.findFirst({
    where: {
      id,
      OR: [{ fromRestaurantId: restaurantId }, { centralKitchenId: restaurantId }],
    },
    include: INCLUDE,
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

const patchSchema = z.object({
  neededBy: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    ckIngredientId: z.string(),
    ingredientName: z.string(),
    unit: z.string(),
    requestedQty: z.number().positive(),
  })).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.distributionRequest.findFirst({ where: { id, fromRestaurantId: restaurantId } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "DRAFT") return NextResponse.json({ error: "Only DRAFT requests can be edited" }, { status: 400 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { neededBy, notes, items } = parsed.data;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.distributionRequest.update({
      where: { id },
      data: {
        ...(neededBy !== undefined ? { neededBy: neededBy ? new Date(neededBy) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    if (items) {
      await tx.distributionItem.deleteMany({ where: { requestId: id } });
      await tx.distributionItem.createMany({
        data: items.map((i: (typeof items)[number]) => ({
          requestId: id,
          ckIngredientId: i.ckIngredientId,
          ingredientName: i.ingredientName,
          unit: i.unit as any,
          requestedQty: i.requestedQty,
        })),
      });
    }
  });

  const updated = await db.distributionRequest.findUnique({ where: { id }, include: INCLUDE });
  return NextResponse.json(updated);
}
