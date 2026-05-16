import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  name:       z.string().min(1),
  color:      z.string().default("gray"),
  appliesTo:  z.array(z.string()).default([]),
  sortOrder:  z.number().int().default(0),
  menuItemId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const menuItemId = searchParams.get("menuItemId");

  // ?menuItemId=xxx  → return item-specific groups for that item only
  // no param         → return all global groups (menuItemId IS NULL)
  const groups = await db.modifierGroup.findMany({
    where: {
      restaurantId,
      active: true,
      menuItemId: menuItemId ? menuItemId : null,
    },
    include: { tags: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const group = await db.modifierGroup.create({
    data: { restaurantId, ...parsed.data },
    include: { tags: true },
  });

  return NextResponse.json(group, { status: 201 });
}
