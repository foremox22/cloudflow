"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, ShoppingBag, DollarSign, BarChart2,
  Package, AlertTriangle, Trash2, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  summary: { revenue: number; orders: number; avgOrder: number; revenueToday: number };
  dailySales: { date: string; revenue: number; orders: number }[];
  topItems: { name: string; category: string; qty: number; revenue: number }[];
  bottomItems: { name: string; category: string; qty: number; revenue: number }[];
  recipeFoodCosts: { name: string; sellingPrice: number; costPerServing: number; foodCostPct: number }[];
  stockValuation: { kitchenValue: number; fohValue: number; totalValue: number; lowStock: number; outOfStock: number };
  wasteReport: { category: string; qty: number; cost: number }[];
  ordersByType: { dineIn: number; takeaway: number };
}

type Range = "7d" | "30d" | "90d";

const RANGE_LABELS: Record<Range, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

const FC_COLOR = (pct: number) =>
  pct <= 28 ? "#22c55e" : pct <= 35 ? "#f59e0b" : "#ef4444";

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
  fontSize: 12,
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const fmt = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtShort = (n: number) => `$${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toFixed(0)}`;

  if (loading || !data) {
    return (
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-800 rounded-xl" />
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const { summary, dailySales, topItems, recipeFoodCosts, stockValuation, wasteReport, ordersByType } = data;

  const kpis = [
    { label: "Revenue", value: fmt(summary.revenue), sub: `Today ${fmt(summary.revenueToday)}`, icon: DollarSign, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Orders", value: summary.orders.toString(), sub: `Dine-in ${ordersByType.dineIn} · Takeaway ${ordersByType.takeaway}`, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Avg Order", value: fmt(summary.avgOrder), sub: `${RANGE_LABELS[range]}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Stock Value", value: fmt(stockValuation.totalValue), sub: `${stockValuation.lowStock} low · ${stockValuation.outOfStock} out`, icon: Package, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  const avgFoodCost = recipeFoodCosts.length > 0
    ? recipeFoodCosts.reduce((s, r) => s + r.foodCostPct, 0) / recipeFoodCosts.length
    : 0;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Range tabs */}
      <div className="flex items-center gap-2">
        {(["7d", "30d", "90d"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              range === r ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            )}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{k.label}</p>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", k.bg)}>
                  <Icon size={15} className={k.color} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Daily revenue chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">Daily Revenue</h2>
          <span className="text-xs text-gray-500">{RANGE_LABELS[range]}</span>
        </div>
        {mounted && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailySales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE}
                formatter={(v) => [fmt(Number(v ?? 0)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top items + Food cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top items */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-orange-400" />
            <h2 className="text-white font-semibold text-sm">Top Selling Items</h2>
          </div>
          {topItems.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No sales data yet</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topItems.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={CUSTOM_TOOLTIP_STYLE}
                  formatter={(v, name) => [name === "qty" ? `${Number(v ?? 0)} sold` : fmt(Number(v ?? 0)), name === "qty" ? "Qty" : "Revenue"]}
                />
                <Bar dataKey="qty" fill="#f97316" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        {/* Food cost % */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-400" />
              <h2 className="text-white font-semibold text-sm">Food Cost %</h2>
            </div>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
              avgFoodCost <= 28 ? "bg-emerald-500/15 text-emerald-400" :
              avgFoodCost <= 35 ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            )}>
              Avg {avgFoodCost.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Target: ≤28% · Acceptable: ≤35%</p>
          {recipeFoodCosts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No recipe data</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {recipeFoodCosts.map((r) => (
                <div key={r.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-300 truncate max-w-[60%]">{r.name}</span>
                    <span className="text-xs font-semibold" style={{ color: FC_COLOR(r.foodCostPct) }}>
                      {r.foodCostPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(r.foodCostPct, 100)}%`, backgroundColor: FC_COLOR(r.foodCostPct) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock + Waste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock valuation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={15} className="text-purple-400" />
            <h2 className="text-white font-semibold text-sm">Stock Valuation</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Kitchen Ingredients</span>
              <span className="text-sm font-semibold text-white">{fmt(stockValuation.kitchenValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">FOH Stock</span>
              <span className="text-sm font-semibold text-white">{fmt(stockValuation.fohValue)}</span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-base font-bold text-purple-400">{fmt(stockValuation.totalValue)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{stockValuation.lowStock}</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Low Stock</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{stockValuation.outOfStock}</p>
                <p className="text-xs text-red-400/70 mt-0.5">Out of Stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Waste report */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 size={15} className="text-red-400" />
            <h2 className="text-white font-semibold text-sm">Waste Report</h2>
            <span className="text-xs text-gray-500 ml-auto">{RANGE_LABELS[range]}</span>
          </div>
          {wasteReport.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle size={24} className="text-gray-600 mb-2" />
              <p className="text-gray-500 text-sm">No waste recorded</p>
              <p className="text-gray-600 text-xs mt-1">Great news for this period!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wasteReport.map((w) => (
                <div key={w.category} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm text-gray-300 capitalize">{w.category.toLowerCase().replace("_", " ")}</p>
                    <p className="text-xs text-gray-500">{w.qty} units wasted</p>
                  </div>
                  <span className="text-sm font-semibold text-red-400">{fmt(w.cost)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-white">Total waste cost</span>
                <span className="text-sm font-bold text-red-400">
                  {fmt(wasteReport.reduce((s, w) => s + w.cost, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders line chart (daily trend) */}
      {dailySales.some((d) => d.orders > 0) && mounted && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-blue-400" />
            <h2 className="text-white font-semibold text-sm">Order Volume Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={dailySales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => [Number(v ?? 0), "Orders"]} />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
