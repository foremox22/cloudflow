"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Loader2, Zap, ImagePlus, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngredientCategory, Unit } from "@/types";

const CATEGORIES: IngredientCategory[] = [
  "MEAT", "SEAFOOD", "VEGETABLE", "FRUIT", "DAIRY",
  "GRAIN", "SPICE", "CONDIMENT", "OIL", "ALCOHOL", "SOFT_DRINK", "OTHER",
];

const UNITS: Unit[] = [
  "KG", "G", "LB", "OZ", "L", "ML",
  "CUP", "TBSP", "TSP", "PIECE", "BUNCH", "SLICE", "PORTION",
];

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

interface Props {
  item?: Ingredient | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function KitchenIngredientModal({ item, open, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("MEAT");
  const [unit, setUnit] = useState<Unit>("KG");
  const [costPerUnit, setCostPerUnit] = useState("0");
  const [currentStock, setCurrentStock] = useState("0");
  const [parLevel, setParLevel] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [reorderQty, setReorderQty] = useState("0");
  const [kcal, setKcal] = useState("");
  const [kj, setKj] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [priceEstimated, setPriceEstimated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [nutritionNote, setNutritionNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setUnit(item.unit);
      setCostPerUnit(String(item.costPerUnit));
      setCurrentStock(String(item.currentStock));
      setParLevel(String(item.parLevel));
      setReorderPoint(String(item.reorderPoint));
      setReorderQty(String(item.reorderQty));
      setKcal(item.kcalPer100g != null ? String(item.kcalPer100g) : "");
      setKj(item.kjPer100g != null ? String(item.kjPer100g) : "");
      setImageUrl(item.imageUrl ?? null);
      setPriceEstimated(item.priceEstimated);
    } else {
      setName(""); setCategory("MEAT"); setUnit("KG");
      setCostPerUnit("0"); setCurrentStock("0"); setParLevel("0");
      setReorderPoint("0"); setReorderQty("0");
      setKcal(""); setKj(""); setImageUrl(null); setPriceEstimated(false);
    }
    setError(""); setNutritionNote("");
  }, [item, open]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      setImageUrl(data.url!);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function lookupNutrition() {
    if (!name.trim()) { setError("Enter ingredient name first."); return; }
    setLooking(true); setNutritionNote(""); setError("");
    try {
      const res = await fetch(`/api/nutrition?query=${encodeURIComponent(name.trim())}`);
      const data = await res.json() as { kcal?: number; kj?: number; foodName?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Lookup failed."); return; }
      setKcal(String(data.kcal ?? ""));
      setKj(String(data.kj ?? ""));
      setNutritionNote(`Matched: "${data.foodName}" — values per 100 g`);
    } finally {
      setLooking(false);
    }
  }

  function handleKcalChange(val: string) {
    setKcal(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) setKj(String(Math.round(n * 4.184)));
    else setKj("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");

    const payload = {
      name: name.trim(),
      category, unit,
      costPerUnit: parseFloat(costPerUnit) || 0,
      currentStock: parseFloat(currentStock) || 0,
      parLevel: parseFloat(parLevel) || 0,
      reorderPoint: parseFloat(reorderPoint) || 0,
      reorderQty: parseFloat(reorderQty) || 0,
      kcalPer100g: kcal !== "" ? parseFloat(kcal) : null,
      kjPer100g: kj !== "" ? parseFloat(kj) : null,
      imageUrl: imageUrl ?? null,
      priceEstimated,
    };

    const url = isEdit ? `/api/stock/kitchen/${item!.id}` : "/api/stock/kitchen";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to save.");
      return;
    }
    onSaved();
    onClose();
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-y-auto max-h-[92vh]">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-white font-semibold text-base">
                {isEdit ? "Edit Ingredient" : "Add Ingredient"}
              </Dialog.Title>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Image upload */}
              <div>
                <label className={labelCls}>Photo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImagePick}
                  className="hidden"
                />
                {imageUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-gray-800 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Ingredient"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                      >
                        <ImagePlus size={13} />
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-28 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {uploading
                      ? <Loader2 size={20} className="animate-spin" />
                      : <ImagePlus size={20} />
                    }
                    <span className="text-xs">{uploading ? "Uploading…" : "Click to upload photo"}</span>
                    <span className="text-[10px] text-gray-600">JPEG, PNG, WebP — max 5 MB</span>
                  </button>
                )}
              </div>

              {/* Estimated price notice */}
              {isEdit && priceEstimated && (
                <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-300/90 text-xs leading-relaxed">
                      Price is <span className="font-semibold">estimated</span> — it will be confirmed when a purchase order is received.
                    </p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!priceEstimated}
                        onChange={(e) => setPriceEstimated(!e.target.checked)}
                        className="accent-amber-400 w-3.5 h-3.5"
                      />
                      <span className="text-amber-400/80 text-xs">Mark price as confirmed</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className={labelCls}>Name *</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chicken Breast"
                    className={cn(inputCls, "flex-1")}
                  />
                  <button
                    type="button"
                    onClick={lookupNutrition}
                    disabled={looking}
                    title="Lookup nutrition"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    {looking ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    Lookup
                  </button>
                </div>
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className={inputCls}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cost / Unit ($)</label>
                  <input type="number" min="0" step="0.01" value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)} className={inputCls} />
                </div>
                {!isEdit && (
                  <div>
                    <label className={labelCls}>Current Stock</label>
                    <input type="number" min="0" step="any" value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)} className={inputCls} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Par Level</label>
                  <input type="number" min="0" step="any" value={parLevel}
                    onChange={(e) => setParLevel(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Reorder Point</label>
                  <input type="number" min="0" step="any" value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Reorder Qty</label>
                  <input type="number" min="0" step="any" value={reorderQty}
                    onChange={(e) => setReorderQty(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Nutrition */}
              <div className="border border-emerald-800/40 rounded-xl p-4 bg-emerald-900/10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Nutrition per 100 g
                  </span>
                </div>
                {nutritionNote && <p className="text-xs text-emerald-500 mb-2">{nutritionNote}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>kcal</label>
                    <input type="number" min="0" step="1" value={kcal}
                      onChange={(e) => handleKcalChange(e.target.value)}
                      placeholder="e.g. 165" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>kJ</label>
                    <input type="number" min="0" step="1" value={kj}
                      onChange={(e) => setKj(e.target.value)}
                      placeholder="auto-calculated" className={inputCls} />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || uploading}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    saving || uploading
                      ? "bg-orange-500/40 text-white/40 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-400")}>
                  {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
