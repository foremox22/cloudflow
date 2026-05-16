import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  category: z.enum(["FOOD_BEV", "UTILITIES", "MAINTENANCE", "MARKETING", "RENT", "EQUIPMENT", "OTHER"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const expenses = await db.expense.findMany({
    where: {
      restaurantId,
      ...(from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}),
    },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const expense = await db.expense.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      restaurantId,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(expense, { status: 201 });
}
