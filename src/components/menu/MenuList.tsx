"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import MenuItemModal from "./MenuItemModal";
import { useConfirm } from "@/lib/confirm";
import type { MenuItemWithRecipe, RecipeCategory } from "@/types";

const CATEGORY_TABS: { label: string; value: RecipeCategory | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Starters", value: "STARTER" },
  { label: "Mains", value: "MAIN" },
  { label: "Desserts", value: "DESSERT" },
  { label: "Beverages", value: "BEVERAGE" },
  { label: "Sides", value: "SIDE" },
  { label: "Other", value: "OTHER" },
];

export default function MenuList() {
  const confirm = useConfirm();
  const [items, setItems] = useState<MenuItemWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RecipeCategory | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemWithRecipe | null>(null);

  async function load() {
    const res = await fetch("/api/menu");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAvailable(item: MenuItemWithRecipe) {
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    load();
  }

  async function deleteItem(item: MenuItemWithRecipe) {
    if (!await confirm(`Remove "${item.name}" from the menu?`, { title: "Remove menu item", confirmText: "Remove", variant: "danger" })) return;
    await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    load();
  }

  const filtered = tab === "ALL" ? items : items.filter((i) => i.category === tab);

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

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.value
                ? "bg-orange-500/20 text-orange-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No menu items yet.{" "}
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
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Linked Recipe</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Price</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {item.recipe ? item.recipe.name : <span className="text-gray-600">Manual</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-white">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAvailable(item)}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium",
                        item.available
                          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      )}
                    >
                      {item.available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {item.available ? "Active" : "86'd"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditing(item); setModalOpen(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MenuItemModal
        item={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
