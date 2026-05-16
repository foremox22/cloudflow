"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, Clock, X, Coffee } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import type { OrderWithItems } from "@/types";

export default function CafePosScreen() {
  const { data: session } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [takeawayName, setTakeawayName] = useState("");
  const [takeawayPhone, setTakeawayPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/orders");
    if (res.ok) {
      const all: OrderWithItems[] = await res.json();
      setOrders(all);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  async function newCounterOrder() {
    if (!session?.user?.id) return;
    setSaving(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DINE_IN", serverId: session.user.id }),
    });
    if (res.ok) {
      const order = await res.json();
      router.push(`/pos/order/${order.id}`);
    }
    setSaving(false);
  }

  async function startTakeaway(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setSaving(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "TAKEAWAY",
        serverId: session.user.id,
        customerName: takeawayName || undefined,
        customerPhone: takeawayPhone || undefined,
      }),
    });
    if (res.ok) {
      const order = await res.json();
      router.push(`/pos/order/${order.id}`);
    }
    setSaving(false);
  }

  const activeOrders = orders.filter((o) => o.status === "OPEN");

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Action buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={newCounterOrder}
          disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-orange-500/20 disabled:opacity-60"
        >
          <Coffee size={18} />
          New Counter Order
        </button>
        <button
          onClick={() => setTakeawayOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 active:scale-95 border border-gray-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all"
        >
          <ShoppingBag size={18} />
          New Takeaway
        </button>
        <button
          onClick={() => router.push("/pos/history")}
          className="ml-auto flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-3 rounded-xl text-sm font-medium transition-all"
        >
          Sales History
        </button>
      </div>

      {/* Active orders */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-white font-semibold">Active Orders</h2>
          {activeOrders.length > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
              {activeOrders.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm py-12 text-center">Loading…</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-16">
            <Coffee size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No active orders.</p>
            <p className="text-gray-600 text-xs mt-1">Tap "New Counter Order" to start.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeOrders.map((order) => {
              const elapsed = Math.floor((Date.now() - new Date(order.openedAt).getTime()) / 60000);
              const nonVoid = order.items.filter((i) => i.status !== "VOID");
              const subtotal = nonVoid.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
              const pendingCount = order.items.filter((i) => i.status === "PENDING").length;
              const cookingCount = order.items.filter((i) => i.status === "COOKING").length;
              const readyCount = order.items.filter((i) => i.status === "READY").length;
              const allReady = nonVoid.length > 0 && nonVoid.every((i) => i.status === "READY" || i.status === "SERVED");

              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/pos/order/${order.id}`)}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all active:scale-[.98] hover:scale-[1.01]",
                    allReady
                      ? "bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-500/80"
                      : cookingCount > 0
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60"
                      : "bg-gray-900 border-gray-800 hover:border-gray-600"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {order.type === "TAKEAWAY"
                          ? (order.customerName || "Takeaway")
                          : "Counter"}
                      </p>
                      {order.type === "TAKEAWAY" && order.customerPhone && (
                        <p className="text-gray-500 text-xs mt-0.5">{order.customerPhone}</p>
                      )}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                      order.type === "TAKEAWAY"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-gray-700 text-gray-400"
                    )}>
                      {order.type === "TAKEAWAY" ? <ShoppingBag size={10} /> : <Coffee size={10} />}
                      {order.type === "TAKEAWAY" ? "Takeaway" : "Dine-in"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {pendingCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                        {pendingCount} pending
                      </span>
                    )}
                    {cookingCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        {cookingCount} cooking
                      </span>
                    )}
                    {readyCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        {readyCount} ready
                      </span>
                    )}
                    {allReady && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-semibold animate-pulse">
                        ✓ Ready!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-bold text-sm">{formatCurrency(subtotal)}</span>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Clock size={11} />
                      {elapsed}m ago
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Takeaway modal */}
      {takeawayOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <form
            onSubmit={startTakeaway}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ShoppingBag size={16} className="text-orange-400" /> New Takeaway
              </h3>
              <button type="button" onClick={() => setTakeawayOpen(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Customer Name</label>
              <input
                value={takeawayName}
                onChange={(e) => setTakeawayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone</label>
              <input
                value={takeawayPhone}
                onChange={(e) => setTakeawayPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTakeawayOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {saving ? "Starting…" : "Start Order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
