import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const addSchema = z.object({
  ingredientId: z.string(),
  unitPrice: z.number().min(0),
  unit: z.string().optional(),
  isPreferred: z.boolean().default(false),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const products = await db.supplierProduct.findMany({
    where: { supplierId: id },
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
    orderBy: { ingredient: { name: "asc" } },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: supplierId } = await params;
  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ingredientId, unitPrice, unit, isPreferred } = parsed.data;

  // If marking as preferred, unset other preferred for same ingredient
  if (isPreferred) {
    await db.supplierProduct.updateMany({
      where: { ingredientId, isPreferred: true },
      data: { isPreferred: false },
    });
  }

  const product = await db.supplierProduct.upsert({
    where: { supplierId_ingredientId: { supplierId, ingredientId } },
    create: { supplierId, ingredientId, unitPrice, unit: (unit as never) ?? undefined, isPreferred },
    update: { unitPrice, ...(unit ? { unit: unit as never } : {}), isPreferred },
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
  });

  return NextResponse.json(product, { status: 201 });
}
