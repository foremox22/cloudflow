import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const upsertSchema = z.object({
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  targetDate: z.string(),
  amount: z.number().min(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const [targets, orders] = await Promise.all([
    db.revenueTarget.findMany({
      where: { restaurantId, targetDate: { gte: startDate, lte: endDate } },
      orderBy: { targetDate: "asc" },
    }),
    db.order.aggregate({
      where: { restaurantId, status: "PAID", closedAt: { gte: startDate, lte: endDate } },
      _sum: { total: true },
    }),
  ]);

  const actualRevenue = orders._sum.total ?? 0;
  return NextResponse.json({ targets, actualRevenue, year, month });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await db.revenueTarget.upsert({
    where: {
      restaurantId_period_targetDate: {
        restaurantId,
        period: parsed.data.period,
        targetDate: new Date(parsed.data.targetDate),
      },
    },
    update: { amount: parsed.data.amount, notes: parsed.data.notes },
    create: {
      restaurantId,
      period: parsed.data.period,
      targetDate: new Date(parsed.data.targetDate),
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json(target);
}
