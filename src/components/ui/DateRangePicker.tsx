"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  onChange: (start: string, end: string) => void;
  minDate?: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtShort(s: string): string {
  if (!s) return "";
  return parseLocal(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function buildCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay(); // 0=Sun
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(toYMD(new Date(year, month, d)));
  }
  return cells;
}

export default function DateRangePicker({ startDate, endDate, onChange, minDate }: Props) {
  const today = toYMD(new Date());
  const initial = startDate ? parseLocal(startDate) : new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [phase, setPhase] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openPicker() {
    setPhase(startDate && !endDate ? "end" : "start");
    if (startDate) {
      const d = parseLocal(startDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDay(ymd: string) {
    if (minDate && ymd < minDate) return;
    if (phase === "start") {
      onChange(ymd, "");
      setPhase("end");
    } else {
      if (!startDate || ymd < startDate) {
        onChange(ymd, "");
        setPhase("end");
      } else {
        onChange(startDate, ymd);
        setPhase("start");
        setOpen(false);
      }
    }
  }

  function clear() {
    onChange("", "");
    setPhase("start");
  }

  const rangeEnd = phase === "end" && hover && startDate && hover >= startDate ? hover : endDate;

  function cellClass(ymd: string): string {
    const isStart  = ymd === startDate;
    const isEnd    = ymd === endDate;
    const isHover  = phase === "end" && ymd === hover && startDate && hover >= startDate;
    const isActive = isStart || isEnd || isHover;
    const inRange  = startDate && rangeEnd && ymd > startDate && ymd < rangeEnd;
    const isMin    = !!(minDate && ymd < minDate);
    const isToday  = ymd === today;

    if (isMin) return "text-gray-700 cursor-not-allowed";

    let cls = "relative h-9 w-full flex items-center justify-center text-sm font-medium transition-colors select-none cursor-pointer ";

    if (isActive) {
      cls += "text-white z-10 ";
      // round start/end caps
      if (isStart && (endDate || (phase === "end" && hover && hover > startDate!)))
        cls += "rounded-l-full bg-orange-500 ";
      else if (isStart)
        cls += "rounded-full bg-orange-500 ";

      if ((isEnd || isHover) && startDate && ymd > startDate)
        cls += "rounded-r-full bg-orange-500 ";
      else if (isEnd || isHover)
        cls += "rounded-full bg-orange-500 ";
    } else if (inRange) {
      cls += "bg-orange-500/15 text-white ";
    } else {
      cls += "text-gray-300 hover:bg-gray-800 rounded-full ";
    }

    if (isToday && !isActive)
      cls += "ring-1 ring-inset ring-orange-500/40 rounded-full ";

    return cls;
  }

  const cells = buildCells(viewYear, viewMonth);
  const hasRange = startDate && endDate;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "w-full flex items-center gap-2.5 bg-gray-800 border rounded-xl px-4 py-3 text-sm transition-colors text-left",
          open ? "border-orange-500/60 ring-1 ring-orange-500/30" : "border-gray-700 hover:border-gray-600"
        )}
      >
        <Calendar size={15} className="text-orange-400 shrink-0" />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-0.5">From</span>
            <span className={cn("font-medium leading-none", startDate ? "text-white" : "text-gray-500")}>
              {startDate ? fmtShort(startDate) : "Select date"}
            </span>
          </div>
          <span className="text-gray-600 text-lg">→</span>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-0.5">To</span>
            <span className={cn("font-medium leading-none", endDate ? "text-white" : "text-gray-500")}>
              {endDate ? fmtShort(endDate) : "Select date"}
            </span>
          </div>
        </div>
        {hasRange && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-[60] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4">
          {/* Phase pill */}
          <div className="flex gap-1.5 mb-3">
            <div className={cn(
              "flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-colors border",
              phase === "start"
                ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                : "border-gray-800 text-gray-500"
            )}>
              {startDate ? `From: ${fmtShort(startDate)}` : "▷ Select start"}
            </div>
            <div className={cn(
              "flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-colors border",
              phase === "end"
                ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                : "border-gray-800 text-gray-500"
            )}>
              {endDate ? `To: ${fmtShort(endDate)}` : "▷ Select end"}
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
              className="text-white font-semibold text-sm hover:text-orange-400 transition-colors"
            >
              {MONTHS[viewMonth]} {viewYear}
            </button>
            <button type="button" onClick={nextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] text-gray-600 font-bold py-1 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((ymd, i) =>
              ymd === null ? (
                <div key={`pad-${i}`} />
              ) : (
                <div
                  key={ymd}
                  onClick={() => handleDay(ymd)}
                  onMouseEnter={() => setHover(ymd)}
                  onMouseLeave={() => setHover(null)}
                  className={cellClass(ymd)}
                >
                  {parseLocal(ymd).getDate()}
                  {ymd === today && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                  )}
                </div>
              )
            )}
          </div>

          {/* Duration indicator */}
          {startDate && endDate && (
            <div className="mt-3 pt-3 border-t border-gray-800 text-center">
              <span className="text-xs text-gray-400">
                {Math.round((parseLocal(endDate).getTime() - parseLocal(startDate).getTime()) / 86400000) + 1} day{Math.round((parseLocal(endDate).getTime() - parseLocal(startDate).getTime()) / 86400000) + 1 !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
