import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "COOKING", "READY", "SERVED", "VOID"]).optional(),
  courseNumber: z.number().int().positive().optional(),
  isSharing: z.boolean().optional(),
  voidReason: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id: orderId, itemId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify the item belongs to an order in this restaurant
  const existing = await db.orderItem.findFirst({
    where: { id: itemId, orderId, order: { restaurantId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await db.orderItem.update({
    where: { id: itemId },
    data: parsed.data as never,
    include: { menuItem: { select: { id: true, name: true, category: true } } },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id: orderId, itemId } = await params;
  // Scope deletion to this restaurant to prevent cross-tenant deletes
  await db.orderItem.deleteMany({ where: { id: itemId, orderId, order: { restaurantId } } });
  return NextResponse.json({ ok: true });
}
