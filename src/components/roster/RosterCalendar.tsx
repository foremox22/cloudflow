"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sun, Moon, Coffee, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shift {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  session?: string | null;
  position?: string | null;
  confirmStatus: string;
  confirmNote?: string | null;
  user: { id: string; name: string };
}

interface RosterWeek {
  id: string;
  weekStart: string;
  status: string;
  notes?: string | null;
  shifts: Shift[];
}

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  user: { id: string; name: string };
}

interface RosterGroup {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GROUP_DOT: Record<string, string> = {
  orange: "bg-orange-400", blue:   "bg-blue-400",   green:  "bg-green-400",
  purple: "bg-purple-400", pink:   "bg-pink-400",   yellow: "bg-yellow-400",
  cyan:   "bg-cyan-400",   red:    "bg-red-400",
};

const SESSION_STYLE: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; label: string }> = {
  LUNCH:  { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-200", icon: Sun,    label: "Lunch"   },
  DINNER: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-200", icon: Moon,   label: "Dinner"  },
  ALLDAY: { bg: "bg-blue-500/15",   border: "border-blue-500/40",   text: "text-blue-200",   icon: Coffee, label: "All Day" },
};

const STATUS_DOT: Record<string, string> = {
  CONFIRMED: "bg-green-400",
  REJECTED:  "bg-red-400",
  EXCUSED:   "bg-gray-400",
  OVERRIDE:  "bg-yellow-400",
  PENDING:   "bg-blue-400",
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "text-green-400",
  REJECTED:  "text-red-400",
  EXCUSED:   "text-gray-400",
  OVERRIDE:  "text-yellow-400",
  PENDING:   "text-blue-400",
};

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function RosterCalendar({ userId, role }: { userId: string; role: string }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [roster, setRoster] = useState<RosterWeek | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [groups, setGroups] = useState<RosterGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ shift: Shift; x: number; y: number } | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);

  const days = getDays(weekStart);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function load() {
    setLoading(true);
    const [rostersRes, leavesRes, settingsRes] = await Promise.all([
      fetch("/api/roster"),
      fetch("/api/leave"),
      fetch("/api/settings"),
    ]);
    const rosters: RosterWeek[] = rostersRes.ok ? await rostersRes.json() : [];
    const allLeaves: LeaveRequest[] = leavesRes.ok ? await leavesRes.json() : [];
    setLeaves(allLeaves.filter((l) => l.status === "APPROVED"));
    if (settingsRes.ok) {
      const s = await settingsRes.json();
      setGroups(s.rosterConfig?.groups ?? []);
    }

    const r = rosters.find((rw) => sameDay(new Date(rw.weekStart), weekStart));
    if (r) {
      const res = await fetch(`/api/roster/${r.id}`);
      if (res.ok) setRoster(await res.json());
      else setRoster(null);
    } else {
      setRoster(null);
    }
    setLoading(false);
  }

  async function confirmShifts(entries: { shiftId: string; status: "CONFIRMED" | "REJECTED"; note?: string }[]) {
    if (!roster) return;
    setConfirming(true);
    const res = await fetch(`/api/roster/${roster.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shifts: entries }),
    });
    if (res.ok) {
      setRoster((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          shifts: prev.shifts.map((s) => {
            const entry = entries.find((e) => e.shiftId === s.id);
            if (!entry) return s;
            return { ...s, confirmStatus: entry.status, confirmNote: entry.note ?? null };
          }),
        };
      });
      setRejectOpen({});
      setRejectNotes({});
    }
    setConfirming(false);
  }

  const staffMap = new Map<string, string>();
  if (roster) {
    for (const s of roster.shifts) staffMap.set(s.user.id, s.user.name);
  }
  const staffList = Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }));

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;
  const displayStaff = selectedGroup
    ? staffList.filter(s => selectedGroup.memberIds.includes(s.id))
    : staffList;

  function getShifts(staffId: string, day: Date): Shift[] {
    return roster?.shifts.filter((s) => s.userId === staffId && sameDay(new Date(s.date), day)) ?? [];
  }

  function getLeaves(staffId: string, day: Date): LeaveRequest[] {
    return leaves.filter((l) => {
      if (l.userId !== staffId) return false;
      const start = new Date(l.startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(l.endDate);   end.setHours(0, 0, 0, 0);
      const d     = new Date(day);          d.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    });
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const isCurrentWeek = sameDay(weekStart, getMonday(new Date()));

  /* statuses that actually appear in this week's shifts */
  const presentStatuses = roster
    ? [...new Set(roster.shifts.map((s) => s.confirmStatus))]
    : [];

  return (
    <div onClick={() => setTooltip(null)}>
      {/* Week navigator */}
      <div className="flex items-center gap-3 mb-5">
        <button type="button"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm">
          {fmt(days[0])} – {fmt(days[6])}
        </span>
        {isCurrentWeek && (
          <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
            This week
          </span>
        )}
        <button type="button"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>
        {roster && (
          <span className={cn(
            "ml-auto text-xs px-2.5 py-1 rounded-full font-semibold tracking-wide border",
            roster.status === "PUBLISHED"
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : "bg-gray-700/50 text-gray-400 border-gray-600"
          )}>
            {roster.status}
          </span>
        )}
      </div>

      {/* Group filter */}
      {!loading && groups.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">Show:</span>
          <button
            type="button"
            onClick={() => setSelectedGroupId(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors",
              selectedGroupId === null
                ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
            )}
          >
            All Staff
            <span className="text-[10px] opacity-60">({staffList.length})</span>
          </button>
          {groups.map(g => {
            const dot = GROUP_DOT[g.color] ?? "bg-gray-400";
            const count = staffList.filter(s => g.memberIds.includes(s.id)).length;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors",
                  selectedGroupId === g.id
                    ? "bg-gray-700 border-gray-500 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
                {g.name}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading && <p className="text-gray-500 text-sm py-8 text-center">Loading schedule…</p>}

      {!loading && !roster && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No roster published for this week.</p>
        </div>
      )}

      {!loading && roster && displayStaff.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            {selectedGroup ? `No shifts for ${selectedGroup.name} this week.` : "No shifts assigned for this week."}
          </p>
        </div>
      )}

      {!loading && roster && displayStaff.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium w-36 sticky left-0 bg-gray-900">Staff</th>
                  {days.map((d, i) => {
                    const today = sameDay(d, new Date());
                    return (
                      <th key={i} className={cn(
                        "px-3 py-3 text-center font-medium min-w-[120px]",
                        today ? "bg-orange-500/5" : ""
                      )}>
                        <div className={cn("text-sm", today ? "text-orange-400" : "text-gray-300")}>{DAYS[i]}</div>
                        <div className={cn("text-xs mt-0.5", today ? "text-orange-400/70" : "text-gray-600")}>
                          {d.getDate()} {d.toLocaleDateString("en-GB", { month: "short" })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayStaff.map((staff, ri) => (
                  <tr key={staff.id} className={cn(
                    "border-b border-gray-800/50",
                    staff.id === userId ? "bg-orange-500/5" : ri % 2 === 0 ? "bg-gray-950" : "bg-gray-900/40"
                  )}>
                    <td className={cn(
                      "px-4 py-2.5 sticky left-0 bg-inherit",
                      staff.id === userId ? "text-orange-300" : "text-gray-200"
                    )}>
                      <div className="font-medium text-xs">{staff.name}</div>
                      {staff.id === userId && (
                        <div className="text-[10px] text-orange-500/60 mt-0.5">you</div>
                      )}
                    </td>
                    {days.map((day, di) => {
                      const dayLeaves = getLeaves(staff.id, day);
                      const shifts    = getShifts(staff.id, day);
                      const today     = sameDay(day, new Date());

                      if (dayLeaves.length > 0) {
                        return (
                          <td key={di} className={cn("px-2 py-2 align-top", today && "bg-orange-500/5")}>
                            <div className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-2 py-1.5 text-xs text-purple-300 text-center">
                              {dayLeaves[0].type.replace(/_/g, " ")}
                            </div>
                          </td>
                        );
                      }

                      if (shifts.length === 0) {
                        return (
                          <td key={di} className={cn("px-2 py-2 text-center text-gray-700 text-xs", today && "bg-orange-500/5")}>
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={di} className={cn("px-2 py-2 align-top space-y-1", today && "bg-orange-500/5")}>
                          {shifts.map((shift) => {
                            const sess = shift.session ? SESSION_STYLE[shift.session] : null;
                            const SIcon = sess?.icon ?? Clock;
                            const dot  = STATUS_DOT[shift.confirmStatus] ?? STATUS_DOT.PENDING;
                            return (
                              <div
                                key={shift.id}
                                onClick={(e) => { e.stopPropagation(); setTooltip({ shift, x: e.clientX, y: e.clientY }); }}
                                className={cn(
                                  "border rounded-lg px-2.5 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity",
                                  sess
                                    ? `${sess.bg} ${sess.border} ${sess.text}`
                                    : "bg-gray-800 border-gray-700 text-gray-200"
                                )}
                              >
                                {sess && (
                                  <div className={cn("flex items-center gap-0.5 text-[9px] font-bold uppercase mb-0.5 opacity-70")}>
                                    <SIcon size={8} />
                                    {sess.label}
                                  </div>
                                )}
                                <div className="font-semibold tabular-nums">{shift.startTime}–{shift.endTime}</div>
                                <div className="flex items-center justify-between mt-0.5">
                                  {shift.position
                                    ? <span className="opacity-60 truncate max-w-[64px]">{shift.position}</span>
                                    : <span />}
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1">
            <span className="text-xs text-gray-600">Status:</span>
            {presentStatuses.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[s] ?? "bg-gray-400")} />
                <span className={cn("text-xs font-medium capitalize", STATUS_LABEL[s] ?? "text-gray-400")}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
            <span className="text-xs text-gray-600 ml-3">Session:</span>
            {Object.entries(SESSION_STYLE).map(([key, s]) => {
              const Icon = s.icon;
              return (
                <div key={key} className="flex items-center gap-1">
                  <Icon size={10} className={s.text} />
                  <span className={cn("text-xs", s.text)}>{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* ── My Shifts Confirmation Panel ── */}
          {(() => {
            if (roster.status !== "PUBLISHED") return null;
            const myShifts = roster.shifts.filter((s) => s.userId === userId);
            const pendingShifts = myShifts.filter((s) => s.confirmStatus === "PENDING");
            if (pendingShifts.length === 0) return null;
            return (
              <div className="mt-5 bg-orange-500/5 border border-orange-500/25 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <p className="text-orange-300 font-semibold text-sm">
                    Your Shifts — Confirmation Required ({pendingShifts.length})
                  </p>
                </div>
                <div className="space-y-3">
                  {pendingShifts.map((shift) => {
                    const sess = shift.session ? SESSION_STYLE[shift.session] : null;
                    const SIcon = sess?.icon ?? Clock;
                    const dateLabel = new Date(shift.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                    return (
                      <div key={shift.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            {sess && (
                              <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0", sess.bg, sess.border, sess.text)}>
                                <SIcon size={9} />{sess.label}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm">{dateLabel}</p>
                              <p className="text-gray-400 text-xs tabular-nums">{shift.startTime} – {shift.endTime}{shift.position ? ` · ${shift.position}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={confirming}
                              onClick={() => confirmShifts([{ shiftId: shift.id, status: "CONFIRMED" }])}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} /> Confirm
                            </button>
                            <button
                              type="button"
                              disabled={confirming}
                              onClick={() => setRejectOpen((p) => ({ ...p, [shift.id]: !p[shift.id] }))}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        </div>
                        {rejectOpen[shift.id] && (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={rejectNotes[shift.id] ?? ""}
                              onChange={(e) => setRejectNotes((p) => ({ ...p, [shift.id]: e.target.value }))}
                              placeholder="Reason (optional)…"
                              className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <button
                              type="button"
                              disabled={confirming}
                              onClick={() => confirmShifts([{ shiftId: shift.id, status: "REJECTED", note: rejectNotes[shift.id] }])}
                              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => confirmShifts(pendingShifts.map((s) => ({ shiftId: s.id, status: "CONFIRMED" as const })))}
                  className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {confirming ? "Saving…" : `Confirm All ${pendingShifts.length} Shifts`}
                </button>
              </div>
            );
          })()}
        </>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl text-sm max-w-xs"
          style={{ left: Math.min(tooltip.x + 8, window.innerWidth - 230), top: tooltip.y + 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-white font-semibold">{tooltip.shift.user.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {new Date(tooltip.shift.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
              </p>
            </div>
            {tooltip.shift.session && SESSION_STYLE[tooltip.shift.session] && (() => {
              const s = SESSION_STYLE[tooltip.shift.session!]!;
              const Icon = s.icon;
              return (
                <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", s.bg, s.border, s.text)}>
                  <Icon size={9} />{s.label}
                </span>
              );
            })()}
          </div>
          <p className="text-gray-100 font-semibold tabular-nums">{tooltip.shift.startTime} – {tooltip.shift.endTime}</p>
          {tooltip.shift.position && <p className="text-gray-400 text-xs mt-0.5">{tooltip.shift.position}</p>}
          <div className={cn("flex items-center gap-1.5 mt-2")}>
            <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[tooltip.shift.confirmStatus] ?? "bg-gray-400")} />
            <span className={cn("text-xs font-medium capitalize", STATUS_LABEL[tooltip.shift.confirmStatus] ?? "text-gray-400")}>
              {tooltip.shift.confirmStatus.charAt(0) + tooltip.shift.confirmStatus.slice(1).toLowerCase()}
            </span>
          </div>
          {tooltip.shift.confirmNote && (
            <p className="text-gray-400 text-xs mt-1 border-t border-gray-800 pt-1">"{tooltip.shift.confirmNote}"</p>
          )}
        </div>
      )}
    </div>
  );
}
