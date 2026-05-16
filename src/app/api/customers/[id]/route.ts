import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dietaryTags: z.array(z.string()).optional(),
  allergenTags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;

  const customer = await db.customer.findFirst({
    where: { id, orders: { some: { restaurantId } } },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Top ordered menu items
  const grouped = await db.orderItem.groupBy({
    by: ["menuItemId"],
    where: { order: { customerId: id, status: "PAID" } },
    _count: { menuItemId: true },
    orderBy: { _count: { menuItemId: "desc" } },
    take: 6,
  });

  const menuItemIds = grouped.map((g) => g.menuItemId);
  const menuItems = menuItemIds.length
    ? await db.menuItem.findMany({
        where: { id: { in: menuItemIds }, available: true },
        select: { id: true, name: true, price: true, category: true },
      })
    : [];

  const topItems = grouped
    .map((g) => {
      const item = menuItems.find((m) => m.id === g.menuItemId);
      if (!item) return null;
      return { ...item, count: g._count.menuItemId };
    })
    .filter(Boolean);

  return NextResponse.json({ ...customer, topItems });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify customer has orders in this restaurant before updating
  const existing = await db.customer.findFirst({
    where: { id, orders: { some: { restaurantId } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = await db.customer.update({ where: { id }, data: parsed.data as never });
  return NextResponse.json(customer);
}
