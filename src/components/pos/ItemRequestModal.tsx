"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { MenuItemWithRecipe, OrderItemDetail } from "@/types";

// Fallback built-in groups (price = 0 for all)
const BUILTIN_FOOD_GROUPS = [
  { label: "Dietary",       color: "emerald", tags: [
    { label: "Gluten-Free" }, { label: "Vegan" }, { label: "Vegetarian" },
    { label: "Dairy-Free" }, { label: "Halal" }, { label: "Nut-Free" }, { label: "Low-Carb" },
  ]},
  { label: "Spice",         color: "red",     tags: [
    { label: "No Spice" }, { label: "Mild" }, { label: "Medium Spice" }, { label: "Extra Spicy" },
  ]},
  { label: "Modifications", color: "blue",    tags: [
    { label: "No Onion" }, { label: "No Garlic" }, { label: "No Salt" },
    { label: "Less Salt" }, { label: "No Sauce" }, { label: "Extra Sauce" }, { label: "Extra Portion" },
  ]},
  { label: "Cooking",       color: "amber",   tags: [
    { label: "Rare" }, { label: "Medium Rare" }, { label: "Medium" }, { label: "Well Done" },
  ]},
];
const BUILTIN_BEVERAGE_GROUPS = [
  { label: "Temperature", color: "sky",    tags: [
    { label: "Iced" }, { label: "Hot" }, { label: "Extra Hot" }, { label: "Room Temperature" },
  ]},
  { label: "Ice",         color: "blue",   tags: [
    { label: "No Ice" }, { label: "Less Ice" }, { label: "Normal Ice" }, { label: "Extra Ice" },
  ]},
  { label: "Sweetness",   color: "pink",   tags: [
    { label: "No Sugar" }, { label: "Less Sweet" }, { label: "Normal Sweet" }, { label: "Extra Sweet" },
  ]},
  { label: "Milk",        color: "amber",  tags: [
    { label: "Full Cream" }, { label: "Oat Milk" }, { label: "Almond Milk" }, { label: "Skim Milk" }, { label: "No Milk" },
  ]},
  { label: "Extras",      color: "violet", tags: [
    { label: "Extra Shot" }, { label: "Decaf" }, { label: "Extra Syrup" },
    { label: "No Straw" }, { label: "Large" }, { label: "No Garnish" },
  ]},
];

const COLOR_ACTIVE: Record<string, string> = {
  gray:    "bg-gray-500/25 text-gray-300 border-gray-500/50",
  emerald: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50",
  red:     "bg-red-500/25 text-red-300 border-red-500/50",
  blue:    "bg-blue-500/25 text-blue-300 border-blue-500/50",
  amber:   "bg-amber-500/25 text-amber-300 border-amber-500/50",
  sky:     "bg-sky-500/25 text-sky-300 border-sky-500/50",
  pink:    "bg-pink-500/25 text-pink-300 border-pink-500/50",
  violet:  "bg-violet-500/25 text-violet-300 border-violet-500/50",
  teal:    "bg-teal-500/25 text-teal-300 border-teal-500/50",
  orange:  "bg-orange-500/25 text-orange-300 border-orange-500/50",
};

interface TagOption  { label: string; price?: number }
interface GroupOption { label: string; color: string; tags: TagOption[] }
interface CustomGroup { id: string; name: string; color: string; appliesTo: string[]; menuItemId: string | null; tags: { id: string; label: string; price: number }[] }

function toGlobalGroups(custom: CustomGroup[], category: string): GroupOption[] {
  const filtered = custom.filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(category));
  if (filtered.length > 0) {
    return filtered.map((g) => ({
      label: g.name,
      color: g.color,
      tags: g.tags.map((t) => ({ label: t.label, price: t.price })),
    }));
  }
  return category === "BEVERAGE" ? BUILTIN_BEVERAGE_GROUPS : BUILTIN_FOOD_GROUPS;
}

function toItemGroups(custom: CustomGroup[]): GroupOption[] {
  return custom.map((g) => ({
    label: g.name,
    color: g.color,
    tags: g.tags.map((t) => ({ label: t.label, price: t.price })),
  }));
}

interface Props {
  item: MenuItemWithRecipe;
  cartItems: OrderItemDetail[];
  onAdd: (specialRequests: string[], notes: string, priceAdjustment: number) => void;
  onChangeQty: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
  onClose: () => void;
}

export default function ItemRequestModal({ item, cartItems, onAdd, onChangeQty, onRemove, onClose }: Props) {
  const [selected,      setSelected]      = useState<string[]>([]);
  const [notes,         setNotes]         = useState("");
  const [globalGroups,  setGlobalGroups]  = useState<CustomGroup[]>([]);
  const [itemGroups,    setItemGroups]    = useState<CustomGroup[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/modifier-groups").then((r) => r.ok ? r.json() : []),
      fetch(`/api/modifier-groups?menuItemId=${item.id}`).then((r) => r.ok ? r.json() : []),
    ]).then(([global, specific]) => {
      setGlobalGroups(Array.isArray(global) ? global : []);
      setItemGroups(Array.isArray(specific) ? specific : []);
    });
  }, [item.id]);

  // Item-specific groups always shown; global groups fill the rest
  const specificDisplayGroups = toItemGroups(itemGroups);
  const globalDisplayGroups   = toGlobalGroups(globalGroups, item.category);
  const groups = [...specificDisplayGroups, ...globalDisplayGroups];

  // Build a price map from all tag options so we can look up prices fast
  const priceMap = new Map<string, number>();
  for (const g of groups) {
    for (const t of g.tags) {
      if (t.price && t.price > 0) priceMap.set(t.label, t.price);
    }
  }

  const priceAdjustment = selected.reduce((sum, tag) => sum + (priceMap.get(tag) ?? 0), 0);
  const totalPrice = item.price + priceAdjustment;

  const activeCartItems = cartItems.filter((ci) => ci.status !== "VOID");

  function toggle(tag: string) {
    setSelected((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function handleAdd() {
    // Format priced tags as "Extra Shot (+$0.50)" so KDS/receipts are descriptive
    const formatted = selected.map((tag) => {
      const p = priceMap.get(tag);
      return p && p > 0 ? `${tag} (+${formatCurrency(p)})` : tag;
    });
    onAdd(formatted, notes.trim(), priceAdjustment);
    setSelected([]);
    setNotes("");
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <p className="text-white font-semibold leading-tight">{item.name}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-orange-400 font-bold text-lg">{formatCurrency(item.price)}</p>
              {priceAdjustment > 0 && (
                <p className="text-xs text-gray-400">
                  + {formatCurrency(priceAdjustment)} modifiers
                  <span className="ml-1.5 text-orange-300 font-semibold">= {formatCurrency(totalPrice)}</span>
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── In Cart section ── */}
          {activeCartItems.length > 0 && (
            <div className="px-5 pt-4 pb-3 space-y-2 border-b border-gray-800">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <ShoppingCart size={11} /> In Cart
              </p>
              {activeCartItems.map((ci) => (
                <div key={ci.id} className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2.5">

                  {/* Qty stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => ci.quantity > 1 ? onChangeQty(ci.id, -1) : onRemove(ci.id)}
                      className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-white font-semibold text-sm">{ci.quantity}</span>
                    <button
                      onClick={() => onChangeQty(ci.id, 1)}
                      className="w-7 h-7 rounded-lg bg-orange-500/20 hover:bg-orange-500 border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Tags / notes */}
                  <div className="flex-1 min-w-0">
                    {ci.specialRequests.length > 0 && (
                      <p className="text-[11px] text-gray-400 truncate">{ci.specialRequests.join(", ")}</p>
                    )}
                    {ci.notes && (
                      <p className="text-[11px] text-gray-500 italic truncate">{ci.notes}</p>
                    )}
                    {ci.specialRequests.length === 0 && !ci.notes && (
                      <p className="text-[11px] text-gray-600">No modifiers</p>
                    )}
                  </div>

                  {/* Line total */}
                  <span className="text-orange-400 font-semibold text-sm shrink-0">
                    {formatCurrency(ci.unitPrice * ci.quantity)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => onRemove(ci.id)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Add / Customise section ── */}
          <div className="px-5 pt-4 pb-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {activeCartItems.length > 0 ? "Add Another" : "Customise & Add"}
            </p>

            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map((tag) => {
                    const active = selected.includes(tag.label);
                    const hasPrice = (tag.price ?? 0) > 0;
                    return (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => toggle(tag.label)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                          active
                            ? (COLOR_ACTIVE[group.color] ?? COLOR_ACTIVE.gray)
                            : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-300"
                        )}
                      >
                        {tag.label}
                        {hasPrice ? (
                          <span className={cn(
                            "text-[10px] font-semibold",
                            active ? "opacity-80" : "text-orange-400"
                          )}>
                            ({formatCurrency(tag.price!)})
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <MessageSquare size={11} /> Special Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. allergy note, sauce on the side…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:border-gray-600 transition-colors">
            Done
          </button>
          <button type="button" onClick={handleAdd}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors">
            + Add {priceAdjustment > 0 ? formatCurrency(totalPrice) : "to Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
