"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Minus, Plus, Trash2, CreditCard, GripVertical, ArrowRight, SplitSquareHorizontal, Users, ListOrdered, Layers, Flame, Ban } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderWithItems, OrderItemDetail } from "@/types";

const CAT_META: Record<string, { label: string; singular: string; color: string }> = {
  STARTER:  { label: "Entrees",   singular: "Entree",   color: "text-purple-400" },
  MAIN:     { label: "Mains",     singular: "Main",     color: "text-sky-400"    },
  DESSERT:  { label: "Desserts",  singular: "Dessert",  color: "text-pink-400"   },
  BEVERAGE: { label: "Beverages", singular: "Beverage", color: "text-teal-400"   },
  SIDE:     { label: "Sides",     singular: "Side",     color: "text-lime-400"   },
  SAUCE:    { label: "Sauces",    singular: "Sauce",    color: "text-orange-400" },
  BREAD:    { label: "Breads",    singular: "Bread",    color: "text-yellow-400" },
  OTHER:    { label: "Other",     singular: "Other",    color: "text-gray-400"   },
};
const CAT_ORDER = ["STARTER", "MAIN", "DESSERT", "SIDE", "SAUCE", "BREAD", "BEVERAGE", "OTHER"];

// Ordered course sequence used for the "Fire next course" feature
const COURSE_SEQUENCE = ["STARTER", "MAIN", "DESSERT"];

function isCategoryReadyToFire(allItems: OrderItemDetail[], cat: string): boolean {
  const idx = COURSE_SEQUENCE.indexOf(cat);
  if (idx <= 0) return false; // STARTER or non-sequence category — no prerequisite
  const prevCat = COURSE_SEQUENCE[idx - 1];
  const sentPrev = allItems.filter((i) => i.menuItem.category === prevCat && i.status !== "PENDING");
  if (sentPrev.length === 0) return false; // Previous course hasn't been sent yet
  return sentPrev.every((i) => i.status === "READY" || i.status === "SERVED");
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-gray-400",
  COOKING: "text-amber-400",
  READY:   "text-emerald-400",
  SERVED:  "text-gray-600",
};

interface Props {
  order: OrderWithItems;
  onQtyChange: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
  onSendCourse: (category: string, courseNumber: number) => void;
  onSendAll: () => void;
  onCourseChange: (itemId: string, courseNumber: number) => void;
  onSplitCourse: (itemIds: string[], baseMaxCourse: number) => void;
  onToggleSharing: (itemId: string, isSharing: boolean) => void;
  onToggleCategorySharing: (category: string, isSharing: boolean) => void;
  onFireCategory: (category: string) => void;
  onSplitAllOneByOne: () => void;
  onGroupAllTogether: () => void;
  onVoidItem: (itemId: string, reason: string) => Promise<void>;
  onPay: () => void;
  sending: boolean;
}

export default function CartSidebar({
  order, onQtyChange, onRemove, onSendCourse, onSendAll,
  onCourseChange, onSplitCourse, onToggleSharing, onToggleCategorySharing,
  onFireCategory, onSplitAllOneByOne, onGroupAllTogether, onVoidItem, onPay, sending,
}: Props) {
  const [extraRounds, setExtraRounds] = useState<Record<string, number>>({});
  const [voidTarget, setVoidTarget] = useState<{ id: string; name: string } | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // ── Pointer-based drag (works on iPad + mouse) ───────────────────────────
  const pointerTrack = useRef<{
    id: string;
    name: string;
    startX: number;
    startY: number;
    timer: ReturnType<typeof setTimeout> | null;
    dragging: boolean;
  } | null>(null);
  const [ghost, setGhost] = useState<{
    x: number; y: number; name: string; targetCourse: number | null;
  } | null>(null);

  const cancelDrag = useCallback(() => {
    if (pointerTrack.current?.timer) clearTimeout(pointerTrack.current.timer);
    pointerTrack.current = null;
    setGhost(null);
  }, []);

  const commitDrop = useCallback((targetCourse: number | null) => {
    if (!pointerTrack.current || !targetCourse) return;
    const item = order.items.find((i) => i.id === pointerTrack.current!.id);
    if (item && item.courseNumber !== targetCourse) {
      onCourseChange(pointerTrack.current.id, targetCourse);
    }
  }, [order.items, onCourseChange]);

  // Attach / detach global pointer handlers when drag is active
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const t = pointerTrack.current;
      if (!t) return;
      if (!t.dragging) {
        // Cancel if vertical scroll intent detected before drag kicks in
        const dy = Math.abs(e.clientY - t.startY);
        if (dy > 8) { cancelDrag(); return; }
        return;
      }
      // Find the course-zone div under the pointer (ghost has pointer-events:none)
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const zone = els.find((el) => el instanceof HTMLElement && el.dataset.courseNum);
      const targetCourse = zone instanceof HTMLElement && zone.dataset.courseNum
        ? parseInt(zone.dataset.courseNum)
        : null;
      setGhost({ x: e.clientX, y: e.clientY, name: t.name, targetCourse });
    }

    function onUp(e: PointerEvent) {
      const t = pointerTrack.current;
      if (!t) return;
      if (t.dragging) {
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const zone = els.find((el) => el instanceof HTMLElement && el.dataset.courseNum);
        const targetCourse = zone instanceof HTMLElement && zone.dataset.courseNum
          ? parseInt(zone.dataset.courseNum)
          : null;
        commitDrop(targetCourse);
      }
      cancelDrag();
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", cancelDrag);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", cancelDrag);
    };
  }, [cancelDrag, commitDrop]);

  function handleGripPointerDown(itemId: string, itemName: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    pointerTrack.current = {
      id: itemId,
      name: itemName,
      startX: clientX,
      startY: clientY,
      dragging: false,
      timer: setTimeout(() => {
        if (pointerTrack.current && !pointerTrack.current.dragging) {
          pointerTrack.current.dragging = true;
          setGhost({ x: clientX, y: clientY, name: itemName, targetCourse: null });
        }
      }, 200),
    };
  }

  // Trim extraRounds so stale values don't show phantom empty slots after compaction
  useEffect(() => {
    setExtraRounds((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const cat of CAT_ORDER) {
        const catMax = order.items
          .filter((i) => i.status === "PENDING" && i.menuItem.category === cat)
          .reduce((m, i) => Math.max(m, i.courseNumber), 0);
        if ((prev[cat] ?? 0) > catMax) {
          next[cat] = catMax;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [order.items]);

  const subtotal = order.items.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax      = subtotal * 0.1;
  const total    = subtotal + tax - order.discount;

  const pendingItems = order.items.filter((i) => i.status === "PENDING");
  const kitchenItems = order.items.filter((i) => i.status !== "PENDING" && i.status !== "VOID");
  const voidedItems  = order.items.filter((i) => i.status === "VOID");
  const togetherActive = !!order.serveNote;

  const catGroups = CAT_ORDER.map((cat) => {
    const items = pendingItems.filter((i) => i.menuItem.category === cat);
    if (items.length === 0) return null;
    const maxFromItems = Math.max(1, ...items.map((i) => i.courseNumber));
    const maxRound = Math.max(maxFromItems, extraRounds[cat] ?? 1);
    const byRound: Record<number, OrderItemDetail[]> = {};
    for (let r = 1; r <= maxRound; r++) byRound[r] = [];
    items.forEach((item) => { (byRound[item.courseNumber] ??= []).push(item); });
    return { cat, maxRound, byRound };
  }).filter(Boolean) as { cat: string; maxRound: number; byRound: Record<number, OrderItemDetail[]> }[];

  return (
    <div className="relative flex flex-col h-full">
      {/* Drag ghost — follows pointer, pointer-events:none so it doesn't block hit-testing */}
      {ghost && (
        <div
          className="fixed z-[9999] pointer-events-none select-none"
          style={{ left: ghost.x + 12, top: ghost.y - 16, transform: "rotate(2deg)" }}
        >
          <div className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium shadow-2xl border",
            ghost.targetCourse
              ? "bg-orange-500 text-white border-orange-400"
              : "bg-gray-700 text-gray-200 border-gray-600"
          )}>
            <div className="flex items-center gap-1.5">
              <GripVertical size={12} className="opacity-60" />
              {ghost.name}
              {ghost.targetCourse && (
                <span className="text-xs opacity-75 ml-1">→ Course {ghost.targetCourse}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table info */}
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-white font-semibold">
          {order.type === "TAKEAWAY" ? (
            <span className="text-orange-400">
              Takeaway{order.customerName ? ` · ${order.customerName}` : ""}
            </span>
          ) : (
            <>
              Table {order.table?.number}
              <span className="text-gray-400 text-sm font-normal ml-2">· {order.table?.section}</span>
            </>
          )}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">Server: {order.server.name}</p>
      </div>

      {/* Course fire alerts — prominent strip below table header */}
      {catGroups
        .filter(({ cat }) => isCategoryReadyToFire(order.items, cat))
        .map(({ cat }) => {
          const meta = CAT_META[cat] ?? { label: cat, singular: cat, color: "text-gray-400" };
          const prevCat = COURSE_SEQUENCE[COURSE_SEQUENCE.indexOf(cat) - 1];
          const prevMeta = CAT_META[prevCat] ?? { label: prevCat, singular: prevCat, color: "text-gray-400" };
          return (
            <div key={cat} className="px-3 py-2 border-b border-emerald-500/20 bg-emerald-500/5">
              <button
                onClick={() => onFireCategory(cat)}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 animate-pulse disabled:opacity-40 transition-colors"
              >
                <Flame size={15} />
                Fire {meta.label}!
                <span className="text-emerald-600 font-normal text-xs">— {prevMeta.label} ready</span>
              </button>
            </div>
          );
        })
      }

      {/* Serving style quick actions */}
      {pendingItems.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-1.5">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium shrink-0">Serve:</span>
          <button
            onClick={onSplitAllOneByOne}
            disabled={sending}
            title="Split every item into its own course"
            className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors disabled:opacity-40"
          >
            <ListOrdered size={10} />
            1×1
          </button>
          <button
            onClick={onGroupAllTogether}
            disabled={sending}
            title="Send all dishes at the same time"
            className={cn(
              "flex-1 flex items-center justify-center gap-1 text-[11px] py-1 rounded border transition-colors disabled:opacity-40",
              togetherActive
                ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
                : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            )}
          >
            <Layers size={10} />
            Together
          </button>
        </div>
      )}

      {/* Items */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        {order.items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center mt-8">No items yet</p>
        ) : (
          <>
            {/* Together banner */}
            {togetherActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <Layers size={11} />
                {order.serveNote}
              </div>
            )}

            {/* Pending — grouped by category then course */}
            {catGroups.map(({ cat, maxRound, byRound }) => {
              const meta = CAT_META[cat] ?? { label: cat, singular: cat, color: "text-gray-400" };
              const catPendingItems = pendingItems.filter((i) => i.menuItem.category === cat);
              const allSharing = catPendingItems.length > 0 && catPendingItems.every((i) => i.isSharing);
              const readyToFire = isCategoryReadyToFire(order.items, cat) && catPendingItems.length > 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", meta.color)}>
                      {meta.label}
                    </p>
                    <div className="flex items-center gap-1">
                      {readyToFire && (
                        <button
                          onClick={() => onFireCategory(cat)}
                          disabled={sending}
                          title={`Fire ${meta.label} — previous course is ready`}
                          className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded border border-emerald-500/60 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 animate-pulse disabled:opacity-40 transition-colors"
                        >
                          <Flame size={9} />
                          Fire!
                        </button>
                      )}
                      <button
                        onClick={() => onToggleCategorySharing(cat, !allSharing)}
                        title={allSharing ? "Mark all as not sharing" : "Mark all as sharing"}
                        className={cn(
                          "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                          allSharing
                            ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                            : "border-gray-700 text-gray-600 hover:text-gray-400 hover:border-gray-600"
                        )}
                      >
                        <Users size={9} />
                        {allSharing ? "Sharing" : "Share"}
                      </button>
                      <button
                        onClick={() =>
                          setExtraRounds((prev) => ({ ...prev, [cat]: Math.max(maxRound, prev[cat] ?? 1) + 1 }))
                        }
                        className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        + Round
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: maxRound }, (_, i) => i + 1).map((courseNum) => {
                      const courseItems = byRound[courseNum] ?? [];
                      const isEmpty = courseItems.length === 0;
                      return (
                        <div
                          key={courseNum}
                          data-course-num={courseNum}
                          className={cn(
                            "rounded-lg border transition-colors",
                            isEmpty ? "border-dashed min-h-[40px]" : "",
                            ghost?.targetCourse === courseNum
                              ? "border-orange-500/70 bg-orange-500/5"
                              : isEmpty
                              ? "border-gray-700"
                              : "border-gray-800",
                            ghost && ghost.targetCourse !== courseNum && !isEmpty ? "border-gray-700" : ""
                          )}
                        >
                          <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-[11px] text-gray-400 font-medium">
                              {meta.singular} {courseNum}
                              {!isEmpty && (
                                <span className="text-gray-600 ml-1">
                                  · {courseItems.length} dish{courseItems.length !== 1 ? "es" : ""}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              {courseItems.length > 1 && (
                                <button
                                  title="Split 1 by 1"
                                  onClick={() => onSplitCourse(courseItems.slice(1).map((i) => i.id), maxRound)}
                                  disabled={sending}
                                  className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
                                >
                                  <SplitSquareHorizontal size={11} />
                                </button>
                              )}
                              {!isEmpty && (
                                <button
                                  onClick={() => onSendCourse(cat, courseNum)}
                                  disabled={sending}
                                  className={cn(
                                    "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                                    sending
                                      ? "bg-amber-500/20 text-amber-400/50 cursor-not-allowed"
                                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                  )}
                                >
                                  <ArrowRight size={9} />
                                  Send
                                </button>
                              )}
                            </div>
                          </div>

                          {isEmpty && (
                            <p className="text-[10px] text-gray-600 text-center pb-2">Drop here</p>
                          )}

                          {!isEmpty && (
                            <div className="px-2 pb-2 space-y-1.5">
                              {courseItems.map((item) => (
                                <CartItem
                                  key={item.id}
                                  item={item}
                                  editable
                                  dragging={ghost?.name === item.menuItem.name && !!ghost}
                                  onQtyChange={onQtyChange}
                                  onRemove={onRemove}
                                  onToggleSharing={onToggleSharing}
                                  onGripPointerDown={(e) => handleGripPointerDown(item.id, item.menuItem.name, e)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Kitchen items */}
            {kitchenItems.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">In Kitchen</p>
                <div className="space-y-1.5">
                  {kitchenItems.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      editable={false}
                      onQtyChange={onQtyChange}
                      onRemove={onRemove}
                      onVoid={() => { setVoidTarget({ id: item.id, name: item.menuItem.name }); setVoidReason(""); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Voided items */}
            {voidedItems.length > 0 && (
              <div>
                <p className="text-xs text-red-500/70 uppercase tracking-wider font-medium mb-2">Voided</p>
                <div className="space-y-1.5">
                  {voidedItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                      <Ban size={12} className="text-red-500/60 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-sm line-through">{item.menuItem.name}</p>
                        {item.voidReason && (
                          <p className="text-[11px] text-red-400/70 italic mt-0.5">{item.voidReason}</p>
                        )}
                      </div>
                      <span className="text-gray-600 text-sm line-through shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Tax 10%</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-white font-semibold text-base pt-1 border-t border-gray-800">
          <span>Total</span>
          <span>{formatCurrency(Math.max(0, total))}</span>
        </div>
      </div>

      {/* Void confirmation modal */}
      {voidTarget && (
        <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/40 rounded-xl p-5 w-full max-w-xs space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban size={16} />
              <p className="font-semibold text-sm">Void Item</p>
            </div>
            <p className="text-gray-300 text-sm">
              <span className="font-medium text-white">{voidTarget.name}</span> will be voided and removed from the bill.
            </p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reason for void *</label>
              <textarea
                rows={2}
                autoFocus
                placeholder="e.g. Customer complaint — wrong order, food cold…"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-red-500/60"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setVoidTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-white hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!voidReason.trim()}
                onClick={async () => {
                  await onVoidItem(voidTarget.id, voidReason.trim());
                  setVoidTarget(null);
                }}
                className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Void Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2">
        {pendingItems.length > 0 && (
          <button
            onClick={onSendAll}
            disabled={sending}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              sending
                ? "bg-amber-500/50 text-white/50 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            <ArrowRight size={16} />
            {sending ? "Sending…" : `Send All to Kitchen (${pendingItems.length})`}
          </button>
        )}
        <button
          onClick={onPay}
          disabled={order.items.length === 0}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
            order.items.length === 0
              ? "bg-orange-500/30 text-white/30 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          <CreditCard size={16} />
          Pay
        </button>
      </div>
    </div>
  );
}

function CartItem({
  item,
  editable,
  dragging,
  onQtyChange,
  onRemove,
  onToggleSharing,
  onVoid,
  onGripPointerDown,
}: {
  item: OrderItemDetail;
  editable: boolean;
  dragging?: boolean;
  onQtyChange: (id: string, d: number) => void;
  onRemove: (id: string) => void;
  onToggleSharing?: (id: string, isSharing: boolean) => void;
  onVoid?: () => void;
  onGripPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 bg-gray-800/50 rounded-lg p-2 transition-opacity select-none",
        dragging && "opacity-30"
      )}
    >
      {editable && (
        <button
          type="button"
          onPointerDown={onGripPointerDown}
          onContextMenu={(e) => e.preventDefault()}
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-2 -ml-1 rounded-lg hover:bg-gray-700/50 active:bg-gray-700"
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
          title="Hold to reorder"
        >
          <GripVertical size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{item.menuItem.name}</p>

        {/* Special request tags */}
        {item.specialRequests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.specialRequests.map((r) => (
              <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {r}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <p className="text-[10px] text-gray-500 italic mt-0.5 truncate">{item.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className={cn("text-xs capitalize", STATUS_COLOR[item.status] ?? "text-gray-400")}>
            {item.status.toLowerCase()}
          </p>

          {/* Sharing toggle */}
          {editable && onToggleSharing ? (
            <button
              onClick={() => onToggleSharing(item.id, !item.isSharing)}
              className={cn(
                "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                item.isSharing
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                  : "border-gray-700 text-gray-600 hover:text-gray-400 hover:border-gray-600"
              )}
            >
              <Users size={8} />
              {item.isSharing ? "Sharing" : "Share"}
            </button>
          ) : item.isSharing ? (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <Users size={8} />
              Sharing
            </span>
          ) : null}
        </div>
      </div>

      <div className="text-gray-300 text-sm shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</div>

      {editable ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => (item.quantity > 1 ? onQtyChange(item.id, -1) : onRemove(item.id))}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {item.quantity > 1 ? <Minus size={12} /> : <Trash2 size={12} />}
          </button>
          <span className="text-white text-sm w-5 text-center">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.id, 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Plus size={12} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-sm w-5 text-center">{item.quantity}</span>
          {onVoid && (
            <button
              onClick={onVoid}
              title="Void this item"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Ban size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
