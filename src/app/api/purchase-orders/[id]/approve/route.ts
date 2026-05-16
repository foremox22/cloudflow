import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { sendPoApprovalEmail } from "@/lib/mailer";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "cancel"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session as { user?: { id?: string } }).user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: "No restaurant" }, { status: 403 });

  // Only ADMIN/MANAGER can approve purchase orders
  const membership = await db.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { action } = parsed.data;

  const po = await db.purchaseOrder.findFirst({
    where: { id, restaurantId },
    include: {
      supplier: true,
      lineItems: {
        include: { ingredient: { select: { name: true, unit: true } } },
      },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (po.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT orders can be approved or cancelled" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "CANCELLED";

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: {
      status: newStatus,
      approvedById: action === "approve" ? userId : null,
    },
  });

  // Send email to supplier on approval
  if (action === "approve" && po.supplier.email) {
    sendPoApprovalEmail({
      supplierName: po.supplier.name,
      supplierEmail: po.supplier.email,
      poId: po.id,
      lineItems: po.lineItems.map((l: (typeof po.lineItems)[number]) => ({
        ingredientName: l.ingredient.name,
        quantity: l.quantity,
        unit: l.ingredient.unit,
        unitPrice: l.unitPrice,
      })),
      notes: po.notes,
      expectedAt: po.expectedAt,
    }).catch(() => null);
  }

  return NextResponse.json(updated);
}
