import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const myRestaurantId = await getRestaurantId(session.user.id);
  if (!myRestaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { restaurantId: otherId } = await params;

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId: myRestaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const myRestaurant = await db.restaurant.findUnique({ where: { id: myRestaurantId } });
  const [centralKitchenId, linkedRestaurantId] =
    myRestaurant?.type === "CENTRAL_KITCHEN"
      ? [myRestaurantId, otherId]
      : [otherId, myRestaurantId];

  await db.centralKitchenLink.delete({
    where: { centralKitchenId_linkedRestaurantId: { centralKitchenId, linkedRestaurantId } },
  });

  return NextResponse.json({ ok: true });
}
