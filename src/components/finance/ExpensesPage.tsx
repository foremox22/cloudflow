"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Receipt, ChevronLeft, ChevronRight, Camera, Paperclip, X, ExternalLink, Loader2, ImageIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Header from "@/components/layout/Header";
import DatePicker from "@/components/ui/DatePicker";

type ExpenseCategory = "FOOD_BEV" | "UTILITIES" | "MAINTENANCE" | "MARKETING" | "RENT" | "EQUIPMENT" | "OTHER";

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  receiptUrl: string | null;
  createdBy: { name: string };
}

const CAT_META: Record<ExpenseCategory, { label: string; color: string }> = {
  FOOD_BEV:    { label: "Food & Bev",   color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  UTILITIES:   { label: "Utilities",    color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  MAINTENANCE: { label: "Maintenance",  color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  MARKETING:   { label: "Marketing",    color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  RENT:        { label: "Rent",         color: "bg-red-500/15 text-red-400 border-red-500/30" },
  EQUIPMENT:   { label: "Equipment",    color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  OTHER:       { label: "Other",        color: "bg-gray-700/60 text-gray-400 border-gray-700" },
};

const CATEGORIES = Object.keys(CAT_META) as ExpenseCategory[];

function monthLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

function groupByDate(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function ExpensesPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [fDesc,       setFDesc]       = useState("");
  const [fAmt,        setFAmt]        = useState("");
  const [fCat,        setFCat]        = useState<ExpenseCategory>("OTHER");
  const [fDate,       setFDate]       = useState(now.toISOString().slice(0, 10));
  const [fNotes,      setFNotes]      = useState("");
  const [fReceiptUrl, setFReceiptUrl] = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [lightbox,    setLightbox]    = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 0, 23, 59, 59).toISOString();
    const res  = await fetch(`/api/finance/expenses?from=${from}&to=${to}`);
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function shiftMonth(n: number) {
    let m = month + n;
    let y = year;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  async function handleFileSelect(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload?folder=receipts", { method: "POST", body: form });
    if (res.ok) {
      const { url } = await res.json();
      setFReceiptUrl(url);
    }
    setUploading(false);
  }

  async function addExpense() {
    const amount = parseFloat(fAmt);
    if (!fDesc.trim() || !amount || amount <= 0) return;
    setSaving(true);
    await fetch("/api/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: fDesc.trim(), amount, category: fCat, date: fDate,
        notes: fNotes.trim() || undefined,
        receiptUrl: fReceiptUrl,
      }),
    });
    setFDesc(""); setFAmt(""); setFNotes(""); setFReceiptUrl(null); setSaving(false); setShowForm(false);
    await load();
  }

  async function deleteExpense(id: string) {
    setDeleting(id);
    await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
    setDeleting(null);
    await load();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((c) => ({
    cat: c,
    total: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const grouped = groupByDate(expenses);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Expenses" subtitle="Track outgoings by category" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl">

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-white font-semibold text-sm min-w-36 text-center">{monthLabel(year, month)}</span>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"><ChevronRight size={16} /></button>
          <div className="flex-1" />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>

        {/* Summary bar */}
        {!loading && expenses.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <p className="text-white font-bold text-xl">{formatCurrency(total)}</p>
            </div>
            <div className="w-px bg-gray-800 self-stretch hidden sm:block" />
            <div className="flex flex-wrap gap-2 flex-1">
              {byCategory.map(({ cat, total: t }) => (
                <span key={cat} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", CAT_META[cat].color)}>
                  {CAT_META[cat].label} <span className="font-bold">{formatCurrency(t)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">New Expense</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <input value={fDesc} onChange={(e) => setFDesc(e.target.value)} autoFocus placeholder="e.g. Gas bill — April"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
                <input type="number" min="0.01" step="0.01" value={fAmt} onChange={(e) => setFAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <DatePicker value={fDate} onChange={setFDate} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setFCat(c)}
                      className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", fCat === c ? CAT_META[c].color : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300")}>
                      {CAT_META[c].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <input value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Invoice #, vendor name…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>

              {/* Receipt / invoice upload */}
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1.5 block">Receipt / Invoice</label>
                {fReceiptUrl ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setLightbox(fReceiptUrl)} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fReceiptUrl} alt="Receipt" className="w-20 h-20 object-cover rounded-xl border border-gray-700" />
                      <span className="absolute inset-0 rounded-xl bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ExternalLink size={14} className="text-white opacity-0 hover:opacity-100" />
                      </span>
                    </button>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-emerald-400 text-xs font-medium">Receipt uploaded</p>
                      <button onClick={() => setFReceiptUrl(null)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
                        <X size={11} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {/* Hidden inputs */}
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
                    <input ref={fileRef} type="file" accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />

                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 text-sm font-medium transition-colors disabled:opacity-40"
                    >
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 text-sm font-medium transition-colors disabled:opacity-40"
                    >
                      <Paperclip size={15} /> Choose File
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setFReceiptUrl(null); }} className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
              <button onClick={addExpense} disabled={saving || uploading || !fDesc.trim() || !fAmt}
                className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                {saving ? "Saving…" : "Add Expense"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Loading…</p>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Receipt size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No expenses recorded for {monthLabel(year, month)}.</p>
          </div>
        ) : (
          grouped.map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">
                {new Date(dateKey + "T12:00:00").toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-1.5">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 group">
                    {/* Receipt thumbnail */}
                    {e.receiptUrl ? (
                      <button onClick={() => setLightbox(e.receiptUrl!)} className="shrink-0" title="View receipt">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.receiptUrl} alt="Receipt" className="w-10 h-10 object-cover rounded-lg border border-gray-700 hover:border-orange-500/50 transition-colors" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-gray-800 bg-gray-800/50 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon size={13} className="text-gray-700" />
                      </div>
                    )}
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0", CAT_META[e.category].color)}>
                      {CAT_META[e.category].label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{e.description}</p>
                      {e.notes && <p className="text-gray-500 text-xs truncate">{e.notes}</p>}
                    </div>
                    <p className="text-white font-semibold text-sm shrink-0">{formatCurrency(e.amount)}</p>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      disabled={deleting === e.id}
                      className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Receipt"
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-gray-700"
            />
            <a
              href={lightbox}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-700 text-gray-300 text-xs hover:text-white transition-colors"
            >
              <ExternalLink size={12} /> Open full size
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
