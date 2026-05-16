import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

function hoursFromTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins   = eh * 60 + em;
  return Math.max(0, (endMins - startMins) / 60);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const shifts = await db.rosterShift.findMany({
    where: {
      restaurantId,
      date: { gte: new Date(from), lte: new Date(to) },
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  // Group shifts by user and accumulate hours
  const byUser = new Map<string, { userId: string; userName: string; role: string; hoursWorked: number; shiftCount: number }>();
  for (const shift of shifts) {
    const hours = hoursFromTimes(shift.startTime, shift.endTime);
    const existing = byUser.get(shift.userId);
    if (existing) {
      existing.hoursWorked += hours;
      existing.shiftCount  += 1;
    } else {
      byUser.set(shift.userId, {
        userId:     shift.user.id,
        userName:   shift.user.name,
        role:       shift.user.role,
        hoursWorked: hours,
        shiftCount: 1,
      });
    }
  }

  return NextResponse.json(Array.from(byUser.values()));
}
