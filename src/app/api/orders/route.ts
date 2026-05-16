import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY"]).default("DINE_IN"),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  serverId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const orders = await db.order.findMany({
    where: { restaurantId, status: { in: ["OPEN", "HOLD"] } },
    include: {
      table: { select: { id: true, number: true, section: true } },
      server: { select: { id: true, name: true } },
      items: {
        include: { menuItem: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, tableId, serverId, customerName, customerPhone } = parsed.data;

  if (type === "DINE_IN" && tableId) {
    const [order] = await db.$transaction([
      db.order.create({
        data: { restaurantId, type, tableId, serverId, customerName, customerPhone },
        include: {
          table: { select: { id: true, number: true, section: true } },
          server: { select: { id: true, name: true } },
          items: { include: { menuItem: { select: { id: true, name: true, category: true } } } },
        },
      }),
      db.restaurantTable.update({ where: { id: tableId }, data: { status: "OCCUPIED" } }),
    ]);
    return NextResponse.json(order, { status: 201 });
  }

  const order = await db.order.create({
    data: { restaurantId, type, serverId, customerName, customerPhone },
    include: {
      table: { select: { id: true, number: true, section: true } },
      server: { select: { id: true, name: true } },
      items: { include: { menuItem: { select: { id: true, name: true, category: true } } } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
