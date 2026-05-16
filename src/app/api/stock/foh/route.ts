import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["BEVERAGE", "PACKAGING", "SUPPLIES", "OTHER"]),
  unit: z.string(),
  unitLabel: z.string().optional().nullable(),
  costPerUnit: z.number().min(0).default(0),
  currentStock: z.number().min(0).default(0),
  parLevel: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  reorderQty: z.number().min(0).default(0),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const items = await db.fohItem.findMany({
    where: { restaurantId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await db.fohItem.create({ data: { ...parsed.data, restaurantId } as never });
  return NextResponse.json(item, { status: 201 });
}
