import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CAFE", "DINE_IN", "TAKEAWAY"]).default("DINE_IN"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("UTC"),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeId = await getRestaurantId(session.user.id);

  const memberships = await db.userRestaurant.findMany({
    where: { userId: session.user.id },
    include: { restaurant: true },
    orderBy: { restaurant: { createdAt: "asc" } },
  });

  return NextResponse.json(
    memberships.map((m: (typeof memberships)[number]) => ({ ...m.restaurant, role: m.role, active: m.restaurantId === activeId }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // If the user already belongs to a restaurant, they must be ADMIN there to create another
  const currentId = await getRestaurantId(session.user.id);
  if (currentId) {
    const membership = await db.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: session.user.id, restaurantId: currentId } },
    });
    if (membership?.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can create restaurants" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const restaurant = await db.restaurant.create({
    data: {
      ...parsed.data,
      members: { create: { userId: session.user.id, role: "ADMIN" } },
    },
  });

  return NextResponse.json(restaurant, { status: 201 });
}
