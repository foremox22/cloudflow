"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Clock, Star, Building2, Check, X, Loader2,
  Pencil, Trash2, Search, SlidersHorizontal, ArrowUpDown,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { cn, formatCurrency, calcFoodCostPct, convertToIngredientUnit } from "@/lib/utils";
import RecipeFormModal from "@/components/recipes/RecipeFormModal";
import { useConfirm } from "@/lib/confirm";

interface Restaurant { id: string; name: string; type?: string }

interface Props {
  initialRecipes: any[];
  ingredients: any[];
  allergens: any[];
  restaurants: Restaurant[];
  currentRestaurantId: string;
}

const CATEGORIES = ["ALL", "STARTER", "MAIN", "DESSERT", "BEVERAGE", "SIDE", "SAUCE", "BREAD", "OTHER"];

type SortKey = "name" | "category" | "restaurant" | "cost" | "selling" | "fc" | "updatedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

function calcCost(r: any): number {
  if (!r.servings || r.servings === 0) return 0;
  return r.ingredients.reduce((sum: number, ri: any) => {
    const base = convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit);
    return sum + ri.ingredient.costPerUnit * base / (ri.ingredient.yieldRate ?? 1);
  }, 0) / r.servings;
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({ recipe, restaurants, onClose, onUpdated }: {
  recipe: any; restaurants: Restaurant[];
  onClose: () => void; onUpdated: (id: string, a: any[]) => void;
}) {
  const others  = restaurants.filter((r) => r.id !== recipe.restaurantId);
  const initial = new Set<string>(recipe.assignments?.map((a: any) => a.restaurantId) ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [saving,   setSaving]   = useState(false);

  function toggle(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/master-recipes/${recipe.id}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantIds: Array.from(selected) }),
    });
    if (res.ok) { onUpdated(recipe.id, await res.json()); onClose(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <p className="text-white font-semibold text-sm">Assign to Restaurants</p>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[220px]">{recipe.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="px-4 py-3 space-y-1.5 max-h-72 overflow-y-auto">
          {others.length === 0
            ? <p className="text-gray-500 text-sm text-center py-6">No other restaurants found.</p>
            : others.map((r) => {
                const checked = selected.has(r.id);
                return (
                  <button key={r.id} onClick={() => toggle(r.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-colors",
                      checked
                        ? "bg-orange-500/15 border border-orange-500/40 text-white"
                        : "bg-gray-800/50 border border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white"
                    )}>
                    <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0",
                      checked ? "bg-orange-500 border-orange-500" : "border-gray-600")}>
                      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <Building2 size={14} className={checked ? "text-orange-400" : "text-gray-500"} />
                    <span className="truncate flex-1">{r.name}</span>
                  </button>
                );
              })}
        </div>
        <div className="px-4 py-3 border-t border-gray-800 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving || others.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sort header cell ──────────────────────────────────────────────────────────
function Th({ label, sortKey, current, dir, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn("px-4 py-3 text-left", className)}>
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp size={12} className="text-orange-400" /> : <ChevronDown size={12} className="text-orange-400" />
          : <ChevronsUpDown size={12} className="text-gray-600" />}
      </button>
    </th>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MasterRecipeList({
  initialRecipes, ingredients, allergens, restaurants,
}: Props) {
  const confirm = useConfirm();
  const [recipes, setRecipes] = useState<any[]>(
    initialRecipes.map((r) => ({ ...r, costPerServing: r.costPerServing ?? calcCost(r) }))
  );

  // Filters
  const [search,    setSearch]  = useState("");
  const [rfFilter,  setRF]      = useState("ALL");
  const [typeFilter,setTF]      = useState<"all" | "master" | "regular">("all");
  const [catFilter, setCF]      = useState("ALL");

  // Sort
  const [sortKey, setSortKey]   = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<any | null>(null);
  const [assigning, setAssigning] = useState<any | null>(null);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1); }, [search, rfFilter, typeFilter, catFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...recipes];
    if (search.trim()) list = list.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    if (rfFilter !== "ALL") list = list.filter((r) => r.restaurantId === rfFilter);
    if (typeFilter === "master")  list = list.filter((r) =>  r.isMaster);
    if (typeFilter === "regular") list = list.filter((r) => !r.isMaster);
    if (catFilter !== "ALL") list = list.filter((r) => r.category === catFilter);

    list.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name":       av = a.name;                           bv = b.name; break;
        case "category":   av = a.category;                       bv = b.category; break;
        case "restaurant": av = a.restaurant?.name ?? "";         bv = b.restaurant?.name ?? ""; break;
        case "cost":       av = a.costPerServing ?? 0;            bv = b.costPerServing ?? 0; break;
        case "selling":    av = a.sellingPrice ?? 0;              bv = b.sellingPrice ?? 0; break;
        case "fc":         av = calcFoodCostPct(a.costPerServing ?? 0, a.sellingPrice); bv = calcFoodCostPct(b.costPerServing ?? 0, b.sellingPrice); break;
        default:           av = new Date(a.updatedAt).getTime();  bv = new Date(b.updatedAt).getTime();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [recipes, search, rfFilter, typeFilter, catFilter, sortKey, sortDir]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged        = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const masterCount  = recipes.filter((r) =>  r.isMaster).length;
  const regularCount = recipes.filter((r) => !r.isMaster).length;
  const activeFilters =
    (search ? 1 : 0) + (rfFilter !== "ALL" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) + (catFilter !== "ALL" ? 1 : 0);

  async function handleSave(data: any, id?: string) {
    const { _linkIngredientId, _linkBatchYield, ...recipeData } = data;
    const url = id ? `/api/recipes/${id}` : "/api/master-recipes";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipeData),
    });
    if (!res.ok) return;
    const saved    = await res.json();
    const withCost = { ...saved, costPerServing: calcCost(saved) };
    setRecipes((p) => id ? p.map((r) => r.id === id ? withCost : r) : [withCost, ...p]);
    setShowModal(false); setEditing(null);
  }

  async function handleDelete(recipe: any) {
    if (!await confirm(`Archive "${recipe.name}"?`, { title: "Archive recipe", confirmText: "Archive", variant: "danger" })) return;
    await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    setRecipes((p) => p.filter((r) => r.id !== recipe.id));
  }

  function handleAssignUpdated(recipeId: string, assignments: any[]) {
    setRecipes((p) => p.map((r) => r.id === recipeId ? { ...r, assignments } : r));
  }

  return (
    <div className="space-y-4">

      {/* ── Top row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span><span className="text-white font-semibold">{recipes.length}</span> total</span>
          <span className="flex items-center gap-1">
            <Star size={12} className="text-orange-400" fill="currentColor" />
            <span className="text-orange-400 font-semibold">{masterCount}</span> master
          </span>
          <span><span className="text-white font-semibold">{regularCount}</span> regular</span>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} /> New Master Recipe
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes…"
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {/* Restaurant */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500 text-xs shrink-0">Restaurant</span>
            {[{ id: "ALL", name: "All" }, ...restaurants].map((r) => (
              <button key={r.id} onClick={() => setRF(r.id)}
                className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                  rfFilter === r.id ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700")}>
                {r.name}
              </button>
            ))}
          </div>

          {/* Type */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs shrink-0">Type</span>
            {(["all", "master", "regular"] as const).map((t) => (
              <button key={t} onClick={() => setTF(t)}
                className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                  typeFilter === t
                    ? t === "master" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "bg-gray-700 text-white border border-gray-600"
                    : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700")}>
                {t === "master" && <Star size={9} fill="currentColor" />}
                {t === "all" ? "All" : t === "master" ? "Master" : "Regular"}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500 text-xs shrink-0">Category</span>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCF(c)}
                className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                  catFilter === c ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700")}>
                {c === "ALL" ? "All" : c}
              </button>
            ))}
          </div>
        </div>

        {activeFilters > 0 && (
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={12} className="text-orange-400" />
            <span className="text-xs text-orange-400">{activeFilters} filter{activeFilters > 1 ? "s" : ""} active</span>
            <button onClick={() => { setSearch(""); setRF("ALL"); setTF("all"); setCF("ALL"); }}
              className="text-xs text-gray-500 hover:text-white underline">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <Th label="Recipe"     sortKey="name"       current={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[200px]" />
                <Th label="Category"   sortKey="category"   current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Restaurant" sortKey="restaurant" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Type</span>
                </th>
                <Th label="Time"       sortKey="updatedAt"  current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Cost/srv"   sortKey="cost"       current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                <Th label="Selling"    sortKey="selling"    current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                <Th label="FC%"        sortKey="fc"         current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Assigned to</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-500 text-sm">
                    No recipes match your filters.
                  </td>
                </tr>
              ) : paged.map((recipe, idx) => {
                const cost   = recipe.costPerServing ?? 0;
                const fc     = recipe.sellingPrice > 0 ? calcFoodCostPct(cost, recipe.sellingPrice) : null;
                const assigned = (recipe.assignments ?? []) as any[];
                const mins   = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

                return (
                  <tr
                    key={recipe.id}
                    className={cn(
                      "border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors",
                      idx === paged.length - 1 && "border-b-0"
                    )}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="text-white font-medium leading-snug">{recipe.name}</p>
                      {recipe.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{recipe.description}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                        {recipe.category}
                      </span>
                    </td>

                    {/* Restaurant */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Building2 size={11} className="shrink-0 text-gray-600" />
                        {recipe.restaurant?.name ?? "—"}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {recipe.isMaster ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap">
                          <Star size={9} fill="currentColor" /> Master
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Regular</span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
                        <Clock size={11} /> {mins}m
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-white text-xs font-medium">{formatCurrency(cost)}</span>
                    </td>

                    {/* Selling */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-orange-400 text-xs font-medium">
                        {recipe.sellingPrice > 0 ? formatCurrency(recipe.sellingPrice) : "—"}
                      </span>
                    </td>

                    {/* FC% */}
                    <td className="px-4 py-3 text-right">
                      {fc !== null ? (
                        <span className={cn("text-xs font-semibold",
                          fc < 30 ? "text-emerald-400" : fc < 50 ? "text-amber-400" : "text-red-400")}>
                          {fc.toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Assigned to */}
                    <td className="px-4 py-3">
                      {recipe.isMaster ? (
                        <div className="flex flex-col gap-1.5">
                          {assigned.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {assigned.slice(0, 2).map((a: any) => (
                                <span key={a.restaurantId ?? a.restaurant?.id}
                                  className="text-[11px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  {a.restaurant?.name}
                                </span>
                              ))}
                              {assigned.length > 2 && (
                                <span className="text-[11px] text-gray-500">+{assigned.length - 2}</span>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => setAssigning(recipe)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 border border-orange-500/40 hover:border-orange-500/70 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-lg transition-colors w-fit"
                          >
                            <Building2 size={11} />
                            {assigned.length === 0 ? "Assign" : "Edit assignment"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditing(recipe); setShowModal(true); }}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(recipe)}
                          title="Archive"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-2.5 border-t border-gray-800 flex items-center justify-between gap-4">
          <p className="text-gray-500 text-xs whitespace-nowrap">
            {filtered.length === 0 ? "0 recipes" : (
              <>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                <span className="text-gray-300">{filtered.length}</span> recipes
              </>
            )}
          </p>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-gray-600 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      "min-w-[30px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      page === p
                        ? "bg-orange-500 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                  >
                    {p}
                  </button>
                )
              )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>

          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setRF("ALL"); setTF("all"); setCF("ALL"); }}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 whitespace-nowrap">
              <X size={11} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <RecipeFormModal
          recipe={editing}
          ingredients={ingredients}
          allergens={allergens}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
      {assigning && (
        <AssignModal
          recipe={assigning}
          restaurants={restaurants}
          onClose={() => setAssigning(null)}
          onUpdated={handleAssignUpdated}
        />
      )}
    </div>
  );
}
