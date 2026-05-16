"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, SlidersHorizontal, AlertTriangle, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import CafeCartSidebar from "./CafeCartSidebar";
import PaymentModal from "./PaymentModal";
import ItemRequestModal from "./ItemRequestModal";
import type { OrderWithItems, MenuItemWithRecipe, RecipeCategory, PaymentMethod } from "@/types";

const TABS: { label: string; value: RecipeCategory | "ALL" }[] = [
  { label: "All",       value: "ALL" },
  { label: "Coffee",    value: "BEVERAGE" },
  { label: "Food",      value: "MAIN" },
  { label: "Starters",  value: "STARTER" },
  { label: "Desserts",  value: "DESSERT" },
  { label: "Sides",     value: "SIDE" },
  { label: "Other",     value: "OTHER" },
];

// Category accent colors for menu tiles
const CAT_COLOR: Record<string, string> = {
  BEVERAGE: "border-teal-500/40  hover:border-teal-500/70  bg-teal-500/5",
  MAIN:     "border-sky-500/40   hover:border-sky-500/70   bg-sky-500/5",
  STARTER:  "border-purple-500/40 hover:border-purple-500/70 bg-purple-500/5",
  DESSERT:  "border-pink-500/40  hover:border-pink-500/70  bg-pink-500/5",
  SIDE:     "border-lime-500/40  hover:border-lime-500/70  bg-lime-500/5",
  OTHER:    "border-gray-700     hover:border-gray-600     bg-gray-900",
};

function hasAllergenConflict(itemAllergens: string[], customerAllergens: string[]): boolean {
  return itemAllergens.some((ia) =>
    customerAllergens.some(
      (ca) =>
        ia.toLowerCase().includes(ca.toLowerCase()) ||
        ca.toLowerCase().includes(ia.toLowerCase())
    )
  );
}

interface Props { orderId: string }

export default function CafeOrderScreen({ orderId }: Props) {
  const router = useRouter();
  const [order,      setOrder]      = useState<OrderWithItems | null>(null);
  const [menuItems,  setMenuItems]  = useState<MenuItemWithRecipe[]>([]);
  const [tab,        setTab]        = useState<RecipeCategory | "ALL">("ALL");
  const [search,     setSearch]     = useState("");
  const [sending,    setSending]    = useState(false);
  const [payOpen,    setPayOpen]    = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItemWithRecipe | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) setOrder(await res.json());
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    fetch("/api/menu")
      .then((r) => r.json())
      .then((items: MenuItemWithRecipe[]) => setMenuItems(items.filter((i) => i.available)));
  }, [loadOrder]);

  // Instant add — no modal
  async function addItem(menuItemId: string, specialRequests: string[] = [], notes = "", priceAdjustment = 0) {
    await fetch(`/api/orders/${orderId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId, quantity: 1, specialRequests, notes: notes || undefined, priceAdjustment }),
    });
    await loadOrder();
  }

  async function handleModifierAdd(specialRequests: string[], notes: string, priceAdjustment: number) {
    if (!pendingItem) return;
    await addItem(pendingItem.id, specialRequests, notes, priceAdjustment);
  }

  async function changeQty(itemId: string, delta: number) {
    if (!order) return;
    const item = order.items.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) return removeItem(itemId);
    await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    await loadOrder();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
    await loadOrder();
  }

  async function sendToKitchen() {
    if (!order) return;
    setSending(true);
    const pendingIds = order.items.filter((i) => i.status === "PENDING").map((i) => i.id);
    await Promise.all(
      pendingIds.map((id) =>
        fetch(`/api/orders/${orderId}/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COOKING" }),
        })
      )
    );
    await loadOrder();
    setSending(false);
  }

  async function assignTable(tableId: string | null) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    await loadOrder();
  }

  async function voidItem(itemId: string, voidReason: string) {
    await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID", voidReason }),
    });
    await loadOrder();
  }

  async function handlePayment(method: PaymentMethod, discount: number, breakdown: { cashPaid?: number; cardPaid?: number; voucherPaid?: number; voucherCode?: string }) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod: method, discount, ...breakdown }),
    });
    setPayOpen(false);
    router.push("/pos");
  }

  async function cancelOrder() {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID" }),
    });
    setCancelOpen(false);
    router.push("/pos");
  }

  function handleBack() {
    const nonVoid = order?.items.filter((i) => i.status !== "VOID") ?? [];
    if (nonVoid.length === 0) setCancelOpen(true);
    else router.push("/pos");
  }

  const filteredMenu = menuItems.filter(
    (i) =>
      (tab === "ALL" || i.category === tab) &&
      (search === "" || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (!order) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  }

  const subtotal = order.items.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div className="flex gap-0 h-[calc(100vh-4rem)]">

      {/* ── Left: Menu ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 px-4 pt-4 pb-2">

        {/* Back + order label */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">
              {order.type === "TAKEAWAY" ? (
                <span className="text-orange-400">
                  Takeaway{order.customerName ? ` · ${order.customerName}` : ""}
                </span>
              ) : (
                "Counter Order"
              )}
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-9 pr-9 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.value
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Menu grid — tap = instant add, small sliders icon = modifier modal */}
        <div className="flex-1 overflow-y-auto">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No items found</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-2 pb-4">
              {filteredMenu.map((item) => {
                const allergenWarning = hasAllergenConflict(item.allergenNames, []);
                const colorClass = CAT_COLOR[item.category] ?? CAT_COLOR.OTHER;
                // Count how many of this item are already in the cart
                const inCart = order.items.filter(
                  (ci) => ci.menuItem.id === item.id && ci.status !== "VOID"
                ).reduce((s, ci) => s + ci.quantity, 0);

                return (
                  <div key={item.id} className="relative group">
                    {/* Badge anchored to outer div so it overflows the card edge freely */}
                    {inCart > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center z-20 pointer-events-none">
                        {inCart}
                      </span>
                    )}

                    {/* Inner relative wrapper so the slider icon anchors to the card, not the outer div */}
                    <div className="relative">
                      <button
                        onClick={() => addItem(item.id)}
                        className={cn(
                          "w-full border rounded-2xl p-4 pb-8 text-left transition-all active:scale-95",
                          allergenWarning
                            ? "border-red-500/40 hover:border-red-500/70 bg-red-500/5"
                            : colorClass
                        )}
                      >
                        {allergenWarning && (
                          <div className="flex items-center gap-1 text-red-400 text-[10px] mb-1.5">
                            <AlertTriangle size={10} /> Allergen
                          </div>
                        )}

                        <p className={cn(
                          "text-sm font-semibold leading-tight mb-2",
                          allergenWarning ? "text-red-300" : "text-white"
                        )}>
                          {item.name}
                        </p>
                        <p className="text-orange-400 font-bold text-base">{formatCurrency(item.price)}</p>
                      </button>

                      {/* Modifier button — anchored inside the card's relative div */}
                      <button
                        onClick={() => setPendingItem(item)}
                        title="Add with modifiers"
                        className="absolute bottom-2 right-2 p-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <SlidersHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ───────────────────────────────── */}
      <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-hidden">
        <CafeCartSidebar
          order={order}
          onQtyChange={changeQty}
          onRemove={removeItem}
          onSendAll={sendToKitchen}
          onVoidItem={voidItem}
          onPay={() => setPayOpen(true)}
          onAssignTable={assignTable}
          sending={sending}
        />
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        subtotal={subtotal}
        tax={subtotal * 0.1}
        discount={order.discount}
        items={order.items.filter((i) => i.status !== "VOID")}
        onConfirm={handlePayment}
      />

      {/* Modifier modal — manage existing cart items + add another */}
      {pendingItem && (
        <ItemRequestModal
          item={pendingItem}
          cartItems={order.items.filter((ci) => ci.menuItem.id === pendingItem.id)}
          onAdd={handleModifierAdd}
          onChangeQty={changeQty}
          onRemove={removeItem}
          onClose={() => setPendingItem(null)}
        />
      )}

      {/* Cancel confirm */}
      {cancelOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 space-y-4">
            <h3 className="text-white font-semibold">Cancel this order?</h3>
            <p className="text-gray-400 text-sm">No items were added. This order will be cancelled.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelOpen(false); router.push("/pos"); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
              >
                Keep
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
