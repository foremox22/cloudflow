"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowDownCircle, ArrowUpCircle, Trash2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "IN" | "OUT" | "WASTE" | "ADJUST";
  quantity: number;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
}

const TX_ICONS = {
  IN: <ArrowDownCircle size={14} className="text-emerald-400" />,
  OUT: <ArrowUpCircle size={14} className="text-red-400" />,
  WASTE: <Trash2 size={14} className="text-amber-400" />,
  ADJUST: <RefreshCw size={14} className="text-blue-400" />,
};

const TX_COLORS = {
  IN: "text-emerald-400",
  OUT: "text-red-400",
  WASTE: "text-amber-400",
  ADJUST: "text-blue-400",
};

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  unit: string;
}

export default function TransactionHistoryModal({ open, onClose, itemId, itemName, unit }: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/stock/transactions?itemType=KITCHEN&itemId=${itemId}`)
      .then((r) => r.json())
      .then((data: Transaction[]) => { setTxs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, itemId]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
            <div>
              <Dialog.Title className="text-white font-semibold">{itemName}</Dialog.Title>
              <p className="text-gray-400 text-xs mt-0.5">Transaction history</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <p className="text-gray-500 text-sm text-center py-8">Loading…</p>
            ) : txs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No transactions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="flex items-start gap-3 bg-gray-800/50 rounded-lg px-3 py-2.5">
                    <div className="mt-0.5 shrink-0">{TX_ICONS[tx.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${TX_COLORS[tx.type]}`}>{tx.type}</span>
                        <span className={`text-sm font-bold ${TX_COLORS[tx.type]}`}>
                          {tx.type === "IN" ? "+" : "−"}{tx.quantity} {unit}
                        </span>
                      </div>
                      {tx.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.notes}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()} · {tx.createdBy.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
