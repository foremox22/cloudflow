"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, ShoppingCart, AlertTriangle, XCircle, ChefHat,
  MessageSquare, TrendingUp, DollarSign, CalendarDays, Utensils,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types";

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  AUTO_ORDER:               { icon: ShoppingCart,  color: "text-blue-400" },
  LOW_STOCK:                { icon: AlertTriangle, color: "text-yellow-400" },
  OUT_OF_STOCK:             { icon: XCircle,       color: "text-red-400" },
  PREP_URGENT:              { icon: ChefHat,       color: "text-orange-400" },
  CUSTOMER_FEEDBACK:        { icon: MessageSquare, color: "text-green-400" },
  INGREDIENT_OVERPRICE:     { icon: DollarSign,    color: "text-red-400" },
  INGREDIENT_PRICE_INCREASE:{ icon: TrendingUp,    color: "text-yellow-400" },
  PUBLIC_HOLIDAY:           { icon: CalendarDays,  color: "text-purple-400" },
  SPECIAL_MENU:             { icon: Utensils,      color: "text-pink-400" },
  ROSTER:                   { icon: CalendarDays,  color: "text-orange-400" },
  GENERAL:                  { icon: Bell,          color: "text-gray-400" },
};

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifications(await res.json());
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleClick(n: NotificationRow) {
    if (!n.read) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-white font-medium text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-orange-400 hover:text-orange-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">No notifications</p>
            )}
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.GENERAL;
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-800/60 hover:bg-gray-800/50 transition-colors",
                    !n.read ? "bg-orange-500/5" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={cn("shrink-0 mt-0.5", meta.color)} />
                    <div className="min-w-0">
                      <p className={cn("text-sm truncate", !n.read ? "text-white font-medium" : "text-gray-300")}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1.5 ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
