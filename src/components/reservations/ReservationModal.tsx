"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import type { ReservationRow } from "@/types";

interface RestaurantTable {
  id: string;
  number: number;
  section: string;
  capacity: number;
  status: "FREE" | "OCCUPIED" | "RESERVED";
}

const SPECIAL_TAG_OPTIONS = [
  "Birthday", "Anniversary", "Business", "Date Night",
  "VIP", "Window Seat", "Quiet Table", "High Chair",
];
const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "Dairy-Free"];
const ALLERGEN_OPTIONS = ["Nuts", "Shellfish", "Dairy", "Gluten", "Eggs", "Soy", "Fish"];

function dateToLocalInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultTimeStr(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(Math.ceil(now.getMinutes() / 15) * 15 % 60).padStart(2, "0");
  return `${h}:${m}`;
}

interface Props {
  initial: ReservationRow | null;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReservationModal({ initial, defaultDate, onClose, onSaved }: Props) {
  const isEdit = !!initial;

  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const [customerName,  setCustomerName]  = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [partySize,     setPartySize]     = useState(String(initial?.partySize ?? 2));
  const [tableId,       setTableId]       = useState(initial?.tableId ?? "");
  const [dateStr,       setDateStr]       = useState(
    initial ? dateToLocalInput(new Date(initial.reservedFor)) : dateToLocalInput(defaultDate)
  );
  const [timeStr,      setTimeStr]      = useState(
    initial ? new Date(initial.reservedFor).toTimeString().slice(0, 5) : defaultTimeStr()
  );
  const [notes,        setNotes]        = useState(initial?.notes ?? "");
  const [specialTags,  setSpecialTags]  = useState<string[]>(initial?.specialTags ?? []);
  const [dietaryTags,  setDietaryTags]  = useState<string[]>(initial?.dietaryTags ?? []);
  const [allergenTags, setAllergenTags] = useState<string[]>(initial?.allergenTags ?? []);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then(setTables)
      .catch(() => {});
  }, []);

  function toggleTag(list: string[], set: (v: string[]) => void, tag: string) {
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  async function submit() {
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    const size = parseInt(partySize);
    if (!size || size < 1) { setError("Party size must be at least 1."); return; }
    const reservedFor = new Date(`${dateStr}T${timeStr}`).toISOString();

    setSaving(true);
    setError("");

    const body = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      partySize: size,
      tableId: tableId || null,
      reservedFor,
      notes: notes.trim() || undefined,
      specialTags,
      dietaryTags,
      allergenTags,
    };

    const res = isEdit
      ? await fetch(`/api/reservations/${initial!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error?.formErrors?.[0] ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  const freeTables = tables.filter((t) => t.status === "FREE" || t.id === initial?.tableId);

  return (
    <Modal
      open={true}
      onClose={onClose}
      maxWidth="max-w-lg"
      className="p-0 overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Sticky header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-semibold">{isEdit ? "Edit Reservation" : "New Reservation"}</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Guest info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Guest Name *</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Smith"
              autoFocus
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+1 555 0100"
              type="tel"
              className="input"
            />
          </div>
          <div>
            <label className="label">Party Size</label>
            <input
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              type="number" min="1" max="50"
              className="input"
            />
          </div>
        </div>

        {/* Date & time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <DatePicker
              value={dateStr}
              onChange={setDateStr}
              placeholder="Pick a date"
            />
          </div>
          <div>
            <label className="label">Time</label>
            <TimePicker value={timeStr} onChange={setTimeStr} />
          </div>
        </div>

        {/* Table */}
        <div>
          <label className="label">Table (optional)</label>
          <div className="relative">
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="input appearance-none pr-8"
            >
              <option value="">No table assigned</option>
              {freeTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number} — {t.section} ({t.capacity} seats)
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Window seat requested, extra chair needed…"
            rows={2}
            className="input resize-none"
          />
        </div>

        {/* Special occasion tags */}
        <TagGroup
          label="Occasion"
          color="purple"
          options={SPECIAL_TAG_OPTIONS}
          selected={specialTags}
          onToggle={(t) => toggleTag(specialTags, setSpecialTags, t)}
        />

        {/* Dietary */}
        <TagGroup
          label="Dietary"
          color="emerald"
          options={DIETARY_OPTIONS}
          selected={dietaryTags}
          onToggle={(t) => toggleTag(dietaryTags, setDietaryTags, t)}
        />

        {/* Allergens */}
        <TagGroup
          label="Allergens"
          color="red"
          options={ALLERGEN_OPTIONS}
          selected={allergenTags}
          onToggle={(t) => toggleTag(allergenTags, setAllergenTags, t)}
        />

        {error && <p className="error">{error}</p>}

        {/* Footer */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Reservation"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Tag group chip picker ── */

const TAG_COLORS: Record<string, { active: string; inactive: string }> = {
  purple:  { active: "bg-purple-500/20 border-purple-500/50 text-purple-300",   inactive: "bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500/40 hover:text-purple-400" },
  emerald: { active: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300", inactive: "bg-gray-800 border-gray-700 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400" },
  red:     { active: "bg-red-500/20 border-red-500/50 text-red-300",            inactive: "bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500/40 hover:text-red-400" },
};

function TagGroup({
  label, color, options, selected, onToggle,
}: {
  label: string;
  color: "purple" | "emerald" | "red";
  options: string[];
  selected: string[];
  onToggle: (t: string) => void;
}) {
  const cs = TAG_COLORS[color];
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              selected.includes(opt) ? cs.active : cs.inactive
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
