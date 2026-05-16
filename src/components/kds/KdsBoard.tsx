"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, ChevronDown, ChevronRight, UtensilsCrossed, Wine, Eye } from "lucide-react";
import { isKdsReadonlyForMode } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import TicketCard from "./TicketCard";
import type { KdsTicket } from "@/types";

type Mode = "kitchen" | "bar";

function hourBucket(date: Date | string): string {
  const d = new Date(date);
  const h = d.getHours();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:00 – ${pad((h + 1) % 24)}:00`;
}

function hourBucketKey(date: Date | string): number {
  return new Date(date).getHours();
}

function filterTicketItems(ticket: KdsTicket, mode: Mode): KdsTicket {
  const items = ticket.items.filter((i) =>
    mode === "bar"
      ? i.menuItem.category === "BEVERAGE"
      : i.menuItem.category !== "BEVERAGE"
  );
  return { ...ticket, items };
}

export default function KdsBoard({ role }: { role: string }) {
  const [tickets, setTickets]           = useState<KdsTicket[]>([]);
  const [lastRefresh, setLastRefresh]   = useState<Date>(new Date());
  const [collapsedHours, setCollapsedHours] = useState<Set<number>>(new Set());
  const [mode, setMode]                 = useState<Mode>("kitchen");

  const readonly = isKdsReadonlyForMode(role, mode);

  const load = useCallback(async () => {
    const res = await fetch("/api/kds/tickets");
    if (res.ok) {
      setTickets(await res.json());
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleItemStatusChange(itemId: string, status: "COOKING" | "READY") {
    if (readonly) return;
    await fetch(`/api/kds/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function toggleHour(h: number) {
    setCollapsedHours((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  }

  // Filter ticket items by mode, drop tickets with nothing left
  const visible = tickets
    .map((t) => filterTicketItems(t, mode))
    .filter((t) => t.items.length > 0);

  const active = visible.filter((t) => t.items.some((i) => i.status === "COOKING"));
  const done   = visible.filter((t) => t.items.every((i) => i.status === "READY"));

  const doneByHour = done.reduce<Record<number, KdsTicket[]>>((acc, t) => {
    const h = hourBucketKey(t.openedAt);
    (acc[h] ??= []).push(t);
    return acc;
  }, {});
  const hourKeys = Object.keys(doneByHour).map(Number).sort((a, b) => b - a);

  const isBar = mode === "bar";
  const accentActive = isBar ? "text-teal-400" : "text-emerald-400";
  const emptyLabel   = isBar ? "No active drink orders" : "No active tickets";
  const emptySubLabel = isBar ? "Waiting for drink orders from POS…" : "Waiting for orders from POS…";

  return (
    <div className="space-y-6">
      {/* ── Mode toggle + stats ── */}
      <div className="flex items-center gap-4">
        {/* Toggle pill */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setMode("kitchen")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              mode === "kitchen"
                ? "bg-orange-500/20 text-orange-400"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <UtensilsCrossed size={14} />
            Kitchen
          </button>
          <button
            onClick={() => setMode("bar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              mode === "bar"
                ? "bg-teal-500/20 text-teal-400"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Wine size={14} />
            Bar
          </button>
        </div>

        <span className="text-xs text-gray-500">
          {active.length} active ticket{active.length !== 1 ? "s" : ""}
        </span>

        {readonly && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
            <Eye size={12} />
            View only
          </span>
        )}

        <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <RefreshCw size={11} className="animate-spin" style={{ animationDuration: "3s" }} />
          {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-gray-700" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-amber-500/60" />
          8+ min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-red-500/60" />
          15+ min
        </span>
        {isBar && (
          <span className="flex items-center gap-1.5 ml-2 text-teal-500">
            <Wine size={11} />
            Bar Display
          </span>
        )}
      </div>

      {/* ── Active tickets ── */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
          <p className="text-lg font-medium">{emptyLabel}</p>
          <p className="text-sm mt-1">{emptySubLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {active.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onItemStatusChange={handleItemStatusChange}
              barMode={isBar}
              readonly={readonly}
            />
          ))}
        </div>
      )}

      {/* ── Done tickets — grouped by hour ── */}
      {done.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className={accentActive} />
            <span className={cn("text-xs font-semibold uppercase tracking-wider", accentActive)}>
              Completed — {done.length} ticket{done.length !== 1 ? "s" : ""}
            </span>
            <div className="flex-1 border-t border-gray-800" />
          </div>

          {hourKeys.map((h) => {
            const group = doneByHour[h];
            const collapsed = collapsedHours.has(h);
            const label = hourBucket(group[0].openedAt);
            return (
              <div key={h} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleHour(h)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 transition-colors text-left"
                >
                  {collapsed
                    ? <ChevronRight size={14} className="text-gray-500 shrink-0" />
                    : <ChevronDown  size={14} className="text-gray-500 shrink-0" />}
                  <span className="text-sm font-semibold text-gray-300">{label}</span>
                  <span className="text-xs text-gray-500">
                    {group.length} ticket{group.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {!collapsed && (
                  <div className="flex gap-4 overflow-x-auto px-4 py-3 bg-gray-950/50">
                    {group.map((ticket) => (
                      <div key={ticket.id} className="shrink-0 w-72 opacity-60 hover:opacity-90 transition-opacity">
                        <TicketCard
                          ticket={ticket}
                          onItemStatusChange={handleItemStatusChange}
                          done
                          barMode={isBar}
                          readonly={readonly}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
