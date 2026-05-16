import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum([
    "MEAT", "SEAFOOD", "VEGETABLE", "FRUIT", "DAIRY",
    "GRAIN", "SPICE", "CONDIMENT", "OIL", "ALCOHOL", "SOFT_DRINK", "OTHER",
  ]).optional(),
  unit: z.enum(["KG", "G", "LB", "OZ", "L", "ML", "CUP", "TBSP", "TSP", "PIECE", "BUNCH", "SLICE", "PORTION"]).optional(),
  costPerUnit: z.number().min(0).optional(),
  parLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQty: z.number().min(0).optional(),
  kcalPer100g: z.number().nullable().optional(),
  kjPer100g: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  priceEstimated: z.boolean().optional(),
  prepRecipeId: z.string().nullable().optional(),
  batchYield: z.number().positive().nullable().optional(),
  yieldRate: z.number().min(0.01).max(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.ingredient.findFirst({ where: { id, restaurantId } });
  if (!existing || !existing.active) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameConflict = await db.ingredient.findFirst({
      where: { restaurantId, name: { equals: parsed.data.name, mode: "insensitive" }, id: { not: id } },
    });
    if (nameConflict) return NextResponse.json({ error: "Name already in use" }, { status: 409 });
  }

  const updated = await db.ingredient.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const userRole = (session as { user?: { role?: string } }).user?.role;
  if (!["ADMIN", "MANAGER"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.ingredient.findFirst({ where: { id, restaurantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.ingredient.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
