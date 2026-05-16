"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplierId: string;
  supplierName: string;
  ingredients: Ingredient[];
  existingIds: string[];
}

export default function SupplierProductModal({
  open, onClose, onSaved, supplierId, supplierName, ingredients, existingIds,
}: Props) {
  const [ingredientId, setIngredientId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = ingredients.filter((i) => !existingIds.includes(i.id));
  const selected = ingredients.find((i) => i.id === ingredientId);

  useEffect(() => {
    if (open) { setIngredientId(""); setUnitPrice(""); setIsPreferred(false); setError(""); }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/suppliers/${supplierId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId, unitPrice: parseFloat(unitPrice), isPreferred }),
    });

    setSaving(false);
    if (!res.ok) { setError("Failed to add product."); return; }
    onSaved();
    onClose();
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="text-white font-semibold">Add Product</Dialog.Title>
              <p className="text-gray-400 text-sm">{supplierName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Ingredient *</label>
              <select
                required
                value={ingredientId}
                onChange={(e) => setIngredientId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select ingredient…</option>
                {available.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Unit Price (£ per {selected?.unit ?? "unit"}) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inputCls}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsPreferred(!isPreferred)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                isPreferred
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              )}
            >
              <Star size={14} className={isPreferred ? "fill-amber-400" : ""} />
              Mark as preferred supplier for this ingredient
            </button>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium", saving ? "bg-orange-500/50 text-white/50 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600")}>
                {saving ? "Saving…" : "Add Product"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
