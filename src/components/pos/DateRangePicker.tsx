"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type Preset = "today" | "yesterday" | "week" | "month";

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
];

const DAYS   = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

export function getPresetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  if (p === "today")     return { from: toDateStr(now), to: toDateStr(now) };
  if (p === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: toDateStr(y), to: toDateStr(y) };
  }
  if (p === "week") {
    const mon = new Date(now); mon.setDate(now.getDate() - (now.getDay() + 6) % 7);
    return { from: toDateStr(mon), to: toDateStr(now) };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toDateStr(first), to: toDateStr(now) };
}

function daysInMonth(y: number, m: number)   { return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y: number, m: number)  { return (new Date(y, m, 1).getDay() + 6) % 7; } // Mon=0

interface TimeSpinProps {
  label: string;
  value: string;                        // "HH:MM"
  onChange: (v: string) => void;
}

function TimeSpin({ label, value, onChange }: TimeSpinProps) {
  const [h, m] = value.split(":").map(Number);

  function adjust(part: "h" | "m", delta: number) {
    const nh = part === "h" ? (h + delta + 24) % 24 : h;
    const nm = part === "m" ? (m + delta + 60) % 60 : m;
    onChange(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
  }

  return (
    <div className="flex-1 bg-gray-800/60 rounded-xl p-3">
      <p className="text-[11px] text-gray-500 mb-2.5 flex items-center gap-1 font-medium uppercase tracking-wide">
        <Clock size={10} /> {label}
      </p>
      <div className="flex items-center justify-center gap-1">
        {/* Hours */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => adjust("h", 1)}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white flex items-center justify-center text-xl leading-none transition-colors">
            ＋
          </button>
          <span className="text-white font-bold text-2xl w-10 text-center tabular-nums select-none">
            {String(h).padStart(2, "0")}
          </span>
          <button onClick={() => adjust("h", -1)}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white flex items-center justify-center text-xl leading-none transition-colors">
            －
          </button>
        </div>
        <span className="text-gray-500 font-bold text-2xl pb-0.5 select-none">:</span>
        {/* Minutes (15-step) */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => adjust("m", 15)}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white flex items-center justify-center text-xl leading-none transition-colors">
            ＋
          </button>
          <span className="text-white font-bold text-2xl w-10 text-center tabular-nums select-none">
            {String(m).padStart(2, "0")}
          </span>
          <button onClick={() => adjust("m", -15)}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white flex items-center justify-center text-xl leading-none transition-colors">
            －
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  from: string;
  to: string;
  fromTime: string;
  toTime: string;
  onChange: (from: string, to: string, fromTime: string, toTime: string) => void;
}

export default function DateRangePicker({ from, to, fromTime, toTime, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const [tempFrom,     setTempFrom]     = useState(from);
  const [tempTo,       setTempTo]       = useState(to);
  const [tempFromTime, setTempFromTime] = useState(fromTime);
  const [tempToTime,   setTempToTime]   = useState(toTime);
  const [selecting,    setSelecting]    = useState<"from" | "to">("from");
  const [hover,        setHover]        = useState<string | null>(null);

  const [viewYear,  setViewYear]  = useState(() => new Date(from + "T12:00:00").getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(from + "T12:00:00").getMonth());

  // Sync temp state when picker opens
  useEffect(() => {
    if (!open) return;
    setTempFrom(from); setTempTo(to);
    setTempFromTime(fromTime); setTempToTime(toTime);
    setSelecting("from"); setHover(null);
    const d = new Date(from + "T12:00:00");
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDayClick(ds: string) {
    if (selecting === "from") {
      setTempFrom(ds); setTempTo(ds); setSelecting("to");
    } else {
      if (ds < tempFrom) { setTempFrom(ds); setTempTo(tempFrom); }
      else               { setTempTo(ds); }
      setSelecting("from");
    }
  }

  function handlePreset(p: Preset) {
    const r = getPresetRange(p);
    onChange(r.from, r.to, "00:00", "23:59");
    setOpen(false);
  }

  function apply() {
    onChange(tempFrom, tempTo, tempFromTime, tempToTime);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar cells
  const totalDays = daysInMonth(viewYear, viewMonth);
  const offset    = firstWeekday(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) =>
      toDateStr(new Date(viewYear, viewMonth, i + 1))
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Effective "to" while hovering during "to" selection
  const effectiveTo = selecting === "to" && hover
    ? (hover >= tempFrom ? hover : tempFrom)
    : tempTo;
  const effectiveFrom = selecting === "to" && hover && hover < tempFrom ? hover : tempFrom;

  const todayStr = toDateStr(new Date());

  // Trigger label
  const fmt = (ds: string) =>
    new Date(ds + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  const label = from === to
    ? `${fmt(from)},  ${fromTime} – ${toTime}`
    : `${fmt(from)} ${fromTime}  →  ${fmt(to)} ${toTime}`;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm font-medium transition-colors whitespace-nowrap"
      >
        <Calendar size={15} className="text-orange-400 shrink-0" />
        <span>{label}</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 p-3 border-b border-gray-800">
              {PRESETS.map((p) => (
                <button key={p.value} onClick={() => handlePreset(p.value)}
                  className="py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-orange-500/20 hover:text-orange-400 active:bg-orange-500/30 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={prevMonth}
                className="w-10 h-10 rounded-xl hover:bg-gray-800 active:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-white font-semibold text-base">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth}
                className="w-10 h-10 rounded-xl hover:bg-gray-800 active:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-600 py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
              {cells.map((ds, i) => {
                if (!ds) return <div key={`blank-${i}`} />;

                const isStart   = ds === effectiveFrom;
                const isEnd     = ds === effectiveTo;
                const inRange   = ds > effectiveFrom && ds < effectiveTo;
                const isToday   = ds === todayStr;
                const isFuture  = ds > todayStr;

                return (
                  <button
                    key={ds}
                    disabled={isFuture}
                    onClick={() => handleDayClick(ds)}
                    onMouseEnter={() => setHover(ds)}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      "h-11 w-full flex items-center justify-center text-sm font-medium transition-colors rounded-xl",
                      isFuture && "opacity-25 cursor-default",
                      !isFuture && !isStart && !isEnd && !inRange && "text-gray-300 hover:bg-gray-800 active:bg-gray-700",
                      inRange  && "bg-orange-500/20 text-orange-300 rounded-none",
                      isStart  && "bg-orange-500 text-white rounded-xl",
                      isEnd    && !isStart && "bg-orange-500 text-white rounded-xl",
                      isStart && isEnd && "rounded-xl",
                      isToday && !isStart && !isEnd && "ring-1 ring-inset ring-orange-500/60",
                    )}
                  >
                    {new Date(ds + "T12:00:00").getDate()}
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <p className="text-center text-xs text-gray-600 pb-1">
              {selecting === "from" ? "Tap start date" : "Tap end date"}
            </p>

            {/* Time pickers */}
            <div className="flex gap-3 px-3 py-3 border-t border-gray-800">
              <TimeSpin label="From" value={tempFromTime} onChange={setTempFromTime} />
              <TimeSpin label="To"   value={tempToTime}   onChange={setTempToTime}   />
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-3 pb-4">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={apply}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-sm font-semibold transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
