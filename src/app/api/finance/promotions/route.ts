import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.string(),
  endsAt: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const promotions = await db.promotion.findMany({
    where: { restaurantId, ...(activeOnly ? { active: true } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const code = parsed.data.code?.trim().toUpperCase() || null;

  const promotion = await db.promotion.create({
    data: {
      ...parsed.data,
      code,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      restaurantId,
    },
  });

  return NextResponse.json(promotion, { status: 201 });
}
