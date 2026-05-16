"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;            // "HH:MM" 24-hour
  onChange: (time: string) => void;
  placeholder?: string;
  minuteStep?: 15 | 30;
}

function fmt12(hh: string, mm: string): string {
  const h = parseInt(hh, 10);
  return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
}

const MIN_POPUP_WIDTH = 208; // w-52

export default function TimePicker({ value, onChange, placeholder = "Select time", minuteStep = 15 }: Props) {
  const MINUTES = Array.from(
    { length: 60 / minuteStep },
    (_, i) => String(i * minuteStep).padStart(2, "0")
  );
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  const [hh, mm] = value ? value.split(":") : ["", ""];

  const [open,       setOpen]       = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);
  const hourRef    = useRef<HTMLDivElement>(null);
  const minRef     = useRef<HTMLDivElement>(null);

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

  // Scroll selected items into view when popup opens
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const hIdx = HOURS.indexOf(hh);
      const mIdx = MINUTES.indexOf(mm);
      if (hourRef.current && hIdx >= 0)
        (hourRef.current.children[hIdx] as HTMLElement)?.scrollIntoView({ block: "center" });
      if (minRef.current && mIdx >= 0)
        (minRef.current.children[mIdx] as HTMLElement)?.scrollIntoView({ block: "center" });
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function openPopup() {
    if (triggerRef.current) {
      const rect  = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_POPUP_WIDTH);
      const popupHeight = 240;
      const spaceBelow  = window.innerHeight - rect.bottom;
      const top = spaceBelow >= popupHeight ? rect.bottom + 8 : rect.top - popupHeight - 8;
      setPopupStyle({ position: "fixed", top, left: rect.left, width, zIndex: 9999 });
    }
    setOpen((o) => !o);
  }

  function selectHour(h: string) {
    onChange(`${h}:${mm || "00"}`);
  }

  function selectMinute(m: string) {
    onChange(`${hh || "09"}:${m}`);
    setOpen(false);
  }

  const popup = (
    <div ref={popupRef} style={popupStyle} className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-2 border-b border-gray-800">
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-600 py-2">Hour</div>
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-600 py-2 border-l border-gray-800">Min</div>
      </div>

      <div className="grid grid-cols-2">
        {/* Hours */}
        <div ref={hourRef} className="h-52 overflow-y-auto overscroll-contain py-1" style={{ scrollbarWidth: "none" }}>
          {HOURS.map((h) => (
            <button key={h} type="button" onClick={() => selectHour(h)}
              className={cn(
                "w-full py-2 text-sm font-medium transition-colors",
                h === hh ? "bg-orange-500 text-white" : "text-gray-300 hover:bg-gray-800"
              )}>
              {h}
            </button>
          ))}
        </div>

        {/* Minutes */}
        <div ref={minRef} className="h-52 overflow-y-auto overscroll-contain py-1 border-l border-gray-800" style={{ scrollbarWidth: "none" }}>
          {MINUTES.map((m) => (
            <button key={m} type="button" onClick={() => selectMinute(m)}
              className={cn(
                "w-full py-2 text-sm font-medium transition-colors",
                m === mm ? "bg-orange-500 text-white" : "text-gray-300 hover:bg-gray-800"
              )}>
              :{m}
            </button>
          ))}
        </div>
      </div>

      {value && (
        <div className="border-t border-gray-800 py-2 text-center text-sm font-semibold text-orange-400">
          {fmt12(hh, mm)}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <button
        type="button"
        ref={triggerRef}
        onClick={openPopup}
        className={cn(
          "w-full flex items-center gap-2.5 bg-gray-800 border rounded-lg px-3 py-2 text-sm transition-colors text-left",
          open
            ? "border-orange-500 ring-2 ring-orange-500 border-transparent"
            : "border-gray-700 hover:border-gray-600"
        )}
      >
        <Clock size={15} className="text-orange-400 shrink-0" />
        <span className={cn("flex-1 font-medium", value ? "text-white" : "text-gray-500")}>
          {value ? fmt12(hh, mm) : placeholder}
        </span>
      </button>

      {open && mounted && createPortal(popup, document.body)}
    </div>
  );
}
