import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import MasterRecipeList from "@/components/master-recipes/MasterRecipeList";
import { convertToIngredientUnit } from "@/lib/utils";

export default async function MasterRecipesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const restaurantId = await getRestaurantId(session.user.id);

  // All restaurants this admin manages
  const allMemberships = await db.userRestaurant.findMany({
    where: { userId: session.user.id, role: "ADMIN" },
    include: { restaurant: { select: { id: true, name: true, type: true } } },
    orderBy: { restaurant: { createdAt: "asc" } },
  });
  const adminRestaurantIds = allMemberships.map((m) => m.restaurantId);

  const [recipes, ingredients, allergens] = await Promise.all([
    // ALL recipes across all admin-managed restaurants
    db.recipe.findMany({
      where: { restaurantId: { in: adminRestaurantIds }, active: true },
      include: {
        createdBy: { select: { id: true, name: true } },
        ingredients: {
          include: {
            ingredient: { select: { id: true, name: true, costPerUnit: true, unit: true, yieldRate: true, prepRecipeId: true } },
          },
        },
        allergens: { include: { allergen: true } },
        assignments: { include: { restaurant: { select: { id: true, name: true } } } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }).then((list) =>
      list.map((r) => ({
        ...r,
        costPerServing:
          r.servings > 0
            ? r.ingredients.reduce((sum, ri) => {
                const baseQty = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
                return sum + ri.ingredient.costPerUnit * baseQty / (ri.ingredient.yieldRate ?? 1);
              }, 0) / r.servings
            : 0,
      }))
    ),
    restaurantId
      ? db.ingredient.findMany({
          where: { restaurantId, active: true },
          include: { ingredientAllergens: { include: { allergen: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    db.allergen.findMany({ orderBy: { name: "asc" } }),
  ]);

  const restaurants = allMemberships.map((m) => m.restaurant);

  return (
    <>
      <Header title="Master Recipes" />
      <div className="p-6">
        <MasterRecipeList
          initialRecipes={recipes as any}
          ingredients={ingredients as any}
          allergens={allergens}
          restaurants={restaurants}
          currentRestaurantId={restaurantId ?? ""}
        />
      </div>
    </>
  );
}
