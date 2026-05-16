"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, AlertTriangle, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import CartSidebar from "./CartSidebar";
import PaymentModal from "./PaymentModal";
import CustomerPanel from "./CustomerPanel";
import ItemRequestModal from "./ItemRequestModal";
import type { OrderWithItems, MenuItemWithRecipe, RecipeCategory, PaymentMethod, TableWithOrder } from "@/types";

const TABS: { label: string; value: RecipeCategory | "ALL" }[] = [
  { label: "All",       value: "ALL" },
  { label: "Starters",  value: "STARTER" },
  { label: "Mains",     value: "MAIN" },
  { label: "Desserts",  value: "DESSERT" },
  { label: "Beverages", value: "BEVERAGE" },
  { label: "Sides",     value: "SIDE" },
];

const BEVERAGE_SUBCATEGORY_ORDER = [
  "Cocktail", "Mocktail", "Wine", "Beer", "Spirit", "Sake",
  "Soft Drink", "Tea", "Juice", "Water",
];

// True if any customer allergen fuzzy-matches an item allergen name
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

export default function OrderScreen({ orderId }: Props) {
  const router = useRouter();
  const [order,     setOrder]     = useState<OrderWithItems | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithRecipe[]>([]);
  const [tab,       setTab]       = useState<RecipeCategory | "ALL">("ALL");
  const [search,    setSearch]    = useState("");
  const [sending,   setSending]   = useState(false);
  const [payOpen,   setPayOpen]   = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItemWithRecipe | null>(null);

  const [cancelOpen,       setCancelOpen]       = useState(false);
  const [tableModalOpen,   setTableModalOpen]   = useState<"move" | "join" | "split" | null>(null);
  const [modalTables,      setModalTables]      = useState<TableWithOrder[]>([]);
  const [modalLoading,     setModalLoading]     = useState(false);
  const [splitSelectedIds, setSplitSelectedIds] = useState<Set<string>>(new Set());
  const [splitStep,        setSplitStep]        = useState<1 | 2>(1);

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

  async function addItem(menuItemId: string, specialRequests: string[] = [], notes = "", priceAdjustment = 0) {
    await fetch(`/api/orders/${orderId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId, quantity: 1, specialRequests, notes: notes || undefined, priceAdjustment }),
    });
    await loadOrder();
  }

  async function handleItemAdd(specialRequests: string[], notes: string, priceAdjustment: number) {
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

  async function sendCourse(category: string, courseNumber: number) {
    if (!order) return;
    setSending(true);
    const ids = order.items
      .filter((i) => i.status === "PENDING" && i.menuItem.category === category && i.courseNumber === courseNumber)
      .map((i) => i.id);
    await Promise.all(
      ids.map((id) =>
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

  async function changeCourse(itemId: string, courseNumber: number) {
    if (!order) return;

    const movedItem = order.items.find((i) => i.id === itemId);
    if (!movedItem) return;
    const category = movedItem.menuItem.category;

    // Simulate post-move state for this category
    const catPending = order.items
      .filter((i) => i.status === "PENDING" && i.menuItem.category === category)
      .map((i) => ({ id: i.id, original: i.courseNumber, next: i.id === itemId ? courseNumber : i.courseNumber }));

    // Build a gap-free compact map: sorted unique "next" values → 1, 2, 3…
    const uniqueSorted = [...new Set(catPending.map((i) => i.next))].sort((a, b) => a - b);
    const compact: Record<number, number> = {};
    uniqueSorted.forEach((c, idx) => { compact[c] = idx + 1; });

    // Patch every item whose compacted course differs from its original
    await Promise.all(
      catPending
        .filter((i) => compact[i.next] !== i.original)
        .map((i) =>
          fetch(`/api/orders/${orderId}/items/${i.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseNumber: compact[i.next] }),
          })
        )
    );
    await loadOrder();
  }

  async function splitCourse(itemIds: string[], baseMaxCourse: number) {
    if (!order) return;
    setSending(true);
    await Promise.all(
      itemIds.map((id, idx) =>
        fetch(`/api/orders/${orderId}/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseNumber: baseMaxCourse + idx + 1 }),
        })
      )
    );
    await loadOrder();
    setSending(false);
  }

  async function fireCategory(category: string) {
    if (!order) return;
    setSending(true);
    const ids = order.items
      .filter((i) => i.status === "PENDING" && i.menuItem.category === category)
      .map((i) => i.id);
    await Promise.all(
      ids.map((id) =>
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

  async function toggleCategorySharing(category: string, isSharing: boolean) {
    if (!order) return;
    const ids = order.items
      .filter((i) => i.status === "PENDING" && i.menuItem.category === category)
      .map((i) => i.id);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/orders/${orderId}/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSharing }),
        })
      )
    );
    await loadOrder();
  }

  async function toggleSharing(itemId: string, isSharing: boolean) {
    await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSharing }),
    });
    await loadOrder();
  }

  async function splitAllOneByOne() {
    if (!order) return;
    setSending(true);
    const pending = order.items.filter((i) => i.status === "PENDING");
    // Group by category so course numbers reset to 1 within each category
    const byCat: Record<string, typeof pending> = {};
    pending.forEach((item) => {
      const cat = item.menuItem.category;
      (byCat[cat] ??= []).push(item);
    });
    await Promise.all([
      ...Object.values(byCat).flatMap((catItems) =>
        catItems.map((item, idx) =>
          fetch(`/api/orders/${orderId}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseNumber: idx + 1 }),
          })
        )
      ),
      fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serveNote: null }),
      }),
    ]);
    await loadOrder();
    setSending(false);
  }

  async function groupAllTogether() {
    if (!order) return;
    setSending(true);
    const isActive = !!order.serveNote;
    const pending = order.items.filter((i) => i.status === "PENDING");
    if (isActive) {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serveNote: null }),
      });
    } else {
      await Promise.all([
        ...pending.map((item) =>
          fetch(`/api/orders/${orderId}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseNumber: 1 }),
          })
        ),
        fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serveNote: "All dishes together" }),
        }),
      ]);
    }
    await loadOrder();
    setSending(false);
  }

  async function voidItem(itemId: string, voidReason: string) {
    await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID", voidReason }),
    });
    await loadOrder();
  }

  function handleBack() {
    const nonVoid = order?.items.filter((i) => i.status !== "VOID") ?? [];
    if (nonVoid.length === 0) {
      setCancelOpen(true);
    } else {
      router.push("/pos");
    }
  }

  async function openTableModal(mode: "move" | "join" | "split") {
    setTableModalOpen(mode);
    setSplitStep(1);
    setSplitSelectedIds(new Set());
    setModalLoading(true);
    const res = await fetch("/api/tables");
    if (res.ok) setModalTables(await res.json());
    setModalLoading(false);
  }

  async function moveTable(tableId: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    setTableModalOpen(null);
    await loadOrder();
  }

  async function joinTable(sourceOrderId: string) {
    await fetch(`/api/orders/${orderId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceOrderId }),
    });
    setTableModalOpen(null);
    await loadOrder();
  }

  async function splitItems(targetTableId: string) {
    await fetch(`/api/orders/${orderId}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: [...splitSelectedIds], tableId: targetTableId }),
    });
    setTableModalOpen(null);
    setSplitSelectedIds(new Set());
    await loadOrder();
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

  async function handlePayment(method: PaymentMethod, discount: number, breakdown: { cashPaid?: number; cardPaid?: number; voucherPaid?: number; voucherCode?: string }) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod: method, discount, ...breakdown }),
    });
    setPayOpen(false);
    router.push("/pos");
  }

  const customer = order?.customer ?? null;
  const customerAllergens = customer?.allergenTags ?? [];
  const customerDietary   = customer?.dietaryTags ?? [];

  const filteredModalTables = modalTables.filter((t) => {
    if (tableModalOpen === "move")  return t.status === "FREE";
    if (tableModalOpen === "join")  return t.status === "OCCUPIED" && t.id !== order?.tableId && t.orders.length > 0;
    if (tableModalOpen === "split") return t.status === "FREE";
    return false;
  });

  const filteredMenu = menuItems.filter(
    (i) =>
      (tab === "ALL" || i.category === tab) &&
      (search === "" || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  const beverageGroups: [string, typeof filteredMenu][] = (() => {
    if (tab !== "BEVERAGE" || search) return [];
    const map = new Map<string, typeof filteredMenu>();
    for (const item of filteredMenu) {
      const key = item.subcategory ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const ordered: [string, typeof filteredMenu][] = [];
    for (const sub of BEVERAGE_SUBCATEGORY_ORDER) {
      if (map.has(sub)) ordered.push([sub, map.get(sub)!]);
    }
    for (const [k, v] of map) {
      if (!BEVERAGE_SUBCATEGORY_ORDER.includes(k)) ordered.push([k, v]);
    }
    return ordered;
  })();

  if (!order) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading order…</div>;
  }

  const subtotal = order.items.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div className="flex gap-4 p-6 h-[calc(100vh-4rem)]">
      {/* Left: Menu browser */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBack}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {order.type === "TAKEAWAY" ? (
              <>
                <span className="text-orange-400">Takeaway</span>
                {order.customerName && (
                  <span className="text-gray-400 text-base font-normal ml-2">· {order.customerName}</span>
                )}
              </>
            ) : (
              <>
                Table {order.table?.number}
                <span className="text-gray-400 text-base font-normal ml-2">· {order.table?.section}</span>
              </>
            )}
          </h1>
          {order.type === "DINE_IN" && (
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => openTableModal("move")}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                Move
              </button>
              <button onClick={() => openTableModal("join")}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                Join
              </button>
              <button onClick={() => openTableModal("split")}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                Split
              </button>
            </div>
          )}
        </div>

        {/* Customer panel — only when a customer profile is linked */}
        {customer && (
          <CustomerPanel
            customerId={customer.id}
            customerAllergens={customerAllergens}
            customerDietary={customerDietary}
            onAddItem={addItem}
          />
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu…"
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                tab === t.value
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Menu items grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No items found</div>
          ) : tab === "BEVERAGE" && !search ? (
            /* Grouped by subcategory */
            <div className="space-y-5 pb-2">
              {beverageGroups.map(([sub, items]) => (
                <div key={sub}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-0.5">
                    {sub}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {items.map((item) => {
                      const allergenWarning = customerAllergens.length > 0 &&
                        hasAllergenConflict(item.allergenNames, customerAllergens);
                      return (
                        <button key={item.id} onClick={() => setPendingItem(item)}
                          className={cn(
                            "relative bg-gray-900 border rounded-xl p-3 text-left transition-colors group",
                            allergenWarning
                              ? "border-red-500/40 hover:border-red-500/70"
                              : "border-gray-800 hover:border-orange-500/50"
                          )}>
                          {allergenWarning && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={9} /> Allergen
                            </div>
                          )}
                          <p className={cn(
                            "text-sm font-medium leading-tight mb-1 pr-14",
                            allergenWarning ? "text-red-300" : "text-white group-hover:text-orange-300"
                          )}>
                            {item.name}
                          </p>
                          <p className="text-orange-400 font-semibold text-sm">{formatCurrency(item.price)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Flat grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMenu.map((item) => {
                const allergenWarning = customerAllergens.length > 0 &&
                  hasAllergenConflict(item.allergenNames, customerAllergens);
                return (
                  <button key={item.id} onClick={() => setPendingItem(item)}
                    className={cn(
                      "relative bg-gray-900 border rounded-xl p-3 text-left transition-colors group",
                      allergenWarning
                        ? "border-red-500/40 hover:border-red-500/70"
                        : "border-gray-800 hover:border-orange-500/50"
                    )}>
                    {allergenWarning && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
                        <AlertTriangle size={9} /> Allergen
                      </div>
                    )}
                    <p className={cn(
                      "text-sm font-medium leading-tight mb-1 pr-14",
                      allergenWarning ? "text-red-300" : "text-white group-hover:text-orange-300"
                    )}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                    <p className="text-orange-400 font-semibold text-sm">{formatCurrency(item.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-72 bg-gray-900 border border-gray-800 rounded-xl flex flex-col shrink-0 overflow-hidden">
        <CartSidebar
          order={order}
          onQtyChange={changeQty}
          onRemove={removeItem}
          onSendCourse={sendCourse}
          onSendAll={sendToKitchen}
          onCourseChange={changeCourse}
          onSplitCourse={splitCourse}
          onToggleSharing={toggleSharing}
          onToggleCategorySharing={toggleCategorySharing}
          onFireCategory={fireCategory}
          onSplitAllOneByOne={splitAllOneByOne}
          onGroupAllTogether={groupAllTogether}
          onVoidItem={voidItem}
          onPay={() => setPayOpen(true)}
          sending={sending}
        />
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        subtotal={subtotal}
        tax={subtotal * 0.1}
        discount={order.discount}
        items={order.items.filter((i) => i.status !== "VOID")}
        onConfirm={handlePayment}
      />

      {pendingItem && order && (
        <ItemRequestModal
          item={pendingItem}
          cartItems={order.items.filter((ci) => ci.menuItem.id === pendingItem.id)}
          onAdd={handleItemAdd}
          onChangeQty={changeQty}
          onRemove={removeItem}
          onClose={() => setPendingItem(null)}
        />
      )}

      {/* Cancel / Free Table confirm */}
      {cancelOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4 shadow-2xl">
            <h3 className="text-white font-semibold">Free this table?</h3>
            <p className="text-gray-400 text-sm">
              No items were added. Cancel this order and free{" "}
              {order.table ? `Table ${order.table.number}` : "this table"}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelOpen(false); router.push("/pos"); }}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-sm font-medium transition-colors"
              >
                Free Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move / Join / Split table modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {tableModalOpen === "move" && "Move to Table"}
                {tableModalOpen === "join" && "Join with Table"}
                {tableModalOpen === "split" && (splitStep === 1 ? "Select Items to Split" : "Split to Table")}
              </h3>
              <button onClick={() => setTableModalOpen(null)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Split step 1 — pick items */}
            {tableModalOpen === "split" && splitStep === 1 && (
              <>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {order.items.filter((i) => i.status !== "VOID").length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">No items to split.</p>
                  ) : (
                    order.items.filter((i) => i.status !== "VOID").map((item) => (
                      <label key={item.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-orange-500"
                          checked={splitSelectedIds.has(item.id)}
                          onChange={(e) => {
                            const next = new Set(splitSelectedIds);
                            if (e.target.checked) next.add(item.id); else next.delete(item.id);
                            setSplitSelectedIds(next);
                          }}
                        />
                        <span className="flex-1 text-sm text-white">{item.menuItem.name} ×{item.quantity}</span>
                        <span className="text-sm text-orange-400">{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </label>
                    ))
                  )}
                </div>
                <button
                  disabled={splitSelectedIds.size === 0}
                  onClick={() => setSplitStep(2)}
                  className="mt-4 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  Next: Pick Table →
                </button>
              </>
            )}

            {/* Move / Join / Split step 2 — pick table */}
            {(tableModalOpen !== "split" || splitStep === 2) && (
              <div className="flex-1 overflow-y-auto">
                {modalLoading ? (
                  <div className="text-gray-500 text-sm text-center py-8">Loading tables…</div>
                ) : filteredModalTables.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    {tableModalOpen === "join" ? "No other occupied tables" : "No free tables available"}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 py-1">
                    {filteredModalTables.map((t) => {
                      const elapsed = t.orders[0]
                        ? Math.floor((Date.now() - new Date(t.orders[0].openedAt).getTime()) / 60000)
                        : null;
                      return (
                        <button
                          key={t.id}
                          onClick={async () => {
                            if (tableModalOpen === "move") await moveTable(t.id);
                            else if (tableModalOpen === "join") await joinTable(t.orders[0].id);
                            else await splitItems(t.id);
                          }}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all hover:scale-105",
                            tableModalOpen === "join"
                              ? "bg-red-500/10 border-red-500/40 hover:border-red-500/70"
                              : "bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-500/70"
                          )}
                        >
                          <div className="text-lg font-bold text-white">T{t.number}</div>
                          <div className="text-xs text-gray-400">{t.section}</div>
                          {elapsed !== null && (
                            <div className="text-xs text-amber-400 mt-1">{elapsed}m</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
