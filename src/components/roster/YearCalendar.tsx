"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface RosterWeek { id: string; weekStart: string; status: string; _count?: { shifts: number } }
interface LeaveRequest { userId: string; startDate: string; endDate: string; status: string; type: string; user: { name: string } }

/* ── Australian public holidays (nationwide) ── */
const PUBLIC_HOLIDAYS: Record<string, string> = {
  "2025-01-01": "New Year's Day",  "2025-01-27": "Australia Day",
  "2025-04-18": "Good Friday",     "2025-04-19": "Easter Saturday",
  "2025-04-20": "Easter Sunday",   "2025-04-21": "Easter Monday",
  "2025-04-25": "Anzac Day",       "2025-12-25": "Christmas Day",
  "2025-12-26": "Boxing Day",
  "2026-01-01": "New Year's Day",  "2026-01-26": "Australia Day",
  "2026-04-03": "Good Friday",     "2026-04-04": "Easter Saturday",
  "2026-04-05": "Easter Sunday",   "2026-04-06": "Easter Monday",
  "2026-04-27": "Anzac Day",       "2026-12-25": "Christmas Day",
  "2026-12-26": "Boxing Day",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["M","T","W","T","F","S","S"];

/* ── Helpers ── */
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0,0,0,0);
  return mon;
}

/* Returns a set of YYYY-MM-DD strings for all 7 days of the roster's week */
function rosterDays(weekStart: string): Set<string> {
  const days = new Set<string>();
  const mon = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    days.add(isoDate(d));
  }
  return days;
}

/* Returns set of approved leave dates for a given range */
function leaveDates(leaves: LeaveRequest[]): Set<string> {
  const out = new Set<string>();
  for (const l of leaves) {
    if (l.status !== "APPROVED") continue;
    const start = new Date(l.startDate);
    const end   = new Date(l.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.add(isoDate(new Date(d)));
    }
  }
  return out;
}

/* Calendar grid: returns cells (Date|null) for the month, Mon-start */
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/* ── Component ── */
export default function YearCalendar() {
  const [year, setYear]       = useState(() => new Date().getFullYear());
  const [rosters, setRosters] = useState<RosterWeek[]>([]);
  const [leaves, setLeaves]   = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/roster"), fetch("/api/leave")]).then(async ([rRes, lRes]) => {
      if (rRes.ok) setRosters(await rRes.json());
      if (lRes.ok) setLeaves(await lRes.json());
      setLoading(false);
    });
  }, []);

  const today       = new Date();
  const todayStr    = isoDate(today);
  const todayMon    = isoDate(getMonday(today));

  /* Build lookup sets */
  const publishedDays = new Set<string>();
  const draftDays     = new Set<string>();
  for (const r of rosters) {
    const days = rosterDays(r.weekStart);
    days.forEach(d => (r.status === "PUBLISHED" ? publishedDays : draftDays).add(d));
  }
  const leaveSet = leaveDates(leaves);

  /* Tooltip state */
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  function showTip(text: string, e: React.MouseEvent) {
    setTip({ text, x: e.clientX, y: e.clientY });
  }

  return (
    <div onClick={() => setTip(null)}>
      {/* Year nav */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" title="Previous year" onClick={() => setYear(y => y - 1)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-lg min-w-[60px] text-center">{year}</span>
        <button type="button" title="Next year" onClick={() => setYear(y => y + 1)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>

        {/* Legend */}
        <div className="ml-auto flex flex-wrap gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/40 inline-block" />Published</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-700 inline-block" />Draft</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40 inline-block" />Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 inline-block" />Public Holiday</span>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm text-center py-8">Loading…</p>}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((monthName, monthIdx) => {
            const cells = monthCells(year, monthIdx);
            return (
              <div key={monthIdx} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white text-xs font-semibold mb-3">{monthName}</h3>

                <div className="grid grid-cols-7 gap-px">
                  {/* Day headers */}
                  {DAY_HEADERS.map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-gray-600 font-medium py-0.5">{d}</div>
                  ))}

                  {/* Day cells */}
                  {cells.map((date, ci) => {
                    if (!date) return <div key={ci} />;

                    const ds          = isoDate(date);
                    const isToday     = ds === todayStr;
                    const isPH        = !!PUBLIC_HOLIDAYS[ds];
                    const isPublished = publishedDays.has(ds);
                    const isDraft     = !isPublished && draftDays.has(ds);
                    const isLeave     = leaveSet.has(ds);
                    const isWeekend   = date.getDay() === 0 || date.getDay() === 6;
                    const isPast      = date < today && !isToday;

                    return (
                      <div
                        key={ci}
                        onClick={e => { e.stopPropagation(); if (isPH) showTip(PUBLIC_HOLIDAYS[ds], e); }}
                        className={cn(
                          "relative text-center text-[10px] rounded py-0.5 transition-colors select-none",
                          isToday      ? "ring-1 ring-orange-500 text-orange-400 font-bold" :
                          isPH         ? "bg-red-500/20 text-red-400 font-medium cursor-pointer" :
                          isPublished  ? "bg-orange-500/25 text-orange-300" :
                          isDraft      ? "bg-gray-700/50 text-gray-500" :
                          isLeave      ? "bg-purple-500/25 text-purple-300" :
                          isWeekend    ? "text-gray-600" :
                          isPast       ? "text-gray-700" :
                                         "text-gray-400"
                        )}
                      >
                        {date.getDate()}
                        {isLeave && !isPH && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PH tooltip */}
      {tip && (
        <div
          className="fixed z-50 bg-gray-900 border border-red-500/40 text-red-300 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{ left: Math.min(tip.x + 8, window.innerWidth - 200), top: tip.y + 8 }}
        >
          🇦🇺 {tip.text}
        </div>
      )}
    </div>
  );
}
