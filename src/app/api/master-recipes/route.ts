import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { NextResponse } from "next/server";
import { z } from "zod";
import { convertToIngredientUnit } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  description: z.string().optional(),
  method: z.string().optional(),
  prepTime: z.number().int().min(0).default(0),
  cookTime: z.number().int().min(0).default(0),
  servings: z.number().int().min(1).default(1),
  sellingPrice: z.number().min(0).default(0),
  ingredients: z.array(z.object({
    ingredientId: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
  })).default([]),
  allergenIds: z.array(z.string()).default([]),
  imageUrl: z.string().nullable().optional(),
  dietaryTags: z.array(z.string()).default([]),
});

async function getAdminRestaurantIds(userId: string): Promise<string[]> {
  const memberships = await db.userRestaurant.findMany({
    where: { userId, role: "ADMIN" },
    select: { restaurantId: true },
  });
  return memberships.map((m: (typeof memberships)[number]) => m.restaurantId);
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminIds = await getAdminRestaurantIds(session.user.id);
  if (adminIds.length === 0) return NextResponse.json([]);

  const recipes = await db.recipe.findMany({
    where: { restaurantId: { in: adminIds }, isMaster: true, active: true },
    include: {
      createdBy: { select: { id: true, name: true } },
      ingredients: {
        include: {
          ingredient: {
            select: { id: true, name: true, costPerUnit: true, unit: true, yieldRate: true },
          },
        },
      },
      allergens: { include: { allergen: true } },
      assignments: { include: { restaurant: { select: { id: true, name: true } } } },
      restaurant: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withCost = recipes.map((r: (typeof recipes)[number]) => ({
    ...r,
    costPerServing:
      r.servings > 0
        ? r.ingredients.reduce((sum: number, ri: (typeof r.ingredients)[number]) => {
            const baseQty = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
            return sum + ri.ingredient.costPerUnit * baseQty / (ri.ingredient.yieldRate ?? 1);
          }, 0) / r.servings
        : 0,
  }));

  return NextResponse.json(withCost);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (membership?.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ingredients, allergenIds, ...data } = parsed.data;

  const recipe = await db.recipe.create({
    data: {
      ...data,
      restaurantId,
      isMaster: true,
      category: data.category as any,
      createdById: session.user.id,
      ingredients: { create: ingredients.map((i: (typeof ingredients)[number]) => ({ ingredientId: i.ingredientId, quantity: i.quantity, unit: i.unit as any })) },
      allergens: { create: allergenIds.map((id: string) => ({ allergenId: id })) },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      ingredients: { include: { ingredient: true } },
      allergens: { include: { allergen: true } },
      assignments: { include: { restaurant: { select: { id: true, name: true } } } },
    },
  });

  await db.recipeVersion.create({
    data: { recipeId: recipe.id, version: 1, snapshotJson: recipe as any, changedById: session.user.id },
  });

  return NextResponse.json(recipe, { status: 201 });
}
