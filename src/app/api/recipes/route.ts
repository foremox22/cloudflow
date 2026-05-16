import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { NextResponse } from "next/server";
import { convertToIngredientUnit } from "@/lib/utils";
import { z } from "zod";

const ingredientLineSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
});

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  description: z.string().optional(),
  method: z.string().optional(),
  prepTime: z.number().int().min(0).default(0),
  cookTime: z.number().int().min(0).default(0),
  servings: z.number().int().min(1).default(1),
  sellingPrice: z.number().min(0).default(0),
  ingredients: z.array(ingredientLineSchema).default([]),
  allergenIds: z.array(z.string()).default([]),
  imageUrl: z.string().nullable().optional(),
  dietaryTags: z.array(z.string()).default([]),
});

const RECIPE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  ingredients: {
    include: {
      ingredient: { select: { id: true, name: true, costPerUnit: true, unit: true, yieldRate: true, prepRecipeId: true } },
    },
  },
  prepForItems: { select: { id: true, name: true } },
  allergens: { include: { allergen: true } },
  _count: { select: { versions: true } },
} as const;

function calcCost(r: any) {
  return r.servings > 0
    ? r.ingredients.reduce((sum: number, ri: any) => {
        const baseQty = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
        return sum + ri.ingredient.costPerUnit * baseQty / (ri.ingredient.yieldRate ?? 1.0);
      }, 0) / r.servings
    : 0;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const [ownRecipes, assignments] = await Promise.all([
    db.recipe.findMany({
      where: { restaurantId, active: true, ...(category ? { category: category as any } : {}) },
      include: RECIPE_INCLUDE,
      orderBy: { updatedAt: "desc" },
    }),
    db.recipeAssignment.findMany({
      where: { restaurantId },
      include: { recipe: { include: RECIPE_INCLUDE } },
    }),
  ]);

  const masterRecipes = assignments
    .map((a) => a.recipe)
    .filter((r) => r.active && (!category || r.category === (category as any)))
    .map((r) => ({ ...r, isMaster: true }));

  const all = [
    ...ownRecipes.map((r) => ({ ...r, costPerServing: calcCost(r) })),
    ...masterRecipes.map((r) => ({ ...r, costPerServing: calcCost(r) })),
  ];

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER", "HEAD_CHEF"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions to create recipes" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ingredients, allergenIds, ...data } = parsed.data;

  const recipe = await db.recipe.create({
    data: {
      ...data,
      restaurantId,
      category: data.category as any,
      createdById: session.user.id,
      ingredients: {
        create: ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit as any,
        })),
      },
      allergens: {
        create: allergenIds.map((id) => ({ allergenId: id })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      ingredients: { include: { ingredient: true } },
      allergens: { include: { allergen: true } },
    },
  });

  await db.recipeVersion.create({
    data: {
      recipeId: recipe.id,
      version: 1,
      snapshotJson: recipe as any,
      changedById: session.user.id,
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
