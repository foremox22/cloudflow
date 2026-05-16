import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { sendRosterInviteEmail } from "@/lib/mailer";
import { randomUUID } from "crypto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const roster = await db.rosterWeek.findUnique({
    where: { id, restaurantId },
    include: {
      shifts: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      invites: true,
    },
  });

  if (!roster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (roster.status === "ARCHIVED") return NextResponse.json({ error: "Cannot publish archived roster" }, { status: 400 });

  // Get distinct users with shifts
  const userMap = new Map<string, { id: string; name: string; email: string }>();
  for (const shift of roster.shifts) {
    userMap.set(shift.user.id, shift.user);
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const weekLabel = new Date(roster.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // Upsert invites first (sequential, needed before parallel email/notify)
  type RosterInvite = (typeof roster.invites)[number];
  const inviteMap = new Map<string, RosterInvite>(
    roster.invites.map((i: RosterInvite) => [i.userId, i] as [string, RosterInvite])
  );
  for (const [userId] of userMap) {
    if (!inviteMap.has(userId)) {
      const invite = await db.rosterInvite.create({
        data: { rosterId: id, userId, token: randomUUID() },
      });
      inviteMap.set(userId, invite as RosterInvite);
    }
  }

  // Parallelize emails and notifications
  await Promise.all(
    Array.from(userMap.entries()).map(async ([userId, user]) => {
      const invite = inviteMap.get(userId)!;
      const confirmUrl = `${appUrl}/roster/confirm/${invite.token}`;
      type RosterShift = (typeof roster.shifts)[number];
      const userShifts = roster.shifts.filter((s: RosterShift) => s.userId === userId);
      const userShiftCount = userShifts.length;

      await Promise.all([
        sendRosterInviteEmail({
          staffName: user.name,
          staffEmail: user.email,
          weekStart: roster.weekStart,
          confirmUrl,
          shifts: userShifts.map((s: (typeof userShifts)[number]) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            position: s.position ?? undefined,
          })),
        }).catch(() => null),
        db.notification.create({
          data: {
            restaurantId,
            userId,
            type: "ROSTER",
            title: `Roster published — w/c ${weekLabel}`,
            body: `You have ${userShiftCount} shift${userShiftCount !== 1 ? "s" : ""} this week. Please confirm your schedule.`,
            link: "/roster",
          },
        }),
      ]);
    })
  );

  await db.rosterWeek.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  return NextResponse.json({ ok: true, staffNotified: userMap.size });
}
