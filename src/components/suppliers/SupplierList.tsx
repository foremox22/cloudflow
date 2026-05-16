"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Star, ChevronDown, ChevronUp,
  Package, FileText, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/confirm";
import type { SupplierWithProducts, PurchaseOrderWithDetails } from "@/types";
import SupplierModal from "./SupplierModal";
import SupplierProductModal from "./SupplierProductModal";
import PurchaseOrderModal from "./PurchaseOrderModal";
import PoDetailModal from "./PoDetailModal";

const PO_STATUSES = ["ALL", "DRAFT", "APPROVED", "SENT", "RECEIVED", "CANCELLED"] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  APPROVED: "bg-blue-500/15 text-blue-400",
  SENT: "bg-amber-500/15 text-amber-400",
  RECEIVED: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
}

export default function SupplierList() {
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "suppliers" | "orders") ?? "suppliers";
  const highlightPoId = searchParams.get("po");

  const [suppliers, setSuppliers] = useState<SupplierWithProducts[]>([]);
  const [pos, setPos] = useState<PurchaseOrderWithDetails[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [poStatusFilter, setPoStatusFilter] = useState<string>("ALL");
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithProducts | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productTargetSupplier, setProductTargetSupplier] = useState<SupplierWithProducts | null>(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<PurchaseOrderWithDetails | null>(null);

  const [performances, setPerformances] = useState<Record<string, { onTimePct: number | null; avgPriceVariancePct: number | null }>>({});

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    if (res.ok) setSuppliers(await res.json());
  }, []);

  const fetchPos = useCallback(async () => {
    const res = await fetch("/api/purchase-orders");
    if (res.ok) setPos(await res.json());
  }, []);

  const fetchIngredients = useCallback(async () => {
    const res = await fetch("/api/ingredients");
    if (res.ok) setIngredients(await res.json());
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchPos();
    fetchIngredients();
  }, [fetchSuppliers, fetchPos, fetchIngredients]);

  // Auto-open PO from notification link
  useEffect(() => {
    if (highlightPoId && pos.length > 0) {
      const po = pos.find((p) => p.id === highlightPoId);
      if (po) setDetailPo(po);
    }
  }, [highlightPoId, pos]);

  async function fetchPerformance(supplierId: string) {
    const res = await fetch(`/api/suppliers/${supplierId}/performance`);
    if (res.ok) {
      const data = await res.json();
      setPerformances((p) => ({ ...p, [supplierId]: data }));
    }
  }

  function toggleExpand(id: string) {
    if (expandedSupplier === id) { setExpandedSupplier(null); return; }
    setExpandedSupplier(id);
    if (!performances[id]) fetchPerformance(id);
  }

  async function archiveSupplier(id: string) {
    if (!await confirm("Archive this supplier?", { title: "Archive supplier", confirmText: "Archive", variant: "danger" })) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchSuppliers();
  }

  async function removeProduct(supplierId: string, productId: string) {
    if (!await confirm("Remove this product?", { title: "Remove product", confirmText: "Remove", variant: "danger" })) return;
    await fetch(`/api/suppliers/${supplierId}/products/${productId}`, { method: "DELETE" });
    fetchSuppliers();
  }

  function setTab(t: string) {
    router.push(`/suppliers?tab=${t}`);
  }

  const filteredPos = poStatusFilter === "ALL" ? pos : pos.filter((p) => p.status === poStatusFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(["suppliers", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            {t === "suppliers" ? `Suppliers (${suppliers.length})` : `Purchase Orders (${pos.length})`}
          </button>
        ))}
      </div>

      {/* ═══ SUPPLIERS TAB ═══ */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{suppliers.length} active supplier{suppliers.length !== 1 ? "s" : ""}</p>
            <button
              onClick={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Supplier
            </button>
          </div>

          {suppliers.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>No suppliers yet. Add your first supplier.</p>
            </div>
          )}

          <div className="space-y-3">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Supplier header */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-orange-400 font-bold text-sm">{s.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{s.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {s.contactName && <span>{s.contactName}</span>}
                      {s.email && <span>{s.email}</span>}
                      {s.phone && <span>{s.phone}</span>}
                      <span>{s.leadDays}d lead</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                      {s.products.length} products
                    </span>
                    <button
                      onClick={() => { setProductTargetSupplier(s); setProductModalOpen(true); }}
                      className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1"
                    >
                      + Product
                    </button>
                    <button
                      onClick={() => { setEditingSupplier(s); setSupplierModalOpen(true); }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => archiveSupplier(s.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"
                    >
                      {expandedSupplier === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded: products + performance */}
                {expandedSupplier === s.id && (
                  <div className="border-t border-gray-800 bg-gray-950">
                    {/* Performance row */}
                    {performances[s.id] && (
                      <div className="flex items-center gap-6 px-4 py-3 border-b border-gray-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-gray-500" />
                          <span className="text-gray-400">{performances[s.id]?.onTimePct !== null ? `${performances[s.id].onTimePct}% on-time` : "No deliveries yet"}</span>
                        </div>
                        {performances[s.id]?.avgPriceVariancePct !== null && (
                          <div className="flex items-center gap-1.5">
                            {(performances[s.id]?.avgPriceVariancePct ?? 0) > 5 ? (
                              <TrendingUp size={12} className="text-red-400" />
                            ) : (performances[s.id]?.avgPriceVariancePct ?? 0) < -5 ? (
                              <TrendingDown size={12} className="text-green-400" />
                            ) : (
                              <Minus size={12} className="text-gray-400" />
                            )}
                            <span className={cn(
                              (performances[s.id]?.avgPriceVariancePct ?? 0) > 5 ? "text-red-400" :
                              (performances[s.id]?.avgPriceVariancePct ?? 0) < -5 ? "text-green-400" :
                              "text-gray-400"
                            )}>
                              Avg price {(performances[s.id]?.avgPriceVariancePct ?? 0) > 0 ? "+" : ""}{performances[s.id].avgPriceVariancePct}% vs current cost
                            </span>
                          </div>
                        )}
                        <span className="text-gray-500">{s._count.purchaseOrders} total POs</span>
                      </div>
                    )}

                    {/* Products table */}
                    {s.products.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-medium text-xs">Ingredient</th>
                            <th className="px-4 py-2.5 text-right text-gray-500 font-medium text-xs">Unit Price</th>
                            <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">Preferred</th>
                            <th className="px-4 py-2.5 text-right text-gray-500 font-medium text-xs"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.products.map((p) => (
                            <tr key={p.id} className="border-t border-gray-800/50">
                              <td className="px-4 py-2.5 text-white">{p.ingredient.name}</td>
                              <td className="px-4 py-2.5 text-right text-gray-300">
                                £{p.unitPrice.toFixed(2)} / {p.unit}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {p.isPreferred && <Star size={14} className="inline text-amber-400 fill-amber-400" />}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  onClick={() => removeProduct(s.id, p.id)}
                                  className="text-gray-500 hover:text-red-400"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-4 py-4 text-gray-600 text-sm">No products listed. Click + Product to add.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PURCHASE ORDERS TAB ═══ */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {PO_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPoStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    poStatusFilter === s
                      ? "bg-orange-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}
                >
                  {s === "ALL" ? `All (${pos.length})` : s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPoModalOpen(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} /> New PO
            </button>
          </div>

          {filteredPos.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>No purchase orders{poStatusFilter !== "ALL" ? ` with status ${poStatusFilter}` : ""}.</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredPos.map((po) => {
              const total = po.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
              return (
                <button
                  key={po.id}
                  onClick={() => setDetailPo(po)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">#{po.id.slice(-8).toUpperCase()}</span>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[po.status])}>
                          {po.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{po.supplier.name}</span>
                        <span>{po.lineItems.length} item{po.lineItems.length !== 1 ? "s" : ""}</span>
                        {po.expectedAt && <span>Expected {new Date(po.expectedAt).toLocaleDateString()}</span>}
                        <span>by {po.createdBy.name}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-orange-400 font-semibold">£{total.toFixed(2)}</p>
                      <p className="text-gray-600 text-xs">{new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <SupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSaved={fetchSuppliers}
        supplier={editingSupplier}
      />
      {productTargetSupplier && (
        <SupplierProductModal
          open={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          onSaved={fetchSuppliers}
          supplierId={productTargetSupplier.id}
          supplierName={productTargetSupplier.name}
          ingredients={ingredients}
          existingIds={productTargetSupplier.products.map((p) => p.ingredient.id)}
        />
      )}
      <PurchaseOrderModal
        open={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        onSaved={fetchPos}
        suppliers={suppliers}
        ingredients={ingredients}
      />
      <PoDetailModal
        open={!!detailPo}
        onClose={() => setDetailPo(null)}
        onUpdated={() => { fetchPos(); fetchSuppliers(); }}
        po={detailPo}
      />
    </div>
  );
}
