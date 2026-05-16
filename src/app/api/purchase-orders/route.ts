import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const lineItemSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const createSchema = z.object({
  supplierId: z.string(),
  notes: z.string().optional(),
  expectedAt: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const pos = await db.purchaseOrder.findMany({
    where: { restaurantId, ...(status ? { status: status as never } : {}) },
    include: {
      supplier: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      lineItems: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pos);
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

  const { supplierId, notes, expectedAt, lineItems } = parsed.data;

  const po = await db.purchaseOrder.create({
    data: {
      restaurantId,
      supplierId,
      notes: notes ?? null,
      expectedAt: expectedAt ? new Date(expectedAt) : null,
      createdById: userId,
      lineItems: { create: lineItems },
    },
    include: {
      supplier: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      lineItems: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
      },
    },
  });

  return NextResponse.json(po, { status: 201 });
}
