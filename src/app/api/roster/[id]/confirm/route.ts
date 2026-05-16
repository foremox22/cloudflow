import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const confirmSchema = z.object({
  shifts: z.array(
    z.object({
      shiftId: z.string(),
      status: z.enum(["CONFIRMED", "REJECTED"]),
      note: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const roster = await db.rosterWeek.findUnique({
    where: { id, restaurantId },
    include: { shifts: { where: { userId: session.user.id } } },
  });
  if (!roster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (roster.status !== "PUBLISHED") return NextResponse.json({ error: "Roster not published" }, { status: 400 });

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ownShiftIds = new Set(roster.shifts.map((s) => s.id));

  const updated = await Promise.all(
    parsed.data.shifts
      .filter((entry) => ownShiftIds.has(entry.shiftId))
      .map((entry) =>
        db.rosterShift.update({
          where: { id: entry.shiftId },
          data: {
            confirmStatus: entry.status,
            confirmNote: entry.status === "REJECTED" ? (entry.note ?? null) : null,
            confirmedAt: new Date(),
          },
        })
      )
  );

  return NextResponse.json({ ok: true, updated: updated.length });
}
