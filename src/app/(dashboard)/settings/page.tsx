"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, Building2, Save, Upload, Clock, ImageIcon, Plus, X } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";
import Image from "next/image";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";

type RestaurantType = "CAFE" | "DINE_IN" | "TAKEAWAY" | "CENTRAL_KITCHEN";
type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

interface TimeSlot { open: string; close: string }
interface DayHours  { closed: boolean; slots: TimeSlot[] }
type OpeningHours = Record<Day, DayHours>;

interface RestaurantSettings {
  id: string;
  name: string;
  type: RestaurantType;
  address: string | null;
  phone: string | null;
  timezone: string;
  logoUrl: string | null;
  openingHours: OpeningHours | null;
}

const RESTAURANT_TYPES: { value: RestaurantType; label: string; desc: string }[] = [
  { value: "CAFE",            label: "Cafe",               desc: "Coffee shop, bakery, light meals" },
  { value: "DINE_IN",         label: "Dine-in Restaurant", desc: "Full table service, à la carte" },
  { value: "TAKEAWAY",        label: "Takeaway Shop",      desc: "Counter service, grab-and-go" },
  { value: "CENTRAL_KITCHEN", label: "Central Kitchen",   desc: "Production hub supplying other venues" },
];

const TIMEZONES = [
  "UTC", "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "Pacific/Auckland",
  "Asia/Singapore", "Asia/Tokyo", "Europe/London", "America/New_York",
];

const DAYS: Day[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<Day, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function defaultHours(): OpeningHours {
  return Object.fromEntries(
    DAYS.map((d) => [d, { closed: false, slots: [{ open: "09:00", close: "22:00" }] }])
  ) as OpeningHours;
}

export default function SettingsPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings]     = useState<RestaurantSettings | null>(null);
  const [form, setForm]             = useState<Partial<RestaurantSettings>>({});
  const [hours, setHours]           = useState<OpeningHours>(defaultHours);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [dirty, setDirty]           = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: RestaurantSettings) => {
        setSettings(d);
        setForm(d);
        setHours(d.openingHours ?? defaultHours());
        setLogoPreview(d.logoUrl ?? null);
        setLoading(false);
      });
  }, []);

  function update<K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function toggleClosed(day: Day) {
    setHours((h) => ({ ...h, [day]: { ...h[day], closed: !h[day].closed } }));
    setDirty(true);
  }

  function updateSlot(day: Day, idx: number, field: keyof TimeSlot, value: string) {
    setHours((h) => {
      const slots = h[day].slots.map((s, i) => i === idx ? { ...s, [field]: value } : s);
      return { ...h, [day]: { ...h[day], slots } };
    });
    setDirty(true);
  }

  function addSlot(day: Day) {
    setHours((h) => ({
      ...h,
      [day]: { ...h[day], slots: [...h[day].slots, { open: "09:00", close: "17:00" }] },
    }));
    setDirty(true);
  }

  function removeSlot(day: Day, idx: number) {
    setHours((h) => {
      const slots = h[day].slots.filter((_, i) => i !== idx);
      return { ...h, [day]: { ...h[day], slots } };
    });
    setDirty(true);
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
    if (res.ok) {
      const { logoUrl } = await res.json();
      setLogoPreview(logoUrl);
      setSettings((s) => s ? { ...s, logoUrl } : s);
      toast.success("Logo updated");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to upload logo");
    }
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, openingHours: hours }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      setDirty(false);
      toast.success("Settings saved");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save settings");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <>
        <Header title="Settings" />
        <div className="p-6 animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-800 rounded-xl" />)}
        </div>
      </>
    );
  }

  if (!settings) {
    return (
      <>
        <Header title="Settings" />
        <div className="p-6 text-center text-gray-500 text-sm">No restaurant found</div>
      </>
    );
  }

  return (
    <>
      <Header title="Settings" />
      <div className="p-6 max-w-2xl space-y-6 flex-1 overflow-y-auto">

        {/* ── Restaurant Details ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-orange-400" />
            <h2 className="text-white font-semibold text-sm">Restaurant Details</h2>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Restaurant Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-orange-500 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview ? (
                  <Image src={logoPreview} alt="Restaurant logo" width={80} height={80} unoptimized className="object-contain w-full h-full" />
                ) : (
                  <ImageIcon size={28} className="text-gray-600" />
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload size={13} />
                  {uploading ? "Uploading…" : "Upload Logo"}
                </button>
                <p className="text-[10px] text-gray-500">JPEG, PNG or WebP · max 5 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload restaurant logo"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Restaurant Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Restaurant Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RESTAURANT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("type", t.value)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-lg border text-left transition-colors",
                    form.type === t.value
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-3 h-3 rounded-full border-2", form.type === t.value ? "border-orange-500 bg-orange-500" : "border-gray-600")} />
                    <span className={cn("text-xs font-semibold", form.type === t.value ? "text-orange-300" : "text-gray-300")}>{t.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
            <input
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value || null as unknown as string)}
              placeholder="123 Main St, Sydney NSW 2000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || null as unknown as string)}
              placeholder="+61 2 1234 5678"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Timezone</label>
            <select
              value={form.timezone ?? "UTC"}
              onChange={(e) => update("timezone", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        {/* ── Opening Hours ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-orange-400" />
            <h2 className="text-white font-semibold text-sm">Opening Hours</h2>
          </div>

          {DAYS.map((day) => {
            const dh = hours[day];
            return (
              <div key={day} className="rounded-lg border border-gray-800 bg-gray-800/40 p-3 space-y-2">
                {/* Day header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300 w-24">{DAY_LABELS[day]}</span>
                  <button
                    type="button"
                    onClick={() => toggleClosed(day)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                      dh.closed
                        ? "bg-gray-800 border-gray-700 text-gray-500"
                        : "bg-green-500/15 border-green-700 text-green-400"
                    )}
                  >
                    {dh.closed ? "Closed" : "Open"}
                  </button>
                </div>

                {/* Slots */}
                {!dh.closed && (
                  <div className="space-y-2 pl-1">
                    {dh.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-32">
                          <TimePicker
                            value={slot.open}
                            onChange={(v) => updateSlot(day, idx, "open", v)}
                          />
                        </div>
                        <span className="text-gray-600 text-xs shrink-0">–</span>
                        <div className="w-32">
                          <TimePicker
                            value={slot.close}
                            onChange={(v) => updateSlot(day, idx, "close", v)}
                          />
                        </div>
                        {dh.slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(day, idx)}
                            aria-label="Remove slot"
                            className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-orange-400 transition-colors mt-1"
                    >
                      <Plus size={11} />
                      Add slot
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── System Info ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={16} className="text-gray-400" />
            <h2 className="text-white font-semibold text-sm">System Info</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Restaurant ID</span>
              <span className="text-gray-400 font-mono text-xs">{settings.id}</span>
            </div>
          </div>
        </div>

        {/* ── Save ── */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
