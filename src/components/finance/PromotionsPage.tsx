"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, Tag, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Header from "@/components/layout/Header";
import DatePicker from "@/components/ui/DatePicker";

interface Promotion {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderValue: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  notes: string | null;
}

const EMPTY: Omit<Promotion, "id" | "usedCount" | "createdAt"> = {
  name: "", code: "", type: "PERCENTAGE", value: 10, minOrderValue: 0,
  maxUses: null, startsAt: "", endsAt: null, active: true, notes: null,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function isActive(p: Promotion) {
  if (!p.active) return false;
  const now = Date.now();
  if (new Date(p.startsAt).getTime() > now) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return false;
  return true;
}

export default function PromotionsPage() {
  const [promos,  setPromos]  = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"active" | "all">("active");
  const [modal,   setModal]   = useState<Promotion | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/finance/promotions");
    if (res.ok) setPromos(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(p: Promotion) {
    await fetch(`/api/finance/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await load();
  }

  async function deletePromo(id: string) {
    await fetch(`/api/finance/promotions/${id}`, { method: "DELETE" });
    await load();
  }

  const visible = tab === "active" ? promos.filter(isActive) : promos;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Promotions" subtitle="Manage discount codes and offers" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl">

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {(["active", "all"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3.5 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors",
                  tab === t ? "bg-orange-500 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white")}>
                {t === "active" ? "Active" : "All"}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setModal("new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors">
            <Plus size={15} /> New Promotion
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Tag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{tab === "active" ? "No active promotions." : "No promotions yet."}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((p) => {
              const live = isActive(p);
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{p.name}</p>
                      {p.code && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-orange-400 text-xs font-mono font-bold tracking-wider">
                          {p.code}
                        </span>
                      )}
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        live ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-700/60 text-gray-500 border-gray-700")}>
                        {live ? "Live" : p.active ? "Scheduled" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      <p className="text-orange-400 font-bold text-sm">
                        {p.type === "PERCENTAGE" ? `${p.value}% off` : `${formatCurrency(p.value)} off`}
                      </p>
                      {p.minOrderValue > 0 && <p className="text-gray-500 text-xs">Min {formatCurrency(p.minOrderValue)}</p>}
                      <p className="text-gray-500 text-xs">
                        {formatDate(p.startsAt)}{p.endsAt ? ` → ${formatDate(p.endsAt)}` : " (no end)"}
                      </p>
                      {p.maxUses !== null && (
                        <p className="text-gray-500 text-xs">{p.usedCount}/{p.maxUses} uses</p>
                      )}
                    </div>

                    {p.notes && <p className="text-gray-600 text-xs mt-1 italic">{p.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal(p)} className="p-2 rounded-lg text-gray-600 hover:text-gray-300 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => toggleActive(p)} title={p.active ? "Deactivate" : "Activate"}
                      className="p-2 rounded-lg text-gray-600 hover:text-orange-400 transition-colors">
                      {p.active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => deletePromo(p.id)} className="p-2 rounded-lg text-gray-700 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <PromotionModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ── Modal ── */

function PromotionModal({ initial, onClose, onSaved }: { initial: Promotion | null; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [name,     setName]     = useState(initial?.name ?? "");
  const [code,     setCode]     = useState(initial?.code ?? "");
  const [type,     setType]     = useState<"PERCENTAGE" | "FIXED">(initial?.type ?? "PERCENTAGE");
  const [value,    setValue]    = useState(String(initial?.value ?? 10));
  const [minOrder, setMinOrder] = useState(String(initial?.minOrderValue ?? 0));
  const [maxUses,  setMaxUses]  = useState(String(initial?.maxUses ?? ""));
  const [startsAt, setStartsAt] = useState(initial ? initial.startsAt.slice(0, 10) : today);
  const [endsAt,   setEndsAt]   = useState(initial?.endsAt ? initial.endsAt.slice(0, 10) : "");
  const [notes,    setNotes]    = useState(initial?.notes ?? "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    if (!name.trim()) { setError("Name is required."); return; }
    const v = parseFloat(value);
    if (!v || v <= 0) { setError("Value must be positive."); return; }
    setSaving(true); setError("");
    const body = {
      name: name.trim(), code: code.trim() || null, type, value: v,
      minOrderValue: parseFloat(minOrder) || 0,
      maxUses: maxUses ? parseInt(maxUses) : null,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      notes: notes.trim() || null,
    };
    const res = initial
      ? await fetch(`/api/finance/promotions/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/finance/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError("Something went wrong."); setSaving(false); return; }
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-white font-semibold">{initial ? "Edit Promotion" : "New Promotion"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Happy Hour 20% Off"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Promo Code (optional — leave blank for automatic)</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. HAPPY20"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Type</label>
              <div className="flex gap-1.5">
                {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={cn("flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                      type === t ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white")}>
                    {t === "PERCENTAGE" ? "%" : "$"} Fixed
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{type === "PERCENTAGE" ? "Discount %" : "Discount $"}</label>
              <input type="number" min="0.01" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Order ($)</label>
              <input type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Uses (blank = unlimited)</label>
              <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Starts</label>
              <DatePicker value={startsAt} onChange={setStartsAt} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ends (optional)</label>
              <DatePicker value={endsAt} onChange={setEndsAt} placeholder="No end date" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {saving ? "Saving…" : initial ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
