import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { code, subtotal } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const now = new Date();
  const promo = await db.promotion.findFirst({
    where: {
      restaurantId,
      code: code.trim().toUpperCase(),
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
  });

  if (!promo) return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
    return NextResponse.json({ error: "Promo code has reached its usage limit" }, { status: 400 });
  if (subtotal < promo.minOrderValue)
    return NextResponse.json({ error: `Minimum order $${promo.minOrderValue.toFixed(2)} required` }, { status: 400 });

  const discount =
    promo.type === "PERCENTAGE"
      ? Math.round(subtotal * (promo.value / 100) * 100) / 100
      : Math.min(promo.value, subtotal);

  return NextResponse.json({
    discount,
    promoName: promo.name,
    promoType: promo.type,
  });
}
