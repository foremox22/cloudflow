import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const roster = await db.rosterWeek.findUnique({
    where: { id, restaurantId },
    include: {
      createdBy: { select: { name: true } },
      shifts: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!roster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(roster);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.rosterWeek.delete({ where: { id, restaurantId } });
  return NextResponse.json({ ok: true });
}
