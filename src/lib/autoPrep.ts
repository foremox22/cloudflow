import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export async function maybeCreateUrgentPrep(ingredientId: string, newStock: number): Promise<void> {
  const ingredient = await db.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient || !ingredient.prepRecipeId) return;
  if (newStock > (ingredient.parLevel ?? 0)) return;

  const restaurantId = ingredient.restaurantId;

  const existing = await db.prepTask.findFirst({
    where: { restaurantId, ingredientId, status: { in: ["PENDING", "IN_PROGRESS"] }, type: "URGENT" },
  });
  if (existing) return;

  const systemUser = await db.userRestaurant.findFirst({
    where: { restaurantId, role: { in: ["ADMIN", "MANAGER"] }, user: { active: true } },
    select: { userId: true },
  });
  if (!systemUser) return;

  await db.prepTask.create({
    data: {
      restaurantId,
      ingredientId,
      type: "URGENT",
      status: "PENDING",
      targetQty: Math.max(ingredient.parLevel ?? 1, 1),
      notes: `Auto-created: ${ingredient.name} dropped to ${newStock.toFixed(2)} ${ingredient.unit} (par: ${ingredient.parLevel} ${ingredient.unit})`,
      createdById: systemUser.userId,
    },
  });

  await notify(
    restaurantId,
    "PREP_URGENT",
    "Urgent Prep Needed",
    `${ingredient.name} is below par level (${newStock.toFixed(2)} ${ingredient.unit}). An urgent prep task has been created.`,
    "/prep"
  );
}
