import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import RecipeList from "@/components/recipes/RecipeList";
import { convertToIngredientUnit } from "@/lib/utils";

export default async function RecipesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const restaurantId = await getRestaurantId(session.user.id);

  const RECIPE_INCLUDE = {
    createdBy: { select: { id: true, name: true } },
    ingredients: {
      include: {
        ingredient: { select: { id: true, name: true, costPerUnit: true, unit: true, yieldRate: true, prepRecipeId: true } },
      },
    },
    prepForItems: { select: { id: true, name: true } },
    allergens: { include: { allergen: true } },
  } as const;

  function addCost(list: any[]) {
    return list.map((r) => ({
      ...r,
      costPerServing:
        r.servings > 0
          ? r.ingredients.reduce((sum: number, ri: any) => {
              const baseQty = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
              return sum + ri.ingredient.costPerUnit * baseQty / (ri.ingredient.yieldRate ?? 1.0);
            }, 0) / r.servings
          : 0,
    }));
  }

  const [ownRecipes, assignments, ingredients, allergens] = await Promise.all([
    restaurantId
      ? db.recipe.findMany({ where: { restaurantId, active: true }, include: RECIPE_INCLUDE, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    restaurantId
      ? db.recipeAssignment.findMany({ where: { restaurantId }, include: { recipe: { include: RECIPE_INCLUDE } } })
      : Promise.resolve([]),
    restaurantId
      ? db.ingredient.findMany({
          where: { restaurantId, active: true },
          include: { ingredientAllergens: { include: { allergen: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    db.allergen.findMany({ orderBy: { name: "asc" } }),
  ]);

  const masterRecipes = assignments
    .map((a: (typeof assignments)[number]) => a.recipe)
    .filter((r: (typeof assignments)[number]["recipe"]) => r.active)
    .map((r: (typeof assignments)[number]["recipe"]) => ({ ...r, isMaster: true }));

  const recipes = [
    ...addCost(ownRecipes),
    ...addCost(masterRecipes),
  ];

  return (
    <>
      <Header title="Recipes" />
      <div className="p-6">
        <RecipeList
          initialRecipes={recipes as any}
          ingredients={ingredients as any}
          allergens={allergens}
        />
      </div>
    </>
  );
}
