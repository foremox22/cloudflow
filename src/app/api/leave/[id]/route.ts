import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findFirst({
    where: { userId: session.user.id, restaurantId, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const updated = await db.leaveRequest.update({
    where: { id, restaurantId },
    data: {
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote ?? null,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.leaveRequest.findUnique({ where: { id, restaurantId } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (request.status !== "PENDING") return NextResponse.json({ error: "Cannot cancel reviewed request" }, { status: 400 });

  await db.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
