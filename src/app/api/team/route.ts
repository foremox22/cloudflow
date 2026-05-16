import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";
import bcrypt from "bcryptjs";

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"]),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const members = await db.userRestaurant.findMany({
    where: { restaurantId },
    include: { user: { select: { id: true, name: true, email: true, active: true, createdAt: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(
    members.map((m: (typeof members)[number]) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      active: m.user.active,
      joinedAt: m.user.createdAt,
      isSelf: m.user.id === session.user.id,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  // Only ADMIN/MANAGER can invite
  const myMembership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!myMembership || !["ADMIN", "MANAGER"].includes(myMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, email, password, role } = parsed.data;

  // Check if user with this email already exists
  let user = await db.user.findUnique({ where: { email } });

  if (user) {
    // User exists — check if already a member
    const existing = await db.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
    });
    if (existing) return NextResponse.json({ error: "User is already a member of this restaurant" }, { status: 409 });

    // Add to restaurant
    await db.userRestaurant.create({ data: { userId: user.id, restaurantId, role } });
  } else {
    // Create new user and enroll
    const hashed = await bcrypt.hash(password, 10);
    user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        restaurants: { create: { restaurantId, role } },
      },
    });
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role }, { status: 201 });
}
