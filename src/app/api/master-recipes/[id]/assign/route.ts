import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

async function getAdminRestaurantIds(userId: string): Promise<string[]> {
  const memberships = await db.userRestaurant.findMany({
    where: { userId, role: "ADMIN" },
    select: { restaurantId: true },
  });
  return memberships.map((m: (typeof memberships)[number]) => m.restaurantId);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminIds = await getAdminRestaurantIds(session.user.id);

  const recipe = await db.recipe.findFirst({
    where: { id, restaurantId: { in: adminIds }, isMaster: true },
    include: { assignments: { include: { restaurant: { select: { id: true, name: true } } } } },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(recipe.assignments);
}

// PUT: replace full assignment list
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminIds = await getAdminRestaurantIds(session.user.id);

  const recipe = await db.recipe.findFirst({
    where: { id, restaurantId: { in: adminIds }, isMaster: true },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { restaurantIds }: { restaurantIds: string[] } = await req.json();

  // Only assign to restaurants the admin actually manages (security check)
  const validIds = restaurantIds.filter((rid) => adminIds.includes(rid) && rid !== recipe.restaurantId);

  await db.recipeAssignment.deleteMany({ where: { recipeId: id } });

  if (validIds.length > 0) {
    await db.recipeAssignment.createMany({
      data: validIds.map((rid) => ({ recipeId: id, restaurantId: rid })),
      skipDuplicates: true,
    });
  }

  const updated = await db.recipeAssignment.findMany({
    where: { recipeId: id },
    include: { restaurant: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}
