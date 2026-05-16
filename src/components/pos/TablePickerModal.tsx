"use client";

import { useEffect, useState } from "react";
import { X, Hash, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestaurantTable {
  id: string;
  number: number;
  section: string;
  capacity: number;
  status: "FREE" | "OCCUPIED" | "RESERVED";
  orders: { id: string }[];
}

interface Props {
  currentTableId: string | null;
  currentOrderId: string;
  onAssign: (tableId: string | null) => void;
  onClose: () => void;
}

export default function TablePickerModal({ currentTableId, currentOrderId, onAssign, onClose }: Props) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setTables(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const sections = [...new Set(tables.map((t) => t.section))].sort();

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <p className="text-white font-semibold">Assign Table</p>
            <p className="text-gray-500 text-xs mt-0.5">Tag a table number to this order</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading tables…</p>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <AlertCircle size={28} className="mx-auto text-gray-600" />
              <p className="text-gray-400 text-sm">No tables set up yet.</p>
              <p className="text-gray-600 text-xs">Go to Settings → Tables to add tables.</p>
            </div>
          ) : (
            sections.map((section) => {
              const sectionTables = tables.filter((t) => t.section === section);
              return (
                <div key={section}>
                  {sections.length > 1 && (
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{section}</p>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {sectionTables.map((table) => {
                      const isSelected = table.id === currentTableId;
                      // Occupied by a DIFFERENT order
                      const isTaken = table.status === "OCCUPIED" && !isSelected;

                      return (
                        <button
                          key={table.id}
                          onClick={() => { onAssign(isSelected ? null : table.id); onClose(); }}
                          className={cn(
                            "relative flex flex-col items-center justify-center aspect-square rounded-xl border text-sm font-semibold transition-all active:scale-95",
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                              : isTaken
                              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                              : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600"
                          )}
                        >
                          <Hash size={10} className="absolute top-1.5 left-1.5 opacity-40" />
                          <span className="text-lg font-bold">{table.number}</span>
                          {isTaken && (
                            <span className="text-[8px] font-medium opacity-70 mt-0.5">occupied</span>
                          )}
                          {isSelected && (
                            <span className="text-[8px] font-medium opacity-80 mt-0.5">assigned</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {currentTableId && (
          <div className="px-5 pb-4 shrink-0">
            <button
              onClick={() => { onAssign(null); onClose(); }}
              className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-red-500/40 hover:text-red-400 transition-colors"
            >
              Clear Table Assignment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
