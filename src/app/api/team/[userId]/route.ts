import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { userId } = await params;

  const myMembership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!myMembership || !["ADMIN", "MANAGER"].includes(myMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, role, active } = parsed.data;

  if (role !== undefined) {
    await db.userRestaurant.update({
      where: { userId_restaurantId: { userId, restaurantId } },
      data: { role },
    });
  }
  if (name !== undefined || active !== undefined) {
    await db.user.update({
      where: { id: userId },
      data: { ...(name !== undefined && { name }), ...(active !== undefined && { active }) },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { userId } = await params;

  const myMembership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!myMembership || myMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await db.userRestaurant.delete({
    where: { userId_restaurantId: { userId, restaurantId } },
  });

  return NextResponse.json({ ok: true });
}
