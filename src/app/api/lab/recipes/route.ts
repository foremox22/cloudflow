import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import type { AIRecipeData } from "@/types";
import { RecipeCategory, Unit } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const recipes = await db.labRecipe.findMany({
    where: { session: { restaurantId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reviewedBy: { select: { id: true, name: true } },
      session: { select: { id: true, title: true, userId: true } },
    },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sessionId, name, recipeJson } = body as {
    sessionId: string;
    name: string;
    recipeJson: AIRecipeData;
  };

  if (!sessionId || !name || !recipeJson) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const labSession = await db.labSession.findFirst({ where: { id: sessionId, userId } });
  if (!labSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const existing = await db.labRecipe.findFirst({ where: { sessionId, name } });
  if (existing) {
    return NextResponse.json({ error: "Recipe already saved for this session" }, { status: 409 });
  }

  const labRecipe = await db.labRecipe.create({
    data: { sessionId, name, recipeJson: recipeJson as object },
  });

  return NextResponse.json(labRecipe, { status: 201 });
}

function mapCategory(cat: string): RecipeCategory {
  const map: Record<string, RecipeCategory> = {
    STARTER: "STARTER",
    MAIN: "MAIN",
    DESSERT: "DESSERT",
    BEVERAGE: "BEVERAGE",
    SIDE: "SIDE",
    SAUCE: "SAUCE",
    BREAD: "BREAD",
  };
  return map[cat?.toUpperCase()] ?? "OTHER";
}

function mapUnit(u: string): Unit {
  const map: Record<string, Unit> = {
    KG: "KG", G: "G", LB: "LB", OZ: "OZ", L: "L", ML: "ML",
    CUP: "CUP", TBSP: "TBSP", TSP: "TSP", PIECE: "PIECE",
    BUNCH: "BUNCH", SLICE: "SLICE", PORTION: "PORTION",
  };
  return map[u?.toUpperCase()] ?? "PIECE";
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { labRecipeId, action } = body as { labRecipeId: string; action: "approve" | "reject" };

  const labRecipe = await db.labRecipe.findUnique({ where: { id: labRecipeId } });
  if (!labRecipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (labRecipe.status !== "PENDING") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  if (action === "reject") {
    const updated = await db.labRecipe.update({
      where: { id: labRecipeId },
      data: { status: "REJECTED", reviewedById: userId, reviewedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  // approve — create actual Recipe row
  const data = labRecipe.recipeJson as unknown as AIRecipeData;

  const labSessForIngredients = await db.labSession.findUnique({ where: { id: labRecipe.sessionId }, select: { restaurantId: true } });
  const allIngredients = await db.ingredient.findMany({ where: { active: true, restaurantId: labSessForIngredients?.restaurantId } });
  const allergenNames = (data.allergens ?? []).map((a) => a.toLowerCase());
  const allAllergens = await db.allergen.findMany({
    where: { name: { in: allergenNames, mode: "insensitive" } },
  });

  const recipeRestaurantId = labSessForIngredients?.restaurantId ?? "";

  const recipe = await db.$transaction(async (tx) => {

    const newRecipe = await tx.recipe.create({
      data: {
        restaurantId: recipeRestaurantId,
        name: data.name,
        category: mapCategory(data.category),
        description: data.description,
        method: data.method,
        prepTime: data.prepTime ?? 0,
        cookTime: data.cookTime ?? 0,
        servings: data.servings ?? 1,
        sellingPrice: data.suggestedPrice ?? 0,
        active: false,
        createdById: userId,
      },
    });

    for (const ing of data.ingredients ?? []) {
      const found = allIngredients.find(
        (i) => i.name.toLowerCase() === ing.name.toLowerCase()
      );
      if (found) {
        await tx.recipeIngredient.create({
          data: {
            recipeId: newRecipe.id,
            ingredientId: found.id,
            quantity: ing.quantity,
            unit: mapUnit(ing.unit),
          },
        });
      }
    }

    for (const allergen of allAllergens) {
      await tx.recipeAllergen.create({
        data: { recipeId: newRecipe.id, allergenId: allergen.id },
      });
    }

    await tx.labRecipe.update({
      where: { id: labRecipeId },
      data: {
        status: "APPROVED",
        reviewedById: userId,
        reviewedAt: new Date(),
        savedRecipeId: newRecipe.id,
      },
    });

    return newRecipe;
  });

  return NextResponse.json({ recipe });
}
