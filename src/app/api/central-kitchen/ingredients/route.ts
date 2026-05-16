import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ckId = req.nextUrl.searchParams.get("ckId");
  if (!ckId) return NextResponse.json({ error: "ckId required" }, { status: 400 });

  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  // Verify the CK exists and is actually a CENTRAL_KITCHEN
  const ck = await db.restaurant.findUnique({
    where: { id: ckId },
    select: { id: true, type: true },
  });
  if (!ck || ck.type !== "CENTRAL_KITCHEN") {
    return NextResponse.json({ error: "Not a Central Kitchen" }, { status: 404 });
  }

  // Requester must be either a member of the CK itself or a linked restaurant
  const isCKMember = await db.userRestaurant.findFirst({
    where: { restaurantId: ckId, userId: session.user.id },
  });
  const isLinked = await db.centralKitchenLink.findFirst({
    where: { centralKitchenId: ckId, linkedRestaurantId: restaurantId },
  });

  if (!isCKMember && !isLinked) {
    return NextResponse.json({ error: "Not authorized to view this CK's ingredients" }, { status: 403 });
  }

  const ingredients = await db.ingredient.findMany({
    where: { restaurantId: ckId },
    select: { id: true, name: true, unit: true, currentStock: true, category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(ingredients);
}
