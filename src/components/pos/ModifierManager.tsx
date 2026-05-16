"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X, Tag, ChevronDown } from "lucide-react";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { value: "gray",    label: "Gray",   active: "bg-gray-500/25 text-gray-300 border-gray-500/50",    dot: "bg-gray-400" },
  { value: "emerald", label: "Green",  active: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50", dot: "bg-emerald-400" },
  { value: "red",     label: "Red",    active: "bg-red-500/25 text-red-300 border-red-500/50",       dot: "bg-red-400" },
  { value: "blue",    label: "Blue",   active: "bg-blue-500/25 text-blue-300 border-blue-500/50",    dot: "bg-blue-400" },
  { value: "amber",   label: "Amber",  active: "bg-amber-500/25 text-amber-300 border-amber-500/50", dot: "bg-amber-400" },
  { value: "sky",     label: "Sky",    active: "bg-sky-500/25 text-sky-300 border-sky-500/50",       dot: "bg-sky-400" },
  { value: "pink",    label: "Pink",   active: "bg-pink-500/25 text-pink-300 border-pink-500/50",    dot: "bg-pink-400" },
  { value: "violet",  label: "Purple", active: "bg-violet-500/25 text-violet-300 border-violet-500/50", dot: "bg-violet-400" },
  { value: "teal",    label: "Teal",   active: "bg-teal-500/25 text-teal-300 border-teal-500/50",    dot: "bg-teal-400" },
  { value: "orange",  label: "Orange", active: "bg-orange-500/25 text-orange-300 border-orange-500/50", dot: "bg-orange-400" },
];

const CATEGORY_OPTIONS = [
  { value: "BEVERAGE", label: "Beverages" },
  { value: "MAIN",     label: "Mains" },
  { value: "STARTER",  label: "Starters" },
  { value: "DESSERT",  label: "Desserts" },
  { value: "SIDE",     label: "Sides" },
  { value: "OTHER",    label: "Other" },
];

interface ModifierTag   { id: string; label: string; price: number; sortOrder: number }
interface ModifierGroup {
  id: string; name: string; color: string; appliesTo: string[];
  menuItemId: string | null; sortOrder: number; active: boolean; tags: ModifierTag[];
}
interface MenuItem { id: string; name: string; category: string }

function colorStyle(color: string) {
  return COLOR_OPTIONS.find((c) => c.value === color) ?? COLOR_OPTIONS[0];
}

// ─── Reusable Group Card ──────────────────────────────────────────────────────

interface GroupCardProps {
  group: ModifierGroup;
  showAppliesTo?: boolean;
  onSaved: () => void;
}

function GroupCard({ group, showAppliesTo = true, onSaved }: GroupCardProps) {
  const cs = colorStyle(group.color);
  const [editing, setEditing]           = useState(false);
  const [editName, setEditName]         = useState(group.name);
  const [editColor, setEditColor]       = useState(group.color);
  const [editAppliesTo, setEditAppliesTo] = useState<string[]>(group.appliesTo);
  const [addingTag, setAddingTag]       = useState(false);
  const [newLabel, setNewLabel]         = useState("");
  const [newPrice, setNewPrice]         = useState("");
  const [editTagId, setEditTagId]       = useState<string | null>(null);
  const [editTagLabel, setEditTagLabel] = useState("");
  const [editTagPrice, setEditTagPrice] = useState("");
  const newTagRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingTag) newTagRef.current?.focus(); }, [addingTag]);

  async function saveGroup() {
    await fetch(`/api/modifier-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor, appliesTo: editAppliesTo }),
    });
    setEditing(false); onSaved();
  }

  async function deleteGroup() {
    if (!confirm("Delete this modifier group and all its tags?")) return;
    await fetch(`/api/modifier-groups/${group.id}`, { method: "DELETE" });
    onSaved();
  }

  async function addTag() {
    if (!newLabel.trim()) return;
    await fetch(`/api/modifier-groups/${group.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), price: parseFloat(newPrice) || 0 }),
    });
    setNewLabel(""); setNewPrice(""); setAddingTag(false); onSaved();
  }

  async function saveTag(tagId: string) {
    if (!editTagLabel.trim()) return;
    await fetch(`/api/modifier-groups/${group.id}/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editTagLabel.trim(), price: parseFloat(editTagPrice) || 0 }),
    });
    setEditTagId(null); onSaved();
  }

  async function deleteTag(tagId: string) {
    await fetch(`/api/modifier-groups/${group.id}/tags/${tagId}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Group header */}
      {editing ? (
        <div className="p-4 space-y-3 border-b border-gray-800">
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGroup()} autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50" />
          <div>
            <p className="text-xs text-gray-500 mb-2">Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c.value} onClick={() => setEditColor(c.value)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                    editColor === c.value ? c.active : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500")}>
                  <span className={cn("w-2 h-2 rounded-full", c.dot)} /> {c.label}
                </button>
              ))}
            </div>
          </div>
          {showAppliesTo && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Applies to <span className="text-gray-600">(empty = all)</span></p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button key={cat.value}
                    onClick={() => setEditAppliesTo((p) => p.includes(cat.value) ? p.filter((v) => v !== cat.value) : [...p, cat.value])}
                    className={cn("px-2.5 py-1 rounded-full text-xs border transition-colors",
                      editAppliesTo.includes(cat.value)
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                        : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500")}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs hover:border-gray-600 transition-colors">Cancel</button>
            <button onClick={saveGroup} className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition-colors">Save</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cs.dot)} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{group.name}</p>
            {showAppliesTo && group.appliesTo.length > 0 && (
              <p className="text-xs text-gray-500">
                {group.appliesTo.map((a) => CATEGORY_OPTIONS.find((c) => c.value === a)?.label ?? a).join(", ")}
              </p>
            )}
          </div>
          <button onClick={() => { setEditing(true); setEditName(group.name); setEditColor(group.color); setEditAppliesTo(group.appliesTo); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={deleteGroup} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Tags */}
      <div className="p-4 flex flex-wrap gap-2">
        {group.tags.map((tag) =>
          editTagId === tag.id ? (
            <div key={tag.id} className="flex items-center gap-1">
              <input value={editTagLabel} onChange={(e) => setEditTagLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTag(tag.id); if (e.key === "Escape") setEditTagId(null); }}
                autoFocus placeholder="Label"
                className="bg-gray-800 border border-orange-500/50 rounded-lg px-2 py-1 text-white text-xs w-24 focus:outline-none" />
              <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                <span className="text-gray-500 text-xs">$</span>
                <input value={editTagPrice} onChange={(e) => setEditTagPrice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTag(tag.id); if (e.key === "Escape") setEditTagId(null); }}
                  placeholder="0.00" type="number" min="0" step="0.50"
                  className="bg-transparent text-white text-xs w-14 focus:outline-none" />
              </div>
              <button onClick={() => saveTag(tag.id)} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={12} /></button>
              <button onClick={() => setEditTagId(null)} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>
            </div>
          ) : (
            <div key={tag.id} className="group/tag flex items-center gap-0.5">
              <span className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", cs.active)}>
                {tag.label}
                {tag.price > 0 && <span className="opacity-70 font-semibold">+${tag.price.toFixed(2)}</span>}
              </span>
              <button onClick={() => { setEditTagId(tag.id); setEditTagLabel(tag.label); setEditTagPrice(tag.price > 0 ? String(tag.price) : ""); }}
                className="opacity-0 group-hover/tag:opacity-100 p-0.5 ml-0.5 rounded text-gray-500 hover:text-gray-300 transition-all">
                <Pencil size={10} />
              </button>
              <button onClick={() => deleteTag(tag.id)}
                className="opacity-0 group-hover/tag:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 transition-all">
                <X size={10} />
              </button>
            </div>
          )
        )}

        {/* Add tag inline */}
        {addingTag ? (
          <div className="flex items-center gap-1 flex-wrap">
            <input ref={newTagRef} value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") { setAddingTag(false); setNewLabel(""); setNewPrice(""); } }}
              placeholder="Tag name"
              className="bg-gray-800 border border-orange-500/50 rounded-lg px-2 py-1 text-white text-xs w-24 focus:outline-none placeholder-gray-600" />
            <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
              <span className="text-gray-500 text-xs">$</span>
              <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") { setAddingTag(false); setNewLabel(""); setNewPrice(""); } }}
                placeholder="0.00" type="number" min="0" step="0.50"
                className="bg-transparent text-white text-xs w-14 focus:outline-none placeholder-gray-600" />
            </div>
            <button onClick={addTag} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={12} /></button>
            <button onClick={() => { setAddingTag(false); setNewLabel(""); setNewPrice(""); }} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>
          </div>
        ) : (
          <button onClick={() => { setAddingTag(true); setNewLabel(""); setNewPrice(""); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors">
            <Plus size={11} /> Add tag
          </button>
        )}
      </div>
    </div>
  );
}

// ─── New Group Form ───────────────────────────────────────────────────────────

interface NewGroupFormProps {
  menuItemId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

function NewGroupForm({ menuItemId, onSaved, onCancel }: NewGroupFormProps) {
  const [name,      setName]      = useState("");
  const [color,     setColor]     = useState("gray");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [saving,    setSaving]    = useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/modifier-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, appliesTo, menuItemId: menuItemId ?? null }),
    });
    setSaving(false); onSaved();
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
      <p className="text-sm font-semibold text-white">New Modifier Group</p>
      <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="e.g. Size, Temperature, Cooking" autoFocus
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
      <div>
        <p className="text-xs text-gray-500 mb-2">Colour</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button key={c.value} onClick={() => setColor(c.value)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                color === c.value ? c.active : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500")}>
              <span className={cn("w-2 h-2 rounded-full", c.dot)} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      {!menuItemId && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Applies to <span className="text-gray-600">(empty = all categories)</span></p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button key={cat.value}
                onClick={() => setAppliesTo((p) => p.includes(cat.value) ? p.filter((v) => v !== cat.value) : [...p, cat.value])}
                className={cn("px-2.5 py-1 rounded-full text-xs border transition-colors",
                  appliesTo.includes(cat.value)
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500")}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
        <button onClick={create} disabled={saving || !name.trim()}
          className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
          {saving ? "Creating…" : "Create Group"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModifierManager() {
  const [tab, setTab] = useState<"global" | "item">("global");

  // Global tab state
  const [globalGroups, setGlobalGroups] = useState<ModifierGroup[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showNewGlobal, setShowNewGlobal] = useState(false);

  // Item tab state
  const [menuItems,      setMenuItems]      = useState<MenuItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [itemGroups,     setItemGroups]     = useState<ModifierGroup[]>([]);
  const [itemLoading,    setItemLoading]    = useState(false);
  const [showNewItem,    setShowNewItem]    = useState(false);

  async function reloadGlobal() {
    setGlobalLoading(true);
    const res = await fetch("/api/modifier-groups");
    if (res.ok) setGlobalGroups(await res.json());
    setGlobalLoading(false);
  }

  async function reloadItemGroups(itemId: string) {
    if (!itemId) return;
    setItemLoading(true);
    const res = await fetch(`/api/modifier-groups?menuItemId=${itemId}`);
    if (res.ok) setItemGroups(await res.json());
    setItemLoading(false);
  }

  useEffect(() => { reloadGlobal(); }, []);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.ok ? r.json() : [])
      .then((items) => {
        setMenuItems(Array.isArray(items) ? items : []);
      });
  }, []);

  useEffect(() => {
    if (selectedItemId) reloadItemGroups(selectedItemId);
    else setItemGroups([]);
  }, [selectedItemId]);

  const selectedItem = menuItems.find((m) => m.id === selectedItemId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="POS Modifier Tags" subtitle="Customise modifier options shown when adding items" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl">

        {/* Tabs */}
        <div className="flex gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit">
          <button onClick={() => setTab("global")}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === "global" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>
            Global Groups
          </button>
          <button onClick={() => setTab("item")}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === "item" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>
            By Menu Item
          </button>
        </div>

        {/* ── Global Tab ── */}
        {tab === "global" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Apply to all items or by category</p>
              {!showNewGlobal && (
                <button onClick={() => setShowNewGlobal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors">
                  <Plus size={14} /> New Group
                </button>
              )}
            </div>

            {showNewGlobal && (
              <NewGroupForm menuItemId={null} onSaved={() => { setShowNewGlobal(false); reloadGlobal(); }} onCancel={() => setShowNewGlobal(false)} />
            )}

            {globalLoading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : globalGroups.length === 0 && !showNewGlobal ? (
              <div className="text-center py-16 text-gray-500">
                <Tag size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No global modifier groups yet.</p>
                <p className="text-xs text-gray-600 mt-1">The POS will use built-in tags until you add your own.</p>
              </div>
            ) : (
              globalGroups.map((g) => <GroupCard key={g.id} group={g} showAppliesTo onSaved={reloadGlobal} />)
            )}
          </>
        )}

        {/* ── By Item Tab ── */}
        {tab === "item" && (
          <>
            {/* Menu item selector */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Select a menu item</label>
              <div className="relative">
                <select value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); setShowNewItem(false); }}
                  className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 pr-8">
                  <option value="">— Choose a menu item —</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {selectedItemId && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Modifier groups specific to <span className="text-white font-medium">{selectedItem?.name}</span>
                  </p>
                  {!showNewItem && (
                    <button onClick={() => setShowNewItem(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors">
                      <Plus size={14} /> New Group
                    </button>
                  )}
                </div>

                {showNewItem && (
                  <NewGroupForm
                    menuItemId={selectedItemId}
                    onSaved={() => { setShowNewItem(false); reloadItemGroups(selectedItemId); }}
                    onCancel={() => setShowNewItem(false)}
                  />
                )}

                {itemLoading ? (
                  <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
                ) : itemGroups.length === 0 && !showNewItem ? (
                  <div className="text-center py-12 text-gray-500">
                    <Tag size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No item-specific modifiers for this item.</p>
                    <p className="text-xs text-gray-600 mt-1">These will appear first in the POS for this item only.</p>
                  </div>
                ) : (
                  itemGroups.map((g) => (
                    <GroupCard key={g.id} group={g} showAppliesTo={false} onSaved={() => reloadItemGroups(selectedItemId)} />
                  ))
                )}
              </>
            )}

            {!selectedItemId && (
              <div className="text-center py-16 text-gray-500">
                <Tag size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a menu item above to manage its modifiers.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
