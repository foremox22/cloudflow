"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  position?: string | null;
  notes?: string | null;
  confirmStatus: string;
  confirmNote?: string | null;
}

interface ConfirmData {
  rosterWeekId: string;
  weekStart: string;
  notes?: string | null;
  user: { id: string; name: string };
  shifts: ShiftInfo[];
}

type Decision = "CONFIRMED" | "REJECTED";

export default function RosterConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ConfirmData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, { status: Decision; note: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/roster/confirm/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid or expired link");
        return r.json();
      })
      .then((d: ConfirmData) => {
        setData(d);
        // Pre-fill existing decisions
        const init: Record<string, { status: Decision; note: string }> = {};
        for (const s of d.shifts) {
          if (s.confirmStatus === "CONFIRMED" || s.confirmStatus === "REJECTED") {
            init[s.id] = { status: s.confirmStatus as Decision, note: s.confirmNote ?? "" };
          } else {
            init[s.id] = { status: "CONFIRMED", note: "" };
          }
        }
        setDecisions(init);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    const payload = {
      shifts: data.shifts.map((s) => ({
        shiftId: s.id,
        status: decisions[s.id]?.status ?? "CONFIRMED",
        note: decisions[s.id]?.note || undefined,
      })),
    };
    const res = await fetch(`/api/roster/confirm/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) setSubmitted(true);
    setSubmitting(false);
  }

  function weekLabel(d: string) {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
    return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
  }

  function dayLabel(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start py-12 px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl overflow-hidden">
          <Image src="/logo.png" alt="Cloudflow" width={36} height={36} className="object-contain" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Cloudflow</p>
          <p className="text-gray-500 text-xs">Restaurant Management</p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-orange-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold">Link Not Found</p>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {submitted && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg">Response Recorded</p>
            <p className="text-gray-400 text-sm mt-1">Your schedule confirmation has been saved. Your manager will be in touch if needed.</p>
          </div>
        )}

        {!loading && !error && !submitted && data && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/80">
              <h1 className="text-white font-semibold text-lg">Hi {data.user.name},</h1>
              <p className="text-gray-400 text-sm mt-0.5">Your schedule for the week of</p>
              <p className="text-orange-400 text-sm font-medium">{weekLabel(data.weekStart)}</p>
              {data.notes && <p className="text-gray-400 text-xs mt-2 bg-gray-800 rounded-lg px-3 py-2">{data.notes}</p>}
            </div>

            <div className="px-6 py-5 space-y-4">
              {data.shifts.map((shift) => {
                const dec = decisions[shift.id] ?? { status: "CONFIRMED" as Decision, note: "" };
                return (
                  <div key={shift.id} className={cn(
                    "border rounded-xl p-4 transition-colors",
                    dec.status === "CONFIRMED" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-medium text-sm">{dayLabel(shift.date)}</p>
                        <p className="text-gray-400 text-sm">{shift.startTime} – {shift.endTime}</p>
                        {shift.position && <p className="text-gray-500 text-xs mt-0.5">{shift.position}</p>}
                        {shift.notes && <p className="text-gray-500 text-xs mt-0.5 italic">{shift.notes}</p>}
                      </div>
                      {/* Confirm / Reject buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setDecisions((d) => ({ ...d, [shift.id]: { ...d[shift.id], status: "CONFIRMED" } }))}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            dec.status === "CONFIRMED"
                              ? "bg-green-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:text-white"
                          )}>
                          <CheckCircle size={13} /> Confirm
                        </button>
                        <button
                          onClick={() => setDecisions((d) => ({ ...d, [shift.id]: { ...d[shift.id], status: "REJECTED" } }))}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            dec.status === "REJECTED"
                              ? "bg-red-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:text-white"
                          )}>
                          <XCircle size={13} /> Can't work
                        </button>
                      </div>
                    </div>

                    {dec.status === "REJECTED" && (
                      <div className="mt-3">
                        <input
                          value={dec.note}
                          onChange={(e) => setDecisions((d) => ({ ...d, [shift.id]: { ...d[shift.id], note: e.target.value } }))}
                          placeholder="Please tell us why you can't work this day…"
                          className="w-full bg-gray-800 border border-red-500/30 text-white rounded-lg px-3 py-2 text-xs placeholder-gray-600"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-6 pb-6">
              <button onClick={submit} disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors">
                {submitting ? "Submitting…" : "Submit My Response"}
              </button>
              <p className="text-gray-600 text-xs text-center mt-3">
                Your manager will review any rejections and contact you if needed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
