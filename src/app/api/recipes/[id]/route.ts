import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  method: z.string().optional(),
  prepTime: z.number().int().min(0).optional(),
  cookTime: z.number().int().min(0).optional(),
  servings: z.number().int().min(1).optional(),
  sellingPrice: z.number().min(0).optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string(),
        quantity: z.number().positive(),
        unit: z.string(),
      })
    )
    .optional(),
  allergenIds: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  dietaryTags: z.array(z.string()).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const recipe = await db.recipe.findFirst({
    where: { id, restaurantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      ingredients: { include: { ingredient: true } },
      allergens: { include: { allergen: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 20,
        include: { changedBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Find the recipe first to get its actual restaurantId
  const existing = await db.recipe.findUnique({ where: { id }, select: { restaurantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the user has edit access to the restaurant that owns this recipe
  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId: existing.restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER", "HEAD_CHEF"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions to edit recipes" }, { status: 403 });
  }

  const restaurantId = existing.restaurantId;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ingredients, allergenIds, ...data } = parsed.data;
  const userId = session.user.id;

  const recipe = await db.$transaction(async (tx) => {
    if (ingredients !== undefined) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    if (allergenIds !== undefined) {
      await tx.recipeAllergen.deleteMany({ where: { recipeId: id } });
    }

    const updated = await tx.recipe.update({
      where: { id },
      data: {
        ...data,
        ...(data.category ? { category: data.category as any } : {}),
        ...(ingredients
          ? {
              ingredients: {
                create: ingredients.map((i: (typeof ingredients)[number]) => ({
                  ingredientId: i.ingredientId,
                  quantity: i.quantity,
                  unit: i.unit as any,
                })),
              },
            }
          : {}),
        ...(allergenIds
          ? {
              allergens: {
                create: allergenIds.map((aid) => ({ allergenId: aid })),
              },
            }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        ingredients: { include: { ingredient: true } },
        allergens: { include: { allergen: true } },
        prepForItems: { select: { id: true, name: true } },
      },
    });

    const lastVersion = await tx.recipeVersion.findFirst({
      where: { recipeId: id },
      orderBy: { version: "desc" },
    });

    await tx.recipeVersion.create({
      data: {
        recipeId: id,
        version: (lastVersion?.version ?? 0) + 1,
        snapshotJson: updated as any,
        changedById: userId,
      },
    });

    return updated;
  });

  return NextResponse.json(recipe);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.recipe.findUnique({ where: { id }, select: { restaurantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId: existing.restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER", "HEAD_CHEF"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions to delete recipes" }, { status: 403 });
  }

  await db.recipe.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
