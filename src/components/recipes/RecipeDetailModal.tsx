"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X, Clock, Users, Printer, ChefHat, Zap, DollarSign,
  History, ArrowLeft, RotateCcw, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn, formatCurrency, calcFoodCostPct, convertToIngredientUnit } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

const DIETARY_TAGS: { value: string; label: string; color: string }[] = [
  { value: "VEGAN",        label: "🌱 Vegan",        color: "bg-green-500/15 text-green-400" },
  { value: "VEGETARIAN",   label: "🥬 Vegetarian",   color: "bg-emerald-500/15 text-emerald-400" },
  { value: "GLUTEN_FREE",  label: "🌾 Gluten Free",  color: "bg-yellow-500/15 text-yellow-400" },
  { value: "DAIRY_FREE",   label: "🥛 Dairy Free",   color: "bg-blue-500/15 text-blue-400" },
  { value: "NUT_FREE",     label: "🥜 Nut Free",     color: "bg-orange-500/15 text-orange-400" },
  { value: "HALAL",        label: "☪ Halal",         color: "bg-teal-500/15 text-teal-400" },
  { value: "KOSHER",       label: "✡ Kosher",        color: "bg-purple-500/15 text-purple-400" },
  { value: "LOW_CARB",     label: "📉 Low Carb",     color: "bg-cyan-500/15 text-cyan-400" },
  { value: "KETO",         label: "🥑 Keto",         color: "bg-amber-500/15 text-amber-400" },
  { value: "PALEO",        label: "🍖 Paleo",        color: "bg-lime-500/15 text-lime-400" },
  { value: "SPICY",        label: "🌶 Spicy",        color: "bg-red-500/15 text-red-400" },
];

const CATEGORY_COLORS: Record<string, string> = {
  STARTER:  "bg-yellow-500/15 text-yellow-400",
  MAIN:     "bg-orange-500/15 text-orange-400",
  DESSERT:  "bg-pink-500/15 text-pink-400",
  BEVERAGE: "bg-blue-500/15 text-blue-400",
  SIDE:     "bg-green-500/15 text-green-400",
  SAUCE:    "bg-red-500/15 text-red-400",
  BREAD:    "bg-amber-500/15 text-amber-400",
  OTHER:    "bg-gray-500/15 text-gray-400",
};

interface VersionRecord {
  id: string;
  version: number;
  snapshotJson: any;
  createdAt: string;
  changedBy?: { id: string; name: string } | null;
}

interface Props {
  recipe: any;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRevert?: (recipeId: string, versionNum: number) => Promise<void>;
}

function displayQtyUnit(qty: number, unit: string): { qty: string; unit: string } {
  if (unit === "KG" && qty < 1) return { qty: String(Math.round(qty * 1000)), unit: "g" };
  if (unit === "L"  && qty < 1) return { qty: String(Math.round(qty * 1000 * 10) / 10), unit: "ml" };
  return { qty: String(parseFloat(qty.toFixed(3))), unit };
}

function printRecipe(recipe: any) {
  const costPerServing =
    recipe.servings > 0
      ? recipe.ingredients.reduce(
          (s: number, ri: any) => s + (ri.ingredient?.costPerUnit ?? 0) * convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient?.unit ?? ri.unit),
          0
        ) / recipe.servings
      : 0;

  const ingredientRows = recipe.ingredients.map((ri: any) => {
    const { qty, unit } = displayQtyUnit(ri.quantity, ri.unit);
    const linePrice = ri.ingredient
      ? ri.ingredient.costPerUnit * convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit)
      : null;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${ri.ingredient?.name ?? ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${linePrice != null ? "$" + linePrice.toFixed(2) : "—"}</td>
    </tr>`;
  }).join("");

  const allergenList = recipe.allergens?.length
    ? recipe.allergens.map((a: any) => a.allergen?.name ?? "").join(", ")
    : "None";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${recipe.name}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:#111;background:#fff;padding:40px;max-width:720px;margin:0 auto}h1{font-size:28px;font-weight:700;margin-bottom:4px}.meta{display:flex;gap:24px;margin:16px 0;font-size:14px;color:#555}.badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;background:#f3f4f6;color:#374151;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em}.description{font-size:15px;color:#444;margin-bottom:24px;line-height:1.6}h2{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:14px;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:14px}thead tr{background:#f9fafb}th{padding:8px 12px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb}th:not(:first-child){text-align:right}.method{font-size:15px;line-height:1.8;color:#333;white-space:pre-wrap}.cost-row{display:flex;gap:32px;margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px}.cost-item p{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:2px}.cost-item strong{font-size:18px}.footer{margin-top:40px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}@media print{body{padding:24px}@page{margin:16mm}}</style>
  </head><body>
  ${recipe.imageUrl ? `<img src="${recipe.imageUrl}" style="width:100%;height:240px;object-fit:cover;border-radius:8px;margin-bottom:20px;" alt="" />` : ""}
  <span class="badge">${recipe.category}</span>
  <h1>${recipe.name}</h1>
  <div class="meta"><span>⏱ Prep ${recipe.prepTime} min</span><span>🔥 Cook ${recipe.cookTime} min</span><span>👥 Serves ${recipe.servings}</span></div>
  ${recipe.description ? `<p class="description">${recipe.description}</p>` : ""}
  <h2>Ingredients</h2>
  <table><thead><tr><th>Ingredient</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Price</th></tr></thead><tbody>${ingredientRows}</tbody></table>
  ${recipe.method ? `<h2>Method</h2><p class="method">${recipe.method}</p>` : ""}
  <h2>Allergens</h2><p>${allergenList}</p>
  <h2>Cost</h2><div class="cost-row"><div class="cost-item"><p>Food Cost/serving</p><strong>${formatCurrency(costPerServing)}</strong></div><div class="cost-item"><p>Selling Price</p><strong>${formatCurrency(recipe.sellingPrice)}</strong></div><div class="cost-item"><p>Food Cost %</p><strong>${calcFoodCostPct(costPerServing, recipe.sellingPrice)}%</strong></div></div>
  <p class="footer">Printed from Cloudflow — ${new Date().toLocaleDateString()}</p>
  <script>window.onload=function(){window.print()}<\/script></body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── Version snapshot mini-view ── */
function VersionSnapshot({ snap }: { snap: any }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-800 rounded-lg p-2.5">
          <p className="text-gray-500 mb-0.5">Prep</p>
          <p className="text-white font-medium">{snap.prepTime} min</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2.5">
          <p className="text-gray-500 mb-0.5">Cook</p>
          <p className="text-white font-medium">{snap.cookTime} min</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2.5">
          <p className="text-gray-500 mb-0.5">Serves</p>
          <p className="text-white font-medium">{snap.servings}</p>
        </div>
      </div>
      {snap.description && (
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{snap.description}</p>
      )}
      {snap.ingredients?.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1.5">Ingredients ({snap.ingredients.length})</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {snap.ingredients.map((ri: any, i: number) => {
              const { qty, unit } = displayQtyUnit(ri.quantity, ri.unit);
              return (
                <div key={i} className="flex justify-between text-xs px-2.5 py-1.5 rounded-lg bg-gray-800/60">
                  <span className="text-gray-300">{ri.ingredient?.name ?? ri.ingredientId}</span>
                  <span className="text-gray-500 tabular-nums">{qty} {unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex gap-3 text-xs pt-1">
        <div>
          <span className="text-gray-500">Selling price: </span>
          <span className="text-orange-400 font-medium">{formatCurrency(snap.sellingPrice)}</span>
        </div>
        {snap.allergens?.length > 0 && (
          <div>
            <span className="text-gray-500">Allergens: </span>
            <span className="text-red-400">{snap.allergens.map((a: any) => a.allergen?.name).join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function RecipeDetailModal({ recipe, open, onClose, onEdit, onRevert }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [view, setView] = useState<"recipe" | "history">("recipe");
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [reverting, setReverting] = useState<number | null>(null);

  /* fetch versions when switching to history view */
  useEffect(() => {
    if (!open || !recipe) return;
    setView("recipe");
    setExpandedVersion(null);
  }, [open, recipe?.id]);

  async function loadVersions() {
    if (!recipe) return;
    setLoadingVersions(true);
    const res = await fetch(`/api/recipes/${recipe.id}`);
    if (res.ok) {
      const data = await res.json();
      setVersions(data.versions ?? []);
    }
    setLoadingVersions(false);
  }

  function openHistory() {
    setView("history");
    loadVersions();
  }

  async function handleRevert(versionNum: number) {
    const ok = await confirm(
      `Revert this recipe to version ${versionNum}? A new version will be created with the restored content.`,
      { title: `Revert to v${versionNum}`, confirmText: "Revert", variant: "warning" }
    );
    if (!ok) return;
    setReverting(versionNum);
    try {
      if (onRevert) await onRevert(recipe.id, versionNum);
      toast.success(`Recipe reverted to v${versionNum}. New version created.`);
      setView("recipe");
      onClose();
    } catch {
      toast.error("Failed to revert recipe.");
    }
    setReverting(null);
  }

  if (!recipe) return null;

  const costPerServing =
    recipe.servings > 0
      ? recipe.ingredients.reduce(
          (s: number, ri: any) =>
            s + (ri.ingredient?.costPerUnit ?? 0) * convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient?.unit ?? ri.unit),
          0
        ) / recipe.servings
      : 0;

  const foodCostPct = calcFoodCostPct(costPerServing, recipe.sellingPrice);
  const currentVersion = recipe._count?.versions ?? null;
  const latestVersionNum = versions[0]?.version ?? currentVersion;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          {/* ── Hero / header ── */}
          {view === "recipe" && recipe.imageUrl ? (
            <div className="relative h-48 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-gray-900/70" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => printRecipe(recipe)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs rounded-lg transition-colors">
                  <Printer size={13} /> Print / PDF
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="absolute bottom-4 left-5 right-20">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", CATEGORY_COLORS[recipe.category])}>
                    {recipe.category}
                  </span>
                  {currentVersion && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-300 border border-gray-600">
                      v{currentVersion}
                    </span>
                  )}
                </div>
                <Dialog.Title className="text-white font-bold text-xl leading-tight">{recipe.name}</Dialog.Title>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between px-6 pt-5 pb-1 shrink-0">
              <div>
                {view === "recipe" ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", CATEGORY_COLORS[recipe.category])}>
                        {recipe.category}
                      </span>
                      {currentVersion && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                          v{currentVersion}
                        </span>
                      )}
                    </div>
                    <Dialog.Title className="text-white font-bold text-xl">{recipe.name}</Dialog.Title>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setView("recipe")} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <Dialog.Title className="text-white font-semibold text-sm">Version History</Dialog.Title>
                      <p className="text-gray-500 text-xs">{recipe.name}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {view === "recipe" && (
                  <button onClick={() => printRecipe(recipe)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
                    <Printer size={13} /> Print / PDF
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── RECIPE VIEW ── */}
            {view === "recipe" && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5"><Clock size={13} /> Prep {recipe.prepTime} min</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} /> Cook {recipe.cookTime} min</span>
                  <span className="flex items-center gap-1.5"><Users size={13} /> Serves {recipe.servings}</span>
                </div>

                {recipe.description && (
                  <p className="text-gray-300 text-sm leading-relaxed">{recipe.description}</p>
                )}

                {recipe.ingredients?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ChefHat size={12} /> Ingredients
                    </h3>
                    <div className="rounded-xl border border-gray-800 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-800/60">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Ingredient</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Unit</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {recipe.ingredients.map((ri: any) => {
                            const { qty, unit } = displayQtyUnit(ri.quantity, ri.unit);
                            const linePrice = ri.ingredient
                              ? ri.ingredient.costPerUnit * convertToIngredientUnit(ri.quantity, ri.unit, ri.ingredient.unit)
                              : null;
                            return (
                              <tr key={ri.id ?? ri.ingredientId} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 text-white">{ri.ingredient?.name ?? ri.ingredientId}</td>
                                <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{qty}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{unit}</td>
                                <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">
                                  {linePrice != null ? formatCurrency(linePrice) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {recipe.method && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Method</h3>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{recipe.method}</p>
                  </div>
                )}

                {(recipe.allergens?.length > 0 || recipe.dietaryTags?.length > 0) && (
                  <div className="space-y-3">
                    {recipe.allergens?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Allergens</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.allergens.map((a: any) => (
                            <span key={a.allergen?.id ?? a.allergenId} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">
                              {a.allergen?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {recipe.dietaryTags?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dietary</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.dietaryTags.map((tag: string) => {
                            const meta = DIETARY_TAGS.find((t) => t.value === tag);
                            return (
                              <span key={tag} className={cn("text-xs px-2 py-0.5 rounded-full", meta?.color ?? "bg-gray-500/15 text-gray-400")}>
                                {meta?.label ?? tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recipe.ingredients?.some((ri: any) => ri.ingredient?.kcalPer100g != null) && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap size={11} className="text-emerald-400" /> Nutrition (estimated per serving)
                    </h3>
                    {(() => {
                      const totalKcal = recipe.ingredients.reduce((sum: number, ri: any) => {
                        const kcal = ri.ingredient?.kcalPer100g;
                        if (kcal == null) return sum;
                        return sum + (kcal * ri.quantity * 1000) / 100;
                      }, 0);
                      return totalKcal > 0
                        ? <span className="text-emerald-400 font-medium text-sm">{Math.round(totalKcal / recipe.servings)} kcal / serving</span>
                        : null;
                    })()}
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <DollarSign size={12} /> Cost Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Food Cost / serving", value: formatCurrency(costPerServing), color: "text-white" },
                      { label: "Selling Price",        value: formatCurrency(recipe.sellingPrice), color: "text-orange-400" },
                      { label: "Food Cost %",          value: `${foodCostPct}%`, color: foodCostPct > 35 ? "text-red-400" : "text-green-400" },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-800 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                        <p className={cn("font-bold text-lg", item.color)}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── HISTORY VIEW ── */}
            {view === "history" && (
              <div>
                {loadingVersions ? (
                  <p className="text-gray-500 text-sm py-8 text-center">Loading history…</p>
                ) : versions.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No version history found.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => {
                      const isCurrent = v.version === latestVersionNum;
                      const isExpanded = expandedVersion === v.version;
                      const snap = v.snapshotJson as any;
                      const date = new Date(v.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      });

                      return (
                        <div key={v.id}
                          className={cn(
                            "rounded-xl border transition-colors",
                            isCurrent
                              ? "border-orange-500/30 bg-orange-500/5"
                              : "border-gray-800 bg-gray-800/30 hover:border-gray-700"
                          )}
                        >
                          {/* Version row header */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                            onClick={() => setExpandedVersion(isExpanded ? null : v.version)}
                          >
                            {/* Version badge */}
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 tabular-nums",
                              isCurrent
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-gray-700 text-gray-300 border border-gray-600"
                            )}>
                              v{v.version}
                            </span>

                            {/* Meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-sm font-medium truncate">{snap.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                <span>{date}</span>
                                {v.changedBy && <span>by {v.changedBy.name}</span>}
                                <span>{snap.ingredients?.length ?? 0} ingredients · serves {snap.servings}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {!isCurrent && onRevert && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRevert(v.version); }}
                                  disabled={reverting === v.version}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw size={11} />
                                  {reverting === v.version ? "Reverting…" : "Revert"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setExpandedVersion(isExpanded ? null : v.version); }}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded snapshot */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
                              <VersionSnapshot snap={snap} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 shrink-0">
            {view === "recipe" ? (
              <>
                <div className="flex items-center gap-3">
                  <p className="text-gray-600 text-xs">Created by {recipe.createdBy?.name ?? "—"}</p>
                  {currentVersion && currentVersion > 1 && (
                    <button
                      type="button"
                      onClick={openHistory}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors"
                    >
                      <History size={12} />
                      {currentVersion - 1} previous version{currentVersion - 1 !== 1 ? "s" : ""}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentVersion && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-800 text-gray-400 border border-gray-700">
                      v{currentVersion}
                    </span>
                  )}
                  {onEdit && (
                    <button onClick={onEdit}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors">
                      Edit Recipe
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView("recipe")}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={15} />
                Back to recipe
              </button>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
