"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock, Save, Sun, Moon, Coffee,
  CheckCircle, XCircle, Plus, Pencil, Trash2, X, UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/ui/TimePicker";
import { useToast } from "@/lib/toast";

/* ── Types ── */
type TemplateId = "LUNCH" | "DINNER" | "ALLDAY";

interface Template {
  id: TemplateId;
  label: string;
  start: string;
  end: string;
  enabled: boolean;
}

interface Group {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

/* ── Config ── */
const DEFAULT_TEMPLATES: Template[] = [
  { id: "LUNCH",  label: "Lunch",   start: "10:00", end: "14:00", enabled: true },
  { id: "DINNER", label: "Dinner",  start: "17:30", end: "21:00", enabled: true },
  { id: "ALLDAY", label: "All Day", start: "09:00", end: "21:00", enabled: false },
];

const GROUP_COLORS = [
  { value: "orange",  bg: "bg-orange-500/20",  border: "border-orange-500/50",  text: "text-orange-400",  dot: "bg-orange-400" },
  { value: "blue",    bg: "bg-blue-500/20",    border: "border-blue-500/50",    text: "text-blue-400",    dot: "bg-blue-400" },
  { value: "green",   bg: "bg-green-500/20",   border: "border-green-500/50",   text: "text-green-400",   dot: "bg-green-400" },
  { value: "purple",  bg: "bg-purple-500/20",  border: "border-purple-500/50",  text: "text-purple-400",  dot: "bg-purple-400" },
  { value: "pink",    bg: "bg-pink-500/20",    border: "border-pink-500/50",    text: "text-pink-400",    dot: "bg-pink-400" },
  { value: "yellow",  bg: "bg-yellow-500/20",  border: "border-yellow-500/50",  text: "text-yellow-400",  dot: "bg-yellow-400" },
  { value: "cyan",    bg: "bg-cyan-500/20",    border: "border-cyan-500/50",    text: "text-cyan-400",    dot: "bg-cyan-400" },
  { value: "red",     bg: "bg-red-500/20",     border: "border-red-500/50",     text: "text-red-400",     dot: "bg-red-400" },
];

const TEMPLATE_ICON: Record<TemplateId, React.ElementType> = { LUNCH: Sun, DINNER: Moon, ALLDAY: Coffee };
const TEMPLATE_COLOR: Record<TemplateId, { ring: string; icon: string }> = {
  LUNCH:  { ring: "border-orange-500/60 bg-orange-500/10", icon: "text-orange-400" },
  DINNER: { ring: "border-purple-500/60 bg-purple-500/10", icon: "text-purple-400" },
  ALLDAY: { ring: "border-blue-500/60   bg-blue-500/10",   icon: "text-blue-400" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager", HEAD_CHEF: "Head Chef",
  CHEF: "Chef", SOUS_CHEF: "Sous Chef", WAITER: "Waiter", BARTENDER: "Bartender",
};

function colorStyle(color: string) {
  return GROUP_COLORS.find(c => c.value === color) ?? GROUP_COLORS[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Component ── */
export default function RosterSettings() {
  const toast = useToast();

  const [templates, setTemplates]   = useState<Template[]>(DEFAULT_TEMPLATES);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);

  /* Group modal state */
  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditing]  = useState<Group | null>(null);
  const [gName, setGName]           = useState("");
  const [gColor, setGColor]         = useState("orange");
  const [gMembers, setGMembers]     = useState<string[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetch("/api/settings"), fetch("/api/team")]).then(async ([sRes, tRes]) => {
      if (sRes.ok) {
        const d = await sRes.json();
        if (d.rosterConfig?.templates?.length) setTemplates(d.rosterConfig.templates);
        if (d.rosterConfig?.groups)            setGroups(d.rosterConfig.groups);
      }
      if (tRes.ok) setTeam(await tRes.json());
      setLoading(false);
    });
  }, []);

  /* Focus name input when modal opens */
  useEffect(() => {
    if (groupModal) setTimeout(() => nameRef.current?.focus(), 50);
  }, [groupModal]);

  function update(id: TemplateId, field: keyof Template, value: string | boolean) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  async function saveTemplates() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rosterConfig: { templates, groups } }),
    });
    if (res.ok) toast.success("Roster settings saved");
    else        toast.error("Failed to save");
    setSaving(false);
  }

  async function saveGroups(newGroups: Group[]): Promise<boolean> {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rosterConfig: { templates, groups: newGroups } }),
    });
    if (!res.ok) { toast.error("Failed to save groups"); return false; }
    return true;
  }

  /* Open create modal */
  function openCreate() {
    setEditing(null);
    setGName("");
    setGColor("orange");
    setGMembers([]);
    setGroupModal("create");
  }

  /* Open edit modal */
  function openEdit(g: Group) {
    setEditing(g);
    setGName(g.name);
    setGColor(g.color);
    setGMembers([...g.memberIds]);
    setGroupModal("edit");
  }

  /* Confirm group */
  async function confirmGroup() {
    if (!gName.trim()) return;
    const mode = groupModal;
    let newGroups: Group[];
    if (mode === "edit" && editingGroup) {
      newGroups = groups.map(g => g.id === editingGroup.id ? { ...g, name: gName.trim(), color: gColor, memberIds: gMembers } : g);
    } else {
      newGroups = [...groups, { id: uid(), name: gName.trim(), color: gColor, memberIds: gMembers }];
    }
    setGroups(newGroups);
    const ok = await saveGroups(newGroups);
    if (!ok) { setGroups(groups); return; }
    setGroupModal(null);
    toast.success(mode === "edit" ? "Group updated" : "Group created");
  }

  /* Delete group */
  async function deleteGroup(id: string) {
    const newGroups = groups.filter(g => g.id !== id);
    setGroups(newGroups);
    await saveGroups(newGroups);
    toast.success("Group deleted");
  }

  function toggleMember(id: string) {
    setGMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (loading) return <div className="text-gray-500 text-sm py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Session Templates ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-orange-400" />
          <h2 className="text-white font-semibold text-sm">Session Templates</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">Configure default shift times. Enable only the sessions your restaurant uses.</p>

        <div className="space-y-3">
          {templates.map(t => {
            const Icon   = TEMPLATE_ICON[t.id];
            const colors = TEMPLATE_COLOR[t.id];
            return (
              <div key={t.id}
                className={cn("rounded-xl border p-4 transition-colors",
                  t.enabled ? colors.ring : "border-gray-700 bg-gray-800/20"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={15} className={t.enabled ? colors.icon : "text-gray-600"} />
                  <span className={cn("text-sm font-semibold flex-1", t.enabled ? "text-white" : "text-gray-500")}>
                    {t.label}
                    {t.id === "ALLDAY" && <span className="ml-2 text-[10px] font-normal text-gray-500">Ideal for cafes</span>}
                  </span>
                  <button type="button" title={t.enabled ? "Disable" : "Enable"}
                    onClick={() => update(t.id, "enabled", !t.enabled)}>
                    {t.enabled
                      ? <CheckCircle size={18} className={colors.icon} />
                      : <XCircle size={18} className="text-gray-600 hover:text-gray-400 transition-colors" />}
                  </button>
                </div>
                {t.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start</label>
                      <TimePicker value={t.start} onChange={v => update(t.id, "start", v)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End</label>
                      <TimePicker value={t.end} onChange={v => update(t.id, "end", v)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={saveTemplates} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            <Save size={14} />
            {saving ? "Saving…" : "Save Templates"}
          </button>
        </div>
      </div>

      {/* ── Groups ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UsersRound size={16} className="text-orange-400" />
            <h2 className="text-white font-semibold text-sm">Groups</h2>
            <span className="text-xs text-gray-500">Organise staff into teams for easier rostering</span>
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-colors">
            <Plus size={13} />
            Create Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="py-8 text-center">
            <UsersRound size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No groups yet</p>
            <p className="text-gray-600 text-xs mt-1">Create groups like "Kitchen", "Front of House", "Bar"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map(g => {
              const cs = colorStyle(g.color);
              const members = team.filter(m => g.memberIds.includes(m.id));
              return (
                <div key={g.id}
                  className={cn("flex items-center gap-3 rounded-xl border p-3.5", cs.bg, cs.border)}>
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", cs.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", cs.text)}>{g.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {members.length === 0
                        ? "No members"
                        : members.map(m => m.name).join(", ")}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" title="Edit group" onClick={() => openEdit(g)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button type="button" title="Delete group" onClick={() => deleteGroup(g.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


{/* ── Group modal ── */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">
                {groupModal === "edit" ? "Edit Group" : "Create Group"}
              </h2>
              <button type="button" title="Close" onClick={() => setGroupModal(null)}
                className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Group Name</label>
                <input
                  ref={nameRef}
                  type="text"
                  title="Group name"
                  value={gName}
                  onChange={e => setGName(e.target.value)}
                  placeholder="e.g. Kitchen, Front of House, Bar"
                  onKeyDown={e => e.key === "Enter" && confirmGroup()}
                  className="input"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.value}
                      onClick={() => setGColor(c.value)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all",
                        c.dot,
                        gColor === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110" : "opacity-60 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Members */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Members — {gMembers.length} selected
                </label>
                <div className="max-h-52 overflow-y-auto space-y-1 border border-gray-700 rounded-xl p-2">
                  {team.map(m => {
                    const selected = gMembers.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                          selected ? "bg-orange-500/15 border border-orange-500/30" : "hover:bg-gray-800 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                          selected ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-400"
                        )}>
                          {selected ? "✓" : m.name[0].toUpperCase()}
                        </div>
                        <span className={cn("text-sm flex-1", selected ? "text-white" : "text-gray-300")}>{m.name}</span>
                        <span className="text-[10px] text-gray-500">{ROLE_LABELS[m.role] ?? m.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setGroupModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmGroup} disabled={!gName.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                {groupModal === "edit" ? "Save Changes" : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
