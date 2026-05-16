"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Banknote, Clock, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Header from "@/components/layout/Header";
import DatePicker from "@/components/ui/DatePicker";

interface PayrollEntry {
  id: string;
  userId: string;
  userName: string;
  hoursWorked: number;
  hourlyRate: number;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  notes: string | null;
}

interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "APPROVED" | "PAID";
  totalAmount: number;
  notes: string | null;
  createdBy: { name: string };
  entries: PayrollEntry[];
}

interface PreviewEntry {
  userId: string;
  userName: string;
  role: string;
  hoursWorked: number;
  shiftCount: number;
}

const STATUS_META = {
  DRAFT:    { label: "Draft",    color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Approved", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  PAID:     { label: "Paid",     color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString([], { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

export default function PayrollPage() {
  const [runs,    setRuns]    = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/finance/payroll");
    if (res.ok) setRuns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: PayrollRun["status"]) {
    await fetch(`/api/finance/payroll/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function deleteRun(id: string) {
    await fetch(`/api/finance/payroll/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Payroll" subtitle="Pay runs generated from roster shifts" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl">

        <div className="flex justify-end">
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors">
            <Plus size={15} /> New Pay Run
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Loading…</p>
        ) : runs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Banknote size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payroll runs yet.</p>
            <p className="text-xs text-gray-600 mt-1">Create one by selecting a date range from your roster.</p>
          </div>
        ) : (
          runs.map((run) => {
            const isOpen = expanded === run.id;
            const meta   = STATUS_META[run.status];
            return (
              <div key={run.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Run header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : run.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{formatPeriod(run.periodStart, run.periodEnd)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{run.entries.length} employees · by {run.createdBy.name}</p>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0", meta.color)}>
                    {meta.label}
                  </span>
                  <p className="text-white font-bold shrink-0">{formatCurrency(run.totalAmount)}</p>
                  {isOpen ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="text-left pb-2 font-medium">Employee</th>
                            <th className="text-right pb-2 font-medium">Hours</th>
                            <th className="text-right pb-2 font-medium">Rate</th>
                            <th className="text-right pb-2 font-medium">Base</th>
                            <th className="text-right pb-2 font-medium">Bonus</th>
                            <th className="text-right pb-2 font-medium">Deduct.</th>
                            <th className="text-right pb-2 font-medium">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {run.entries.map((e) => (
                            <tr key={e.id} className="text-gray-300">
                              <td className="py-2 text-white font-medium">{e.userName}</td>
                              <td className="py-2 text-right tabular-nums">{e.hoursWorked.toFixed(1)}h</td>
                              <td className="py-2 text-right tabular-nums">{formatCurrency(e.hourlyRate)}/h</td>
                              <td className="py-2 text-right tabular-nums">{formatCurrency(e.baseAmount)}</td>
                              <td className="py-2 text-right tabular-nums text-emerald-400">{e.bonus > 0 ? `+${formatCurrency(e.bonus)}` : "—"}</td>
                              <td className="py-2 text-right tabular-nums text-red-400">{e.deductions > 0 ? `-${formatCurrency(e.deductions)}` : "—"}</td>
                              <td className="py-2 text-right tabular-nums text-white font-semibold">{formatCurrency(e.netAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={6} className="pt-3 text-right text-gray-500 text-xs font-medium">Total</td>
                            <td className="pt-3 text-right text-white font-bold">{formatCurrency(run.totalAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {run.status === "DRAFT" && (
                        <button onClick={() => updateStatus(run.id, "APPROVED")}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 text-xs font-semibold transition-colors">
                          <CheckCircle2 size={13} /> Approve
                        </button>
                      )}
                      {run.status === "APPROVED" && (
                        <button onClick={() => updateStatus(run.id, "PAID")}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors">
                          <Banknote size={13} /> Mark Paid
                        </button>
                      )}
                      {run.status === "DRAFT" && (
                        <button onClick={() => deleteRun(run.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-500 hover:text-red-400 text-xs transition-colors">
                          <X size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showNew && <NewRunModal onClose={() => setShowNew(false)} onSaved={load} />}
    </div>
  );
}

/* ── New Pay Run modal ── */

function NewRunModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [from,    setFrom]    = useState(firstOfMonth);
  const [to,      setTo]      = useState(lastOfMonth);
  const [preview, setPreview] = useState<PreviewEntry[] | null>(null);
  const [rates,   setRates]   = useState<Record<string, string>>({});
  const [bonuses, setBonuses] = useState<Record<string, string>>({});
  const [deducts, setDeducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [notes,   setNotes]   = useState("");
  const [error,   setError]   = useState("");

  async function loadPreview() {
    setLoading(true);
    const res = await fetch(`/api/finance/payroll/preview?from=${from}&to=${to}`);
    if (res.ok) {
      const data: PreviewEntry[] = await res.json();
      setPreview(data);
      // Init rate inputs
      const initRates: Record<string, string> = {};
      data.forEach((e) => { initRates[e.userId] = ""; });
      setRates(initRates);
      setBonuses({});
      setDeducts({});
    }
    setLoading(false);
  }

  async function create() {
    if (!preview || preview.length === 0) { setError("No shifts found for this period."); return; }
    setSaving(true); setError("");
    const entries = preview.map((e) => ({
      userId:      e.userId,
      userName:    e.userName,
      hoursWorked: e.hoursWorked,
      hourlyRate:  parseFloat(rates[e.userId] || "0") || 0,
      bonus:       parseFloat(bonuses[e.userId] || "0") || 0,
      deductions:  parseFloat(deducts[e.userId] || "0") || 0,
    }));
    const res = await fetch("/api/finance/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodStart: from, periodEnd: to, notes: notes || undefined, entries }),
    });
    if (!res.ok) { setError("Failed to create payroll run."); setSaving(false); return; }
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-white font-semibold">New Pay Run</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date range */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Period Start</label>
              <DatePicker value={from} onChange={setFrom} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Period End</label>
              <DatePicker value={to} onChange={setTo} />
            </div>
            <button onClick={loadPreview} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-40">
              <Clock size={14} /> {loading ? "Loading…" : "Load Shifts"}
            </button>
          </div>

          {/* Preview table */}
          {preview && (
            preview.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No roster shifts found for this period.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Shift Summary — enter hourly rates</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left pb-2 font-medium">Employee</th>
                        <th className="text-right pb-2 font-medium">Hours</th>
                        <th className="text-right pb-2 font-medium">Rate ($/h)</th>
                        <th className="text-right pb-2 font-medium">Bonus ($)</th>
                        <th className="text-right pb-2 font-medium">Deduct. ($)</th>
                        <th className="text-right pb-2 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {preview.map((e) => {
                        const rate = parseFloat(rates[e.userId] || "0") || 0;
                        const bonus = parseFloat(bonuses[e.userId] || "0") || 0;
                        const deduct = parseFloat(deducts[e.userId] || "0") || 0;
                        const net = Math.max(0, e.hoursWorked * rate + bonus - deduct);
                        return (
                          <tr key={e.userId} className="text-gray-300">
                            <td className="py-2.5 text-white font-medium">{e.userName}<span className="ml-2 text-gray-600 text-xs font-normal">{e.shiftCount} shifts</span></td>
                            <td className="py-2.5 text-right tabular-nums">{e.hoursWorked.toFixed(1)}h</td>
                            <td className="py-2.5 text-right">
                              <input type="number" min="0" step="0.5" value={rates[e.userId] ?? ""}
                                onChange={(ev) => setRates((r) => ({ ...r, [e.userId]: ev.target.value }))}
                                placeholder="0"
                                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-orange-500/50" />
                            </td>
                            <td className="py-2.5 text-right">
                              <input type="number" min="0" step="1" value={bonuses[e.userId] ?? ""}
                                onChange={(ev) => setBonuses((b) => ({ ...b, [e.userId]: ev.target.value }))}
                                placeholder="0"
                                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-orange-500/50" />
                            </td>
                            <td className="py-2.5 text-right">
                              <input type="number" min="0" step="1" value={deducts[e.userId] ?? ""}
                                onChange={(ev) => setDeducts((d) => ({ ...d, [e.userId]: ev.target.value }))}
                                placeholder="0"
                                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-orange-500/50" />
                            </td>
                            <td className="py-2.5 text-right text-white font-semibold tabular-nums">{formatCurrency(net)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Run Notes</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this pay run…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
                </div>
              </div>
            )
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
            <button onClick={create} disabled={saving || !preview || preview.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              {saving ? "Creating…" : "Create Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
