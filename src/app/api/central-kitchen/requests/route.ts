import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  centralKitchenId: z.string(),
  neededBy: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    ckIngredientId: z.string(),
    ingredientName: z.string(),
    unit: z.string(),
    requestedQty: z.number().positive(),
  })).min(1),
});

const INCLUDE = {
  fromRestaurant: { select: { id: true, name: true } },
  centralKitchen: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { ckIngredient: { select: { id: true, name: true, unit: true, currentStock: true } } } },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { type: true } });

  const where =
    restaurant?.type === "CENTRAL_KITCHEN"
      ? { centralKitchenId: restaurantId, ...(status ? { status: status as any } : {}) }
      : { fromRestaurantId: restaurantId, ...(status ? { status: status as any } : {}) };

  const requests = await db.distributionRequest.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { centralKitchenId, neededBy, notes, items } = parsed.data;

  // Verify this restaurant is linked to that CK
  const link = await db.centralKitchenLink.findUnique({
    where: { centralKitchenId_linkedRestaurantId: { centralKitchenId, linkedRestaurantId: restaurantId } },
  });
  if (!link) return NextResponse.json({ error: "Not linked to this Central Kitchen" }, { status: 403 });

  const request = await db.distributionRequest.create({
    data: {
      fromRestaurantId: restaurantId,
      centralKitchenId,
      neededBy: neededBy ? new Date(neededBy) : undefined,
      notes,
      createdById: session.user.id,
      items: {
        create: items.map((i: (typeof items)[number]) => ({
          ckIngredientId: i.ckIngredientId,
          ingredientName: i.ingredientName,
          unit: i.unit as any,
          requestedQty: i.requestedQty,
        })),
      },
    },
    include: INCLUDE,
  });

  return NextResponse.json(request, { status: 201 });
}
