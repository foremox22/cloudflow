"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Send, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Clock, Sun, Moon, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/ui/TimePicker";
import { useToast } from "@/lib/toast";

/* ── Types ────────────────────────────────────────────────────── */

interface TeamMember { id: string; name: string; role: string; active: boolean; }

interface Shift {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  position?: string | null;
  notes?: string | null;
  session?: string | null;
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
  _count?: { shifts: number };
}

interface TimeSlot { open: string; close: string; }
interface DayHours  { closed: boolean; slots: TimeSlot[]; }
type OpeningHours = Record<string, DayHours>;

type SessionMode = "LUNCH" | "DINNER" | "ALLDAY" | "BOTH" | "CUSTOM";

interface RosterTemplate { id: "LUNCH" | "DINNER" | "ALLDAY"; label: string; start: string; end: string; enabled: boolean; }
interface RosterGroup    { id: string; name: string; color: string; memberIds: string[] }
interface RosterConfig   { templates: RosterTemplate[]; groups?: RosterGroup[] }

interface ShiftModal {
  staffId: string;
  staffName: string;
  date: Date;
  existing?: Shift;
}

/* ── Constants ────────────────────────────────────────────────── */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const CONFIRM_ICON: Record<string, React.ElementType> = {
  CONFIRMED: CheckCircle,
  REJECTED:  AlertCircle,
  PENDING:   Clock,
};

const CONFIRM_COLOR: Record<string, string> = {
  CONFIRMED: "text-green-400",
  REJECTED:  "text-red-400",
  EXCUSED:   "text-gray-400",
  OVERRIDE:  "text-yellow-400",
  PENDING:   "text-blue-400",
};

const SESSION_STYLE: Record<string, string> = {
  LUNCH:  "bg-orange-500/20 border-orange-600/40",
  DINNER: "bg-purple-500/20 border-purple-600/40",
  ALLDAY: "bg-blue-500/20   border-blue-600/40",
};

const SESSION_LABEL: Record<string, string> = { LUNCH: "Lunch", DINNER: "Dinner", ALLDAY: "All Day" };

const SESSION_ICON: Record<string, React.ElementType> = { LUNCH: Sun, DINNER: Moon, ALLDAY: Coffee };

const GROUP_DOT: Record<string, string> = {
  orange: "bg-orange-400", blue:   "bg-blue-400",   green:  "bg-green-400",
  purple: "bg-purple-400", pink:   "bg-pink-400",   yellow: "bg-yellow-400",
  cyan:   "bg-cyan-400",   red:    "bg-red-400",
};

const SESSION_TAB_ACTIVE: Record<string, string> = {
  LUNCH:   "bg-orange-500/20 border-orange-500 text-orange-300",
  DINNER:  "bg-purple-500/20 border-purple-500 text-purple-300",
  ALLDAY:  "bg-blue-500/20   border-blue-500   text-blue-300",
  BOTH:    "bg-blue-500/20   border-blue-500   text-blue-300",
  CUSTOM:  "bg-gray-700      border-gray-600   text-white",
};

/* ── Helpers ──────────────────────────────────────────────────── */

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T00:00:00.000Z`;
}

function roleLabel(role: string) {
  return role.split("_").map(w => w[0] + w.slice(1).toLowerCase()).join(" ");
}

/* ── Shift badge ──────────────────────────────────────────────── */

function ShiftBadge({
  shift, onEdit, onDelete, showManage,
}: {
  shift: Shift;
  onEdit: () => void;
  onDelete: () => void;
  showManage: boolean;
}) {
  const Icon = CONFIRM_ICON[shift.confirmStatus] ?? Clock;
  const sessionStyle = shift.session ? SESSION_STYLE[shift.session] : null;

  return (
    <div className="group relative">
      <div
        onClick={onEdit}
        className={cn(
          "border rounded-lg px-2 py-1.5 text-xs cursor-pointer transition-colors hover:opacity-90",
          sessionStyle ?? "bg-gray-800 border-gray-700 hover:border-gray-600"
        )}
      >
        {shift.session && SESSION_LABEL[shift.session] && (() => {
          const SIcon = SESSION_ICON[shift.session] ?? Clock;
          const color = shift.session === "LUNCH" ? "text-orange-400" : shift.session === "DINNER" ? "text-purple-400" : "text-blue-400";
          return (
            <div className={cn("flex items-center gap-0.5 text-[9px] font-bold uppercase mb-0.5", color)}>
              <SIcon size={8} />
              {SESSION_LABEL[shift.session]}
            </div>
          );
        })()}
        <div className="flex items-center justify-center gap-1">
          <Icon size={10} className={CONFIRM_COLOR[shift.confirmStatus]} />
          <span className="text-gray-200 font-medium">{shift.startTime}</span>
        </div>
        <div className="text-gray-500 text-center">{shift.endTime}</div>
      </div>

      {showManage && (
        <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
          <button
            type="button"
            title="Delete shift"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-4 h-4 bg-red-600 hover:bg-red-500 rounded text-white flex items-center justify-center"
          >
            <Trash2 size={8} />
          </button>
        </div>
      )}

      {shift.confirmStatus === "REJECTED" && shift.confirmNote && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 border border-red-500/40 rounded-lg p-2 text-xs text-red-300 w-40 hidden group-hover:block shadow-xl">
          {shift.confirmNote}
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function RosterBuilder({ role }: { role: string }) {
  const toast = useToast();
  const [rosters, setRosters]             = useState<RosterWeek[]>([]);
  const [selectedRosterId, setSelected]   = useState<string | null>(null);
  const [roster, setRoster]               = useState<RosterWeek | null>(null);
  const [team, setTeam]                   = useState<TeamMember[]>([]);
  const [weekStart, setWeekStart]         = useState(() => getMonday(new Date()));
  const [openingHours, setOpeningHours]   = useState<OpeningHours | null>(null);
  const [rosterConfig, setRosterConfig]   = useState<RosterConfig | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [modal, setModal]                 = useState<ShiftModal | null>(null);
  const [sessionMode, setSessionMode]     = useState<SessionMode>("CUSTOM");
  const [shiftForm, setShiftForm]         = useState({ startTime: "09:00", endTime: "17:00", position: "", notes: "" });
  const [dinnerForm, setDinnerForm]       = useState({ startTime: "17:30", endTime: "21:00" });
  const [publishing, setPublishing]       = useState(false);
  const [creating, setCreating]           = useState(false);
  const [saving, setSaving]               = useState(false);

  const days = getDays(weekStart);
  const canManage = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"].includes(role);

  const groups = rosterConfig?.groups ?? [];
  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;
  const displayTeam = selectedGroup
    ? team.filter(m => selectedGroup.memberIds.includes(m.id))
    : team;

  /* fetch helpers */
  const loadRosters = useCallback(async () => {
    const res = await fetch("/api/roster");
    if (res.ok) setRosters(await res.json());
  }, []);

  const loadTeam = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) setTeam((await res.json()).filter((m: TeamMember) => m.active));
  }, []);

  useEffect(() => {
    loadRosters();
    loadTeam();
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.openingHours) setOpeningHours(d.openingHours);
        if (d.rosterConfig) setRosterConfig(d.rosterConfig);
      });
  }, [loadRosters, loadTeam]);

  useEffect(() => {
    if (selectedRosterId) {
      fetch(`/api/roster/${selectedRosterId}`).then(r => r.json()).then(setRoster);
    } else {
      setRoster(null);
    }
  }, [selectedRosterId]);

  const weekRoster = rosters.find((r) => sameDay(new Date(r.weekStart), weekStart));

  /* shift lookup — returns ALL shifts for a person/day */
  function getShifts(staffId: string, day: Date): Shift[] {
    return roster?.shifts.filter(s => s.userId === staffId && sameDay(new Date(s.date), day)) ?? [];
  }

  /* opening-hours slots for a given date */
  function getDaySlots(date: Date): TimeSlot[] {
    if (!openingHours) return [];
    const key = DAY_KEYS[date.getDay()];
    const dh = openingHours[key];
    if (!dh || dh.closed) return [];
    return dh.slots;
  }

  /* helper — get times for a session from rosterConfig or opening-hours fallback */
  function getSessionTimes(mode: SessionMode, date: Date): { start: string; end: string } | null {
    const tmpl = rosterConfig?.templates.find(t => t.id === mode && t.enabled);
    if (tmpl) return { start: tmpl.start, end: tmpl.end };
    const slots = getDaySlots(date);
    if (mode === "LUNCH"  && slots[0]) return { start: slots[0].open, end: slots[0].close };
    if (mode === "DINNER" && slots[1]) return { start: slots[1].open, end: slots[1].close };
    return null;
  }

  /* set session and auto-fill times */
  function applySession(mode: SessionMode, date: Date) {
    setSessionMode(mode);
    if (mode === "BOTH") {
      const lunch  = getSessionTimes("LUNCH",  date);
      const dinner = getSessionTimes("DINNER", date);
      if (lunch)  setShiftForm(f => ({ ...f, startTime: lunch.start, endTime: lunch.end }));
      if (dinner) setDinnerForm({ startTime: dinner.start, endTime: dinner.end });
      return;
    }
    const times = getSessionTimes(mode, date);
    if (times) setShiftForm(f => ({ ...f, startTime: times.start, endTime: times.end }));
  }

  /* open modal */
  function openModal(staffId: string, staffName: string, day: Date, existing?: Shift) {
    setModal({ staffId, staffName, date: day, existing });

    if (existing) {
      setSessionMode((existing.session as SessionMode) || "CUSTOM");
      setShiftForm({ startTime: existing.startTime, endTime: existing.endTime, position: existing.position ?? "", notes: existing.notes ?? "" });
      return;
    }

    // Default to first enabled template, or CUSTOM
    const enabled = rosterConfig?.templates.filter(t => t.enabled) ?? [];
    const first   = enabled[0];
    const second  = enabled[1];
    const defaultMode: SessionMode = first ? (first.id as SessionMode) : (getDaySlots(day).length >= 1 ? "LUNCH" : "CUSTOM");
    setSessionMode(defaultMode);

    const times = getSessionTimes(defaultMode, day);
    setShiftForm({ startTime: times?.start ?? "09:00", endTime: times?.end ?? "17:00", position: "", notes: "" });

    if (second?.id === "DINNER") {
      const dt = getSessionTimes("DINNER", day);
      if (dt) setDinnerForm({ startTime: dt.start, endTime: dt.end });
    }
  }

  /* create roster */
  async function createRoster() {
    setCreating(true);
    const res = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: localDateISO(weekStart) }),
    });
    if (res.ok) {
      const r = await res.json();
      await loadRosters();
      setSelected(r.id);
    }
    setCreating(false);
  }

  /* save / update shift */
  async function saveShift() {
    if (!modal || !roster) return;
    setSaving(true);

    if (modal.existing) {
      const res = await fetch(`/api/roster/${roster.id}/shifts/${modal.existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          position: shiftForm.position || null,
          notes: shiftForm.notes || null,
          session: sessionMode === "CUSTOM" ? null : sessionMode,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRoster(p => p ? { ...p, shifts: p.shifts.map(s => s.id === updated.id ? updated : s) } : null);
      }
    } else if (sessionMode === "BOTH") {
      const createShift = async (payload: object) => {
        const res = await fetch(`/api/roster/${roster.id}/shifts`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: modal.staffId, date: localDateISO(modal.date), position: shiftForm.position || null, notes: shiftForm.notes || null, ...payload }),
        });
        return res.ok ? res.json() : null;
      };
      const [lunch, dinner] = await Promise.all([
        createShift({ startTime: shiftForm.startTime, endTime: shiftForm.endTime, session: "LUNCH" }),
        createShift({ startTime: dinnerForm.startTime, endTime: dinnerForm.endTime, session: "DINNER" }),
      ]);
      const added = [lunch, dinner].filter(Boolean);
      if (added.length) setRoster(p => p ? { ...p, shifts: [...p.shifts, ...added] } : null);
    } else {
      const res = await fetch(`/api/roster/${roster.id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: modal.staffId,
          date: localDateISO(modal.date),
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          position: shiftForm.position || null,
          notes: shiftForm.notes || null,
          session: sessionMode === "CUSTOM" ? null : sessionMode,
        }),
      });
      if (res.ok) {
        const newShift = await res.json();
        setRoster(p => p ? { ...p, shifts: [...p.shifts, newShift] } : null);
      }
    }

    setSaving(false);
    setModal(null);
  }

  async function deleteShift(shiftId: string) {
    if (!roster) return;
    await fetch(`/api/roster/${roster.id}/shifts/${shiftId}`, { method: "DELETE" });
    setRoster(p => p ? { ...p, shifts: p.shifts.filter(s => s.id !== shiftId) } : null);
  }

  async function handleConfirmStatus(shift: Shift, status: "EXCUSED" | "OVERRIDE") {
    if (!roster) return;
    const res = await fetch(`/api/roster/${roster.id}/shifts/${shift.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmStatus: status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRoster(p => p ? { ...p, shifts: p.shifts.map(s => s.id === updated.id ? updated : s) } : null);
    }
  }

  async function publish() {
    if (!roster) return;
    setPublishing(true);
    const res = await fetch(`/api/roster/${roster.id}/publish`, { method: "POST" });
    if (res.ok) {
      const { staffNotified } = await res.json();
      setRoster(p => p ? { ...p, status: "PUBLISHED" } : null);
      setRosters(p => p.map(r => r.id === roster.id ? { ...r, status: "PUBLISHED" } : r));
      toast.success(`Roster published — ${staffNotified} staff member${staffNotified !== 1 ? "s" : ""} notified by email.`);
    }
    setPublishing(false);
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  /* ── Session picker helper ── */
  const isEditing = !!modal?.existing;
  const enabledTemplates = rosterConfig?.templates.filter(t => t.enabled) ?? [];
  const hasBoth = !isEditing && enabledTemplates.some(t => t.id === "LUNCH") && enabledTemplates.some(t => t.id === "DINNER");

  const SESSION_TABS: { mode: SessionMode; label: string }[] = [
    ...enabledTemplates.map(t => ({ mode: t.id as SessionMode, label: t.label })),
    ...(hasBoth ? [{ mode: "BOTH" as SessionMode, label: "Both" }] : []),
    { mode: "CUSTOM", label: "Custom" },
  ];

  return (
    <div>
      {/* Week navigator */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button type="button" title="Previous week"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); setSelected(null); setRoster(null); }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-medium text-sm min-w-[160px]">{fmt(days[0])} – {fmt(days[6])}</span>
        <button type="button" title="Next week"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); setSelected(null); setRoster(null); }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>

        {weekRoster ? (
          <button type="button" onClick={() => setSelected(weekRoster.id)}
            className={cn("ml-2 px-3 py-1.5 text-xs rounded-lg border transition-colors",
              selectedRosterId === weekRoster.id
                ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
            )}>
            {weekRoster.status === "PUBLISHED" ? "✓ Published" : "Draft"} — {weekRoster._count?.shifts ?? roster?.shifts.length ?? 0} shifts
          </button>
        ) : (
          <button type="button" onClick={createRoster} disabled={creating}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50">
            <Plus size={13} />
            {creating ? "Creating…" : "Create Roster"}
          </button>
        )}

        {roster?.status === "DRAFT" && (
          <button type="button" onClick={publish} disabled={publishing || roster.shifts.length === 0}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50">
            <Send size={14} />
            {publishing ? "Publishing…" : "Publish & Email Staff"}
          </button>
        )}
        {roster?.status === "PUBLISHED" && (
          <span className="ml-auto text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg">
            Published — emails sent
          </span>
        )}
      </div>

      {/* Group / team filter */}
      {groups.length > 0 && (
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
            <span className="text-[10px] opacity-60">({team.length})</span>
          </button>
          {groups.map(g => {
            const dot = GROUP_DOT[g.color] ?? "bg-gray-400";
            const memberCount = team.filter(m => g.memberIds.includes(m.id)).length;
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
                <span className="text-[10px] opacity-60">({memberCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {!roster && !weekRoster && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No roster for this week. Click "Create Roster" to start building.</p>
        </div>
      )}

      {roster && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-400 font-medium w-36 sticky left-0 bg-gray-900">Staff</th>
                {days.map((d, i) => {
                  const today = sameDay(d, new Date());
                  const slots = getDaySlots(d);
                  return (
                    <th key={i} className={cn("px-3 py-3 text-center font-medium min-w-[130px]",
                      today ? "text-orange-400" : "text-gray-400")}>
                      <div>{DAYS[i]}</div>
                      <div className="text-xs mt-0.5 text-gray-600">{d.getDate()} {d.toLocaleDateString("en-GB", { month: "short" })}</div>
                      {slots.length > 0 && (
                        <div className="flex justify-center gap-1 mt-1">
                          {slots[0] && <span className="text-[9px] text-orange-500/70 bg-orange-500/10 rounded px-1">{slots[0].open}–{slots[0].close}</span>}
                          {slots[1] && <span className="text-[9px] text-purple-500/70 bg-purple-500/10 rounded px-1">{slots[1].open}–{slots[1].close}</span>}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayTeam.map((staff, ri) => (
                <tr key={staff.id} className={cn("border-b border-gray-800/50", ri % 2 === 0 ? "bg-gray-950" : "bg-gray-900/40")}>
                  <td className="px-4 py-2 sticky left-0 bg-inherit">
                    <div className="text-gray-200 font-medium text-xs">{staff.name}</div>
                    <div className="text-gray-600 text-[10px]">{roleLabel(staff.role)}</div>
                  </td>
                  {days.map((day, di) => {
                    const shifts = getShifts(staff.id, day);
                    const hasLunch  = shifts.some(s => s.session === "LUNCH");
                    const hasDinner = shifts.some(s => s.session === "DINNER");
                    const canAdd    = canManage && roster.status === "DRAFT" && !(hasLunch && hasDinner && shifts.length >= 2);

                    return (
                      <td key={di} className="px-2 py-1.5 align-top">
                        <div className="space-y-1">
                          {shifts.map(shift => (
                            <ShiftBadge
                              key={shift.id}
                              shift={shift}
                              showManage={canManage && roster.status === "DRAFT"}
                              onEdit={() => openModal(staff.id, staff.name, day, shift)}
                              onDelete={() => deleteShift(shift.id)}
                            />
                          ))}

                          {/* Rejection controls */}
                          {shifts.some(s => s.confirmStatus === "REJECTED") && canManage && (
                            <div className="flex gap-0.5">
                              {shifts.filter(s => s.confirmStatus === "REJECTED").map(s => (
                                <div key={s.id} className="flex gap-0.5">
                                  <button type="button" onClick={() => handleConfirmStatus(s, "EXCUSED")}
                                    className="w-5 h-5 bg-gray-500 hover:bg-gray-400 rounded text-white text-[9px] flex items-center justify-center" title="Excuse">E</button>
                                  <button type="button" onClick={() => handleConfirmStatus(s, "OVERRIDE")}
                                    className="w-5 h-5 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-[9px] flex items-center justify-center" title="Override">!</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add shift button */}
                          {canAdd && (
                            <button
                              type="button"
                              title="Add shift"
                              onClick={() => openModal(staff.id, staff.name, day)}
                              className="w-full h-8 border border-dashed border-gray-800 hover:border-gray-600 rounded-lg text-gray-700 hover:text-gray-400 transition-colors flex items-center justify-center"
                            >
                              <Plus size={11} />
                            </button>
                          )}

                          {/* Empty cell */}
                          {shifts.length === 0 && !canAdd && (
                            <div className="h-8 flex items-center justify-center text-gray-800 text-xs">—</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection summary */}
      {roster?.shifts.some(s => s.confirmStatus === "REJECTED") && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-medium text-sm mb-2">Shift Rejections</p>
          <div className="space-y-2">
            {roster.shifts.filter(s => s.confirmStatus === "REJECTED").map(s => (
              <div key={s.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-300 font-medium">{s.user.name}</span>
                <span className="text-gray-500">{new Date(s.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                {s.confirmNote && <span className="text-red-300 flex-1">"{s.confirmNote}"</span>}
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => handleConfirmStatus(s, "EXCUSED")}
                    className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">Excuse</button>
                  <button type="button" onClick={() => handleConfirmStatus(s, "OVERRIDE")}
                    className="text-xs px-2 py-0.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded">Override</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Shift modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold">{modal.existing ? "Edit Shift" : "Add Shift"}</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {modal.staffName} · {modal.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </div>
              <button type="button" title="Close" onClick={() => setModal(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Session tabs */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Session</p>
              <div className="flex gap-1.5 flex-wrap">
                {SESSION_TABS.map(({ mode, label }) => {
                  const SIcon = SESSION_ICON[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => applySession(mode, modal.date)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        sessionMode === mode
                          ? SESSION_TAB_ACTIVE[mode] ?? "bg-gray-700 border-gray-600 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                      )}
                    >
                      {SIcon && <SIcon size={10} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {/* Lunch times (or single shift) */}
              <div>
                {sessionMode === "BOTH" && (
                  <p className="text-[10px] text-orange-400 font-semibold uppercase mb-1.5 flex items-center gap-1">
                    <Sun size={9} /> {rosterConfig?.templates.find(t => t.id === "LUNCH")?.label ?? "Lunch"}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Start</label>
                    <TimePicker value={shiftForm.startTime} onChange={v => setShiftForm(f => ({ ...f, startTime: v }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">End</label>
                    <TimePicker value={shiftForm.endTime} onChange={v => setShiftForm(f => ({ ...f, endTime: v }))} />
                  </div>
                </div>
              </div>

              {/* Dinner times (BOTH mode only) */}
              {sessionMode === "BOTH" && (
                <div>
                  <p className="text-[10px] text-purple-400 font-semibold uppercase mb-1.5 flex items-center gap-1">
                    <Moon size={9} /> {rosterConfig?.templates.find(t => t.id === "DINNER")?.label ?? "Dinner"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start</label>
                      <TimePicker value={dinnerForm.startTime} onChange={v => setDinnerForm(f => ({ ...f, startTime: v }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End</label>
                      <TimePicker value={dinnerForm.endTime} onChange={v => setDinnerForm(f => ({ ...f, endTime: v }))} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Position (optional)</label>
                <input title="Position" value={shiftForm.position}
                  onChange={e => setShiftForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Head Chef, Bar, Floor"
                  className="input" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
                <input title="Notes" value={shiftForm.notes}
                  onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions"
                  className="input" />
              </div>

              <button type="button" onClick={saveShift} disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? "Saving…" : modal.existing ? "Update Shift" : sessionMode === "BOTH" ? "Add Lunch & Dinner" : "Add Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
