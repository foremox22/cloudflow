import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  tableId: z.string().optional().nullable(),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  partySize: z.number().int().min(1).default(2),
  reservedFor: z.string(),
  notes: z.string().optional(),
  specialTags: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  allergenTags: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  let startDate: Date;
  let endDate: Date;

  if (dateStr) {
    startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
  }

  const statusFilter = searchParams.get("status");

  const reservations = await db.reservation.findMany({
    where: {
      restaurantId,
      reservedFor: { gte: startDate, lte: endDate },
      ...(statusFilter ? { status: statusFilter as never } : {}),
    },
    include: {
      table: { select: { id: true, number: true, section: true } },
      createdBy: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, dietaryTags: true, allergenTags: true } },
    },
    orderBy: { reservedFor: "asc" },
  });

  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const reservation = await db.reservation.create({
    data: {
      ...parsed.data,
      restaurantId,
      reservedFor: new Date(parsed.data.reservedFor),
      createdById: session.user.id,
    },
    include: {
      table: { select: { id: true, number: true, section: true } },
      createdBy: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, dietaryTags: true, allergenTags: true } },
    },
  });

  return NextResponse.json(reservation, { status: 201 });
}
