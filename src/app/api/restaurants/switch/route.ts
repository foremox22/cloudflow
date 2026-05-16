import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const schema = z.object({ restaurantId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must be ADMIN in the current restaurant to switch
  const currentId = await getRestaurantId(session.user.id);
  if (currentId) {
    const currentMembership = await db.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: session.user.id, restaurantId: currentId } },
    });
    if (currentMembership?.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can switch restaurants" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify membership in the target restaurant
  const membership = await db.userRestaurant.findUnique({
    where: {
      userId_restaurantId: {
        userId: session.user.id,
        restaurantId: parsed.data.restaurantId,
      },
    },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rms-rid", parsed.data.restaurantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
