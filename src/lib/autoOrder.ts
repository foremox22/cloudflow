import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export async function maybeCreateAutoPo(ingredientId: string): Promise<void> {
  const ingredient = await db.ingredient.findUnique({
    where: { id: ingredientId },
    include: {
      supplierProducts: {
        where: { supplier: { active: true } },
        include: { supplier: true },
        orderBy: [{ isPreferred: "desc" }, { unitPrice: "asc" }],
      },
    },
  });

  if (!ingredient || ingredient.currentStock > ingredient.reorderPoint) return;
  if (ingredient.reorderQty <= 0) return;

  const supplierProduct = ingredient.supplierProducts[0];
  if (!supplierProduct) return;

  const restaurantId = ingredient.restaurantId;

  const existing = await db.purchaseOrder.findFirst({
    where: {
      restaurantId,
      supplierId: supplierProduct.supplierId,
      status: { in: ["DRAFT", "APPROVED", "SENT"] },
      lineItems: { some: { ingredientId } },
    },
  });
  if (existing) return;

  const systemUser = await db.userRestaurant.findFirst({
    where: { restaurantId, role: { in: ["ADMIN", "MANAGER"] }, user: { active: true } },
    select: { userId: true },
  });
  if (!systemUser) return;

  const po = await db.purchaseOrder.create({
    data: {
      restaurantId,
      supplierId: supplierProduct.supplierId,
      status: "DRAFT",
      notes: `Auto-generated: ${ingredient.name} dropped below reorder point (${ingredient.reorderPoint} ${ingredient.unit})`,
      createdById: systemUser.userId,
      lineItems: {
        create: {
          ingredientId,
          quantity: ingredient.reorderQty,
          unitPrice: supplierProduct.unitPrice,
        },
      },
    },
  });

  await notify(
    restaurantId,
    "AUTO_ORDER",
    "Auto Purchase Order Created",
    `${ingredient.name} is below reorder point. A draft PO has been created for ${supplierProduct.supplier.name}.`,
    `/suppliers?tab=orders&po=${po.id}`
  );
}
