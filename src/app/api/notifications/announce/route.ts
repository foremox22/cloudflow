import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { notify } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["PUBLIC_HOLIDAY", "SPECIAL_MENU"]),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
    select: { role: true },
  });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, title, body: msgBody } = parsed.data;
  await notify(restaurantId, type, title, msgBody);

  return NextResponse.json({ ok: true });
}
