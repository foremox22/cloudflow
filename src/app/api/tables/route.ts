import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  number: z.number().int().positive(),
  section: z.string().default("Main"),
  capacity: z.number().int().positive().default(4),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const tables = await db.restaurantTable.findMany({
    where: { restaurantId },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "HOLD"] } },
        select: { id: true, status: true, openedAt: true },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ section: "asc" }, { number: "asc" }],
  });

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const table = await db.restaurantTable.create({ data: { ...parsed.data, restaurantId } });
  return NextResponse.json(table, { status: 201 });
}
