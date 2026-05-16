"use client";

import { useState } from "react";
import { Calendar, Clipboard, FileText, Settings, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import RosterCalendar from "./RosterCalendar";
import RosterBuilder  from "./RosterBuilder";
import LeavePanel     from "./LeavePanel";
import RosterSettings from "./RosterSettings";
import YearCalendar   from "./YearCalendar";

type Tab = "calendar" | "year" | "manage" | "leave" | "settings";

const canManage = (role: string) => ["ADMIN", "MANAGER", "HEAD_CHEF"].includes(role);

export default function RosterPage({ role, userId }: { role: string; userId: string }) {
  const [tab, setTab] = useState<Tab>("calendar");

  const tabs: { id: Tab; label: string; icon: React.ElementType; hidden?: boolean }[] = [
    { id: "calendar",  label: "Schedule",  icon: Calendar },
    { id: "year",      label: "Year View", icon: CalendarDays },
    { id: "manage",    label: "Builder",   icon: Clipboard,  hidden: !canManage(role) },
    { id: "leave",     label: "Leave",     icon: FileText },
    { id: "settings",  label: "Settings",  icon: Settings,   hidden: !canManage(role) },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.filter(t => !t.hidden).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "calendar"  && <RosterCalendar userId={userId} role={role} />}
      {tab === "year"      && <YearCalendar />}
      {tab === "manage"    && <RosterBuilder role={role} />}
      {tab === "leave"     && <LeavePanel role={role} userId={userId} />}
      {tab === "settings"  && <RosterSettings />}
    </div>
  );
}
