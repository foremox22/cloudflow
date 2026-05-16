"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, CreditCard, ArrowRight, Ban, X, Hash } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderWithItems } from "@/types";
import TablePickerModal from "./TablePickerModal";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-gray-400",
  COOKING: "text-amber-400",
  READY:   "text-emerald-400",
  SERVED:  "text-gray-500",
};

interface Props {
  order: OrderWithItems;
  onQtyChange: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
  onSendAll: () => void;
  onVoidItem: (itemId: string, reason: string) => Promise<void>;
  onPay: () => void;
  onAssignTable: (tableId: string | null) => void;
  sending: boolean;
}

export default function CafeCartSidebar({
  order, onQtyChange, onRemove, onSendAll, onVoidItem, onPay, onAssignTable, sending,
}: Props) {
  const [voidTarget, setVoidTarget] = useState<{ id: string; name: string; needsReason: boolean } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [tablePickerOpen, setTablePickerOpen] = useState(false);

  const pendingItems = order.items.filter((i) => i.status === "PENDING");
  const kitchenItems = order.items.filter((i) => i.status !== "PENDING" && i.status !== "VOID");
  const voidedItems  = order.items.filter((i) => i.status === "VOID");

  const subtotal    = order.items.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax         = subtotal * 0.1;
  const total       = subtotal + tax - order.discount;
  const nonVoidCount = order.items.filter((i) => i.status !== "VOID").length;

  async function handleVoid() {
    if (!voidTarget) return;
    const reason = voidTarget.needsReason ? voidReason.trim() : "Voided by staff";
    if (voidTarget.needsReason && !reason) return;
    await onVoidItem(voidTarget.id, reason);
    setVoidTarget(null);
    setVoidReason("");
  }

  function openVoid(id: string, name: string, needsReason: boolean) {
    setVoidTarget({ id, name, needsReason });
    setVoidReason("");
  }

  return (
    <div className="relative flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">
              {order.type === "TAKEAWAY" ? (
                <span className="text-orange-400">
                  Takeaway{order.customerName ? ` · ${order.customerName}` : ""}
                </span>
              ) : (
                <span>Counter Order</span>
              )}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">Server: {order.server.name}</p>
          </div>

          {/* Table tag button */}
          <button
            onClick={() => setTablePickerOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0",
              order.table
                ? "bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
            )}
          >
            <Hash size={11} />
            {order.table ? `Table ${order.table.number}` : "Table"}
          </button>
        </div>
      </div>

      {tablePickerOpen && (
        <TablePickerModal
          currentTableId={order.tableId}
          currentOrderId={order.id}
          onAssign={onAssignTable}
          onClose={() => setTablePickerOpen(false)}
        />
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {order.items.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-12">Tap items to add</p>
        )}

        {/* Pending items */}
        {pendingItems.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 bg-gray-800/50 rounded-xl px-3 py-2.5">
            <div className="flex-1 min-w-0 mr-1">
              <p className="text-white text-sm font-medium leading-snug">{item.menuItem.name}</p>
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
              <p className="text-orange-400 text-xs font-semibold mt-0.5">{formatCurrency(item.unitPrice)}</p>
            </div>

            {/* − qty + */}
            <button
              onClick={() => item.quantity > 1 ? onQtyChange(item.id, -1) : onRemove(item.id)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 active:scale-90 transition-all shrink-0"
            >
              {item.quantity > 1 ? <Minus size={15} /> : <Trash2 size={14} />}
            </button>
            <span className="text-white text-sm font-bold w-5 text-center shrink-0">{item.quantity}</span>
            <button
              onClick={() => onQtyChange(item.id, 1)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 active:scale-90 transition-all shrink-0"
            >
              <Plus size={15} />
            </button>

            {/* Quick void — no reason needed for pending */}
            <button
              onClick={() => openVoid(item.id, item.menuItem.name, false)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
              title="Remove"
            >
              <X size={15} />
            </button>
          </div>
        ))}

        {/* Kitchen items */}
        {kitchenItems.length > 0 && (
          <>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold pt-3 pb-1 px-1">
              In Kitchen / Bar
            </p>
            {kitchenItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 border border-gray-800 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0 mr-1">
                  <p className="text-gray-300 text-sm leading-snug">{item.menuItem.name}</p>
                  <p className={cn("text-xs capitalize mt-0.5", STATUS_COLOR[item.status] ?? "text-gray-400")}>
                    {item.status.toLowerCase()}
                  </p>
                </div>
                <span className="text-gray-500 text-sm shrink-0">
                  {item.quantity > 1 && <span className="mr-1 text-gray-600">×{item.quantity}</span>}
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
                <button
                  onClick={() => openVoid(item.id, item.menuItem.name, true)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
                  title="Void"
                >
                  <Ban size={13} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Voided */}
        {voidedItems.length > 0 && (
          <>
            <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-semibold pt-3 pb-1 px-1">
              Voided
            </p>
            {voidedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                <Ban size={11} className="text-red-500/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-sm line-through truncate">{item.menuItem.name}</p>
                  {item.voidReason && (
                    <p className="text-[10px] text-red-400/60 italic mt-0.5">{item.voidReason}</p>
                  )}
                </div>
                <span className="text-gray-700 text-sm line-through shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1.5 text-sm shrink-0">
        <div className="flex justify-between text-gray-400">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Tax 10%</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span>−{formatCurrency(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-gray-800 mt-1">
          <span>Total</span>
          <span>{formatCurrency(Math.max(0, total))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2 shrink-0">
        {pendingItems.length > 0 && (
          <button
            onClick={onSendAll}
            disabled={sending}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[.98]",
              sending
                ? "bg-amber-500/50 text-white/50 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            <ArrowRight size={16} />
            {sending ? "Sending…" : `Send to Kitchen (${pendingItems.length})`}
          </button>
        )}
        <button
          onClick={onPay}
          disabled={nonVoidCount === 0}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[.98]",
            nonVoidCount === 0
              ? "bg-orange-500/30 text-white/30 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          <CreditCard size={16} />
          {nonVoidCount > 0 ? `Pay · ${formatCurrency(Math.max(0, total))}` : "Pay"}
        </button>
      </div>

      {/* Void bottom sheet */}
      {voidTarget && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60">
          <div className="w-full bg-gray-900 border-t border-red-500/20 rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <Ban size={14} />
                <span className="font-semibold text-sm">Void Item</span>
              </div>
              <button onClick={() => setVoidTarget(null)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-gray-300 text-sm">
              Remove <span className="font-semibold text-white">{voidTarget.name}</span> from the bill?
            </p>

            {voidTarget.needsReason && (
              <textarea
                rows={2}
                autoFocus
                placeholder="Reason (e.g. customer changed mind)…"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-red-500/50"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setVoidTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={voidTarget.needsReason && !voidReason.trim()}
                onClick={handleVoid}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
