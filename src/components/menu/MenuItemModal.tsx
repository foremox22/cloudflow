"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemWithRecipe, RecipeCategory } from "@/types";

const CATEGORIES: RecipeCategory[] = [
  "STARTER", "MAIN", "DESSERT", "BEVERAGE", "SIDE", "SAUCE", "BREAD", "OTHER",
];

interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  sellingPrice: number;
}

interface Props {
  item?: MenuItemWithRecipe | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function MenuItemModal({ item, open, onClose, onSaved }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("MAIN");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadingRecipes(true);
    fetch("/api/recipes")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setRecipes(data); })
      .catch(() => setRecipes([]))
      .finally(() => setLoadingRecipes(false));
  }, [open]);

  useEffect(() => {
    if (item) {
      setRecipeId(item.recipeId ?? "");
      setName(item.name);
      setPrice(String(item.price));
      setCategory(item.category);
      setSortOrder(String(item.sortOrder));
    } else {
      setRecipeId("");
      setName("");
      setPrice("");
      setCategory("MAIN");
      setSortOrder("0");
    }
    setError("");
  }, [item, open]);

  function handleRecipeChange(id: string) {
    setRecipeId(id);
    if (!id) return;
    const r = recipes.find((r) => r.id === id);
    if (r) {
      setName(r.name);
      setPrice(String(r.sellingPrice));
      setCategory(r.category);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      recipeId: recipeId || undefined,
      name,
      price: parseFloat(price),
      category,
      sortOrder: parseInt(sortOrder),
    };

    const url = item ? `/api/menu/${item.id}` : "/api/menu";
    const method = item ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Failed to save. Please check your inputs.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-white font-semibold text-lg">
              {item ? "Edit Menu Item" : "Add Menu Item"}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Link to Recipe (optional)
              </label>
              <select
                value={recipeId}
                onChange={(e) => handleRecipeChange(e.target.value)}
                disabled={loadingRecipes}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60"
              >
                <option value="">— Manual item —</option>
                {loadingRecipes && <option disabled>Loading recipes…</option>}
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {!loadingRecipes && recipes.length === 0 && (
                <p className="text-xs text-amber-400/80 mt-1">
                  No recipes found for this restaurant. Create recipes in the Recipes section first, or add a manual item below.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Price ($) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium",
                  saving
                    ? "bg-orange-500/50 text-white/50 cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                )}
              >
                {saving ? "Saving…" : item ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
