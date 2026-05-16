"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, AlertTriangle, ChevronDown, Check, Loader2, ImagePlus } from "lucide-react";
import { cn, convertToIngredientUnit } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string(),
  description: z.string().optional(),
  method: z.string().optional(),
  prepTime: z.number().int().min(0),
  cookTime: z.number().int().min(0),
  servings: z.number().int().min(1),
  sellingPrice: z.number().min(0),
  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1, "Select ingredient"),
      quantity: z.number().positive("Must be > 0"),
      unit: z.string(),
    })
  ),
  allergenIds: z.array(z.string()),
  dietaryTags: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = ["STARTER", "MAIN", "DESSERT", "BEVERAGE", "SIDE", "SAUCE", "BREAD", "OTHER"];
const ING_CATEGORIES = ["MEAT","SEAFOOD","VEGETABLE","FRUIT","DAIRY","GRAIN","SPICE","CONDIMENT","OIL","ALCOHOL","SOFT_DRINK","OTHER"];
const UNITS = ["KG", "G", "L", "ML", "PIECE", "BUNCH", "SLICE", "TBSP", "TSP", "CUP", "PORTION"];

const DIETARY_TAGS: { value: string; label: string; color: string }[] = [
  { value: "VEGAN",        label: "🌱 Vegan",        color: "bg-green-500/15 text-green-400 ring-green-500/30" },
  { value: "VEGETARIAN",   label: "🥬 Vegetarian",   color: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" },
  { value: "GLUTEN_FREE",  label: "🌾 Gluten Free",  color: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30" },
  { value: "DAIRY_FREE",   label: "🥛 Dairy Free",   color: "bg-blue-500/15 text-blue-400 ring-blue-500/30" },
  { value: "NUT_FREE",     label: "🥜 Nut Free",     color: "bg-orange-500/15 text-orange-400 ring-orange-500/30" },
  { value: "HALAL",        label: "☪ Halal",         color: "bg-teal-500/15 text-teal-400 ring-teal-500/30" },
  { value: "KOSHER",       label: "✡ Kosher",        color: "bg-purple-500/15 text-purple-400 ring-purple-500/30" },
  { value: "LOW_CARB",     label: "📉 Low Carb",     color: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/30" },
  { value: "KETO",         label: "🥑 Keto",         color: "bg-amber-500/15 text-amber-400 ring-amber-500/30" },
  { value: "PALEO",        label: "🍖 Paleo",        color: "bg-lime-500/15 text-lime-400 ring-lime-500/30" },
  { value: "SPICY",        label: "🌶 Spicy",        color: "bg-red-500/15 text-red-400 ring-red-500/30" },
];

interface IngredientOption {
  id: string;
  name: string;
  costPerUnit: number;
  unit: string;
  priceEstimated?: boolean;
  prepRecipeId?: string | null;
  yieldRate?: number;
}

interface Props {
  recipe?: any;
  ingredients: any[];
  allergens: any[];
  onSave: (data: any, id?: string) => Promise<void>;
  onClose: () => void;
  mode?: "menu" | "prep";
}

// ── Ingredient combobox with inline quick-create ────────────────────────────
function IngredientCombobox({
  value,
  onChange,
  ingredients,
  onCreated,
}: {
  value: string;
  onChange: (id: string) => void;
  ingredients: IngredientOption[];
  onCreated: (ing: IngredientOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [cat, setCat] = useState("OTHER");
  const [unit, setUnit] = useState("KG");
  const [cost, setCost] = useState("0");
  const [par, setPar] = useState("0");
  const [reorder, setReorder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = ingredients.find((i) => i.id === value);

  const filtered = query.trim()
    ? ingredients.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : ingredients;

  const exactMatch = ingredients.some((i) => i.name.toLowerCase() === query.toLowerCase().trim());
  const showCreate = query.trim().length > 0 && !exactMatch;

  function openDropdown() {
    setQuery(selected?.name ?? "");
    setOpen(true);
    setCreating(false);
  }

  function pickIngredient(ing: IngredientOption) {
    onChange(ing.id);
    setOpen(false);
    setCreating(false);
    setQuery("");
  }

  function startCreate() {
    setCreateName(query.trim());
    setCreating(true);
  }

  async function handleCreate(e: React.MouseEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/stock/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          category: cat,
          unit,
          costPerUnit: parseFloat(cost) || 0,
          currentStock: 0,
          parLevel: parseFloat(par) || 0,
          reorderPoint: parseFloat(reorder) || 0,
          reorderQty: 0,
          priceEstimated: true,
        }),
      });
      const data = await res.json() as IngredientOption & { error?: string };
      if (!res.ok) { setCreateError(data.error ?? "Failed to create."); return; }
      onCreated(data);
      onChange(data.id);
      setOpen(false);
      setCreating(false);
      setQuery("");
    } finally {
      setSaving(false);
    }
  }

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest("[data-combobox]")?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-gray-500";

  return (
    <div className="relative min-w-0" data-combobox>
      {/* Trigger input */}
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? query : (selected?.name ?? "")}
          onFocus={openDropdown}
          onChange={(e) => { setQuery(e.target.value); setCreating(false); }}
          placeholder="Search ingredient…"
          className={cn(
            "input flex-1 w-full pr-7",
            selected?.priceEstimated && !open && "border-amber-500/40"
          )}
        />
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      {selected?.priceEstimated && !open && (
        <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
          <AlertTriangle size={9} /> Price estimated — confirm after receiving PO
        </p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Results list */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-3 text-gray-500 text-xs text-center">No ingredients found</p>
            )}
            {filtered.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onMouseDown={() => pickIngredient(ing)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  {ing.id === value && <Check size={12} className="text-orange-400 shrink-0" />}
                  <span className={cn("text-white", ing.id !== value && "pl-4")}>{ing.name}</span>
                  {ing.priceEstimated && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-px rounded font-semibold">EST</span>
                  )}
                  {ing.prepRecipeId && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 ml-1">PREP</span>
                  )}
                  {ing.yieldRate && ing.yieldRate < 1 && (
                    <span className="text-[10px] text-orange-400 ml-1">yield {Math.round(ing.yieldRate * 100)}%</span>
                  )}
                </span>
                <span className="text-gray-500 text-xs">{ing.unit}</span>
              </button>
            ))}
          </div>

          {/* Create option */}
          {showCreate && (
            <div className="border-t border-gray-700">
              <button
                type="button"
                onMouseDown={startCreate}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors"
              >
                <Plus size={13} />
                Create &quot;{query.trim()}&quot; as new ingredient
              </button>
            </div>
          )}

          {/* Quick-create form */}
          {creating && (
            <div className="border-t border-gray-700 bg-gray-900/60 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                <Plus size={12} /> New ingredient: <span className="text-white">{createName}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Category</label>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
                    {ING_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Est. cost / unit ($)</label>
                  <input type="number" min="0" step="0.01" value={cost}
                    onChange={(e) => setCost(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Par level</label>
                  <input type="number" min="0" step="any" value={par}
                    onChange={(e) => setPar(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-0.5">Reorder point</label>
                  <input type="number" min="0" step="any" value={reorder}
                    onChange={(e) => setReorder(e.target.value)} className={inputCls} />
                </div>
              </div>
              {createError && <p className="text-red-400 text-xs">{createError}</p>}
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                <AlertTriangle size={9} /> Will be marked as estimated price until a PO is received.
              </p>
              <div className="flex gap-2 pt-0.5">
                <button type="button" onMouseDown={() => setCreating(false)}
                  className="text-xs text-gray-500 hover:text-white px-2 py-1.5 transition-colors">
                  Cancel
                </button>
                <button type="button" onMouseDown={handleCreate} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {saving ? "Creating…" : "Create & Add"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function RecipeFormModal({ recipe, ingredients: initialIngredients, allergens, onSave, onClose, mode }: Props) {
  const [saving, setSaving] = useState(false);
  const [localIngredients, setLocalIngredients] = useState<IngredientOption[]>(initialIngredients);
  const [imageUrl, setImageUrl] = useState<string | null>(recipe?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Prep recipe linking state
  const [linkIngredientId, setLinkIngredientId] = useState<string>(recipe?.prepForItems?.[0]?.id ?? "");
  const [linkBatchYield, setLinkBatchYield] = useState<string>(
    String(initialIngredients.find((i: any) => i.id === (recipe?.prepForItems?.[0]?.id ?? ""))?.batchYield ?? "1")
  );

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) { setUploadError(data.error ?? "Upload failed."); return; }
      setImageUrl(data.url!);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const defaultCategory = mode === "prep" ? "SAUCE" : "MAIN";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: recipe
      ? {
          name: recipe.name,
          category: recipe.category,
          description: recipe.description ?? "",
          method: recipe.method ?? "",
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          sellingPrice: recipe.sellingPrice,
          ingredients: recipe.ingredients.map((ri: any) => ({
            ingredientId: ri.ingredient.id,
            quantity: ri.quantity,
            unit: ri.unit,
          })),
          allergenIds: recipe.allergens.map((a: any) => a.allergen.id),
          dietaryTags: recipe.dietaryTags ?? [],
        }
      : {
          name: "",
          category: defaultCategory,
          description: "",
          method: "",
          prepTime: 0,
          cookTime: 0,
          servings: 1,
          sellingPrice: 0,
          ingredients: [],
          allergenIds: [],
          dietaryTags: [],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const watchIngredients = watch("ingredients");
  const watchServings = watch("servings") ?? 1;

  const costPerServing =
    watchServings > 0
      ? watchIngredients.reduce((sum, ri) => {
          const ing = localIngredients.find((i) => i.id === ri.ingredientId);
          return sum + (ing ? ing.costPerUnit * convertToIngredientUnit(ri.quantity || 0, ri.unit, ing.unit) / (ing.yieldRate ?? 1) : 0);
        }, 0) / watchServings
      : 0;

  const hasEstimatedIngredients = watchIngredients.some((ri) =>
    localIngredients.find((i) => i.id === ri.ingredientId)?.priceEstimated
  );

  async function onSubmit(data: FormData) {
    setSaving(true);
    const submitData = {
      ...data,
      imageUrl: imageUrl ?? null,
      ...(mode === "prep" && linkIngredientId
        ? { _linkIngredientId: linkIngredientId, _linkBatchYield: linkBatchYield }
        : {}),
    };
    await onSave(submitData, recipe?.id);
    setSaving(false);
  }

  const selectedAllergenIds: string[] = watch("allergenIds") ?? [];
  const selectedDietaryTags: string[] = watch("dietaryTags") ?? [];

  function toggleAllergen(id: string) {
    if (selectedAllergenIds.includes(id)) {
      setValue("allergenIds", selectedAllergenIds.filter((a) => a !== id));
    } else {
      setValue("allergenIds", [...selectedAllergenIds, id]);
    }
  }

  function toggleDietaryTag(value: string) {
    if (selectedDietaryTags.includes(value)) {
      setValue("dietaryTags", selectedDietaryTags.filter((t) => t !== value));
    } else {
      setValue("dietaryTags", [...selectedDietaryTags, value]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-lg">
              {recipe ? "Edit Recipe" : "New Recipe"}
            </h2>
            {mode === "prep" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Prep Recipe
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Image upload */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImagePick}
                className="hidden"
              />
              {imageUrl ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-800 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Recipe" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
                      <ImagePlus size={13} /> Replace
                    </button>
                    <button type="button" onClick={() => setImageUrl(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors">
                      <X size={13} /> Remove
                    </button>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full h-32 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                  <span className="text-xs">{uploading ? "Uploading…" : "Click to upload recipe photo"}</span>
                  <span className="text-[10px] text-gray-600">JPEG, PNG, WebP — max 5 MB</span>
                </button>
              )}
              {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
            </div>

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Name</label>
                <input {...register("name")} className="input" placeholder="Spaghetti Carbonara" />
                {errors.name && <p className="error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Category</label>
                <select {...register("category")} className="input">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea {...register("description")} rows={2} className="input resize-none" placeholder="Short description..." />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Prep (min)</label>
                <input {...register("prepTime", { valueAsNumber: true })} type="number" min="0" className="input" />
              </div>
              <div>
                <label className="label">Cook (min)</label>
                <input {...register("cookTime", { valueAsNumber: true })} type="number" min="0" className="input" />
              </div>
              <div>
                <label className="label">Servings</label>
                <input {...register("servings", { valueAsNumber: true })} type="number" min="1" className="input" />
              </div>
            </div>

            {/* Selling price + cost preview */}
            <div className="grid grid-cols-2 gap-4">
              {mode !== "prep" && (
                <div>
                  <label className="label">Selling Price ($)</label>
                  <input {...register("sellingPrice", { valueAsNumber: true })} type="number" step="0.01" min="0" className="input" />
                </div>
              )}
              <div className={cn("bg-gray-800 rounded-lg px-4 py-3", mode === "prep" && "col-span-2")}>
                <p className="text-gray-400 text-xs mb-1">
                  Est. Food Cost / serving
                  {hasEstimatedIngredients && (
                    <span className="ml-1.5 text-amber-400 text-[10px]">~ estimated prices</span>
                  )}
                </p>
                <p className="text-orange-400 font-bold text-lg">${costPerServing.toFixed(2)}</p>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Ingredients</label>
                <button
                  type="button"
                  onClick={() => append({ ingredientId: "", quantity: 1, unit: "KG" })}
                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {hasEstimatedIngredients && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/8 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                  <AlertTriangle size={12} className="shrink-0" />
                  Some ingredients have estimated prices. Create a purchase order to get real costs.
                </div>
              )}

              <div className="space-y-2">
                {fields.map((field, idx) => {
                  const selectedIng = localIngredients.find((i) => i.id === watchIngredients[idx]?.ingredientId);
                  return (
                    <div key={field.id} className="space-y-0.5">
                      <div className="grid grid-cols-[7fr_2fr_1fr_auto] gap-2 items-start">
                        <IngredientCombobox
                          value={watchIngredients[idx]?.ingredientId ?? ""}
                          onChange={(id) => setValue(`ingredients.${idx}.ingredientId`, id)}
                          ingredients={localIngredients}
                          onCreated={(ing) => setLocalIngredients((prev) => [...prev, ing])}
                        />
                        <input
                          {...register(`ingredients.${idx}.quantity`, { valueAsNumber: true })}
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="Qty"
                          className="input w-full"
                        />
                        <select {...register(`ingredients.${idx}.unit`)} className="input w-full">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {selectedIng?.yieldRate && selectedIng.yieldRate < 1 && (
                        <p className="text-[10px] text-orange-400 pl-1">
                          (yield {Math.round(selectedIng.yieldRate * 100)}% &rarr; eff. ${(selectedIng.costPerUnit / selectedIng.yieldRate).toFixed(2)}/{selectedIng.unit})
                        </p>
                      )}
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-2">No ingredients added</p>
                )}
              </div>
            </div>

            {/* Allergens */}
            {allergens.length > 0 && (
              <div>
                <label className="label">Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((a) => {
                    const selected = selectedAllergenIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAllergen(a.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          selected
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
                        )}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dietary Tags */}
            <div>
              <label className="label">Dietary</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => {
                  const selected = selectedDietaryTags.includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleDietaryTag(tag.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors ring-1",
                        selected ? tag.color : "bg-gray-800 text-gray-400 ring-gray-700 hover:ring-gray-600"
                      )}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method */}
            <div>
              <label className="label">Method</label>
              <textarea
                {...register("method")}
                rows={4}
                className="input resize-none"
                placeholder="Step-by-step cooking method..."
              />
            </div>

            {/* Link to Prep Ingredient (prep mode only) */}
            {mode === "prep" && (
              <div className="border-t border-gray-800 pt-4 mt-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Link to Prep Ingredient</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ingredient in Stock</label>
                    <select
                      value={linkIngredientId}
                      onChange={(e) => setLinkIngredientId(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">— Don&apos;t link yet —</option>
                      {localIngredients
                        .filter((i: any) => !i.prepRecipeId || i.prepRecipeId === recipe?.id)
                        .map((i: any) => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">Which stock ingredient does this recipe produce?</p>
                  </div>
                  {linkIngredientId && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Batch Yield (units produced per batch)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={linkBatchYield}
                        onChange={(e) => setLinkBatchYield(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                        placeholder="e.g. 2 (for 2L of sauce per batch)"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Saving..." : recipe ? "Save Changes" : "Create Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
