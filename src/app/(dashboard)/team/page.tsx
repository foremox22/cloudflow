"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Shield, X, Pencil } from "lucide-react";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type Role = "ADMIN" | "MANAGER" | "HEAD_CHEF" | "CHEF" | "SOUS_CHEF" | "WAITER" | "BARTENDER";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  joinedAt: string;
  isSelf: boolean;
}

const ROLES: Role[] = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:      "Admin",
  MANAGER:    "Manager",
  HEAD_CHEF:  "Head Chef",
  CHEF:       "Chef",
  SOUS_CHEF:  "Sous Chef",
  WAITER:     "Waiter",
  BARTENDER:  "Bartender",
};

const ROLE_COLORS: Record<Role, string> = {
  ADMIN:      "bg-purple-500/15 text-purple-400 border-purple-500/20",
  MANAGER:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  HEAD_CHEF:  "bg-orange-500/15 text-orange-400 border-orange-500/20",
  CHEF:       "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SOUS_CHEF:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  WAITER:     "bg-green-500/15 text-green-400 border-green-500/20",
  BARTENDER:  "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

interface InviteForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface EditForm {
  name: string;
  role: Role;
  active: boolean;
}

export default function TeamPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InviteForm>({ name: "", email: "", password: "", role: "WAITER" });

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", role: "WAITER", active: true });
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(m: Member) {
    setEditingMember(m);
    setEditForm({ name: m.name, role: m.role, active: m.active });
  }

  async function saveEdit() {
    if (!editingMember) return;
    setEditSaving(true);
    const res = await fetch(`/api/team/${editingMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? { ...m, name: editForm.name, role: editForm.role, active: editForm.active }
            : m
        )
      );
      setEditingMember(null);
      toast.success("Member updated");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to update member");
    }
    setEditSaving(false);
  }

  async function invite() {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(`${form.name} added to team`);
      setShowInvite(false);
      setForm({ name: "", email: "", password: "", role: "WAITER" });
      load();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add member");
    }
    setSaving(false);
  }

  async function removeMember(userId: string, name: string) {
    if (!await confirm(`Remove ${name} from this restaurant?`, { title: "Remove member", confirmText: "Remove", variant: "danger" })) return;
    const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success(`${name} removed`);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to remove member");
    }
  }

  const myRole = members.find((m) => m.isSelf)?.role;
  const canManage = myRole === "ADMIN" || myRole === "MANAGER";
  const isAdmin = myRole === "ADMIN";

  return (
    <>
      <Header title="Team" />
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            <p className="text-gray-400 text-sm">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus size={15} />
              Add Member
            </button>
          )}
        </div>

        {/* Members list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No team members found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3" aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => canManage && !m.isSelf && openEdit(m)}
                    className={cn(
                      "border-b border-gray-800/50 last:border-0 transition-colors",
                      canManage && !m.isSelf
                        ? "cursor-pointer hover:bg-gray-800/50"
                        : "hover:bg-gray-800/20"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {m.name}
                            {m.isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{m.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", ROLE_COLORS[m.role])}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        m.active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-400"
                      )}>
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        {!m.isSelf && (
                          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openEdit(m)}
                              title="Edit member"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => removeMember(m.id, m.name)}
                                title="Remove from restaurant"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit member modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-base">Edit Member</h2>
              <button type="button" title="Close" onClick={() => setEditingMember(null)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email read-only */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                <p className="text-sm text-gray-500 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5">{editingMember.email}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  title="Full Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
                <select
                  title="Role"
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>

              {/* Status — only admin can toggle */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, active: val }))}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-xs font-medium transition-colors",
                          editForm.active === val
                            ? val
                              ? "bg-emerald-500/15 border-emerald-600 text-emerald-400"
                              : "bg-gray-700 border-gray-600 text-gray-300"
                            : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                        )}
                      >
                        {val ? "Active" : "Inactive"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!editForm.name || editSaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-base">Add Team Member</h2>
              <button type="button" title="Close" onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Jane Smith" },
                { label: "Email Address", key: "email", type: "email", placeholder: "jane@restaurant.com" },
                { label: "Temporary Password", key: "password", type: "password", placeholder: "Min 6 characters" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof InviteForm]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
                <select
                  title="Role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={invite}
                disabled={!form.name || !form.email || !form.password || saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Adding…" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
