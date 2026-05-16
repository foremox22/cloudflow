"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockItemType, StockTxType } from "@/types";

const TX_TYPES: { value: StockTxType; label: string; desc: string }[] = [
  { value: "IN", label: "Stock In", desc: "Delivery or purchase received" },
  { value: "OUT", label: "Stock Out", desc: "Manual removal" },
  { value: "WASTE", label: "Wastage", desc: "Spoilage or prep waste" },
  { value: "ADJUST", label: "Adjust", desc: "Count correction (adds or removes)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemType: StockItemType;
  itemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
}

export default function StockAdjustModal({
  open,
  onClose,
  onSaved,
  itemType,
  itemId,
  itemName,
  currentStock,
  unit,
}: Props) {
  const [type, setType] = useState<StockTxType>("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setType("IN");
    setQuantity("");
    setNotes("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/stock/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId, type, quantity: parseFloat(quantity), notes }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Failed to save adjustment.");
      return;
    }
    reset();
    onSaved();
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="text-white font-semibold">Adjust Stock</Dialog.Title>
              <p className="text-gray-400 text-sm">{itemName} · {currentStock} {unit}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Transaction Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TX_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      type === t.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    )}
                  >
                    <p className={cn("text-sm font-medium", type === t.value ? "text-orange-400" : "text-white")}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity ({unit}) *
              </label>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason / reference…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
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
                {saving ? "Saving…" : "Save Adjustment"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
