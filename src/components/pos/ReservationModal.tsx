"use client";

import { useState, useRef } from "react";
import { X, CalendarDays, Sparkles, Leaf, AlertTriangle, Search, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationRow, ReservationStatus, CustomerProfile } from "@/types";

const SPECIAL_TAGS = [
  "Birthday", "Anniversary", "Engagement", "Honeymoon",
  "Date Night", "Business", "Graduation", "Farewell",
  "Baby Shower", "VIP",
];
const DIETARY_TAGS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Halal", "Kosher", "Nut-Free", "Low-Carb",
];
const ALLERGEN_TAGS = [
  "Nuts", "Peanuts", "Dairy", "Eggs",
  "Gluten", "Shellfish", "Fish", "Soy",
  "Sesame", "Mustard",
];

interface Props {
  tables: { id: string; number: number; section: string }[];
  reservation?: ReservationRow | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TagPicker({ label, icon, tags, selected, color, onChange }: {
  label: string; icon: React.ReactNode; tags: string[];
  selected: string[]; color: "amber" | "emerald" | "red";
  onChange: (tags: string[]) => void;
}) {
  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);

  const activeClass = {
    amber:   "bg-amber-500/25 text-amber-300 border-amber-500/50",
    emerald: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50",
    red:     "bg-red-500/25 text-red-300 border-red-500/50",
  }[color];

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-2">
        {icon} {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              selected.includes(tag) ? activeClass : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-300"
            )}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReservationModal({ tables, reservation, onSave, onClose }: Props) {
  const [tableId,       setTableId]       = useState(reservation?.tableId ?? "");
  const [customerId,    setCustomerId]    = useState<string | null>(reservation?.customerId ?? null);
  const [customerName,  setCustomerName]  = useState(reservation?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(reservation?.customerPhone ?? "");
  const [partySize,     setPartySize]     = useState(String(reservation?.partySize ?? 2));
  const [reservedFor,   setReservedFor]   = useState(
    reservation?.reservedFor ? toLocalDatetime(reservation.reservedFor) : ""
  );
  const [notes,         setNotes]         = useState(reservation?.notes ?? "");
  const [status,        setStatus]        = useState<ReservationStatus>(reservation?.status ?? "PENDING");
  const [specialTags,   setSpecialTags]   = useState<string[]>(reservation?.specialTags ?? []);
  const [dietaryTags,   setDietaryTags]   = useState<string[]>(reservation?.dietaryTags ?? []);
  const [allergenTags,  setAllergenTags]  = useState<string[]>(reservation?.allergenTags ?? []);
  const [saveCustomer,  setSaveCustomer]  = useState(false);
  const [saving,        setSaving]        = useState(false);

  // Customer search state
  const [searchQ,       setSearchQ]       = useState("");
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState<CustomerProfile[]>([]);
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerProfile | null>(
    reservation?.customer
      ? { ...reservation.customer, notes: null, visitCount: 0 }
      : null
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    setSearchQ(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/customers?q=${encodeURIComponent(val)}`);
      if (res.ok) setSearchResults(await res.json());
      setSearching(false);
    }, 300);
  }

  function linkCustomer(c: CustomerProfile) {
    setLinkedCustomer(c);
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone ?? "");
    setDietaryTags(c.dietaryTags);
    setAllergenTags(c.allergenTags);
    setSearchQ("");
    setSearchResults([]);
  }

  function unlinkCustomer() {
    setLinkedCustomer(null);
    setCustomerId(null);
    setDietaryTags([]);
    setAllergenTags([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let finalCustomerId = customerId;

    // Auto-save as new customer if checkbox checked
    if (saveCustomer && !customerId && customerName) {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone || undefined,
          dietaryTags,
          allergenTags,
        }),
      });
      if (res.ok) {
        const c = await res.json();
        finalCustomerId = c.id;
      }
    }

    await onSave({
      tableId,
      customerId: finalCustomerId ?? undefined,
      customerName,
      customerPhone: customerPhone || undefined,
      partySize: parseInt(partySize),
      reservedFor: new Date(reservedFor).toISOString(),
      notes: notes || undefined,
      specialTags,
      dietaryTags,
      allergenTags,
      status,
    });
    setSaving(false);
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-400" />
            {reservation ? "Edit Reservation" : "New Reservation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── Customer lookup ── */}
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-2">Customer Profile</label>

              {linkedCustomer ? (
                /* Linked customer card */
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck size={15} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{linkedCustomer.name}</p>
                      <p className="text-amber-400/70 text-xs">
                        Regular customer
                        {linkedCustomer.phone && ` · ${linkedCustomer.phone}`}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={unlinkCustomer}
                    className="text-gray-500 hover:text-gray-300 p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Search input */
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={searchQ}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gray-500"
                  />
                  {searching && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden">
                      {searchResults.map((c) => (
                        <button key={c.id} type="button" onClick={() => linkCustomer(c)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 text-left transition-colors">
                          <UserCheck size={14} className="text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{c.name}</p>
                            <p className="text-gray-400 text-xs">
                              {c.phone ?? "No phone"} · {c.visitCount} visit{c.visitCount !== 1 ? "s" : ""}
                              {c.dietaryTags.length > 0 && ` · ${c.dietaryTags.slice(0, 2).join(", ")}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800" />

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Customer Name *</label>
                <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className={inputCls} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputCls} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Party Size *</label>
                <input required type="number" min="1" max="50" value={partySize}
                  onChange={(e) => setPartySize(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Date & Time *</label>
                <input required type="datetime-local" value={reservedFor}
                  onChange={(e) => setReservedFor(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Table *</label>
                <select required value={tableId} onChange={(e) => setTableId(e.target.value)} className={inputCls}>
                  <option value="">Select table…</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>T{t.number} · {t.section}</option>
                  ))}
                </select>
              </div>
              {reservation && (
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)} className={inputCls}>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="SEATED">Seated</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No-show</option>
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800" />

            {/* Special occasion */}
            <TagPicker label="Special Occasion"
              icon={<Sparkles size={12} className="text-amber-400" />}
              tags={SPECIAL_TAGS} selected={specialTags} color="amber" onChange={setSpecialTags} />

            {/* Dietary requirements */}
            <TagPicker label="Dietary Requirements"
              icon={<Leaf size={12} className="text-emerald-400" />}
              tags={DIETARY_TAGS} selected={dietaryTags} color="emerald" onChange={setDietaryTags} />

            {/* Allergens */}
            <TagPicker label="Allergens"
              icon={<AlertTriangle size={12} className="text-red-400" />}
              tags={ALLERGEN_TAGS} selected={allergenTags} color="red" onChange={setAllergenTags} />

            {/* Notes */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} className={`${inputCls} resize-none`}
                placeholder="Any other requests…" />
            </div>

            {/* Save as customer */}
            {!linkedCustomer && !reservation && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={saveCustomer} onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <UserPlus size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Remember as regular customer</span>
                </div>
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:border-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : reservation ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
