import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const entrySchema = z.object({
  userId:      z.string(),
  userName:    z.string(),
  hoursWorked: z.number().min(0),
  hourlyRate:  z.number().min(0),
  bonus:       z.number().min(0).default(0),
  deductions:  z.number().min(0).default(0),
  notes:       z.string().optional(),
});

const createSchema = z.object({
  periodStart: z.string(),
  periodEnd:   z.string(),
  notes:       z.string().optional(),
  entries:     z.array(entrySchema),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const runs = await db.payrollRun.findMany({
    where: { restaurantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      entries:   true,
    },
    orderBy: { periodStart: "desc" },
  });

  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const entries = parsed.data.entries.map((e) => {
    const baseAmount = Math.round(e.hoursWorked * e.hourlyRate * 100) / 100;
    const netAmount  = Math.round((baseAmount + e.bonus - e.deductions) * 100) / 100;
    return { ...e, baseAmount, netAmount };
  });

  const totalAmount = entries.reduce((s, e) => s + e.netAmount, 0);

  const run = await db.payrollRun.create({
    data: {
      restaurantId,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd:   new Date(parsed.data.periodEnd),
      notes:       parsed.data.notes,
      totalAmount,
      createdById: session.user.id,
      entries: { create: entries },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      entries:   true,
    },
  });

  return NextResponse.json(run, { status: 201 });
}
