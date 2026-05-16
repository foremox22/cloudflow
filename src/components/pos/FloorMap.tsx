"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Clock, ShoppingBag, CalendarDays, X, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { TableWithOrder, ReservationRow, OrderWithItems } from "@/types";
import { useSession } from "next-auth/react";
import ReservationModal from "./ReservationModal";

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-500/15 text-yellow-400",
  CONFIRMED: "bg-green-500/15 text-green-400",
};

export default function FloorMap() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [tables, setTables] = useState<TableWithOrder[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<OrderWithItems[]>([]);
  const [collectingOrderId, setCollectingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Table modal
  const [addingTable, setAddingTable] = useState(false);
  const [newNum, setNewNum] = useState("");
  const [newCap, setNewCap] = useState("4");
  const [newSection, setNewSection] = useState("Main");

  // Takeaway modal
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [takeawayName, setTakeawayName] = useState("");
  const [takeawayPhone, setTakeawayPhone] = useState("");
  const [takeawaySaving, setTakeawaySaving] = useState(false);

  // Reservation modal + panel
  const [showReservations, setShowReservations] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationRow | null>(null);

  const load = useCallback(async () => {
    const [tRes, rRes, oRes] = await Promise.all([
      fetch("/api/tables"),
      fetch("/api/reservations"),
      fetch("/api/orders"),
    ]);
    if (tRes.ok) setTables(await tRes.json());
    if (rRes.ok) setReservations(await rRes.json());
    if (oRes.ok) {
      const orders: OrderWithItems[] = await oRes.json();
      setTakeawayOrders(orders.filter((o) => o.type === "TAKEAWAY"));
    }
    setLoading(false);
  }, []);

  async function collectOrder(orderId: string, paymentMethod: "CASH" | "CARD") {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod }),
    });
    setCollectingOrderId(null);
    load();
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleTableClick(table: TableWithOrder) {
    if (table.status === "FREE") {
      if (!session?.user?.id) return;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DINE_IN", tableId: table.id, serverId: session.user.id }),
      });
      if (res.ok) {
        const order = await res.json();
        router.push(`/pos/order/${order.id}`);
      }
    } else if (table.orders.length > 0) {
      router.push(`/pos/order/${table.orders[0].id}`);
    }
  }

  async function startTakeaway(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setTakeawaySaving(true);
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
    setTakeawaySaving(false);
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: parseInt(newNum), capacity: parseInt(newCap), section: newSection }),
    });
    setAddingTable(false);
    setNewNum("");
    load();
  }

  async function saveReservation(data: Record<string, unknown>) {
    if (!session?.user?.id) return;
    if (editingReservation) {
      await fetch(`/api/reservations/${editingReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowReservationModal(false);
    setEditingReservation(null);
    load();
  }

  async function updateReservationStatus(id: string, status: string) {
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function seatReservation(res: ReservationRow) {
    if (!session?.user?.id) return;
    const table = tables.find((t) => t.id === res.tableId);
    if (table?.status === "OCCUPIED") {
      toast.warning(`Table ${table.number} is already occupied.`);
      return;
    }
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DINE_IN",
        tableId: res.tableId,
        customerId: res.customerId ?? undefined,
        serverId: session.user.id,
        customerName: res.customerName,
      }),
    });
    if (orderRes.ok) {
      await fetch(`/api/reservations/${res.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SEATED" }),
      });
      const order = await orderRes.json();
      router.push(`/pos/order/${order.id}`);
    }
  }

  const sections = [...new Set(tables.map((t) => t.section))].sort();

  const reservationsByTable = reservations.reduce<Record<string, number>>((acc, r) => {
    if (r.tableId) acc[r.tableId] = (acc[r.tableId] ?? 0) + 1;
    return acc;
  }, {});

  const todayLabel = new Date().toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={() => setAddingTable(true)}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} /> Add Table
        </button>
        <button
          onClick={() => setTakeawayOpen(true)}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <ShoppingBag size={15} strokeWidth={2.5} /> New Takeaway
        </button>
        <button
          onClick={() => { setEditingReservation(null); setShowReservationModal(true); }}
          className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <CalendarDays size={15} strokeWidth={2.5} /> New Reservation
        </button>
        <button
          onClick={() => router.push("/pos/history")}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          <Receipt size={15} strokeWidth={2} /> Sales
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-xs text-gray-400">
        {[
          { label: "Free",     color: "bg-emerald-500/30 border-emerald-500/50" },
          { label: "Occupied", color: "bg-red-500/30 border-red-500/50" },
          { label: "Reserved", color: "bg-amber-500/30 border-amber-500/50" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded-sm border", color)} />
            {label}
          </span>
        ))}
      </div>

      {/* Floor grid */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading floor map…</div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No tables yet.{" "}
          <button onClick={() => setAddingTable(true)} className="text-orange-400 hover:underline">
            Add your first table.
          </button>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{section}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {tables
                .filter((t) => t.section === section)
                .map((table) => {
                  const activeOrder = table.status === "OCCUPIED" ? table.orders[0] : null;
                  const elapsed = activeOrder
                    ? Math.floor((Date.now() - new Date(activeOrder.openedAt).getTime()) / 60000)
                    : null;
                  const resCount = reservationsByTable[table.id] ?? 0;
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all hover:scale-105",
                        table.status === "FREE"     && "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20",
                        table.status === "OCCUPIED" && "bg-red-500/10 border-red-500/40 hover:bg-red-500/20",
                        table.status === "RESERVED" && "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20"
                      )}
                    >
                      {resCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                          {resCount}
                        </span>
                      )}
                      <div className="text-lg font-bold text-white mb-1">T{table.number}</div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Users size={11} /> {table.capacity}
                      </div>
                      {elapsed !== null && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs mt-1.5",
                          elapsed > 60 ? "text-red-400" : elapsed > 30 ? "text-amber-400" : "text-gray-400"
                        )}>
                          <Clock size={10} /> {elapsed}m
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {/* Takeaway orders panel */}
      {takeawayOrders.length > 0 && (
        <div className="mt-6 border-t border-gray-800 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={15} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">Takeaway Orders</span>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">
              {takeawayOrders.length}
            </span>
          </div>
          <div className="space-y-2">
            {takeawayOrders.map((order) => {
              const elapsed = Math.floor((Date.now() - new Date(order.openedAt).getTime()) / 60000);
              const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
              const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
              const allReady = order.items.length > 0 && order.items.every((i) => i.status === "READY" || i.status === "SERVED");
              const someCooking = order.items.some((i) => i.status === "COOKING");
              const isCollecting = collectingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex items-center justify-between bg-gray-900 border rounded-xl px-4 py-3 gap-3",
                    allReady ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {order.customerName || "Walk-in"}
                      </span>
                      {order.customerPhone && (
                        <span className="text-gray-500 text-xs">{order.customerPhone}</span>
                      )}
                      {allReady && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          Ready for pickup
                        </span>
                      )}
                      {someCooking && !allReady && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Cooking
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 text-xs mt-0.5">
                      <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                      <span>${subtotal.toFixed(2)}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {elapsed}m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCollecting ? (
                      <>
                        <button
                          onClick={() => router.push(`/pos/order/${order.id}`)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setCollectingOrderId(order.id)}
                          className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg transition-colors font-medium"
                        >
                          Collected
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">Payment:</span>
                        <button
                          onClick={() => collectOrder(order.id, "CASH")}
                          className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Cash
                        </button>
                        <button
                          onClick={() => collectOrder(order.id, "CARD")}
                          className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Card
                        </button>
                        <button
                          onClick={() => setCollectingOrderId(null)}
                          className="text-xs text-gray-600 hover:text-gray-400 px-1 py-1 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reservations panel */}
      <div className="mt-6 border-t border-gray-800 pt-5">
        <button
          onClick={() => setShowReservations(!showReservations)}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-white">Reservations — {todayLabel}</span>
            {reservations.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                {reservations.length}
              </span>
            )}
          </div>
          {showReservations
            ? <ChevronUp size={15} className="text-gray-500" />
            : <ChevronDown size={15} className="text-gray-500" />}
        </button>

        {showReservations && (
          reservations.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No upcoming reservations.</p>
          ) : (
            <div className="space-y-2">
              {reservations.map((res) => (
                <div key={res.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-sm font-semibold text-amber-400 shrink-0 tabular-nums w-14">
                      {new Date(res.reservedFor).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{res.customerName}</div>
                      <div className="text-gray-500 text-xs">
                        {res.table ? `T${res.table.number} · ${res.table.section} · ` : ""}{res.partySize} pax
                        {res.customerPhone && ` · ${res.customerPhone}`}
                      </div>
                      {(res.specialTags?.length > 0 || res.dietaryTags?.length > 0 || res.allergenTags?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {res.specialTags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{t}</span>
                          ))}
                          {res.dietaryTags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">{t}</span>
                          ))}
                          {res.allergenTags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">{t}</span>
                          ))}
                        </div>
                      )}
                      {res.notes && <div className="text-amber-400/70 text-xs truncate mt-0.5">{res.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[res.status] ?? "bg-gray-500/15 text-gray-400")}>
                      {res.status}
                    </span>
                    {res.status === "PENDING" && (
                      <button
                        onClick={() => updateReservationStatus(res.id, "CONFIRMED")}
                        className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => seatReservation(res)}
                      className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Seat
                    </button>
                    <button
                      onClick={() => { setEditingReservation(res); setShowReservationModal(true); }}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => updateReservationStatus(res.id, "NO_SHOW")}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-red-400 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      No-show
                    </button>
                    <button
                      onClick={() => updateReservationStatus(res.id, "CANCELLED")}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-500 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Takeaway modal */}
      {takeawayOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <form
            onSubmit={startTakeaway}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4 shadow-2xl"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone</label>
              <input
                value={takeawayPhone}
                onChange={(e) => setTakeawayPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTakeawayOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={takeawaySaving}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50"
              >
                {takeawaySaving ? "Starting…" : "Start Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Table modal */}
      {addingTable && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center">
          <form
            onSubmit={addTable}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4 shadow-2xl"
          >
            <h3 className="text-white font-semibold">Add New Table</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Table Number *</label>
              <input required type="number" min="1" value={newNum} onChange={(e) => setNewNum(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Section</label>
              <input value={newSection} onChange={(e) => setNewSection(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Capacity</label>
              <input type="number" min="1" value={newCap} onChange={(e) => setNewCap(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setAddingTable(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm">Cancel</button>
              <button type="submit"
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600">Add Table</button>
            </div>
          </form>
        </div>
      )}

      {/* Reservation modal */}
      {showReservationModal && (
        <ReservationModal
          tables={tables.map((t) => ({ id: t.id, number: t.number, section: t.section }))}
          reservation={editingReservation}
          onSave={saveReservation}
          onClose={() => { setShowReservationModal(false); setEditingReservation(null); }}
        />
      )}
    </div>
  );
}
