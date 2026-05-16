import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { z } from "zod";
import { maybeCreateUrgentPrep } from "@/lib/autoPrep";

// Converts a quantity from one unit to another within the same family.
// Returns the original quantity if units are the same or families differ.
function convertUnit(qty: number, from: string, to: string): number {
  if (from === to) return qty;
  const KG: Record<string, number> = { KG: 1, G: 0.001, LB: 0.453592, OZ: 0.0283495 };
  const L:  Record<string, number> = { L: 1, ML: 0.001, CUP: 0.236588, TBSP: 0.0147868, TSP: 0.00492892 };
  if (KG[from] !== undefined && KG[to] !== undefined) return qty * KG[from] / KG[to];
  if (L[from]  !== undefined && L[to]  !== undefined) return qty * L[from]  / L[to];
  return qty;
}

const patchSchema = z.object({
  status: z.enum(["OPEN", "HOLD", "PAID", "VOID"]).optional(),
  discount: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "SPLIT", "VOUCHER"]).optional(),
  serveNote: z.string().nullable().optional(),
  cashPaid:    z.number().min(0).optional(),
  cardPaid:    z.number().min(0).optional(),
  voucherPaid: z.number().min(0).optional(),
  voucherCode: z.string().optional(),
  tableId:     z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, restaurantId },
    include: {
      table: { select: { id: true, number: true, section: true } },
      server: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, dietaryTags: true, allergenTags: true, notes: true } },
      items: {
        include: { menuItem: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurantId = await getRestaurantId(session.user.id);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: {
            include: {
              recipe: { include: { ingredients: { include: { ingredient: true } } } },
            },
          },
        },
      },
    },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subtotal = current.items.filter((i) => i.status !== "VOID").reduce((s: number, i) => s + i.unitPrice * i.quantity, 0);
  const tax = subtotal * 0.1;
  const discount = parsed.data.discount ?? current.discount;
  const total = subtotal + tax - discount;

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    total,
    tax,
    discount,
    ...(parsed.data.serveNote !== undefined ? { serveNote: parsed.data.serveNote } : {}),
  };

  if (parsed.data.status === "PAID" || parsed.data.status === "VOID") {
    updateData.closedAt = new Date();
  }

  const deductedItems: { ingredientId: string; newStock: number }[] = [];

  const order = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    const updated = await tx.order.update({
      where: { id },
      data: updateData as never,
      include: {
        table: { select: { id: true, number: true, section: true } },
        server: { select: { id: true, name: true } },
        items: { include: { menuItem: { select: { id: true, name: true, category: true } } } },
      },
    });

    if (parsed.data.tableId !== undefined && parsed.data.tableId !== current.tableId) {
      // Free the previously assigned table
      if (current.tableId) {
        await tx.restaurantTable.update({ where: { id: current.tableId }, data: { status: "FREE" } });
      }
      // Occupy the new table (if not clearing)
      if (parsed.data.tableId) {
        await tx.restaurantTable.update({ where: { id: parsed.data.tableId }, data: { status: "OCCUPIED" } });
      }
    }

    if (current.tableId && (parsed.data.status === "PAID" || parsed.data.status === "VOID")) {
      await tx.restaurantTable.update({
        where: { id: current.tableId },
        data: { status: "FREE" },
      });
    }

    // Auto-deduct kitchen stock on payment
    if (parsed.data.status === "PAID") {
      const userId = (session as { user?: { id?: string } }).user?.id;
      for (const item of current.items) {
        if (item.status === "VOID") continue;
        const recipe = item.menuItem.recipe;
        if (!recipe) continue;
        for (const ri of recipe.ingredients) {
          const deduct = convertUnit(ri.quantity, ri.unit, ri.ingredient.unit) * item.quantity / (ri.ingredient.yieldRate ?? 1.0);
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { currentStock: { decrement: deduct } },
          });
          if (userId) {
            await tx.stockTransaction.create({
              data: {
                restaurantId,
                itemType: "KITCHEN",
                itemId: ri.ingredientId,
                type: "OUT",
                quantity: deduct,
                referenceId: id,
                notes: `Auto-deducted: order #${id.slice(-6)}`,
                createdById: userId,
              },
            });
          }
          deductedItems.push({
            ingredientId: ri.ingredientId,
            newStock: ri.ingredient.currentStock - deduct,
          });
        }
      }
    }

    return updated;
  });

  // Post-payment: trigger urgent prep for prep items below par level (parallelized)
  await Promise.all(
    deductedItems.map(({ ingredientId, newStock }) =>
      maybeCreateUrgentPrep(ingredientId, newStock).catch(() => null)
    )
  );

  return NextResponse.json(order);
}
