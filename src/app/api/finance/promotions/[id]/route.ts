import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  minOrderValue: z.number().min(0).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt)   data.endsAt   = new Date(parsed.data.endsAt);
  if (parsed.data.code !== undefined) data.code = parsed.data.code?.trim().toUpperCase() || null;

  const promotion = await db.promotion.update({ where: { id, restaurantId }, data: data as never });
  return NextResponse.json(promotion);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  await db.promotion.deleteMany({ where: { id, restaurantId } });
  return NextResponse.json({ success: true });
}
