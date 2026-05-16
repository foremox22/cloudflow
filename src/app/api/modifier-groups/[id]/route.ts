import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  appliesTo: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.modifierGroup.findFirst({ where: { id, restaurantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await db.modifierGroup.update({
    where: { id },
    data: parsed.data,
    include: { tags: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const existing = await db.modifierGroup.findFirst({ where: { id, restaurantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.modifierGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
