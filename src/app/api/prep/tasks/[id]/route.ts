import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { maybeCreateAutoPo } from "@/lib/autoOrder";

function convertUnit(qty: number, from: string, to: string): number {
  if (from === to) return qty;
  const KG: Record<string, number> = { KG: 1, G: 0.001, LB: 0.453592, OZ: 0.0283495 };
  const L:  Record<string, number> = { L: 1, ML: 0.001, CUP: 0.236588, TBSP: 0.0147868, TSP: 0.00492892 };
  if (KG[from] !== undefined && KG[to] !== undefined) return qty * KG[from] / KG[to];
  if (L[from]  !== undefined && L[to]  !== undefined) return qty * L[from]  / L[to];
  return qty;
}

const patchSchema = z.object({
  status: z.enum(["IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  targetQty: z.number().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = await db.prepTask.findUnique({
    where: { id },
    include: {
      ingredient: {
        include: {
          prepRecipe: { include: { ingredients: { include: { ingredient: true } } } },
        },
      },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "IN_PROGRESS") updateData.startedAt = new Date();
  if (parsed.data.status === "DONE") updateData.completedAt = new Date();

  // On completion: deduct raw ingredients and add to prep item stock
  if (parsed.data.status === "DONE") {
    const recipe = task.ingredient.prepRecipe;
    const batchYield = task.ingredient.batchYield ?? 1;
    const batches = task.targetQty / batchYield;

    await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      await tx.prepTask.update({ where: { id }, data: updateData as never });

      // Add produced qty to prep item stock
      await tx.ingredient.update({
        where: { id: task.ingredientId },
        data: { currentStock: { increment: task.targetQty } },
      });
      await tx.stockTransaction.create({
        data: {
          restaurantId: task.restaurantId,
          itemType: "KITCHEN",
          itemId: task.ingredientId,
          type: "IN",
          quantity: task.targetQty,
          referenceId: id,
          notes: `Prep completed: ${task.ingredient.name} (${task.targetQty} ${task.ingredient.unit})`,
          createdById: userId,
        },
      });

      // Deduct raw ingredients
      if (recipe) {
        for (const ri of recipe.ingredients) {
          const deduct = convertUnit(ri.quantity, ri.unit, ri.ingredient.unit) * batches / (ri.ingredient.yieldRate ?? 1.0);
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { currentStock: { decrement: deduct } },
          });
          await tx.stockTransaction.create({
            data: {
              restaurantId: task.restaurantId,
              itemType: "KITCHEN",
              itemId: ri.ingredientId,
              type: "OUT",
              quantity: deduct,
              referenceId: id,
              notes: `Used for prep: ${task.ingredient.name}`,
              createdById: userId,
            },
          });
        }
      }
    });

    // Trigger auto-PO for raw ingredients that dropped below reorder point
    if (recipe) {
      for (const ri of recipe.ingredients) {
        await maybeCreateAutoPo(ri.ingredientId);
      }
    }
  } else {
    await db.prepTask.update({ where: { id }, data: updateData as never });
  }

  const updated = await db.prepTask.findUnique({
    where: { id },
    include: {
      ingredient: { include: { prepRecipe: { include: { ingredients: { include: { ingredient: true } } } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.prepTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
