import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const sessions = await db.labSession.findMany({
    where: { userId, restaurantId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const labSession = await db.labSession.create({
    data: { userId, restaurantId, title: "New Lab Session" },
  });

  return NextResponse.json(labSession, { status: 201 });
}
