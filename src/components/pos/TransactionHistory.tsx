"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, TrendingUp, ShoppingCart, Ban, ChevronDown, ChevronRight, CreditCard, Banknote, Split, XCircle, Ticket } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import DateRangePicker, { getPresetRange } from "./DateRangePicker";

type PaymentMethod = "CASH" | "CARD" | "SPLIT" | "VOUCHER";
type OrderStatus   = "PAID" | "VOID";
type OrderType     = "DINE_IN" | "TAKEAWAY";

interface OrderItemLine {
  id: string;
  quantity: number;
  unitPrice: number;
  menuItem: { id: string; name: string };
}

interface HistoryOrder {
  id: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  tax: number;
  discount: number;
  paymentMethod: PaymentMethod | null;
  cashPaid:    number | null;
  cardPaid:    number | null;
  voucherPaid: number | null;
  voucherCode: string | null;
  openedAt: string;
  closedAt: string | null;
  customerName: string | null;
  table: { id: string; number: number; section: string } | null;
  server: { id: string; name: string };
  items: OrderItemLine[];
}

interface Summary {
  revenue: number;
  paidCount: number;
  avgOrder: number;
  voidCount: number;
  cashTotal: number;
  cardTotal: number;
  voucherTotal: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function PaymentIcon({ method }: { method: PaymentMethod | null }) {
  if (method === "CASH")    return <Banknote  size={13} className="text-emerald-400" />;
  if (method === "CARD")    return <CreditCard size={13} className="text-blue-400" />;
  if (method === "SPLIT")   return <Split      size={13} className="text-purple-400" />;
  if (method === "VOUCHER") return <Ticket     size={13} className="text-amber-400" />;
  return null;
}

export default function TransactionHistory() {
  const router = useRouter();

  const [from,     setFrom]     = useState(() => getPresetRange("today").from);
  const [to,       setTo]       = useState(() => getPresetRange("today").to);
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime,   setToTime]   = useState("23:59");
  const [page,     setPage]     = useState(1);

  const [orders,     setOrders]     = useState<HistoryOrder[]>([]);
  const [summary,    setSummary]    = useState<Summary>({ revenue: 0, paidCount: 0, avgOrder: 0, voidCount: 0, cashTotal: 0, cardTotal: 0, voucherTotal: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());
  const [voiding,    setVoiding]    = useState<Set<string>>(new Set());
  const [voidTarget, setVoidTarget] = useState<HistoryOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to, fromTime, toTime, page: String(page) });
    const res = await fetch(`/api/orders/history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setSummary(data.summary);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [from, to, fromTime, toTime, page]);

  useEffect(() => { load(); }, [load]);

  function handleRangeChange(f: string, t: string, ft: string, tt: string) {
    setFrom(f); setTo(t); setFromTime(ft); setToTime(tt); setPage(1);
  }

  async function confirmVoid() {
    if (!voidTarget) return;
    const id = voidTarget.id;
    setVoidTarget(null);
    setVoiding((prev) => new Set(prev).add(id));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID" }),
    });
    setVoiding((prev) => { const next = new Set(prev); next.delete(id); return next; });
    load();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-AU", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/pos")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-white font-semibold text-lg">Sales</h1>
          <p className="text-gray-500 text-sm">Closed orders — paid and voided</p>
        </div>
      </div>

      {/* Date / time range picker */}
      <div className="mb-6">
        <DateRangePicker
          from={from} to={to} fromTime={fromTime} toTime={toTime}
          onChange={handleRangeChange}
        />
      </div>

      {/* Summary cards — top row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-emerald-400" />
            <span className="text-xs text-gray-400 font-medium">Revenue</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(summary.revenue)}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={15} className="text-blue-400" />
            <span className="text-xs text-gray-400 font-medium">Transactions</span>
          </div>
          <div className="text-2xl font-bold text-white">{summary.paidCount}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={15} className="text-orange-400" />
            <span className="text-xs text-gray-400 font-medium">Avg Order</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(summary.avgOrder)}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ban size={15} className="text-red-400" />
            <span className="text-xs text-gray-400 font-medium">Voided</span>
          </div>
          <div className="text-2xl font-bold text-white">{summary.voidCount}</div>
        </div>
      </div>

      {/* Till close breakdown row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Banknote size={17} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Cash in till</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.cashTotal)}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <CreditCard size={17} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Card total</p>
            <p className="text-xl font-bold text-blue-400">{formatCurrency(summary.cardTotal)}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Ticket size={17} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Vouchers</p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(summary.voucherTotal)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No transactions found for this period.</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="w-8 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Closed</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Table / Customer</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Items</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Server</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Payment</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isOpen = expanded.has(order.id);
                  const itemSummary = order.items.length === 0
                    ? "No items"
                    : order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")
                      + (order.items.length > 2 ? ` +${order.items.length - 2} more` : "");

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={cn(
                          "border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer",
                          isOpen && "bg-gray-800/30"
                        )}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <td className="px-3 py-3 text-gray-600">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                          {formatTime(order.closedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            order.type === "DINE_IN"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-orange-500/15 text-orange-400"
                          )}>
                            {order.type === "DINE_IN" ? "Dine-in" : "Takeaway"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white">
                          {order.table
                            ? `T${order.table.number} · ${order.table.section}`
                            : order.customerName || "Walk-in"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                          {itemSummary}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{order.server.name}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <PaymentIcon method={order.paymentMethod} />
                            <span className="text-gray-300 text-xs">{order.paymentMethod ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            order.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          )}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {order.status === "PAID" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setVoidTarget(order); }}
                              disabled={voiding.has(order.id)}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <XCircle size={12} />
                              {voiding.has(order.id) ? "Voiding…" : "Void"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="border-b border-gray-800/50 bg-gray-800/10">
                          <td />
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Items</p>
                                <div className="space-y-1">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-300">
                                        <span className="text-gray-500 mr-1">{item.quantity}×</span>
                                        {item.menuItem.name}
                                      </span>
                                      <span className="text-gray-400">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Totals</p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span className="text-gray-300">{formatCurrency(order.total - order.tax + order.discount)}</span>
                                  </div>
                                  {order.discount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Discount</span>
                                      <span className="text-red-400">−{formatCurrency(order.discount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Tax</span>
                                    <span className="text-gray-300">{formatCurrency(order.tax)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-white">Total</span>
                                    <span className="text-white">{formatCurrency(order.total)}</span>
                                  </div>
                                </div>

                                {/* Payment breakdown (cash / card / voucher split) */}
                                {(order.cashPaid || order.cardPaid || order.voucherPaid) ? (
                                  <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-1">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">Paid by</p>
                                    {order.cashPaid ? (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1.5 text-emerald-400"><Banknote size={12} /> Cash</span>
                                        <span className="text-emerald-400 font-medium">{formatCurrency(order.cashPaid)}</span>
                                      </div>
                                    ) : null}
                                    {order.cardPaid ? (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1.5 text-blue-400"><CreditCard size={12} /> Card</span>
                                        <span className="text-blue-400 font-medium">{formatCurrency(order.cardPaid)}</span>
                                      </div>
                                    ) : null}
                                    {order.voucherPaid ? (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1.5 text-amber-400">
                                          <Ticket size={12} /> Voucher{order.voucherCode ? ` (${order.voucherCode})` : ""}
                                        </span>
                                        <span className="text-amber-400 font-medium">{formatCurrency(order.voucherPaid)}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                <p className="text-xs text-gray-500 mt-3">
                                  Opened: {formatTime(order.openedAt)}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                {pagination.total} transactions · page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 disabled:cursor-not-allowed">
                  Previous
                </button>
                <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Void confirmation modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setVoidTarget(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>

            {/* Icon + title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Void Transaction?</h2>
              <p className="text-gray-400 text-sm mt-1">This action cannot be undone.</p>
            </div>

            {/* Order summary */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {voidTarget.type === "DINE_IN"
                    ? `Table ${voidTarget.table?.number} · ${voidTarget.table?.section}`
                    : voidTarget.customerName || "Walk-in"}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium self-center",
                  voidTarget.type === "DINE_IN" ? "bg-blue-500/15 text-blue-400" : "bg-orange-500/15 text-orange-400"
                )}>
                  {voidTarget.type === "DINE_IN" ? "Dine-in" : "Takeaway"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Closed</span>
                <span className="text-gray-300">
                  {voidTarget.closedAt
                    ? new Date(voidTarget.closedAt).toLocaleString("en-AU", {
                        day: "2-digit", month: "short",
                        hour: "2-digit", minute: "2-digit", hour12: true,
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment</span>
                <span className="text-gray-300 flex items-center gap-1.5">
                  <PaymentIcon method={voidTarget.paymentMethod} />
                  {voidTarget.paymentMethod ?? "—"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2 mt-1 font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="text-white">{formatCurrency(voidTarget.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setVoidTarget(null)}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={confirmVoid}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-sm font-semibold transition-colors">
                Void Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
