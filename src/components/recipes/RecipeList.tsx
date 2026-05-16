"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Clock, ChefHat, DollarSign, Pencil, Trash2 } from "lucide-react";
import { cn, formatCurrency, calcFoodCostPct, convertToIngredientUnit } from "@/lib/utils";
import RecipeFormModal from "./RecipeFormModal";
import { useConfirm } from "@/lib/confirm";
import RecipeDetailModal from "./RecipeDetailModal";
import { DIETARY_TAG_COLORS, DIETARY_TAG_LABELS, CATEGORY_COLORS } from "@/lib/colors";
import type { RecipeCategory } from "@/types";

function calcCost(recipe: any): number {
  return recipe.servings > 0
    ? recipe.ingredients.reduce(
        (s: number, ri: any) =>
          s + (ri.ingredient?.costPerUnit ?? 0) *
              convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient?.unit ?? ri.unit) /
              (ri.ingredient?.yieldRate ?? 1.0),
        0
      ) / recipe.servings
    : 0;
}

interface Props {
  initialRecipes: any[];
  ingredients: any[];
  allergens: any[];
}

export default function RecipeList({ initialRecipes, ingredients, allergens }: Props) {
  const confirm = useConfirm();
  const { data: session } = useSession();
  const canEdit = ["ADMIN", "MANAGER", "HEAD_CHEF"].includes(session?.user?.role ?? "");

  const [recipes, setRecipes] = useState<any[]>(
    initialRecipes.map((r) => ({ ...r, costPerServing: calcCost(r) }))
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"all" | "menu" | "prep">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [mode, setMode] = useState<"menu" | "prep">("menu");

  const categories = ["ALL", "STARTER", "MAIN", "DESSERT", "BEVERAGE", "SIDE", "SAUCE", "BREAD", "OTHER"];

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "ALL" || r.category === categoryFilter;
    const matchView =
      viewMode === "all"
        ? true
        : viewMode === "menu"
        ? (r.prepForItems?.length ?? 0) === 0
        : (r.prepForItems?.length ?? 0) > 0;
    return matchSearch && matchCat && matchView;
  });

  async function handleSave(data: any, id?: string) {
    const { _linkIngredientId, _linkBatchYield, ...recipeData } = data;

    const method = id ? "PATCH" : "POST";
    const url = id ? `/api/recipes/${id}` : "/api/recipes";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipeData),
    });
    if (!res.ok) return;
    const saved = await res.json();
    const withCost = { ...saved, costPerServing: calcCost(saved) };
    if (id) {
      setRecipes((prev) => prev.map((r) => (r.id === id ? withCost : r)));
    } else {
      setRecipes((prev) => [withCost, ...prev]);
    }

    // Link ingredient to this prep recipe if specified
    if (_linkIngredientId && saved.id) {
      await fetch(`/api/stock/kitchen/${_linkIngredientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prepRecipeId: saved.id,
          batchYield: parseFloat(_linkBatchYield) || 1,
        }),
      });
    }

    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!await confirm("Archive this recipe?", { title: "Archive recipe", confirmText: "Archive", variant: "danger" })) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleRevert(recipeId: string, version: number) {
    const res = await fetch(`/api/recipes/${recipeId}/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    if (!res.ok) throw new Error("Revert failed");
    const saved = await res.json();
    const withCost = { ...saved, costPerServing: calcCost(saved) };
    setRecipes((prev) => prev.map((r) => r.id === recipeId ? withCost : r));
  }

  return (
    <div className="space-y-5">
      {/* View mode segmented control */}
      <div className="flex items-center gap-1 p-1 bg-gray-900 border border-gray-800 rounded-full w-fit">
        {(["all", "menu", "prep"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
              viewMode === v
                ? "bg-orange-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            )}
          >
            {v === "all" ? "All Recipes" : v === "menu" ? "Menu Recipes" : "Prep Recipes"}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        {canEdit && (
          <>
            <button
              onClick={() => { setMode("menu"); setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} /> Menu Recipe
            </button>
            <button
              onClick={() => { setMode("prep"); setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} /> Prep Recipe
            </button>
          </>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              categoryFilter === cat
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <p className="text-gray-500 text-sm">{filtered.length} recipes</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>No recipes yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((recipe) => {
            const foodCostPct = calcFoodCostPct(recipe.costPerServing, recipe.sellingPrice);
            const isPrepItem = (recipe.prepForItems?.length ?? 0) > 0;
            return (
              <div
                key={recipe.id}
                onClick={() => setViewing(recipe)}
                className={cn(
                  "bg-gray-900 rounded-xl overflow-hidden flex flex-col transition-colors group cursor-pointer",
                  recipe.isMaster
                    ? "border border-orange-500/30 hover:border-orange-500/50"
                    : "border border-gray-800 hover:border-gray-700"
                )}
              >
                {/* ── Image strip ── */}
                <div className="relative h-36 overflow-hidden bg-gray-800 shrink-0">
                  {recipe.imageUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-gray-900/80" />
                    </>
                  )}
                  {/* Category badge */}
                  <div className="absolute bottom-2.5 left-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", CATEGORY_COLORS[recipe.category])}>
                      {recipe.category}
                    </span>
                  </div>
                  {/* Badges */}
                  <div className="absolute top-2 left-3 flex gap-1.5">
                    {recipe.isMaster && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/25 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                        ★ Master
                      </span>
                    )}
                    {isPrepItem && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        PREP ITEM
                      </span>
                    )}
                  </div>
                  {/* Action buttons — hidden for master recipes (read-only) */}
                  {canEdit && !recipe.isMaster && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMode(isPrepItem ? "prep" : "menu"); setEditing(recipe); setShowModal(true); }}
                      className="p-1.5 rounded-lg bg-black/50 text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                      className="p-1.5 rounded-lg bg-black/50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  )}
                </div>

                {/* ── Card body ── */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-semibold leading-snug">{recipe.name}</h3>
                    {(recipe._count?.versions ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700 shrink-0 mt-0.5">
                        v{recipe._count.versions}
                      </span>
                    )}
                  </div>

                  {recipe.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{recipe.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {recipe.prepTime + recipe.cookTime}min
                    </span>
                    <span>Serves {recipe.servings}</span>
                  </div>

                  {/* Allergens + Dietary */}
                  {(recipe.allergens.length > 0 || recipe.dietaryTags?.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.allergens.map((a: any) => (
                        <span key={a.allergen.id} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">
                          {a.allergen.name}
                        </span>
                      ))}
                      {recipe.dietaryTags?.map((tag: string) => (
                        <span key={tag} className={cn("text-xs px-2 py-0.5 rounded-full", DIETARY_TAG_COLORS[tag] ?? "bg-gray-500/15 text-gray-400")}>
                          {DIETARY_TAG_LABELS[tag] ?? tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cost strip */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-sm mt-auto">
                    <div>
                      <p className="text-gray-500 text-xs">Food Cost</p>
                      <p className="text-white font-semibold">{formatCurrency(recipe.costPerServing)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Selling</p>
                      <p className="text-orange-400 font-semibold">{formatCurrency(recipe.sellingPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">FC%</p>
                      <p className={cn("font-semibold", foodCostPct > 35 ? "text-red-400" : "text-green-400")}>
                        {foodCostPct}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecipeDetailModal
        recipe={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={canEdit ? () => { setEditing(viewing); setViewing(null); setShowModal(true); } : undefined}
        onRevert={canEdit ? handleRevert : undefined}
      />

      {showModal && (
        <RecipeFormModal
          recipe={editing}
          ingredients={ingredients}
          allergens={allergens}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          mode={mode}
        />
      )}
    </div>
  );
}
