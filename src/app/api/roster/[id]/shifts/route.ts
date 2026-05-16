import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const shiftSchema = z.object({
  userId: z.string(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  position: z.string().nullish(),
  notes: z.string().nullish(),
  session: z.enum(["LUNCH", "DINNER", "ALLDAY"]).nullish(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const roster = await db.rosterWeek.findUnique({ where: { id, restaurantId } });
  if (!roster) return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  if (roster.status === "ARCHIVED") return NextResponse.json({ error: "Cannot edit archived roster" }, { status: 400 });

  const body = await req.json();
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const date = new Date(parsed.data.date);
  date.setUTCHours(0, 0, 0, 0);

  // Prevent duplicate session on same day (e.g., two LUNCH shifts)
  const existing = await db.rosterShift.findFirst({
    where: { rosterId: id, userId: parsed.data.userId, date, session: parsed.data.session ?? null },
  });
  if (existing) return NextResponse.json({ error: "Shift already exists for this session on this day" }, { status: 409 });

  const shift = await db.rosterShift.create({
    data: {
      rosterId: id,
      restaurantId,
      userId: parsed.data.userId,
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      position: parsed.data.position ?? null,
      notes: parsed.data.notes ?? null,
      session: parsed.data.session ?? null,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(shift, { status: 201 });
}
