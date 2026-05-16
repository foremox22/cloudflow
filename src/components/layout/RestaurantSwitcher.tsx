"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Check, Plus, X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: string;
  name: string;
  type: string;
  role: string;
  active: boolean;
}

const RESTAURANT_TYPES = [
  { value: "CAFE",     label: "Cafe" },
  { value: "DINE_IN",  label: "Dine-in Restaurant" },
  { value: "TAKEAWAY", label: "Takeaway Shop" },
] as const;

type RestaurantTypeValue = typeof RESTAURANT_TYPES[number]["value"];

interface Props {
  collapsed?: boolean;
}

export default function RestaurantSwitcher({ collapsed = false }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<RestaurantTypeValue>("DINE_IN");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then(setRestaurants)
      .catch(() => null);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function switchTo(id: string) {
    setOpen(false);
    await fetch("/api/restaurants/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: id }),
    });
    window.location.reload();
  }

  function openModal() {
    setOpen(false);
    setNewName("");
    setNewType("DINE_IN");
    setShowModal(true);
  }

  async function createRestaurant() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    });
    if (res.ok) {
      const created = await res.json();
      setShowModal(false);
      await switchTo(created.id);
    }
    setSaving(false);
  }

  const active = restaurants.find((r) => r.active) ?? restaurants[0];
  const isAdmin = active?.role === "ADMIN";

  if (restaurants.length === 0) return null;

  // ── Non-admin: static label, no dropdown ──────────────────────────────────
  if (!isAdmin) {
    return (
      <div
        title={collapsed ? (active?.name ?? "Restaurant") : undefined}
        className={cn(
          "flex items-center rounded-lg",
          collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
        )}
      >
        <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center shrink-0">
          <Building2 size={13} className="text-orange-400" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">
                {active?.name ?? "—"}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
                {active?.role?.toLowerCase()}
              </p>
            </div>
            <Lock size={11} className="text-gray-600 shrink-0" />
          </>
        )}
      </div>
    );
  }

  // ── Admin: full switcher with dropdown + add ───────────────────────────────
  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          title={collapsed ? (active?.name ?? "Restaurant") : undefined}
          className={cn(
            "flex items-center w-full hover:bg-gray-800 transition-colors rounded-lg text-left",
            collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
          )}
        >
          <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-orange-400" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none">
                  {active?.name ?? "—"}
                </p>
                {restaurants.length > 1 && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{restaurants.length} restaurants</p>
                )}
              </div>
              <ChevronDown size={12} className={cn("text-gray-500 shrink-0 transition-transform", open && "rotate-180")} />
            </>
          )}
        </button>

        {open && (
          <div className={cn(
            "absolute z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[200px]",
            collapsed ? "left-full ml-2 top-0" : "top-full mt-1 left-0 right-0"
          )}>
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => switchTo(r.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <Check size={13} className={cn("shrink-0", r.active ? "text-orange-400" : "invisible")} />
                <span className={cn("truncate", r.active ? "text-white font-medium" : "text-gray-300")}>
                  {r.name}
                </span>
                <span className="ml-auto text-[10px] text-gray-500 capitalize">{r.role.toLowerCase()}</span>
              </button>
            ))}

            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={openModal}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <Plus size={12} />
                Add restaurant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── New Restaurant Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Building2 size={15} className="text-orange-400" />
                </div>
                <h2 className="text-white font-semibold text-base">New Restaurant</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Restaurant Name <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) createRestaurant(); }}
                placeholder="e.g. The Garden Café"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Restaurant Type <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {RESTAURANT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setNewType(t.value)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
                      newType === t.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-300"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      newType === t.value ? "border-orange-500" : "border-gray-600"
                    )}>
                      {newType === t.value && (
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRestaurant}
                disabled={!newName.trim() || saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Creating…" : "Create Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
