"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Header from "@/components/layout/Header";

interface TargetData {
  targets: { id: string; period: string; targetDate: string; amount: number; notes: string | null }[];
  actualRevenue: number;
  year: number;
  month: number;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(y: number, m: number) {
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TargetCard({
  period, label, description, target, actual, onSave,
}: {
  period: string;
  label: string;
  description: string;
  target: number;
  actual: number;
  onSave: (amount: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(target || ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    const amount = parseFloat(val);
    if (!amount || amount <= 0) return;
    setSaving(true);
    await onSave(amount);
    setSaving(false);
    setEditing(false);
  }

  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-white font-semibold">{label}</p>
          <p className="text-gray-500 text-xs mt-0.5">{description}</p>
        </div>
        <button onClick={() => { setVal(String(target || "")); setEditing((v) => !v); }}
          className="text-xs text-gray-500 hover:text-orange-400 transition-colors px-2 py-1">
          {editing ? "Cancel" : "Set target"}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number" min="1" autoFocus value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-full pl-7 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <button onClick={save} disabled={saving || !val}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
            {saving ? "…" : "Save"}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Actual</p>
              <p className="text-white font-bold text-lg leading-none">{formatCurrency(actual)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Target</p>
              <p className={target > 0 ? "text-gray-300 font-semibold" : "text-gray-600 text-sm"}>
                {target > 0 ? formatCurrency(target) : "Not set"}
              </p>
            </div>
          </div>
          {target > 0 && (
            <>
              <ProgressBar value={actual} max={target} />
              <p className="text-xs text-gray-500 mt-1.5 text-right">{pct.toFixed(0)}% of target</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TargetsPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState<TargetData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/finance/targets?year=${year}&month=${month}`);
    if (res.ok) setData(await res.json());
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function shiftMonth(n: number) {
    let m = month + n, y = year;
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  function getFirstOfMonth() {
    return new Date(year, month - 1, 1).toISOString();
  }

  async function saveTarget(period: string, amount: number) {
    await fetch("/api/finance/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, targetDate: getFirstOfMonth(), amount }),
    });
    await load();
  }

  const monthly = data?.targets.find((t) => t.period === "MONTHLY")?.amount ?? 0;
  const actual  = data?.actualRevenue ?? 0;

  // Estimate daily avg from actual this month (days elapsed)
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOfMonth  = month === now.getMonth() + 1 && year === now.getFullYear()
    ? now.getDate() : daysInMonth;
  const dailyActual = dayOfMonth > 0 ? actual / dayOfMonth : 0;
  const dailyTarget = data?.targets.find((t) => t.period === "DAILY")?.amount ?? 0;
  const weeklyActual = dailyActual * 7;
  const weeklyTarget = data?.targets.find((t) => t.period === "WEEKLY")?.amount ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Revenue Targets" subtitle="Set goals and track progress" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl">

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-white font-semibold text-sm min-w-32 text-center">{monthLabel(year, month)}</span>
          <button onClick={() => shiftMonth(1)}  className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"><ChevronRight size={16} /></button>
        </div>

        {/* Overview banner */}
        {monthly > 0 && (
          <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-5 flex items-center gap-5">
            <TrendingUp size={28} className="text-orange-400 shrink-0" />
            <div className="flex-1">
              <p className="text-gray-400 text-sm">Monthly revenue vs target</p>
              <div className="flex items-end gap-3 mt-1">
                <p className="text-white font-bold text-2xl">{formatCurrency(actual)}</p>
                <p className="text-gray-500 text-sm mb-0.5">of {formatCurrency(monthly)}</p>
              </div>
              <ProgressBar value={actual} max={monthly} />
            </div>
          </div>
        )}

        {/* Target cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TargetCard
            period="DAILY"
            label="Daily"
            description="Average revenue per day"
            target={dailyTarget}
            actual={dailyActual}
            onSave={(a) => saveTarget("DAILY", a)}
          />
          <TargetCard
            period="WEEKLY"
            label="Weekly"
            description="Average revenue per week"
            target={weeklyTarget}
            actual={weeklyActual}
            onSave={(a) => saveTarget("WEEKLY", a)}
          />
          <TargetCard
            period="MONTHLY"
            label="Monthly"
            description="Total revenue this month"
            target={monthly}
            actual={actual}
            onSave={(a) => saveTarget("MONTHLY", a)}
          />
        </div>

        {/* Empty state */}
        {!data && (
          <div className="text-center py-16 text-gray-500">
            <Target size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Set your first revenue target above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
