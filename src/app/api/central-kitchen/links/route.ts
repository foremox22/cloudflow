import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";

// GET — returns:
//   If current restaurant is a CK: { mode:"ck", linkedRestaurants, availableCKs:[] }
//   Otherwise:                     { mode:"restaurant", linkedCKs, availableCKs }
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, type: true },
  });

  if (restaurant?.type === "CENTRAL_KITCHEN") {
    const links = await db.centralKitchenLink.findMany({
      where: { centralKitchenId: restaurantId },
      include: { linkedRestaurant: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      mode: "ck",
      linkedRestaurants: links.map((l: (typeof links)[number]) => ({ ...l.linkedRestaurant, linkedAt: l.createdAt })),
      availableCKs: [],
    });
  }

  // Regular restaurant — find CKs this user has access to
  const userMemberships = await db.userRestaurant.findMany({
    where: { userId: session.user.id },
    include: { restaurant: { select: { id: true, name: true, type: true } } },
  });
  const availableCKs = userMemberships
    .filter((m: (typeof userMemberships)[number]) => m.restaurant.type === "CENTRAL_KITCHEN" && m.restaurantId !== restaurantId)
    .map((m: (typeof userMemberships)[number]) => m.restaurant);

  const linkedCKLinks = await db.centralKitchenLink.findMany({
    where: { linkedRestaurantId: restaurantId },
    include: { centralKitchen: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const linkedCKs = linkedCKLinks.map((l: (typeof linkedCKLinks)[number]) => ({ ...l.centralKitchen, linkedAt: l.createdAt }));

  return NextResponse.json({ mode: "restaurant", linkedCKs, availableCKs });
}

// POST — link: { ckId } (for restaurant linking to a CK)
//           or { linkedRestaurantId } (for CK adding a restaurant)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });

  let centralKitchenId: string;
  let linkedRestaurantId: string;

  if (restaurant?.type === "CENTRAL_KITCHEN") {
    if (!body.linkedRestaurantId) return NextResponse.json({ error: "linkedRestaurantId required" }, { status: 400 });
    centralKitchenId = restaurantId;
    linkedRestaurantId = body.linkedRestaurantId;
  } else {
    if (!body.ckId) return NextResponse.json({ error: "ckId required" }, { status: 400 });
    centralKitchenId = body.ckId;
    linkedRestaurantId = restaurantId;
  }

  // Prevent self-linking
  if (centralKitchenId === linkedRestaurantId) {
    return NextResponse.json({ error: "Cannot link a restaurant to itself" }, { status: 400 });
  }

  // Validate the CK is actually a CK
  const ck = await db.restaurant.findUnique({ where: { id: centralKitchenId } });
  if (!ck || ck.type !== "CENTRAL_KITCHEN") {
    return NextResponse.json({ error: "Target restaurant is not a Central Kitchen" }, { status: 400 });
  }

  // Validate the linked restaurant exists
  const linkedRestaurant = await db.restaurant.findUnique({ where: { id: linkedRestaurantId } });
  if (!linkedRestaurant) {
    return NextResponse.json({ error: "Target restaurant not found" }, { status: 404 });
  }

  const existing = await db.centralKitchenLink.findUnique({
    where: { centralKitchenId_linkedRestaurantId: { centralKitchenId, linkedRestaurantId } },
  });
  if (existing) return NextResponse.json({ error: "Already linked" }, { status: 409 });

  const link = await db.centralKitchenLink.create({ data: { centralKitchenId, linkedRestaurantId } });
  return NextResponse.json(link, { status: 201 });
}
