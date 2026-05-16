"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FohCategory } from "@/types";

const CATEGORIES: FohCategory[] = ["BEVERAGE", "PACKAGING", "SUPPLIES", "OTHER"];
const UNITS = ["PIECE", "L", "ML", "KG", "G", "PACK", "BOX", "CASE"];

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

interface Props {
  item?: FohItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function FohItemModal({ item, open, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FohCategory>("BEVERAGE");
  const [unit, setUnit] = useState("PIECE");
  const [unitLabel, setUnitLabel] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("0");
  const [currentStock, setCurrentStock] = useState("0");
  const [parLevel, setParLevel] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [reorderQty, setReorderQty] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setUnit(item.unit);
      setUnitLabel(item.unitLabel ?? "");
      setCostPerUnit(String(item.costPerUnit));
      setCurrentStock(String(item.currentStock));
      setParLevel(String(item.parLevel));
      setReorderPoint(String(item.reorderPoint));
      setReorderQty(String(item.reorderQty));
    } else {
      setName(""); setCategory("BEVERAGE"); setUnit("PIECE"); setUnitLabel("");
      setCostPerUnit("0"); setCurrentStock("0"); setParLevel("0");
      setReorderPoint("0"); setReorderQty("0");
    }
    setError("");
  }, [item, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name, category, unit,
      unitLabel: unitLabel.trim() || null,
      costPerUnit: parseFloat(costPerUnit),
      currentStock: parseFloat(currentStock),
      parLevel: parseFloat(parLevel),
      reorderPoint: parseFloat(reorderPoint),
      reorderQty: parseFloat(reorderQty),
    };

    const url = item ? `/api/stock/foh/${item.id}` : "/api/stock/foh";
    const method = item ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) { setError("Failed to save."); return; }
    onSaved();
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-white font-semibold text-lg">
              {item ? "Edit FOH Item" : "Add FOH Item"}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as FohCategory)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Unit Label <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="e.g. bottle, can, keg, bag…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cost / Unit ($)</label>
                <input type="number" min="0" step="0.01" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Stock</label>
                <input type="number" min="0" step="any" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Par Level</label>
                <input type="number" min="0" step="any" value={parLevel} onChange={(e) => setParLevel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reorder Point</label>
                <input type="number" min="0" step="any" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reorder Qty</label>
                <input type="number" min="0" step="any" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium",
                  saving ? "bg-orange-500/50 text-white/50 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600")}>
                {saving ? "Saving…" : item ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
