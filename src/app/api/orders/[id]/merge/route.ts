import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({ sourceOrderId: z.string() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sourceOrderId } = parsed.data;
  if (sourceOrderId === id) return NextResponse.json({ error: "Cannot merge with itself" }, { status: 400 });

  const [target, source] = await Promise.all([
    db.order.findFirst({ where: { id, restaurantId } }),
    db.order.findFirst({ where: { id: sourceOrderId, restaurantId } }),
  ]);

  if (!target) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!source) return NextResponse.json({ error: "Source order not found" }, { status: 404 });
  if (source.status !== "OPEN" && source.status !== "HOLD") {
    return NextResponse.json({ error: "Source order is not active" }, { status: 400 });
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.orderItem.updateMany({
      where: { orderId: sourceOrderId, status: { not: "VOID" } },
      data: { orderId: id },
    });
    await tx.order.update({
      where: { id: sourceOrderId },
      data: { status: "VOID", closedAt: new Date() },
    });
    if (source.tableId) {
      await tx.restaurantTable.update({
        where: { id: source.tableId },
        data: { status: "FREE" },
      });
    }
  });

  const updated = await db.order.findUnique({
    where: { id },
    include: {
      table: { select: { id: true, number: true, section: true } },
      server: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, dietaryTags: true, allergenTags: true, notes: true } },
      items: {
        include: { menuItem: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json(updated);
}
