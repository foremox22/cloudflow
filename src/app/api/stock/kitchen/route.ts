import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const ingredientSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "MEAT", "SEAFOOD", "VEGETABLE", "FRUIT", "DAIRY",
    "GRAIN", "SPICE", "CONDIMENT", "OIL", "ALCOHOL", "SOFT_DRINK", "OTHER",
  ]),
  unit: z.enum(["KG", "G", "LB", "OZ", "L", "ML", "CUP", "TBSP", "TSP", "PIECE", "BUNCH", "SLICE", "PORTION"]),
  costPerUnit: z.number().min(0),
  currentStock: z.number().min(0),
  parLevel: z.number().min(0),
  reorderPoint: z.number().min(0),
  reorderQty: z.number().min(0),
  kcalPer100g: z.number().nullable().optional(),
  kjPer100g: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  priceEstimated: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const ingredients = await db.ingredient.findMany({
    where: { restaurantId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(ingredients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = ingredientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.ingredient.findFirst({
    where: { restaurantId, name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) return NextResponse.json({ error: "Ingredient name already exists" }, { status: 409 });

  const ingredient = await db.ingredient.create({
    data: {
      ...parsed.data,
      restaurantId,
      kcalPer100g: parsed.data.kcalPer100g ?? null,
      kjPer100g: parsed.data.kjPer100g ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      priceEstimated: parsed.data.priceEstimated ?? false,
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
