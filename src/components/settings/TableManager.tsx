"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Hash, Users, LayoutGrid } from "lucide-react";
import Header from "@/components/layout/Header";
import { cn } from "@/lib/utils";

interface RestaurantTable {
  id: string;
  number: number;
  section: string;
  capacity: number;
  status: "FREE" | "OCCUPIED" | "RESERVED";
  orders: { id: string }[];
}

const STATUS_STYLE = {
  FREE:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  OCCUPIED: "bg-red-500/15 text-red-400 border-red-500/30",
  RESERVED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function TableManager() {
  const [tables,   setTables]   = useState<RestaurantTable[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Single add form
  const [newNumber,   setNewNumber]   = useState("");
  const [newSection,  setNewSection]  = useState("Main");
  const [newCapacity, setNewCapacity] = useState("4");

  // Bulk add form
  const [bulkFrom,    setBulkFrom]    = useState("1");
  const [bulkTo,      setBulkTo]      = useState("10");
  const [bulkSection, setBulkSection] = useState("Main");
  const [bulkCap,     setBulkCap]     = useState("4");
  const [bulkSaving,  setBulkSaving]  = useState(false);

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/tables");
    if (res.ok) setTables(await res.json());
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const sections = [...new Set(tables.map((t) => t.section))].sort();

  async function addTable() {
    const number = parseInt(newNumber);
    if (!number || number < 1) return;
    setSaving(true);
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, section: newSection.trim() || "Main", capacity: parseInt(newCapacity) || 4 }),
    });
    setNewNumber(""); setSaving(false); setShowForm(false);
    await reload();
  }

  async function addBulk() {
    const from = parseInt(bulkFrom);
    const to   = parseInt(bulkTo);
    if (!from || !to || from > to || to - from > 99) return;
    setBulkSaving(true);
    for (let n = from; n <= to; n++) {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: n, section: bulkSection.trim() || "Main", capacity: parseInt(bulkCap) || 4 }),
      });
    }
    setBulkSaving(false); setShowBulk(false);
    await reload();
  }

  async function deleteTable(id: string) {
    setDeleting(id);
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    setDeleting(null);
    await reload();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Header title="Tables" subtitle="Set up table numbers for your restaurant" />

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-6">

        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setShowForm((v) => !v); setShowBulk(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Add Table
          </button>
          <button
            onClick={() => { setShowBulk((v) => !v); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            <LayoutGrid size={15} /> Bulk Add
          </button>
        </div>

        {/* Single add form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">New Table</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Table Number</label>
                <input
                  type="number" min="1"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTable()}
                  autoFocus
                  placeholder="e.g. 1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Section</label>
                <input
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="Main"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Capacity</label>
                <input
                  type="number" min="1"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="4"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
              <button onClick={addTable} disabled={saving || !newNumber} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                {saving ? "Adding…" : "Add Table"}
              </button>
            </div>
          </div>
        )}

        {/* Bulk add form */}
        {showBulk && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Bulk Add Tables</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From #</label>
                <input type="number" min="1" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To #</label>
                <input type="number" min="1" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Section</label>
                <input value={bulkSection} onChange={(e) => setBulkSection(e.target.value)} placeholder="Main"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Seats</label>
                <input type="number" min="1" value={bulkCap} onChange={(e) => setBulkCap(e.target.value)} placeholder="4"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Will create tables {bulkFrom}–{bulkTo} ({Math.max(0, parseInt(bulkTo || "0") - parseInt(bulkFrom || "0") + 1)} tables)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowBulk(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">Cancel</button>
              <button onClick={addBulk} disabled={bulkSaving}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                {bulkSaving ? "Creating…" : "Create Tables"}
              </button>
            </div>
          </div>
        )}

        {/* Table grid */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Loading…</p>
        ) : tables.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Hash size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tables yet.</p>
            <p className="text-xs text-gray-600 mt-1">Add individual tables or bulk-create a range.</p>
          </div>
        ) : (
          sections.map((section) => {
            const sectionTables = tables.filter((t) => t.section === section);
            return (
              <div key={section}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-300">{section}</p>
                  <span className="text-xs text-gray-600">{sectionTables.length} tables</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {sectionTables.map((table) => (
                    <div
                      key={table.id}
                      className="relative bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center group"
                    >
                      <span className="text-2xl font-bold text-white">{table.number}</span>
                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-[10px]">
                        <Users size={9} /> {table.capacity}
                      </div>
                      <span className={cn(
                        "mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        STATUS_STYLE[table.status]
                      )}>
                        {table.status.toLowerCase()}
                      </span>

                      {/* Delete — only show when FREE */}
                      {table.status === "FREE" && (
                        <button
                          onClick={() => deleteTable(table.id)}
                          disabled={deleting === table.id}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
