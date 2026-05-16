"use client";

import { useEffect, useState } from "react";
import { Plus, SlidersHorizontal, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import StockAdjustModal from "./StockAdjustModal";
import { useConfirm } from "@/lib/confirm";
import FohItemModal from "./FohItemModal";
import type { FohCategory } from "@/types";

interface FohItem {
  id: string;
  name: string;
  category: FohCategory;
  unit: string;
  unitLabel: string | null;
  costPerUnit: number;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  reorderQty: number;
}

const TABS: { label: string; value: FohCategory | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Beverages", value: "BEVERAGE" },
  { label: "Packaging", value: "PACKAGING" },
  { label: "Supplies", value: "SUPPLIES" },
  { label: "Other", value: "OTHER" },
];

export default function FohStockList() {
  const confirm = useConfirm();
  const [items, setItems] = useState<FohItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FohCategory | "ALL">("ALL");
  const [adjusting, setAdjusting] = useState<FohItem | null>(null);
  const [editing, setEditing] = useState<FohItem | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/stock/foh");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteItem(item: FohItem) {
    if (!await confirm(`Archive "${item.name}"?`, { title: "Archive item", confirmText: "Archive", variant: "danger" })) return;
    await fetch(`/api/stock/foh/${item.id}`, { method: "DELETE" });
    load();
  }

  const filtered = tab === "ALL" ? items : items.filter((i) => i.category === tab);

  const lowStockItems = items.filter(
    (i) => i.reorderPoint > 0 && i.currentStock <= i.reorderPoint
  );

  function stockStatus(i: FohItem): "critical" | "low" | "ok" {
    if (i.reorderPoint > 0 && i.currentStock <= 0) return "critical";
    if (i.reorderPoint > 0 && i.currentStock <= i.reorderPoint) return "low";
    return "ok";
  }

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-amber-300 font-medium text-sm">Low Stock Alert</p>
            <p className="text-amber-400/80 text-xs mt-0.5">
              {lowStockItems.map((i) => i.name).join(", ")} at or below reorder point.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              tab === t.value
                ? "bg-orange-500/20 text-orange-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No items yet.{" "}
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="text-orange-400 hover:underline"
          >
            Add the first one.
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Item</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Par</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Reorder Pt</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Cost/Unit</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = stockStatus(item);
                return (
                  <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{item.name}</span>
                        {status === "critical" && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">OUT</span>
                        )}
                        {status === "low" && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">LOW</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{item.category}</span>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold",
                      status === "critical" ? "text-red-400" : status === "low" ? "text-amber-400" : "text-white")}>
                      {+item.currentStock.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        {item.unitLabel ?? item.unit.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {+item.parLevel.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-600">{item.unitLabel ?? item.unit.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {+item.reorderPoint.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-600">{item.unitLabel ?? item.unit.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(item.costPerUnit)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setAdjusting(item)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1.5 rounded-lg">
                          <SlidersHorizontal size={12} />
                        </button>
                        <button onClick={() => { setEditing(item); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteItem(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800">
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
      )}

      {adjusting && (
        <StockAdjustModal
          open={!!adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={load}
          itemType="FOH"
          itemId={adjusting.id}
          itemName={adjusting.name}
          currentStock={adjusting.currentStock}
          unit={adjusting.unit}
        />
      )}

      <FohItemModal
        item={editing}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(undefined); }}
        onSaved={load}
      />
    </div>
  );
}
