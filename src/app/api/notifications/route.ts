import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const notifications = await db.notification.findMany({
    where: { userId, restaurantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (ids && ids.length > 0) {
    await db.notification.updateMany({
      where: { id: { in: ids }, userId, restaurantId },
      data: { read: true },
    });
  } else {
    await db.notification.updateMany({
      where: { userId, restaurantId, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
