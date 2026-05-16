import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago

  const orders = await db.order.findMany({
    where: {
      restaurantId,
      OR: [
        {
          status: { in: ["OPEN", "HOLD"] },
          items: { some: { status: { in: ["COOKING", "READY"] } } },
        },
        {
          status: { in: ["PAID", "VOID"] },
          closedAt: { gte: cutoff },
          items: { some: { status: { in: ["COOKING", "READY"] } } },
        },
      ],
    },
    include: {
      table: { select: { number: true, section: true } },
      server: { select: { name: true } },
      items: {
        where: { status: { in: ["COOKING", "READY"] } },
        include: { menuItem: { select: { name: true, category: true } } },
        orderBy: [{ courseNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { openedAt: "asc" },
  });

  return NextResponse.json(orders);
}
