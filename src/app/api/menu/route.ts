import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const createSchema = z.object({
  recipeId: z.string().optional(),
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.string(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const items = await db.menuItem.findMany({
    where: { restaurantId },
    include: {
      recipe: {
        select: {
          id: true, name: true, sellingPrice: true,
          allergens: { include: { allergen: { select: { name: true } } } },
          dietaryTags: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const mapped = items.map((item) => ({
    ...item,
    allergenNames: item.recipe?.allergens.map((a) => a.allergen.name) ?? [],
    dietaryTags: item.recipe?.dietaryTags ?? [],
    recipe: item.recipe
      ? { id: item.recipe.id, name: item.recipe.name, sellingPrice: item.recipe.sellingPrice }
      : null,
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { recipeId, name, price, category, imageUrl, sortOrder } = parsed.data;

  const item = await db.menuItem.create({
    data: {
      restaurantId,
      recipeId: recipeId ?? null,
      name,
      price,
      category: category as never,
      imageUrl: imageUrl ?? null,
      sortOrder,
    },
    include: { recipe: { select: { id: true, name: true, sellingPrice: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
