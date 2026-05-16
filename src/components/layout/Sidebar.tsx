"use client";

import Link from "next/link";
import Image from "next/image";
import logoSrc from "../../../public/logo.png";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, UtensilsCrossed, ShoppingCart,
  Monitor, Package, Wine, Truck, FlaskConical, BarChart3,
  Users, LogOut, ChefHat, Settings, Warehouse, CalendarDays,
  Star, Tags, Hash, BookMarked, Receipt, Banknote, Target, Megaphone,
} from "lucide-react";
import RestaurantSwitcher from "./RestaurantSwitcher";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Role } from "@/lib/permissions";

const ALL:          Role[] = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"];
const KITCHEN:      Role[] = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF"];
const KITCHEN_LEAD: Role[] = ["ADMIN", "MANAGER", "HEAD_CHEF", "SOUS_CHEF"];
const MGMT:         Role[] = ["ADMIN", "MANAGER"];

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: "Front of House",
    items: [
      { label: "POS",           href: "/pos",           icon: ShoppingCart, roles: [...MGMT, "WAITER", "BARTENDER"] as Role[] },
      { label: "POS Modifiers", href: "/pos/modifiers", icon: Tags,         roles: MGMT },
      { label: "KDS",           href: "/kds",           icon: Monitor,      roles: ALL },
      { label: "Menu",          href: "/menu",          icon: UtensilsCrossed, roles: [...MGMT, "HEAD_CHEF"] as Role[] },
      { label: "Reservations",  href: "/reservations",  icon: BookMarked,   roles: [...MGMT, "HEAD_CHEF", "WAITER"] as Role[] },
    ],
  },
  {
    label: "Kitchen",
    items: [
      { label: "Recipes",      href: "/recipes",      icon: BookOpen,    roles: KITCHEN },
      { label: "Master Recipes", href: "/master-recipes", icon: Star,    roles: ["ADMIN"] as Role[] },
      { label: "Prep",         href: "/prep",         icon: ChefHat,     roles: KITCHEN },
      { label: "Kitchen Lab",  href: "/lab",          icon: FlaskConical, roles: KITCHEN_LEAD },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Kitchen Stock", href: "/stock/kitchen", icon: Package, roles: KITCHEN_LEAD },
      { label: "FOH Stock",     href: "/stock/foh",     icon: Wine,    roles: KITCHEN_LEAD },
      { label: "Suppliers",     href: "/suppliers",     icon: Truck,   roles: [...MGMT, "HEAD_CHEF"] as Role[] },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Expenses",        href: "/finance/expenses",   icon: Receipt,    roles: MGMT },
      { label: "Payroll",         href: "/finance/payroll",    icon: Banknote,   roles: MGMT },
      { label: "Revenue Targets", href: "/finance/targets",    icon: Target,     roles: MGMT },
      { label: "Promotions",      href: "/finance/promotions", icon: Megaphone,  roles: MGMT },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Roster",          href: "/roster",          icon: CalendarDays, roles: ALL },
      { label: "Analytics",       href: "/analytics",       icon: BarChart3,    roles: MGMT },
      { label: "Central Kitchen", href: "/central-kitchen", icon: Warehouse,    roles: MGMT },
      { label: "Team",            href: "/team",            icon: Users,        roles: MGMT },
      { label: "Tables",          href: "/settings/tables", icon: Hash,         roles: MGMT },
      { label: "Settings",        href: "/settings",        icon: Settings,     roles: MGMT },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: role
      ? group.items.filter((item) => (item.roles as string[]).includes(role))
      : group.items,
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col bg-gray-900 border-r border-gray-800 h-screen sticky top-0 overflow-hidden transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-64"
      )}
    >
      {/* ── Logo / collapse toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "flex items-center border-b border-gray-800 w-full shrink-0 hover:bg-gray-800/60 transition-colors",
          collapsed ? "justify-center px-0 py-5" : "gap-3 px-5 py-5"
        )}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          <Image src={logoSrc} alt="Cloudflow" width={36} height={36} className="object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden text-left">
            <p className="text-white font-semibold text-sm leading-none whitespace-nowrap">Cloudflow</p>
            <p className="text-gray-500 text-xs mt-0.5 whitespace-nowrap">Restaurant Management</p>
          </div>
        )}
      </button>

      {/* ── Restaurant switcher ── */}
      <div className={cn("border-b border-gray-800 shrink-0", collapsed ? "px-2 py-2" : "px-3 py-2")}>
        <RestaurantSwitcher collapsed={collapsed} />
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden space-y-4">
        {visibleGroups.map((group, gi) => (
          <div key={group.label}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600 select-none">
                {group.label}
              </p>
            )}
            {/* Divider when collapsed (except first group) */}
            {collapsed && gi > 0 && (
              <div className="h-px bg-gray-800 mx-2 mb-2" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center py-2 rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "gap-3 px-3",
                      active
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <Icon size={17} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Sign out ── */}
      <div className="px-2 py-3 border-t border-gray-800 shrink-0">
        <button
          onClick={() => setConfirmLogout(true)}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center w-full py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors",
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          <LogOut size={17} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} maxWidth="max-w-xs">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-500/15 mx-auto mb-4">
          <LogOut size={20} className="text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-center mb-1">Sign out?</h2>
        <p className="text-gray-400 text-sm text-center mb-6">You will be returned to the login page.</p>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirmLogout(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" className="flex-1" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </Modal>
    </aside>
  );
}
