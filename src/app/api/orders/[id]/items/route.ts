import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const addItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
  specialRequests: z.array(z.string()).default([]),
  priceAdjustment: z.number().min(0).default(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id: orderId } = await params;
  const body = await req.json();
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { menuItemId, quantity, notes, specialRequests, priceAdjustment } = parsed.data;

  // Verify the order belongs to this restaurant
  const order = await db.order.findFirst({ where: { id: orderId, restaurantId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const menuItem = await db.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  if (!menuItem.available) return NextResponse.json({ error: "Item 86'd — unavailable" }, { status: 400 });

  const unitPrice = menuItem.price + priceAdjustment;

  // Only merge if no special requests, no notes, and no price adjustment (customised items are always distinct)
  const hasCustomisation = specialRequests.length > 0 || !!notes || priceAdjustment > 0;
  if (!hasCustomisation) {
    const existing = await db.orderItem.findFirst({
      where: { orderId, menuItemId, status: "PENDING", specialRequests: { equals: [] }, notes: null, unitPrice: menuItem.price },
    });
    if (existing) {
      const updated = await db.orderItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { menuItem: { select: { id: true, name: true, category: true } } },
      });
      return NextResponse.json(updated);
    }
  }

  const item = await db.orderItem.create({
    data: { orderId, menuItemId, quantity, unitPrice, notes: notes ?? null, specialRequests },
    include: { menuItem: { select: { id: true, name: true, category: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
