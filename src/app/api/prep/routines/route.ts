import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  ingredientId: z.string(),
  targetQty: z.number().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).default([1,2,3,4,5]),
  triggerTime: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const routines = await db.prepRoutine.findMany({
    where: { restaurantId },
    include: { ingredient: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(routines);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const routine = await db.prepRoutine.create({
    data: { ...parsed.data, restaurantId },
    include: { ingredient: true },
  });
  return NextResponse.json(routine);
}
