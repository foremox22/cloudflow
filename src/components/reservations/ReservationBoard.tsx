"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Users, Phone,
  CheckCircle2, XCircle, AlertCircle, Utensils, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import type { ReservationRow, ReservationStatus } from "@/types";
import ReservationModal from "./ReservationModal";

const STATUS_META: Record<ReservationStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: "Pending",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",   icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  SEATED:    { label: "Seated",    color: "bg-sky-500/15 text-sky-400 border-sky-500/30",          icon: Utensils },
  CANCELLED: { label: "Cancelled", color: "bg-gray-700/60 text-gray-500 border-gray-700",          icon: XCircle },
  NO_SHOW:   { label: "No-show",   color: "bg-red-500/15 text-red-400 border-red-500/30",          icon: AlertCircle },
};

type FilterTab = "ALL" | ReservationStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All",       value: "ALL" },
  { label: "Upcoming",  value: "CONFIRMED" },
  { label: "Pending",   value: "PENDING" },
  { label: "Seated",    value: "SEATED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No-show",   value: "NO_SHOW" },
];

function dateToLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDisplayDate(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateToLocal(d) === dateToLocal(today))    return "Today";
  if (dateToLocal(d) === dateToLocal(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function ReservationBoard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<FilterTab>("ALL");
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<ReservationRow | null>(null);
  const [actionId, setActionId]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const dateStr = dateToLocal(selectedDate);
    const res = await fetch(`/api/reservations?date=${dateStr}`);
    if (res.ok) setReservations(await res.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  function shiftDay(n: number) {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + n);
      return next;
    });
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    setActionId(id);
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionId(null);
    await load();
  }

  async function seatReservation(r: ReservationRow) {
    setActionId(r.id);
    // Create a walk-in order then mark reservation SEATED
    await fetch(`/api/reservations/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SEATED" }),
    });
    setActionId(null);
    await load();
  }

  async function deleteReservation(id: string) {
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    await load();
  }

  const visible = reservations.filter(
    (r) => tab === "ALL" || r.status === tab
  );

  const counts = reservations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    acc.ALL = (acc.ALL ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Reservations" subtitle="Manage bookings and walk-ins" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl">

        {/* Date navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftDay(-1)}
            className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 text-white font-semibold text-sm hover:bg-gray-800 transition-colors min-w-36 justify-center"
          >
            <CalendarDays size={15} className="text-orange-400" />
            {formatDisplayDate(selectedDate)}
          </button>
          <button
            onClick={() => shiftDay(1)}
            className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors"
          >
            <Plus size={15} /> New Reservation
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                tab === t.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800"
              )}
            >
              {t.label}
              {(counts[t.value] ?? 0) > 0 && (
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                  tab === t.value ? "bg-white/20" : "bg-gray-700 text-gray-300"
                )}>
                  {counts[t.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reservation list */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reservations for {formatDisplayDate(selectedDate)}.</p>
            <p className="text-xs text-gray-600 mt-1">Create one with the button above.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                actionId={actionId}
                onConfirm={() => updateStatus(r.id, "CONFIRMED")}
                onSeat={() => seatReservation(r)}
                onNoShow={() => updateStatus(r.id, "NO_SHOW")}
                onCancel={() => updateStatus(r.id, "CANCELLED")}
                onEdit={() => { setEditing(r); setModalOpen(true); }}
                onDelete={() => deleteReservation(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ReservationModal
          initial={editing}
          defaultDate={selectedDate}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

interface CardProps {
  reservation: ReservationRow;
  actionId: string | null;
  onConfirm: () => void;
  onSeat: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReservationCard({ reservation: r, actionId, onConfirm, onSeat, onNoShow, onCancel, onEdit, onDelete }: CardProps) {
  const meta   = STATUS_META[r.status];
  const Icon   = meta.icon;
  const busy   = actionId === r.id;
  const isFinal = r.status === "CANCELLED" || r.status === "NO_SHOW" || r.status === "SEATED";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-4 items-start">
      {/* Time column */}
      <div className="shrink-0 text-center w-14">
        <p className="text-white font-bold text-base leading-none">{formatTime(r.reservedFor)}</p>
        <div className="flex items-center justify-center gap-1 mt-1.5 text-gray-500 text-xs">
          <Users size={10} /> {r.partySize}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-800 self-stretch shrink-0" />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-white font-semibold text-sm">{r.customerName}</p>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", meta.color)}>
            <Icon size={10} /> {meta.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
          {r.customerPhone && (
            <span className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Phone size={10} /> {r.customerPhone}
            </span>
          )}
          {r.table && (
            <span className="text-gray-500 text-xs">
              Table {r.table.number} · {r.table.section}
            </span>
          )}
        </div>

        {r.notes && (
          <p className="mt-1.5 text-gray-500 text-xs italic truncate">{r.notes}</p>
        )}

        {/* Special / dietary tags */}
        {(r.specialTags.length > 0 || r.dietaryTags.length > 0 || r.allergenTags.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.specialTags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px]">{t}</span>
            ))}
            {r.dietaryTags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px]">{t}</span>
            ))}
            {r.allergenTags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px]">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1.5 items-end">
        {!isFinal && (
          <>
            {r.status === "PENDING" && (
              <button
                onClick={onConfirm}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                Confirm
              </button>
            )}
            {(r.status === "PENDING" || r.status === "CONFIRMED") && (
              <button
                onClick={onSeat}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                Seat
              </button>
            )}
            <button
              onClick={onNoShow}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-amber-400 text-xs transition-colors disabled:opacity-40"
            >
              No-show
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-red-400 text-xs transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </>
        )}
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-300 text-xs transition-colors">
          Edit
        </button>
        {isFinal && (
          <button onClick={onDelete} className="px-3 py-1.5 rounded-lg text-gray-700 hover:text-red-400 text-xs transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
