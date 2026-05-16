"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, XCircle, Calendar } from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { cn } from "@/lib/utils";
import { LEAVE_TYPE_COLORS as TYPE_COLORS, LEAVE_STATUS_COLORS as STATUS_COLORS } from "@/lib/colors";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  user: { id: string; name: string };
  reviewedBy?: { name: string } | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const canApprove = (role: string) => ["ADMIN", "MANAGER"].includes(role);

export default function LeavePanel({ role, userId }: { role: string; userId: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "pending">("pending");
  const [newOpen, setNewOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/leave");
    if (res.ok) setRequests(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = requests.filter((r) => {
    if (filter === "mine") return r.user.id === userId;
    if (filter === "pending") return r.status === "PENDING";
    return true;
  });

  async function submitRequest() {
    if (!form.startDate || !form.endDate) return;
    setSaving(true);
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason || undefined,
      }),
    });
    if (res.ok) {
      await load();
      setNewOpen(false);
      setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
    }
    setSaving(false);
  }

  async function review(status: "APPROVED" | "REJECTED") {
    if (!reviewModal) return;
    setSaving(true);
    const res = await fetch(`/api/leave/${reviewModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote: reviewNote || undefined }),
    });
    if (res.ok) {
      await load();
      setReviewModal(null);
      setReviewNote("");
    }
    setSaving(false);
  }

  async function cancelRequest(id: string) {
    await fetch(`/api/leave/${id}`, { method: "DELETE" });
    await load();
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(["pending", "mine", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 text-xs rounded-lg transition-colors font-medium",
                filter === f ? "bg-orange-500/15 text-orange-400" : "text-gray-400 hover:text-white"
              )}>
              {f === "pending" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f === "mine" ? "My Requests" : "All"}
            </button>
          ))}
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
          <Plus size={14} />
          Request Leave
        </button>
      </div>

      {displayed.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            {filter === "pending" ? "No pending leave requests." : "No leave requests found."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((r) => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Calendar size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{r.user.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", TYPE_COLORS[r.type])}>
                      {r.type.replace("_", " ")}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[r.status])}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{fmt(r.startDate)} – {fmt(r.endDate)}</p>
                  {r.reason && <p className="text-gray-400 text-xs mt-0.5">"{r.reason}"</p>}
                  {r.reviewedBy && r.reviewNote && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {r.status === "REJECTED" ? "Rejected" : "Approved"} by {r.reviewedBy.name}: {r.reviewNote}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canApprove(role) && r.status === "PENDING" && (
                  <>
                    <button onClick={() => { setReviewModal(r); setReviewNote(""); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors">
                      <Check size={12} /> Review
                    </button>
                  </>
                )}
                {r.user.id === userId && r.status === "PENDING" && (
                  <button onClick={() => cancelRequest(r.id)}
                    className="text-xs px-2.5 py-1.5 text-gray-500 hover:text-red-400 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Leave Modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Request Leave</h2>
              <button onClick={() => setNewOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Leave Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="input">
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Dates</label>
                <DateRangePicker
                  startDate={form.startDate}
                  endDate={form.endDate}
                  onChange={(start, end) => setForm((f) => ({ ...f, startDate: start, endDate: end }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reason (optional)</label>
                <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={2} placeholder="Brief reason for leave"
                  className="input resize-none" />
              </div>
              <button onClick={submitRequest} disabled={saving || !form.startDate || !form.endDate}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Review Leave Request</h2>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-white font-medium text-sm">{reviewModal.user.name}</p>
              <p className="text-gray-400 text-xs">{reviewModal.type.replace("_", " ")} · {fmt(reviewModal.startDate)} – {fmt(reviewModal.endDate)}</p>
              {reviewModal.reason && <p className="text-gray-400 text-xs mt-1">"{reviewModal.reason}"</p>}
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
              <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reason for decision…"
                className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => review("APPROVED")} disabled={saving}
                className="flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => review("REJECTED")} disabled={saving}
                className="flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
