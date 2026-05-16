"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplierWithProducts } from "@/types";
import DatePicker from "@/components/ui/DatePicker";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface LineItem {
  ingredientId: string;
  quantity: string;
  unitPrice: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierWithProducts[];
  ingredients: Ingredient[];
}

export default function PurchaseOrderModal({ open, onClose, onSaved, suppliers, ingredients }: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ingredientId: "", quantity: "", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  useEffect(() => {
    if (open) {
      setSupplierId(""); setNotes(""); setExpectedAt(""); setError("");
      setLineItems([{ ingredientId: "", quantity: "", unitPrice: "" }]);
    }
  }, [open]);

  function handleSupplierChange(id: string) {
    setSupplierId(id);
    setLineItems([{ ingredientId: "", quantity: "", unitPrice: "" }]);
  }

  function handleIngredientChange(idx: number, ingredientId: string) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const product = supplier?.products.find((p) => p.ingredient.id === ingredientId);
    const updated = [...lineItems];
    updated[idx] = { ingredientId, quantity: updated[idx].quantity, unitPrice: product ? String(product.unitPrice) : "" };
    setLineItems(updated);
  }

  function addLine() {
    setLineItems([...lineItems, { ingredientId: "", quantity: "", unitPrice: "" }]);
  }

  function removeLine(idx: number) {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  }

  const total = lineItems.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return s + qty * price;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      supplierId,
      notes: notes || undefined,
      expectedAt: expectedAt || undefined,
      lineItems: lineItems
        .filter((l) => l.ingredientId && l.quantity)
        .map((l) => ({
          ingredientId: l.ingredientId,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice) || 0,
        })),
    };

    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) { setError("Failed to create purchase order."); return; }
    onSaved();
    onClose();
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-white font-semibold text-lg">New Purchase Order</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Supplier *</label>
                <select required value={supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className={inputCls}>
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Expected Delivery</label>
                <DatePicker value={expectedAt} onChange={setExpectedAt} placeholder="No date set" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className={inputCls} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">Line Items *</label>
                <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
                  <Plus size={14} /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((li, idx) => {
                  const availableIngredients = selectedSupplier?.products.map((p) => ({
                    id: p.ingredient.id,
                    name: p.ingredient.name,
                    unit: p.ingredient.unit,
                  })) ?? ingredients;
                  const selected = availableIngredients.find((i) => i.id === li.ingredientId);
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <select
                        required
                        value={li.ingredientId}
                        onChange={(e) => handleIngredientChange(idx, e.target.value)}
                        className={cn(inputCls, "flex-[3]")}
                      >
                        <option value="">Ingredient…</option>
                        {availableIngredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input
                        required
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder={`Qty${selected ? ` (${selected.unit})` : ""}`}
                        value={li.quantity}
                        onChange={(e) => {
                          const u = [...lineItems]; u[idx] = { ...u[idx], quantity: e.target.value }; setLineItems(u);
                        }}
                        className={cn(inputCls, "flex-[2]")}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="£/unit"
                        value={li.unitPrice}
                        onChange={(e) => {
                          const u = [...lineItems]; u[idx] = { ...u[idx], unitPrice: e.target.value }; setLineItems(u);
                        }}
                        className={cn(inputCls, "flex-[2]")}
                      />
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} className="text-gray-500 hover:text-red-400 pt-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {total > 0 && (
              <div className="flex justify-between items-center py-2 border-t border-gray-800">
                <span className="text-gray-400 text-sm">Order Total</span>
                <span className="text-orange-400 font-semibold">£{total.toFixed(2)}</span>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium", saving ? "bg-orange-500/50 text-white/50 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600")}>
                {saving ? "Creating…" : "Create Draft PO"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
