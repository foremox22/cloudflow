import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  ingredientId: z.string(),
  type: z.enum(["ROUTINE", "URGENT"]).default("ROUTINE"),
  targetQty: z.number().positive(),
  notes: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const status = searchParams.get("status");

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd   = new Date(`${date}T23:59:59.999Z`);

  const tasks = await db.prepTask.findMany({
    where: {
      restaurantId,
      ...(status ? { status: status as never } : {}),
      OR: [
        { scheduledFor: { gte: dayStart, lte: dayEnd } },
        { scheduledFor: null, createdAt: { gte: dayStart, lte: dayEnd } },
        { status: { in: ["PENDING", "IN_PROGRESS"] } },
      ],
    },
    include: {
      ingredient: {
        include: {
          prepRecipe: {
            include: {
              ingredients: { include: { ingredient: true } },
            },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ type: "desc" }, { scheduledFor: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const userId = session.user.id;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = await db.prepTask.create({
    data: {
      ...parsed.data,
      restaurantId,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
      createdById: userId,
    },
    include: {
      ingredient: { include: { prepRecipe: { include: { ingredients: { include: { ingredient: true } } } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(task);
}
