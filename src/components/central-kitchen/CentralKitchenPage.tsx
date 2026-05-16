"use client";

import { useEffect, useState } from "react";
import {
  Warehouse, Link2, Plus, X, ChevronRight, Package, AlertTriangle,
  CheckCircle, Truck, ClipboardList, BarChart2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/ui/DatePicker";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

// ─── Types ────────────────────────────────────────────────────────────────────

type DistStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "DISPATCHED" | "RECEIVED" | "CANCELLED";

interface LinkedRestaurant { id: string; name: string; type: string; linkedAt: string }
interface AvailableCK { id: string; name: string }

interface LinksData {
  mode: "ck" | "restaurant";
  linkedRestaurants: LinkedRestaurant[];
  linkedCKs: LinkedRestaurant[];
  availableCKs: AvailableCK[];
}

interface DistItem {
  id: string;
  ingredientName: string;
  unit: string;
  requestedQty: number;
  approvedQty: number | null;
  dispatchedQty: number | null;
  receivedQty: number | null;
  ckIngredient: { id: string; name: string; unit: string; currentStock: number; category?: string };
}

interface DistRequest {
  id: string;
  status: DistStatus;
  neededBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fromRestaurant: { id: string; name: string };
  centralKitchen: { id: string; name: string };
  createdBy: { id: string; name: string };
  items: DistItem[];
}

interface DemandRow {
  ingredientName: string;
  unit: string;
  currentStock: number;
  totalQty: number;
  shortfall: number;
  byRestaurant: { name: string; qty: number; status: string }[];
}

type Tab = "requests" | "demand" | "links";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<DistStatus, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved",
  DISPATCHED: "Dispatched", RECEIVED: "Received", CANCELLED: "Cancelled",
};
const STATUS_COLOR: Record<DistStatus, string> = {
  DRAFT:      "bg-gray-700 text-gray-300",
  SUBMITTED:  "bg-blue-500/15 text-blue-400",
  APPROVED:   "bg-orange-500/15 text-orange-400",
  DISPATCHED: "bg-purple-500/15 text-purple-400",
  RECEIVED:   "bg-emerald-500/15 text-emerald-400",
  CANCELLED:  "bg-red-500/15 text-red-400",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CentralKitchenPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("requests");
  const [links, setLinks] = useState<LinksData | null>(null);
  const [requests, setRequests] = useState<DistRequest[]>([]);
  const [demand, setDemand] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DistRequest | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);

  async function loadLinks() {
    const r = await fetch("/api/central-kitchen/links");
    if (r.ok) setLinks(await r.json());
  }

  async function loadRequests() {
    const r = await fetch("/api/central-kitchen/requests");
    if (r.ok) setRequests(await r.json());
  }

  async function loadDemand() {
    const r = await fetch("/api/central-kitchen/demand");
    if (r.ok) setDemand(await r.json());
  }

  useEffect(() => {
    Promise.all([loadLinks(), loadRequests()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "demand" && links?.mode === "ck") loadDemand();
  }, [tab, links?.mode]);

  const isCK = links?.mode === "ck";

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4 animate-pulse">
        <div className="h-10 bg-gray-800 rounded-xl w-64" />
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  // ─── Not linked and not a CK ──
  const notLinked = !isCK && (links?.linkedCKs.length ?? 0) === 0 && (links?.availableCKs.length ?? 0) === 0;

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { key: "requests", label: isCK ? "Incoming Requests" : "My Requests", icon: ClipboardList },
          ...(isCK ? [{ key: "demand" as Tab, label: "Demand Overview", icon: BarChart2 }] : []),
          { key: "links" as Tab, label: isCK ? "Linked Restaurants" : "Connections", icon: Link2 },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === key ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Requests tab ── */}
      {tab === "requests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {requests.length} request{requests.length !== 1 ? "s" : ""}
            </p>
            {!isCK && (links?.linkedCKs.length ?? 0) > 0 && (
              <button
                onClick={() => setShowNewRequest(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                New Request
              </button>
            )}
          </div>

          {notLinked ? (
            <EmptyNotLinked availableCKs={links?.availableCKs ?? []} onLinked={() => { loadLinks(); loadRequests(); }} toast={toast} />
          ) : requests.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <ClipboardList size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No requests yet</p>
              {!isCK && <p className="text-gray-600 text-xs mt-1">Create a request to get ingredients from your central kitchen</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <RequestCard key={req.id} req={req} isCK={isCK} onOpen={setSelected} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Demand tab (CK only) ── */}
      {tab === "demand" && isCK && (
        <DemandView demand={demand} />
      )}

      {/* ── Links tab ── */}
      {tab === "links" && (
        <LinksView links={links} isCK={isCK} onRefresh={loadLinks} toast={toast} />
      )}

      {/* Modals */}
      {selected && (
        <RequestDetailModal
          req={selected}
          isCK={isCK}
          onClose={() => setSelected(null)}
          onRefresh={() => { loadRequests(); setSelected(null); }}
          toast={toast}
        />
      )}
      {showNewRequest && links?.linkedCKs && (
        <NewRequestModal
          linkedCKs={links.linkedCKs}
          onClose={() => setShowNewRequest(false)}
          onCreated={() => { loadRequests(); setShowNewRequest(false); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ req, isCK, onOpen }: { req: DistRequest; isCK: boolean; onOpen: (r: DistRequest) => void }) {
  const totalItems = req.items.length;
  const totalQty = req.items.reduce((s, i) => s + i.requestedQty, 0);
  return (
    <button
      onClick={() => onOpen(req)}
      className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-left transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLOR[req.status])}>
            {STATUS_LABEL[req.status]}
          </span>
          <span className="text-xs text-gray-500">
            {isCK ? `From: ${req.fromRestaurant.name}` : `To: ${req.centralKitchen.name}`}
          </span>
        </div>
        <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white font-medium">{totalItems} ingredient{totalItems !== 1 ? "s" : ""}</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{Math.round(totalQty * 100) / 100} total qty</span>
        {req.neededBy && (
          <>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400">Needed: {new Date(req.neededBy).toLocaleDateString()}</span>
          </>
        )}
      </div>
      {req.notes && <p className="text-xs text-gray-500 mt-1.5 truncate">{req.notes}</p>}
    </button>
  );
}

// ─── Request detail modal ─────────────────────────────────────────────────────

function RequestDetailModal({
  req, isCK, onClose, onRefresh, toast,
}: {
  req: DistRequest; isCK: boolean; onClose: () => void; onRefresh: () => void; toast: ReturnType<typeof useToast>;
}) {
  const [saving, setSaving] = useState(false);
  const [approvedQtys, setApprovedQtys] = useState<Record<string, number>>(
    Object.fromEntries(req.items.map((i) => [i.id, i.approvedQty ?? i.requestedQty]))
  );
  const [dispatchedQtys, setDispatchedQtys] = useState<Record<string, number>>(
    Object.fromEntries(req.items.map((i) => [i.id, i.dispatchedQty ?? i.approvedQty ?? i.requestedQty]))
  );
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    Object.fromEntries(req.items.map((i) => [i.id, i.receivedQty ?? i.dispatchedQty ?? i.requestedQty]))
  );

  async function action(endpoint: string, body: object) {
    setSaving(true);
    const res = await fetch(`/api/central-kitchen/requests/${req.id}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(`Request ${endpoint}d successfully`);
      onRefresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Action failed");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Warehouse size={16} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Distribution Request</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {isCK ? `From ${req.fromRestaurant.name}` : `To ${req.centralKitchen.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_COLOR[req.status])}>
              {STATUS_LABEL[req.status]}
            </span>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {req.notes && (
            <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">{req.notes}</p>
          )}
          {req.neededBy && (
            <p className="text-xs text-gray-500">Needed by: <span className="text-gray-300">{new Date(req.neededBy).toLocaleDateString()}</span></p>
          )}

          {/* Items table */}
          <div className="bg-gray-800/40 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-xs text-gray-500 font-semibold px-4 py-2.5">Ingredient</th>
                  <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Requested</th>
                  {(req.status === "APPROVED" || req.status === "DISPATCHED" || req.status === "RECEIVED") && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Approved</th>
                  )}
                  {(req.status === "DISPATCHED" || req.status === "RECEIVED") && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Dispatched</th>
                  )}
                  {req.status === "RECEIVED" && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Received</th>
                  )}
                  {/* CK-editable approve column */}
                  {isCK && req.status === "SUBMITTED" && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Approve qty</th>
                  )}
                  {isCK && req.status === "APPROVED" && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Dispatch qty</th>
                  )}
                  {!isCK && req.status === "DISPATCHED" && (
                    <th className="text-right text-xs text-gray-500 font-semibold px-4 py-2.5">Received qty</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {req.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="text-white font-medium">{item.ingredientName}</p>
                      {isCK && (
                        <p className="text-xs text-gray-500">Stock: {item.ckIngredient.currentStock} {item.unit}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{item.requestedQty} {item.unit}</td>
                    {(req.status === "APPROVED" || req.status === "DISPATCHED" || req.status === "RECEIVED") && (
                      <td className="px-4 py-2.5 text-right text-orange-400">{item.approvedQty ?? "—"} {item.unit}</td>
                    )}
                    {(req.status === "DISPATCHED" || req.status === "RECEIVED") && (
                      <td className="px-4 py-2.5 text-right text-purple-400">{item.dispatchedQty ?? "—"} {item.unit}</td>
                    )}
                    {req.status === "RECEIVED" && (
                      <td className="px-4 py-2.5 text-right text-emerald-400">{item.receivedQty ?? "—"} {item.unit}</td>
                    )}
                    {isCK && req.status === "SUBMITTED" && (
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={approvedQtys[item.id] ?? item.requestedQty}
                          onChange={(e) => setApprovedQtys((p) => ({ ...p, [item.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    )}
                    {isCK && req.status === "APPROVED" && (
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={dispatchedQtys[item.id] ?? (item.approvedQty ?? item.requestedQty)}
                          onChange={(e) => setDispatchedQtys((p) => ({ ...p, [item.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    )}
                    {!isCK && req.status === "DISPATCHED" && (
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={receivedQtys[item.id] ?? (item.dispatchedQty ?? item.requestedQty)}
                          onChange={(e) => setReceivedQtys((p) => ({ ...p, [item.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-800 flex items-center gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Close
          </button>
          {/* Restaurant: submit draft */}
          {!isCK && req.status === "DRAFT" && (
            <button
              onClick={() => action("submit", {})}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              Submit to CK
            </button>
          )}
          {/* CK: approve submitted */}
          {isCK && req.status === "SUBMITTED" && (
            <>
              <button
                onClick={() => action("approve", { approvedQtys, cancel: true })}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => action("approve", { approvedQtys })}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            </>
          )}
          {/* CK: dispatch approved */}
          {isCK && req.status === "APPROVED" && (
            <button
              onClick={() => action("dispatch", { dispatchedQtys })}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Truck size={14} />
              Dispatch
            </button>
          )}
          {/* Restaurant: confirm received */}
          {!isCK && req.status === "DISPATCHED" && (
            <button
              onClick={() => action("receive", { receivedQtys })}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              Confirm Received
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Demand overview (CK mode) ────────────────────────────────────────────────

function DemandView({ demand }: { demand: DemandRow[] }) {
  if (demand.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <BarChart2 size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No pending demand</p>
        <p className="text-gray-600 text-xs mt-1">Approved and submitted requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{demand.length} ingredient{demand.length !== 1 ? "s" : ""} needed across linked restaurants</p>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Ingredient</th>
              <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Total Needed</th>
              <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">In Stock</th>
              <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Shortfall</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {demand.map((row) => (
              <tr key={row.ingredientName} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3 font-medium text-white">{row.ingredientName}</td>
                <td className="px-4 py-3 text-right text-orange-400 font-semibold">{row.totalQty} {row.unit}</td>
                <td className="px-4 py-3 text-right text-gray-300">{Math.round(row.currentStock * 100) / 100} {row.unit}</td>
                <td className="px-4 py-3 text-right">
                  {row.shortfall > 0 ? (
                    <span className="text-red-400 font-semibold flex items-center justify-end gap-1">
                      <AlertTriangle size={12} />
                      {row.shortfall} {row.unit}
                    </span>
                  ) : (
                    <span className="text-emerald-400">OK</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.byRestaurant.map((b, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {b.name}: {b.qty} {row.unit}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Links management ─────────────────────────────────────────────────────────

function LinksView({ links, isCK, onRefresh, toast }: {
  links: LinksData | null; isCK: boolean; onRefresh: () => void; toast: ReturnType<typeof useToast>;
}) {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  async function link(ckId: string) {
    setSaving(true);
    const res = await fetch("/api/central-kitchen/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ckId }),
    });
    if (res.ok) { toast.success("Linked to Central Kitchen"); onRefresh(); }
    else { const e = await res.json(); toast.error(e.error ?? "Failed to link"); }
    setSaving(false);
  }

  async function unlink(otherId: string) {
    if (!await confirm("Remove this link?", { title: "Remove link", confirmText: "Remove", variant: "danger" })) return;
    const res = await fetch(`/api/central-kitchen/links/${otherId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Link removed"); onRefresh(); }
    else toast.error("Failed to remove link");
  }

  if (!links) return null;

  return (
    <div className="space-y-6">
      {isCK ? (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">
            Restaurants served by this Central Kitchen ({links.linkedRestaurants.length})
          </h3>
          {links.linkedRestaurants.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Link2 size={28} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No restaurants linked yet</p>
              <p className="text-gray-600 text-xs mt-1">Restaurant admins can link to this central kitchen from their Central Kitchen page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.linkedRestaurants.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/15 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{r.type.toLowerCase().replace("_", " ")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => unlink(r.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {links.linkedCKs.length > 0 && (
            <div>
              <h3 className="text-white font-semibold text-sm mb-3">Connected Central Kitchens</h3>
              <div className="space-y-2">
                {links.linkedCKs.map((ck) => (
                  <div key={ck.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/15 rounded-lg flex items-center justify-center">
                        <Warehouse size={14} className="text-purple-400" />
                      </div>
                      <p className="text-white text-sm font-medium">{ck.name}</p>
                    </div>
                    <button
                      onClick={() => unlink(ck.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {links.availableCKs.length > 0 && (
            <div>
              <h3 className="text-white font-semibold text-sm mb-3">Available Central Kitchens</h3>
              <div className="space-y-2">
                {links.availableCKs
                  .filter((ck) => !links.linkedCKs.some((l) => l.id === ck.id))
                  .map((ck) => (
                    <div key={ck.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Warehouse size={14} className="text-gray-400" />
                        </div>
                        <p className="text-gray-300 text-sm">{ck.name}</p>
                      </div>
                      <button
                        onClick={() => link(ck.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 text-orange-400 text-xs font-medium rounded-lg hover:bg-orange-500/25 transition-colors disabled:opacity-50"
                      >
                        <Link2 size={12} />
                        Connect
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Empty state when not linked ─────────────────────────────────────────────

function EmptyNotLinked({ availableCKs, onLinked, toast }: {
  availableCKs: AvailableCK[]; onLinked: () => void; toast: ReturnType<typeof useToast>;
}) {
  const [saving, setSaving] = useState(false);

  async function link(ckId: string) {
    setSaving(true);
    const res = await fetch("/api/central-kitchen/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ckId }),
    });
    if (res.ok) { toast.success("Connected to Central Kitchen"); onLinked(); }
    else { const e = await res.json(); toast.error(e.error ?? "Failed"); }
    setSaving(false);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
      <Warehouse size={36} className="text-gray-600 mx-auto mb-3" />
      <p className="text-gray-300 font-medium mb-1">Not connected to a Central Kitchen</p>
      <p className="text-gray-500 text-sm mb-6">
        Connect to a Central Kitchen to request pre-made ingredients and batch-prepared items.
      </p>
      {availableCKs.length > 0 ? (
        <div className="space-y-2 max-w-sm mx-auto">
          {availableCKs.map((ck) => (
            <button
              key={ck.id}
              onClick={() => link(ck.id)}
              disabled={saving}
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Warehouse size={14} className="text-orange-400" />
                <span className="text-white">{ck.name}</span>
              </div>
              <ArrowRight size={14} className="text-gray-400" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-xs">
          To set up a Central Kitchen, go to Settings and change a restaurant's type to "Central Kitchen"
        </p>
      )}
    </div>
  );
}

// ─── New request modal ────────────────────────────────────────────────────────

function NewRequestModal({ linkedCKs, onClose, onCreated, toast }: {
  linkedCKs: LinkedRestaurant[]; onClose: () => void; onCreated: () => void; toast: ReturnType<typeof useToast>;
}) {
  const [ckId, setCkId] = useState(linkedCKs[0]?.id ?? "");
  const [neededBy, setNeededBy] = useState("");
  const [notes, setNotes] = useState("");
  const [ckIngredients, setCkIngredients] = useState<{ id: string; name: string; unit: string; currentStock: number }[]>([]);
  const [items, setItems] = useState<{ ckIngredientId: string; ingredientName: string; unit: string; requestedQty: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ckId) return;
    // Load CK's ingredients by switching context temporarily
    // We'll use a separate endpoint: GET /api/central-kitchen/ingredients?ckId=X
    fetch(`/api/central-kitchen/ingredients?ckId=${ckId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCkIngredients(data); })
      .catch(() => null);
  }, [ckId]);

  function addItem() {
    const first = ckIngredients[0];
    if (!first) return;
    setItems((prev) => [...prev, { ckIngredientId: first.id, ingredientName: first.name, unit: first.unit, requestedQty: 1 }]);
  }

  function updateItem(idx: number, field: string, value: string | number) {
    setItems((prev) => {
      const copy = [...prev];
      if (field === "ckIngredientId") {
        const ing = ckIngredients.find((i) => i.id === value);
        if (ing) copy[idx] = { ...copy[idx], ckIngredientId: ing.id, ingredientName: ing.name, unit: ing.unit };
      } else {
        copy[idx] = { ...copy[idx], [field]: value };
      }
      return copy;
    });
  }

  async function submit() {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    const res = await fetch("/api/central-kitchen/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centralKitchenId: ckId, neededBy: neededBy || undefined, notes: notes || undefined, items }),
    });
    if (res.ok) { toast.success("Request created"); onCreated(); }
    else { const e = await res.json(); toast.error(e.error ?? "Failed to create"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold">New Distribution Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {linkedCKs.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Central Kitchen</label>
              <select value={ckId} onChange={(e) => setCkId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
                {linkedCKs.map((ck) => <option key={ck.id} value={ck.id}>{ck.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Needed By (optional)</label>
            <DatePicker value={neededBy} onChange={setNeededBy} placeholder="No date set" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Items</label>
              <button onClick={addItem} disabled={ckIngredients.length === 0} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 disabled:opacity-40">
                <Plus size={12} /> Add item
              </button>
            </div>
            {ckIngredients.length === 0 && (
              <p className="text-gray-500 text-xs text-center py-3">Loading CK ingredients…</p>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select
                  value={item.ckIngredientId}
                  onChange={(e) => updateItem(idx, "ckIngredientId", e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  {ckIngredients.map((i) => <option key={i.id} value={i.id}>{i.name} (stock: {i.currentStock} {i.unit})</option>)}
                </select>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={item.requestedQty}
                  onChange={(e) => updateItem(idx, "requestedQty", parseFloat(e.target.value) || 0)}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-right focus:outline-none focus:border-orange-500"
                />
                <span className="text-xs text-gray-500 w-8">{item.unit}</span>
                <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={submit} disabled={items.length === 0 || saving} className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Creating…" : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
