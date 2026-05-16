"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Megaphone, MessageSquarePlus, Sun, Moon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useTheme } from "./ThemeProvider";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ROLE_COLORS } from "@/lib/colors";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

type AnnounceType = "PUBLIC_HOLIDAY" | "SPECIAL_MENU";

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "";
  const canAnnounce = role === "ADMIN" || role === "MANAGER";
  const { theme, toggle } = useTheme();

  const [announceOpen, setAnnounceOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [announceType, setAnnounceType] = useState<AnnounceType>("PUBLIC_HOLIDAY");
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [fbCustomer, setFbCustomer] = useState("");
  const [fbRating, setFbRating] = useState("");
  const [fbComment, setFbComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitAnnounce() {
    if (!announceTitle.trim() || !announceBody.trim()) return;
    setSaving(true);
    await fetch("/api/notifications/announce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: announceType, title: announceTitle.trim(), body: announceBody.trim() }),
    });
    setSaving(false);
    setAnnounceTitle("");
    setAnnounceBody("");
    setAnnounceOpen(false);
  }

  async function submitFeedback() {
    if (!fbComment.trim()) return;
    setSaving(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: fbCustomer.trim() || undefined,
        rating: fbRating ? parseInt(fbRating) : undefined,
        comment: fbComment.trim(),
      }),
    });
    setSaving(false);
    setFbCustomer("");
    setFbRating("");
    setFbComment("");
    setFeedbackOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold text-lg leading-none">{title}</h1>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {canAnnounce && (
            <button
              onClick={() => setAnnounceOpen(true)}
              title="Send Announcement"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Megaphone size={18} />
            </button>
          )}
          <button
            onClick={() => setFeedbackOpen(true)}
            title="Log Customer Feedback"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <MessageSquarePlus size={18} />
          </button>
          <NotificationBell />
          <Badge className={ROLE_COLORS[role] ?? "bg-gray-700 text-gray-300"}>
            {role.replace("_", " ")}
          </Badge>
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
            {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      <Modal open={announceOpen} onClose={() => setAnnounceOpen(false)} title="Send Announcement">
        <div className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select
              value={announceType}
              onChange={(e) => setAnnounceType(e.target.value as AnnounceType)}
              className="input"
            >
              <option value="PUBLIC_HOLIDAY">Public Holiday</option>
              <option value="SPECIAL_MENU">Special Menu</option>
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              value={announceTitle}
              onChange={(e) => setAnnounceTitle(e.target.value)}
              placeholder="e.g. Christmas Day Closure"
              className="input"
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              value={announceBody}
              onChange={(e) => setAnnounceBody(e.target.value)}
              rows={3}
              placeholder="Details for the team…"
              className="input resize-none"
            />
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={submitAnnounce}
            disabled={saving || !announceTitle.trim() || !announceBody.trim()}
          >
            {saving ? "Sending…" : "Send to Team"}
          </Button>
        </div>
      </Modal>

      <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Log Customer Feedback">
        <div className="space-y-4">
          <div>
            <label className="label">Customer Name (optional)</label>
            <input
              value={fbCustomer}
              onChange={(e) => setFbCustomer(e.target.value)}
              placeholder="e.g. John Smith"
              className="input"
            />
          </div>
          <div>
            <label className="label">Rating (optional)</label>
            <select
              value={fbRating}
              onChange={(e) => setFbRating(e.target.value)}
              className="input"
            >
              <option value="">— No rating —</option>
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Average</option>
              <option value="2">2 — Poor</option>
              <option value="1">1 — Terrible</option>
            </select>
          </div>
          <div>
            <label className="label">Feedback</label>
            <textarea
              value={fbComment}
              onChange={(e) => setFbComment(e.target.value)}
              rows={3}
              placeholder="What did the customer say?"
              className="input resize-none"
            />
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={submitFeedback}
            disabled={saving || !fbComment.trim()}
          >
            {saving ? "Saving…" : "Log Feedback"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
