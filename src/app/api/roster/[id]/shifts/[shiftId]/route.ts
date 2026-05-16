import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  position: z.string().nullish(),
  notes: z.string().nullish(),
  session: z.enum(["LUNCH", "DINNER", "ALLDAY"]).nullish(),
  confirmStatus: z.enum(["PENDING", "CONFIRMED", "REJECTED", "EXCUSED", "OVERRIDE"]).optional(),
  confirmNote: z.string().nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; shiftId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { shiftId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const shift = await db.rosterShift.update({
    where: { id: shiftId, restaurantId },
    data: parsed.data,
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(shift);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; shiftId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { shiftId } = await params;
  await db.rosterShift.delete({ where: { id: shiftId, restaurantId } });
  return NextResponse.json({ ok: true });
}
