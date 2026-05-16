"use client";

import { useEffect, useState } from "react";
import { User, Leaf, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { CustomerWithSuggestions, RecipeCategory } from "@/types";

interface Props {
  customerId: string;
  customerAllergens: string[];   // from order/customer profile
  customerDietary: string[];
  onAddItem: (menuItemId: string) => void;
}

export default function CustomerPanel({ customerId, customerAllergens, customerDietary, onAddItem }: Props) {
  const [profile, setProfile] = useState<CustomerWithSuggestions | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [customerId]);

  if (!profile) return null;

  const allergens = customerAllergens.length ? customerAllergens : profile.allergenTags;
  const dietary   = customerDietary.length   ? customerDietary   : profile.dietaryTags;

  return (
    <div className="mb-4 bg-gray-900 border border-amber-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <User size={15} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-semibold leading-tight">{profile.name}</p>
            <p className="text-amber-400/70 text-xs">
              Regular · {profile.visitCount} visit{profile.visitCount !== 1 ? "s" : ""}
              {profile.phone && ` · ${profile.phone}`}
            </p>
          </div>
        </div>
        {collapsed ? <ChevronDown size={15} className="text-gray-500" /> : <ChevronUp size={15} className="text-gray-500" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
          {/* Dietary tags */}
          {dietary.length > 0 && (
            <div className="pt-3">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Leaf size={10} className="text-emerald-400" /> Dietary
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dietary.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergens */}
          {allergens.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <AlertTriangle size={10} className="text-red-400" /> Allergens
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allergens.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    ⚠ {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {profile.notes && (
            <p className="text-xs text-gray-400 italic border-l-2 border-amber-500/30 pl-2">
              {profile.notes}
            </p>
          )}

          {/* Past order suggestions */}
          {profile.topItems.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Clock size={10} className="text-blue-400" /> Ordered Before
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {profile.topItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onAddItem(item.id)}
                    className="text-left bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 hover:border-orange-500/40 rounded-lg px-3 py-2 transition-colors group"
                  >
                    <p className="text-white text-xs font-medium leading-tight group-hover:text-orange-300 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-orange-400 text-xs font-semibold">{formatCurrency(item.price)}</p>
                      <p className="text-gray-600 text-[10px]">×{item.count}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
