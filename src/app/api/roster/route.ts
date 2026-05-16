import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  weekStart: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const weeks = await db.rosterWeek.findMany({
    where: { restaurantId },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { shifts: true } },
    },
    orderBy: { weekStart: "desc" },
    take: 20,
  });

  return NextResponse.json(weeks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const weekStart = new Date(parsed.data.weekStart);
  // Snap to Monday
  const day = weekStart.getUTCDay();
  if (day !== 1) {
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setUTCDate(weekStart.getUTCDate() + diff);
  }
  weekStart.setUTCHours(0, 0, 0, 0);

  // Check for existing roster for this week
  const existing = await db.rosterWeek.findFirst({
    where: {
      restaurantId,
      weekStart: { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * 86400000) },
    },
  });
  if (existing) return NextResponse.json({ error: "A roster already exists for this week" }, { status: 409 });

  const roster = await db.rosterWeek.create({
    data: {
      restaurantId,
      weekStart,
      notes: parsed.data.notes ?? null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(roster, { status: 201 });
}
