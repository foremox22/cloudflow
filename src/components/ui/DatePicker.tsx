"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;          // "YYYY-MM-DD"
  onChange: (date: string) => void;
  placeholder?: string;
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

function fmtDisplay(s: string): string {
  return parseLocal(s).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function buildCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toYMD(new Date(year, month, d)));
  return cells;
}

const MIN_POPUP_WIDTH = 296;

export default function DatePicker({ value, onChange, placeholder = "Select date", minDate }: Props) {
  const today   = toYMD(new Date());
  const initial = value ? parseLocal(value) : new Date();

  const [open,       setOpen]       = useState(false);
  const [viewYear,   setViewYear]   = useState(initial.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(initial.getMonth());
  const [mounted,    setMounted]    = useState(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popupRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_POPUP_WIDTH);
      // flip up if not enough space below
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = 340;
      const top = spaceBelow >= popupHeight
        ? rect.bottom + 8
        : rect.top - popupHeight - 8;
      setPopupStyle({ position: "fixed", top, left: rect.left, width, zIndex: 9999 });
    }
    if (value) {
      const d = parseLocal(value);
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
    onChange(ymd);
    setOpen(false);
  }

  const cells = buildCells(viewYear, viewMonth);

  const popup = (
    <div ref={popupRef} style={popupStyle} className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button type="button"
          onClick={() => { const n = new Date(); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); }}
          className="text-white font-semibold text-sm hover:text-orange-400 transition-colors">
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
          <div key={d} className="text-center text-[10px] text-gray-600 font-bold py-1 uppercase">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((ymd, i) =>
          ymd === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <button key={ymd} type="button" onClick={() => handleDay(ymd)}
              disabled={!!(minDate && ymd < minDate)}
              className={cn(
                "relative h-9 w-full flex items-center justify-center text-sm font-medium transition-colors rounded-full select-none",
                minDate && ymd < minDate ? "text-gray-700 cursor-not-allowed"
                  : ymd === value    ? "bg-orange-500 text-white"
                  : ymd === today    ? "text-white ring-1 ring-inset ring-orange-500/40 hover:bg-gray-800"
                  : "text-gray-300 hover:bg-gray-800"
              )}
            >
              {parseLocal(ymd).getDate()}
              {ymd === today && ymd !== value && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
              )}
            </button>
          )
        )}
      </div>

      {/* Today shortcut */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <button type="button" onClick={() => handleDay(today)}
          className="w-full text-xs text-gray-400 hover:text-orange-400 transition-colors py-1">
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <button
        type="button"
        ref={triggerRef}
        onClick={openPicker}
        className={cn(
          "w-full flex items-center gap-2.5 bg-gray-800 border rounded-lg px-3 py-2 text-sm transition-colors text-left",
          open
            ? "border-orange-500 ring-2 ring-orange-500 border-transparent"
            : "border-gray-700 hover:border-gray-600"
        )}
      >
        <Calendar size={15} className="text-orange-400 shrink-0" />
        <span className={cn("flex-1", value ? "text-white" : "text-gray-500")}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
      </button>

      {open && mounted && createPortal(popup, document.body)}
    </div>
  );
}
