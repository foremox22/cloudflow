import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["COOKING", "READY", "SERVED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify the order item belongs to this restaurant before updating
  const existing = await db.orderItem.findFirst({
    where: { id, order: { restaurantId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await db.orderItem.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { menuItem: { select: { name: true } } },
  });

  return NextResponse.json(item);
}
