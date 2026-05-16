import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  unit: z.string(),
  costPerUnit: z.number().min(0),
  currentStock: z.number().min(0).default(0),
  parLevel: z.number().min(0).default(0),
  allergenIds: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const ingredients = await db.ingredient.findMany({
    where: { restaurantId, active: true },
    include: { ingredientAllergens: { include: { allergen: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(ingredients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { allergenIds, ...data } = parsed.data;

  const ingredient = await db.ingredient.create({
    data: {
      ...data,
      restaurantId,
      category: data.category as any,
      unit: data.unit as any,
      ingredientAllergens: {
        create: allergenIds.map((id) => ({ allergenId: id })),
      },
    },
    include: { ingredientAllergens: { include: { allergen: true } } },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
