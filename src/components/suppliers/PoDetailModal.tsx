"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CheckCircle, XCircle, Send, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseOrderWithDetails } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  APPROVED: "bg-blue-500/15 text-blue-400",
  SENT: "bg-amber-500/15 text-amber-400",
  RECEIVED: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  po: PurchaseOrderWithDetails | null;
}

export default function PoDetailModal({ open, onClose, onUpdated, po }: Props) {
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});
  const [actualPrices, setActualPrices] = useState<Record<string, string>>({});
  const [acting, setActing] = useState(false);

  if (!po) return null;

  const total = po.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function doAction(endpoint: string, body: object) {
    setActing(true);
    const res = await fetch(`/api/purchase-orders/${po!.id}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActing(false);
    if (res.ok) { onUpdated(); onClose(); }
  }

  async function handleReceive() {
    const qtys: Record<string, number> = {};
    const prices: Record<string, number> = {};
    for (const li of po!.lineItems) {
      const qv = receivedQtys[li.id];
      qtys[li.id] = qv ? parseFloat(qv) : li.quantity;
      const pv = actualPrices[li.id];
      prices[li.id] = pv !== undefined && pv !== "" ? parseFloat(pv) : li.unitPrice;
    }
    await doAction("receive", { receivedQtys: qtys, actualPrices: prices });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="text-white font-semibold text-lg">
                PO #{po.id.slice(-8).toUpperCase()}
              </Dialog.Title>
              <p className="text-gray-400 text-sm">{po.supplier.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_COLORS[po.status] ?? "bg-gray-700 text-gray-300")}>
                {po.status}
              </span>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Supplier</p>
              <p className="text-white font-medium">{po.supplier.name}</p>
              {po.supplier.email && <p className="text-gray-400 text-xs">{po.supplier.email}</p>}
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Created</p>
              <p className="text-white font-medium">{new Date(po.createdAt).toLocaleDateString()}</p>
              <p className="text-gray-400 text-xs">by {po.createdBy.name}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Expected</p>
              <p className="text-white font-medium">
                {po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : "—"}
              </p>
              {po.receivedAt && <p className="text-green-400 text-xs">Received {new Date(po.receivedAt).toLocaleDateString()}</p>}
            </div>
          </div>

          {po.notes && (
            <p className="text-gray-400 text-sm mb-4 bg-gray-800 rounded-lg p-3">{po.notes}</p>
          )}

          {/* Line items */}
          <div className="rounded-xl border border-gray-800 overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Item</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Ordered</th>
                  {po.status === "APPROVED" || po.status === "SENT" ? (
                    <>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">Received Qty</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        <span className="text-amber-400/80">Actual Price</span>
                      </th>
                    </>
                  ) : po.status === "RECEIVED" ? (
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Received</th>
                  ) : null}
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-gray-800">
                    <td className="px-4 py-3 text-white">{li.ingredient.name}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {li.quantity} {li.ingredient.unit}
                    </td>
                    {(po.status === "APPROVED" || po.status === "SENT") ? (
                      <>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={String(li.quantity)}
                            value={receivedQtys[li.id] ?? ""}
                            onChange={(e) => setReceivedQtys((p) => ({ ...p, [li.id]: e.target.value }))}
                            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={li.unitPrice.toFixed(2)}
                            value={actualPrices[li.id] ?? ""}
                            onChange={(e) => setActualPrices((p) => ({ ...p, [li.id]: e.target.value }))}
                            className="w-24 bg-gray-800 border border-amber-500/30 focus:border-amber-400 rounded px-2 py-1 text-amber-300 text-sm text-right outline-none"
                          />
                        </td>
                      </>
                    ) : po.status === "RECEIVED" ? (
                      <td className="px-4 py-3 text-right text-green-400">
                        {li.receivedQty ?? li.quantity} {li.ingredient.unit}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-right text-gray-300">£{li.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      £{(li.quantity * li.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-800/40">
                <tr>
                  <td colSpan={(po.status === "APPROVED" || po.status === "SENT") ? 5 : po.status === "RECEIVED" ? 4 : 3} className="px-4 py-3 text-right text-gray-400 font-medium">
                    Order Total
                  </td>
                  <td className="px-4 py-3 text-right text-orange-400 font-semibold">£{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Receive info */}
          {(po.status === "APPROVED" || po.status === "SENT") && (
            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 text-xs text-amber-300/90">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>
                <span className="font-semibold">Actual prices</span> will update ingredient cost-per-unit in Kitchen Stock. Leave blank to keep the ordered price. Estimated prices will be marked as confirmed.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {po.status === "DRAFT" && (
              <>
                <button
                  disabled={acting}
                  onClick={() => doAction("approve", { action: "cancel" })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10 disabled:opacity-50"
                >
                  <XCircle size={16} /> Cancel PO
                </button>
                <button
                  disabled={acting}
                  onClick={() => doAction("approve", { action: "approve" })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 ml-auto"
                >
                  <CheckCircle size={16} /> Approve &amp; Send Email
                </button>
              </>
            )}
            {po.status === "APPROVED" && (
              <button
                disabled={acting}
                onClick={() => doAction("send", {})}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50 ml-auto"
              >
                <Send size={16} /> Mark as Sent
              </button>
            )}
            {(po.status === "APPROVED" || po.status === "SENT") && (
              <button
                disabled={acting}
                onClick={handleReceive}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-50",
                  po.status === "APPROVED" ? "" : "ml-auto"
                )}
              >
                <PackageCheck size={16} /> Receive Goods
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
