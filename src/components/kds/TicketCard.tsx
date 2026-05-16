"use client";

import { useEffect, useState } from "react";
import { Clock, ChefHat, CheckCheck, ShoppingBag, Users, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KdsTicket } from "@/types";

const CAT_META: Record<string, { label: string; singular: string; color: string }> = {
  STARTER:  { label: "Entrees",   singular: "Entree",   color: "text-purple-400" },
  MAIN:     { label: "Mains",     singular: "Main",     color: "text-sky-400"    },
  DESSERT:  { label: "Desserts",  singular: "Dessert",  color: "text-pink-400"   },
  BEVERAGE: { label: "Beverages", singular: "Beverage", color: "text-teal-400"   },
  SIDE:     { label: "Sides",     singular: "Side",     color: "text-lime-400"   },
  SAUCE:    { label: "Sauces",    singular: "Sauce",    color: "text-orange-400" },
  BREAD:    { label: "Breads",    singular: "Bread",    color: "text-yellow-400" },
  OTHER:    { label: "Other",     singular: "Other",    color: "text-gray-400"   },
};
const CAT_ORDER = ["STARTER", "MAIN", "DESSERT", "SIDE", "SAUCE", "BREAD", "BEVERAGE", "OTHER"];

interface Props {
  ticket: KdsTicket;
  onItemStatusChange: (itemId: string, status: "COOKING" | "READY") => void;
  done?: boolean;
  barMode?: boolean;
  readonly?: boolean;
}

export default function TicketCard({ ticket, onItemStatusChange, done = false, barMode = false, readonly = false }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(ticket.openedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [ticket.openedAt]);

  const urgency = elapsed >= 15 ? "red" : elapsed >= 8 ? "amber" : "normal";

  // Group items by category then courseNumber
  const catGroups = CAT_ORDER.map((cat) => {
    const catItems = ticket.items.filter((i) => i.menuItem.category === cat);
    if (catItems.length === 0) return null;
    const maxCourse = Math.max(...catItems.map((i) => i.courseNumber));
    const byRound: Record<number, typeof catItems> = {};
    for (let r = 1; r <= maxCourse; r++) byRound[r] = [];
    catItems.forEach((item) => { (byRound[item.courseNumber] ??= []).push(item); });
    return { cat, maxCourse, byRound };
  }).filter(Boolean) as { cat: string; maxCourse: number; byRound: Record<number, KdsTicket["items"]> }[];

  return (
    <div
      className={cn(
        "bg-gray-900 border-2 rounded-xl p-4 flex flex-col gap-3",
        done
          ? "border-emerald-700/40"
          : barMode
          ? urgency === "red"   ? "border-red-500/60"
            : urgency === "amber" ? "border-amber-500/60"
            :                       "border-teal-600/50"
          : urgency === "red"   ? "border-red-500/60"
          : urgency === "amber" ? "border-amber-500/60"
          :                       "border-gray-700"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {ticket.type === "TAKEAWAY" ? (
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-orange-400" />
              <span className="text-orange-400 font-bold text-xl">Takeaway</span>
              {ticket.customerName && (
                <span className="text-gray-400 text-xs">{ticket.customerName}</span>
              )}
            </div>
          ) : (
            <>
              <span className="text-white font-bold text-xl">T{ticket.table?.number}</span>
              <span className="text-gray-500 text-xs ml-2">{ticket.table?.section}</span>
            </>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full",
            done
              ? "bg-emerald-500/20 text-emerald-400"
              : urgency === "red"   ? "bg-red-500/20 text-red-400"
              : urgency === "amber" ? "bg-amber-500/20 text-amber-400"
              : barMode             ? "bg-teal-500/20 text-teal-400"
              :                       "bg-gray-800 text-gray-400"
          )}
        >
          <Clock size={13} />
          {done ? "Done" : `${elapsed}m`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-gray-500 text-xs">Server: {ticket.server.name}</p>
        {(ticket.status === "PAID" || ticket.status === "VOID") && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
            ticket.status === "PAID" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
          )}>
            {ticket.status}
          </span>
        )}
      </div>

      {/* Serve-together banner */}
      {ticket.serveNote && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <Layers size={11} />
          {ticket.serveNote}
        </div>
      )}

      {/* Items — grouped by category, then course round */}
      <div className="space-y-3">
        {catGroups.map(({ cat, maxCourse, byRound }) => {
          const meta = CAT_META[cat] ?? { label: cat, singular: cat, color: "text-gray-400" };
          return (
            <div key={cat}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", meta.color)}>
                {meta.label}
              </p>
              <div className="space-y-2">
                {Array.from({ length: maxCourse }, (_, i) => i + 1).map((courseNum) => {
                  const courseItems = byRound[courseNum] ?? [];
                  if (courseItems.length === 0) return null;
                  return (
                    <div key={courseNum}>
                      {maxCourse > 1 && (
                        <p className="text-[10px] text-gray-500 font-medium mb-1">
                          {meta.singular} {courseNum}
                          <span className="text-gray-700 ml-1">
                            · {courseItems.length} dish{courseItems.length !== 1 ? "es" : ""}
                          </span>
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {courseItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-lg p-2",
                              item.status === "READY" ? "bg-emerald-500/10" : "bg-gray-800"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Name */}
                                <p className={cn(
                                  "text-sm font-medium",
                                  item.status === "READY" ? "text-emerald-300 line-through" : "text-white"
                                )}>
                                  ×{item.quantity} {item.menuItem.name}
                                </p>

                                {/* Special request tags */}
                                {item.specialRequests.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.specialRequests.map((r) => (
                                      <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Free-text notes */}
                                {item.notes && (
                                  <p className="text-[10px] text-amber-400 italic mt-0.5">{item.notes}</p>
                                )}

                                {/* Sharing badge */}
                                {item.isSharing && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 mt-1">
                                    <Users size={8} />
                                    Sharing
                                  </span>
                                )}
                              </div>

                              {/* Status & action buttons — hidden on done cards */}
                              {!done && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.status === "COOKING" && (
                                    <>
                                      <span className="text-xs px-1.5 py-1 rounded bg-amber-500/20 text-amber-400">
                                        {barMode ? "Serving" : "Cooking"}
                                      </span>
                                      {!readonly && (
                                        <button
                                          onClick={() => onItemStatusChange(item.id, "READY")}
                                          className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40"
                                          title="Mark ready"
                                        >
                                          <CheckCheck size={14} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {item.status === "READY" && (
                                    <>
                                      <span className="text-xs px-1.5 py-1 rounded bg-emerald-500/20 text-emerald-400">
                                        Ready
                                      </span>
                                      {!readonly && (
                                        <button
                                          onClick={() => onItemStatusChange(item.id, "COOKING")}
                                          className="p-1.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
                                          title="Undo — back to cooking"
                                        >
                                          <ChefHat size={14} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
