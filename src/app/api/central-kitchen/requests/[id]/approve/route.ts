import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({
  approvedQtys: z.record(z.string(), z.number()), // itemId → approvedQty
  cancel: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const request = await db.distributionRequest.findFirst({
    where: { id, centralKitchenId: restaurantId },
    include: { items: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["SUBMITTED", "DRAFT"].includes(request.status)) {
    return NextResponse.json({ error: "Can only approve SUBMITTED requests" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { approvedQtys, cancel } = parsed.data;

  if (cancel) {
    const updated = await db.distributionRequest.update({
      where: { id },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  await db.$transaction([
    ...Object.entries(approvedQtys).map(([itemId, qty]) =>
      db.distributionItem.update({ where: { id: itemId }, data: { approvedQty: qty } })
    ),
    db.distributionRequest.update({
      where: { id },
      data: { status: "APPROVED", updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
