"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle, SlidersHorizontal, Edit2, Trash2,
  Plus, History, Zap, TrendingDown, Package, DollarSign,
  Search, X, LayoutGrid, List, Table2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import StockAdjustModal from "./StockAdjustModal";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import KitchenIngredientModal from "./KitchenIngredientModal";
import TransactionHistoryModal from "./TransactionHistoryModal";
import type { IngredientCategory, Unit } from "@/types";

interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: Unit;
  costPerUnit: number;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  reorderQty: number;
  kcalPer100g: number | null;
  kjPer100g: number | null;
  imageUrl: string | null;
  priceEstimated: boolean;
}

type View = "table" | "card" | "list";

const CATEGORY_LABELS: Record<IngredientCategory | "ALL", string> = {
  ALL: "All", MEAT: "Meat", SEAFOOD: "Seafood", VEGETABLE: "Vegetable",
  FRUIT: "Fruit", DAIRY: "Dairy", GRAIN: "Grain", SPICE: "Spice",
  CONDIMENT: "Condiment", OIL: "Oil", ALCOHOL: "Alcohol",
  SOFT_DRINK: "Soft Drink", OTHER: "Other",
};

const ALL_TABS = ["ALL", "MEAT", "SEAFOOD", "VEGETABLE", "FRUIT", "DAIRY",
  "GRAIN", "SPICE", "CONDIMENT", "OIL", "ALCOHOL", "SOFT_DRINK", "OTHER"] as const;

type TabValue = IngredientCategory | "ALL";

function stockStatus(i: Ingredient): "critical" | "low" | "ok" {
  if (i.reorderPoint > 0 && i.currentStock <= 0) return "critical";
  if (i.reorderPoint > 0 && i.currentStock <= i.reorderPoint) return "low";
  return "ok";
}

function StockBar({ current, par, reorder }: { current: number; par: number; reorder: number }) {
  if (par <= 0) return null;
  const pct = Math.min(100, Math.round((current / par) * 100));
  const color = current <= 0 ? "bg-red-500" : current <= reorder ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="mt-1.5 h-[3px] w-full rounded-full bg-gray-700/60">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Thumbnail({ ing, size }: { ing: Ingredient; size: "sm" | "lg" }) {
  const cls = size === "lg"
    ? "w-full h-full object-cover"
    : "w-9 h-9 rounded-lg object-cover shrink-0 bg-gray-800";
  const fallbackCls = size === "lg"
    ? "w-full h-full flex items-center justify-center text-gray-600 text-2xl font-bold"
    : "w-9 h-9 rounded-lg bg-gray-800 shrink-0 flex items-center justify-center text-gray-700 text-[10px] font-bold";

  if (ing.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ing.imageUrl} alt={ing.name} className={cls} />;
  }
  return <div className={fallbackCls}>{ing.name.slice(0, 2).toUpperCase()}</div>;
}

function StatusBadge({ status }: { status: "critical" | "low" | "ok" }) {
  if (status === "critical") return (
    <span className="text-[10px] font-semibold bg-red-500/15 text-red-400 px-1.5 py-px rounded-full ring-1 ring-red-500/20">OUT</span>
  );
  if (status === "low") return (
    <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-1.5 py-px rounded-full ring-1 ring-amber-500/20">LOW</span>
  );
  return null;
}

function EstBadge() {
  return (
    <span title="Price is estimated — confirm when PO is received" className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-1.5 py-px rounded-full ring-1 ring-amber-500/20 cursor-default">EST</span>
  );
}

export default function KitchenStockList() {
  const toast = useToast();
  const confirm = useConfirm();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("table");
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null);
  const [editing, setEditing] = useState<Ingredient | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<Ingredient | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  async function load() {
    const res = await fetch("/api/stock/kitchen");
    if (res.ok) setIngredients(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteItem(item: Ingredient) {
    const ok = await confirm(`Archive "${item.name}"? This cannot be undone easily.`, {
      title: "Archive ingredient",
      confirmText: "Archive",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/stock/kitchen/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed to delete.");
      return;
    }
    load();
  }

  const lowStockItems = useMemo(
    () => ingredients.filter((i) => i.reorderPoint > 0 && i.currentStock <= i.reorderPoint),
    [ingredients]
  );
  const criticalItems = useMemo(
    () => ingredients.filter((i) => i.reorderPoint > 0 && i.currentStock <= 0),
    [ingredients]
  );
  const totalValue = useMemo(
    () => ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0),
    [ingredients]
  );
  const filtered = useMemo(() => {
    let list = tab === "ALL" ? ingredients : ingredients.filter((i) => i.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [ingredients, tab, search]);

  const rowBg = (s: "critical" | "low" | "ok") =>
    s === "critical" ? "bg-red-500/5 hover:bg-red-500/10" :
    s === "low"      ? "bg-amber-500/5 hover:bg-amber-500/8" :
                       "hover:bg-white/[0.02]";

  const actionBtn = "p-1.5 rounded-md text-gray-500 hover:bg-gray-700/60 transition-colors";

  const footerTotal = formatCurrency(filtered.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0));
  const footerLabel = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}${tab !== "ALL" ? ` in ${CATEGORY_LABELS[tab]}` : ""}`;

  return (
    <div className="space-y-5">

      {/* ── Add button ── */}
      <div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Ingredient
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { icon: <Package size={14} />,      label: "Total Items",   value: ingredients.length,         color: "text-gray-300",  accent: "border-t-gray-600" },
          { icon: <DollarSign size={14} />,   label: "Stock Value",   value: formatCurrency(totalValue), color: "text-white",     accent: "border-t-blue-500/60" },
          { icon: <TrendingDown size={14} />, label: "Low Stock",     value: lowStockItems.length,       color: "text-amber-400", accent: "border-t-amber-500" },
          { icon: <AlertTriangle size={14} />,label: "Out of Stock",  value: criticalItems.length,       color: "text-red-400",   accent: "border-t-red-500" },
        ] as const).map((card) => (
          <div key={card.label} className={cn("bg-gray-900 rounded-xl p-4 border-t-2", card.accent)}>
            <div className={cn("flex items-center gap-1.5 mb-2.5 text-xs font-medium opacity-60", card.color)}>
              {card.icon}{card.label}
            </div>
            <p className={cn("text-2xl font-bold leading-none", card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Low stock alert ── */}
      {lowStockItems.length > 0 && !alertDismissed && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <p className="text-amber-300/90 text-sm flex-1">
            <span className="font-medium">Low stock: </span>
            {lowStockItems.map((i) => i.name).join(", ")}
          </p>
          <button onClick={() => setAlertDismissed(true)} className="text-amber-500/60 hover:text-amber-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Filters + view toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto flex-1">
          {ALL_TABS.map((t) => {
            const count = t === "ALL" ? ingredients.length : ingredients.filter((i) => i.category === t).length;
            if (t !== "ALL" && count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  tab === t ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                {CATEGORY_LABELS[t]}
                <span className={cn("text-[10px] rounded-full px-1.5 py-px font-semibold",
                  tab === t ? "bg-orange-500/20 text-orange-400" : "bg-gray-800 text-gray-500")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-44 bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-lg pl-8 pr-7 py-1.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X size={12} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 gap-0.5">
            {([
              { v: "card"  as View, icon: <LayoutGrid size={14} />, title: "Card view" },
              { v: "list"  as View, icon: <List        size={14} />, title: "Line list" },
              { v: "table" as View, icon: <Table2      size={14} />, title: "Table view" },
            ]).map(({ v, icon, title }) => (
              <button
                key={v}
                title={title}
                onClick={() => setView(v)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  view === v ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="py-16 text-center text-gray-600 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-600 text-sm">
          {search
            ? <>No results for <span className="text-gray-400">"{search}"</span>.</>
            : <>No ingredients yet.{" "}
                <button onClick={() => { setEditing(null); setModalOpen(true); }}
                  className="text-orange-400 hover:text-orange-300 underline underline-offset-2">
                  Add the first one.
                </button>
              </>
          }
        </div>

      ) : view === "card" ? (
        /* ══ CARD VIEW ══ */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((ing) => {
              const status = stockStatus(ing);
              return (
                <div
                  key={ing.id}
                  className={cn(
                    "group relative rounded-xl overflow-hidden border transition-colors",
                    status === "critical" ? "border-red-500/30" :
                    status === "low"      ? "border-amber-500/30" :
                                           "border-gray-800 hover:border-gray-700"
                  )}
                >
                  {/* Photo */}
                  <div className="aspect-square bg-gray-800 relative overflow-hidden">
                    <Thumbnail ing={ing} size="lg" />
                    {/* Status pill */}
                    {status !== "ok" && (
                      <div className="absolute top-2 left-2">
                        <StatusBadge status={status} />
                      </div>
                    )}
                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => setAdjusting(ing)} title="Adjust stock"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <SlidersHorizontal size={14} />
                      </button>
                      <button onClick={() => setHistory(ing)} title="History"
                        className="p-2 rounded-lg bg-white/10 hover:bg-blue-500/30 text-white transition-colors">
                        <History size={14} />
                      </button>
                      <button onClick={() => { setEditing(ing); setModalOpen(true); }} title="Edit"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteItem(ing)} title="Archive"
                        className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-white transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className={cn("p-3",
                    status === "critical" ? "bg-red-500/5" :
                    status === "low"      ? "bg-amber-500/5" :
                                           "bg-gray-900"
                  )}>
                    <p className="font-medium text-white text-sm truncate">{ing.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-gray-500 bg-gray-800/80 px-1.5 py-px rounded-md">
                        {CATEGORY_LABELS[ing.category]}
                      </span>
                      <span className={cn("text-xs font-semibold tabular-nums",
                        status === "critical" ? "text-red-400" :
                        status === "low"      ? "text-amber-400" : "text-gray-300")}>
                        {+ing.currentStock.toFixed(2)} <span className="text-gray-600 font-normal">{ing.unit}</span>
                      </span>
                    </div>
                    <StockBar current={ing.currentStock} par={ing.parLevel} reorder={ing.reorderPoint} />
                    <div className="flex items-center justify-between mt-1.5">
                      {ing.kcalPer100g != null
                        ? <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                            <Zap size={10} />{ing.kcalPer100g} kcal/100g
                          </p>
                        : <span />
                      }
                      {ing.priceEstimated && <EstBadge />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-600">
            <span>{footerLabel}</span>
            <span className="font-semibold text-white tabular-nums">{footerTotal}</span>
          </div>
        </>

      ) : view === "list" ? (
        /* ══ LINE LIST VIEW ══ */
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800/60">
            {filtered.map((ing) => {
              const status = stockStatus(ing);
              const value = ing.currentStock * ing.costPerUnit;
              return (
                <div
                  key={ing.id}
                  className={cn("group flex items-center gap-3 px-4 py-3 transition-colors", rowBg(status))}
                >
                  <Thumbnail ing={ing} size="sm" />

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">{ing.name}</span>
                      <StatusBadge status={status} />
                      {ing.priceEstimated && <EstBadge />}
                    </div>
                    <span className="text-xs text-gray-500">{CATEGORY_LABELS[ing.category]}</span>
                  </div>

                  {/* Stock */}
                  <div className="w-28 shrink-0">
                    <div className="text-right">
                      <span className={cn("text-sm font-semibold tabular-nums",
                        status === "critical" ? "text-red-400" :
                        status === "low"      ? "text-amber-400" : "text-white")}>
                        {+ing.currentStock.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-600 ml-1">{ing.unit}</span>
                    </div>
                    <StockBar current={ing.currentStock} par={ing.parLevel} reorder={ing.reorderPoint} />
                  </div>

                  {/* Value — hidden on small screens */}
                  <div className="w-20 text-right shrink-0 hidden sm:block">
                    <span className={cn("text-sm tabular-nums", value > 0 ? "text-gray-300" : "text-gray-700")}>
                      {formatCurrency(value)}
                    </span>
                  </div>

                  {/* Nutrition */}
                  <div className="w-24 text-right shrink-0 hidden md:block text-xs">
                    {ing.kcalPer100g != null
                      ? <span className="text-emerald-400">{ing.kcalPer100g} kcal</span>
                      : <span className="text-gray-700">—</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setAdjusting(ing)} title="Adjust stock" className={cn(actionBtn, "hover:text-white")}>
                      <SlidersHorizontal size={13} />
                    </button>
                    <button onClick={() => setHistory(ing)} title="History" className={cn(actionBtn, "hover:text-blue-400")}>
                      <History size={13} />
                    </button>
                    <button onClick={() => { setEditing(ing); setModalOpen(true); }} title="Edit" className={cn(actionBtn, "hover:text-white")}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteItem(ing)} title="Archive" className={cn(actionBtn, "hover:text-red-400")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/40 text-xs text-gray-600">
            <span>{footerLabel}</span>
            <span className="font-semibold text-white tabular-nums">{footerTotal}</span>
          </div>
        </div>

      ) : (
        /* ══ TABLE VIEW ══ */
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingredient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Par / Reorder</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1 justify-end">
                      <Zap size={11} className="text-emerald-500" />Nutrition
                    </span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((ing) => {
                  const status = stockStatus(ing);
                  const value = ing.currentStock * ing.costPerUnit;
                  return (
                    <tr key={ing.id} className={cn("group transition-colors", rowBg(status))}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Thumbnail ing={ing} size="sm" />
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{ing.name}</span>
                            <StatusBadge status={status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-md">
                          {CATEGORY_LABELS[ing.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-semibold tabular-nums",
                          status === "critical" ? "text-red-400" :
                          status === "low"      ? "text-amber-400" : "text-white")}>
                          {+ing.currentStock.toFixed(2)}
                        </span>
                        <span className="ml-1 text-xs text-gray-600">{ing.unit}</span>
                        <StockBar current={ing.currentStock} par={ing.parLevel} reorder={ing.reorderPoint} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-gray-400 tabular-nums">{ing.parLevel}</div>
                        <div className="text-gray-600 text-xs tabular-nums">{ing.reorderPoint} re-order</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ing.priceEstimated && <EstBadge />}
                          <span className="text-gray-400 tabular-nums">{formatCurrency(ing.costPerUnit)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={value > 0 ? "text-white font-medium" : "text-gray-600"}>{formatCurrency(value)}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {ing.kcalPer100g != null
                          ? <div className="leading-tight">
                              <div className="text-emerald-400 font-medium">{ing.kcalPer100g} kcal</div>
                              {ing.kjPer100g != null && <div className="text-gray-500">{ing.kjPer100g} kJ</div>}
                            </div>
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setAdjusting(ing)} title="Adjust stock" className={cn(actionBtn, "hover:text-white")}><SlidersHorizontal size={13} /></button>
                          <button onClick={() => setHistory(ing)} title="History" className={cn(actionBtn, "hover:text-blue-400")}><History size={13} /></button>
                          <button onClick={() => { setEditing(ing); setModalOpen(true); }} title="Edit" className={cn(actionBtn, "hover:text-white")}><Edit2 size={13} /></button>
                          <button onClick={() => deleteItem(ing)} title="Archive" className={cn(actionBtn, "hover:text-red-400")}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-800 bg-gray-900/40">
                  <td colSpan={5} className="px-4 py-3 text-xs text-gray-600">{footerLabel}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-white tabular-nums">{footerTotal}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {adjusting && (
        <StockAdjustModal
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={load}
          itemType="KITCHEN"
          itemId={adjusting.id}
          itemName={adjusting.name}
          currentStock={adjusting.currentStock}
          unit={adjusting.unit}
        />
      )}

      <KitchenIngredientModal
        item={editing}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(undefined); }}
        onSaved={load}
      />

      {history && (
        <TransactionHistoryModal
          open={!!history}
          onClose={() => setHistory(null)}
          itemId={history.id}
          itemName={history.name}
          unit={history.unit}
        />
      )}
    </div>
  );
}
