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
  type Membership = (typeof allMemberships)[number];
  const adminRestaurantIds = allMemberships.map((m: Membership) => m.restaurantId);
  const restaurants = allMemberships.map((m: Membership) => m.restaurant);

  const [rawRecipes, ingredients, allergens] = await Promise.all([
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
    }),
    restaurantId
      ? db.ingredient.findMany({
          where: { restaurantId, active: true },
          include: { ingredientAllergens: { include: { allergen: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    db.allergen.findMany({ orderBy: { name: "asc" } }),
  ]);

  type RawRecipe = (typeof rawRecipes)[number];
  type RecipeIngredient = RawRecipe["ingredients"][number];
  const recipes = rawRecipes.map((r: RawRecipe) => ({
    ...r,
    costPerServing:
      r.servings > 0
        ? r.ingredients.reduce((sum: number, ri: RecipeIngredient) => {
            const baseQty = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
            return sum + ri.ingredient.costPerUnit * baseQty / (ri.ingredient.yieldRate ?? 1);
          }, 0) / r.servings
        : 0,
  }));

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
