import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const updateSchema = z.object({ label: z.string().min(1), price: z.number().min(0).optional() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id: groupId, tagId } = await params;
  const group = await db.modifierGroup.findFirst({ where: { id: groupId, restaurantId } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tag = await db.modifierTag.update({ where: { id: tagId }, data: parsed.data });
  return NextResponse.json(tag);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id: groupId, tagId } = await params;
  const group = await db.modifierGroup.findFirst({ where: { id: groupId, restaurantId } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.modifierTag.delete({ where: { id: tagId } });
  return NextResponse.json({ success: true });
}
