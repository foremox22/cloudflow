import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({
  itemIds: z.array(z.string()).min(1),
  tableId: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itemIds, tableId } = parsed.data;

  const [sourceOrder, targetTable] = await Promise.all([
    db.order.findFirst({ where: { id, restaurantId } }),
    db.restaurantTable.findUnique({ where: { id: tableId } }),
  ]);

  if (!sourceOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!targetTable) return NextResponse.json({ error: "Target table not found" }, { status: 404 });
  if (targetTable.status !== "FREE") return NextResponse.json({ error: "Target table is not free" }, { status: 400 });

  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "No user in session" }, { status: 401 });

  await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const newOrder = await tx.order.create({
      data: { restaurantId: sourceOrder.restaurantId, type: "DINE_IN", tableId, serverId: userId, status: "OPEN" },
    });
    await tx.orderItem.updateMany({
      where: { id: { in: itemIds }, orderId: id },
      data: { orderId: newOrder.id },
    });
    await tx.restaurantTable.update({
      where: { id: tableId },
      data: { status: "OCCUPIED" },
    });
  });

  return NextResponse.json({ ok: true });
}
