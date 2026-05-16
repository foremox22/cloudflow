"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplierWithProducts } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: SupplierWithProducts | null;
}

export default function SupplierModal({ open, onClose, onSaved, supplier }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [leadDays, setLeadDays] = useState("3");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setEmail(supplier.email ?? "");
      setPhone(supplier.phone ?? "");
      setAddress(supplier.address ?? "");
      setContactName(supplier.contactName ?? "");
      setLeadDays(String(supplier.leadDays));
    } else {
      setName(""); setEmail(""); setPhone(""); setAddress(""); setContactName(""); setLeadDays("3");
    }
    setError("");
  }, [supplier, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = { name, email, phone, address, contactName, leadDays: parseInt(leadDays, 10) };
    const res = supplier
      ? await fetch(`/api/suppliers/${supplier.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    setSaving(false);
    if (!res.ok) { setError("Failed to save supplier."); return; }
    onSaved();
    onClose();
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-white font-semibold text-lg">
              {supplier ? "Edit Supplier" : "Add Supplier"}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Company Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lead Days</label>
                <input type="number" min="0" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium", saving ? "bg-orange-500/50 text-white/50 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600")}>
                {saving ? "Saving…" : supplier ? "Update" : "Add Supplier"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
