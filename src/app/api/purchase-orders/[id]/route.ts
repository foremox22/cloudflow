import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const updateSchema = z.object({
  notes: z.string().optional(),
  expectedAt: z.string().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        ingredientId: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const po = await db.purchaseOrder.findFirst({
    where: { id, restaurantId },
    include: {
      supplier: { select: { id: true, name: true, email: true, contactName: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      lineItems: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
      },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { lineItems, expectedAt, ...rest } = parsed.data;

  // Verify the PO belongs to this restaurant
  const existingPo = await db.purchaseOrder.findFirst({ where: { id, restaurantId } });
  if (!existingPo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const po = await db.$transaction(async (prisma) => {
    if (lineItems) {
      await prisma.poLineItem.deleteMany({ where: { poId: id } });
      await prisma.poLineItem.createMany({ data: lineItems.map((l: (typeof lineItems)[number]) => ({ ...l, poId: id })) });
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...rest,
        ...(expectedAt !== undefined ? { expectedAt: expectedAt ? new Date(expectedAt) : null } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lineItems: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
      },
    });
  });

  return NextResponse.json(po);
}
