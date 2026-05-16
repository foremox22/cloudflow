import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db.rosterInvite.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, name: true } },
      roster: {
        include: {
          shifts: {
            where: { userId: { not: "" } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (invite.sentAt < sevenDaysAgo) {
    return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  }

  const myShifts = invite.roster.shifts.filter((s) => s.userId === invite.userId);

  return NextResponse.json({
    rosterWeekId: invite.rosterId,
    weekStart: invite.roster.weekStart,
    notes: invite.roster.notes,
    user: invite.user,
    shifts: myShifts.map((s: (typeof myShifts)[number]) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      position: s.position,
      notes: s.notes,
      confirmStatus: s.confirmStatus,
      confirmNote: s.confirmNote,
    })),
  });
}

const confirmSchema = z.object({
  shifts: z.array(
    z.object({
      shiftId: z.string(),
      status: z.enum(["CONFIRMED", "REJECTED"]),
      note: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db.rosterInvite.findUnique({
    where: { token },
    include: { roster: { include: { shifts: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const sevenDaysAgoPost = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (invite.sentAt < sevenDaysAgoPost) {
    return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  }

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const myShiftIds = new Set(
    invite.roster.shifts.filter((s: (typeof invite.roster.shifts)[number]) => s.userId === invite.userId).map((s: (typeof invite.roster.shifts)[number]) => s.id)
  );

  for (const entry of parsed.data.shifts) {
    if (!myShiftIds.has(entry.shiftId)) continue; // security: only update own shifts
    await db.rosterShift.update({
      where: { id: entry.shiftId },
      data: {
        confirmStatus: entry.status,
        confirmNote: entry.status === "REJECTED" ? (entry.note ?? null) : null,
        confirmedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
