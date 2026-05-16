import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ version: z.number().int().positive() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: session.user.id, restaurantId } },
  });
  if (!membership || membership.role === "SOUS_CHEF") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const versionRecord = await db.recipeVersion.findUnique({
    where: { recipeId_version: { recipeId: id, version: parsed.data.version } },
  });
  if (!versionRecord) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const snap = versionRecord.snapshotJson as any;

  const recipe = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.recipeAllergen.deleteMany({ where: { recipeId: id } });

    const updated = await tx.recipe.update({
      where: { id, restaurantId },
      data: {
        name:         snap.name,
        category:     snap.category,
        description:  snap.description  ?? null,
        method:       snap.method       ?? null,
        prepTime:     snap.prepTime,
        cookTime:     snap.cookTime,
        servings:     snap.servings,
        sellingPrice: snap.sellingPrice,
        imageUrl:     snap.imageUrl     ?? null,
        dietaryTags:  snap.dietaryTags  ?? [],
        ingredients: {
          create: (snap.ingredients ?? []).map((i: any) => ({
            ingredientId: i.ingredientId,
            quantity:     i.quantity,
            unit:         i.unit,
          })),
        },
        allergens: {
          create: (snap.allergens ?? []).map((a: any) => ({
            allergenId: a.allergenId,
          })),
        },
      },
      include: {
        createdBy:   { select: { id: true, name: true } },
        ingredients: { include: { ingredient: true } },
        allergens:   { include: { allergen: true } },
        _count:      { select: { versions: true } },
      },
    });

    const lastVersion = await tx.recipeVersion.findFirst({
      where:   { recipeId: id },
      orderBy: { version: "desc" },
    });

    await tx.recipeVersion.create({
      data: {
        recipeId:    id,
        version:     (lastVersion?.version ?? 0) + 1,
        snapshotJson: updated as any,
        changedById: session.user.id,
      },
    });

    return updated;
  });

  return NextResponse.json(recipe);
}
