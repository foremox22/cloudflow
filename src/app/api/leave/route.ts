import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["SICK", "ANNUAL", "HOLIDAY", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const userId = session.user.id;
  const membership = await db.userRestaurant.findFirst({
    where: { userId, restaurantId },
  });
  const isManager = membership && ["ADMIN", "MANAGER"].includes(membership.role);

  const requests = await db.leaveRequest.findMany({
    where: {
      restaurantId,
      ...(isManager ? {} : { userId }),
    },
    include: {
      user: { select: { id: true, name: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(0, 0, 0, 0);

  if (endDate < startDate) return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });

  const request = await db.leaveRequest.create({
    data: {
      restaurantId,
      userId: session.user.id,
      type: parsed.data.type,
      startDate,
      endDate,
      reason: parsed.data.reason ?? null,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(request, { status: 201 });
}
