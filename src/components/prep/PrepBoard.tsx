"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, ChefHat, Clock, Plus, RefreshCw, RotateCcw, Trash2, X, PlayCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/ui/TimePicker";
import { useToast } from "@/lib/toast";
import type { PrepTaskRow, PrepRoutineRow, Unit } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UNITS: Unit[] = ["KG","G","LB","OZ","L","ML","CUP","TBSP","TSP","PIECE","BUNCH","SLICE","PORTION"];

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     color: "bg-gray-500/20 text-gray-400",    dot: "bg-gray-400"    },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-500/20 text-amber-400",  dot: "bg-amber-400"   },
  DONE:        { label: "Done",        color: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Cancelled",   color: "bg-red-500/20 text-red-400",      dot: "bg-red-400"     },
};

interface PrepItemIngredient {
  id: string;
  name: string;
  unit: Unit;
  currentStock: number;
  parLevel: number;
  batchYield: number | null;
  prepRecipeId: string | null;
}

interface Props {
  prepItems: PrepItemIngredient[];
}

export default function PrepBoard({ prepItems }: Props) {
  const toast = useToast();
  const [tasks, setTasks] = useState<PrepTaskRow[]>([]);
  const [routines, setRoutines] = useState<PrepRoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [completingTask, setCompletingTask] = useState<PrepTaskRow | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addRoutineOpen, setAddRoutineOpen] = useState(false);

  // Add task form state
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newType, setNewType] = useState<"ROUTINE" | "URGENT">("ROUTINE");
  const [newNotes, setNewNotes] = useState("");

  // Add routine form state
  const [routineIngredientId, setRoutineIngredientId] = useState("");
  const [routineQty, setRoutineQty] = useState("");
  const [routineDays, setRoutineDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [routineTime, setRoutineTime] = useState("08:00");

  const load = useCallback(async () => {
    const [tRes, rRes] = await Promise.all([
      fetch("/api/prep/tasks"),
      fetch("/api/prep/routines"),
    ]);
    if (tRes.ok) setTasks(await tRes.json());
    if (rRes.ok) setRoutines(await rRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generateTasks() {
    setGenerating(true);
    const res = await fetch("/api/prep/generate", { method: "POST" });
    if (res.ok) {
      const { created } = await res.json();
      await load();
      if (created === 0) toast.info("All routine tasks for today are already created.");
    }
    setGenerating(false);
  }

  async function updateTask(id: string, status: "IN_PROGRESS" | "DONE" | "CANCELLED") {
    await fetch(`/api/prep/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setCompletingTask(null);
    await load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/prep/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/prep/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: newIngredientId, targetQty: parseFloat(newQty), type: newType, notes: newNotes || undefined }),
    });
    setAddTaskOpen(false);
    setNewIngredientId(""); setNewQty(""); setNewNotes("");
    await load();
  }

  async function addRoutine(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/prep/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: routineIngredientId, targetQty: parseFloat(routineQty), daysOfWeek: routineDays, triggerTime: routineTime }),
    });
    setAddRoutineOpen(false);
    setRoutineIngredientId(""); setRoutineQty("");
    await load();
  }

  async function toggleRoutine(id: string, active: boolean) {
    await fetch(`/api/prep/routines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function deleteRoutine(id: string) {
    await fetch(`/api/prep/routines/${id}`, { method: "DELETE" });
    await load();
  }

  const urgentTasks = tasks.filter((t) => t.type === "URGENT" && t.status !== "DONE" && t.status !== "CANCELLED");
  const pendingTasks = tasks.filter((t) => t.type === "ROUTINE" && t.status === "PENDING");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const todayLabel = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  function calcDeductions(task: PrepTaskRow) {
    if (!task.ingredient.prepRecipe) return [];
    const batchYield = task.ingredient.batchYield ?? 1;
    const batches = task.targetQty / batchYield;
    return task.ingredient.prepRecipe.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      qty: ri.quantity * batches,
      unit: ri.unit,
      stock: ri.ingredient.currentStock,
      willShort: ri.ingredient.currentStock < ri.quantity * batches,
    }));
  }

  // Suppress unused variable warning for UNITS
  void UNITS;

  if (loading) return <div className="text-gray-500 text-sm">Loading prep board...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Prep Board</h1>
          <p className="text-gray-400 text-sm">{todayLabel}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={generateTasks}
            disabled={generating}
            className="flex items-center gap-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
            Generate Today
          </button>
          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Urgent", count: urgentTasks.length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
          { label: "Pending", count: pendingTasks.length, color: "text-gray-300", bg: "bg-gray-800 border-gray-700" },
          { label: "In Progress", count: inProgressTasks.length, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
          { label: "Done Today", count: doneTasks.length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={cn("border rounded-xl p-3 text-center", bg)}>
            <div className={cn("text-2xl font-bold", color)}>{count}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Urgent tasks */}
      {urgentTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Urgent Prep</h2>
          </div>
          <div className="space-y-2">
            {urgentTasks.map((task) => <TaskCard key={task.id} task={task} onStart={() => updateTask(task.id, "IN_PROGRESS")} onComplete={() => setCompletingTask(task)} onCancel={() => updateTask(task.id, "CANCELLED")} urgent />)}
          </div>
        </section>
      )}

      {/* In Progress */}
      {inProgressTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">In Progress</h2>
          </div>
          <div className="space-y-2">
            {inProgressTasks.map((task) => <TaskCard key={task.id} task={task} onStart={() => {}} onComplete={() => setCompletingTask(task)} onCancel={() => updateTask(task.id, "CANCELLED")} />)}
          </div>
        </section>
      )}

      {/* Pending routine tasks */}
      {pendingTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pending ({pendingTasks.length})</h2>
          </div>
          <div className="space-y-2">
            {pendingTasks.map((task) => <TaskCard key={task.id} task={task} onStart={() => updateTask(task.id, "IN_PROGRESS")} onComplete={() => setCompletingTask(task)} onCancel={() => updateTask(task.id, "CANCELLED")} />)}
          </div>
        </section>
      )}

      {/* Done */}
      {doneTasks.length > 0 && (
        <section>
          <details>
            <summary className="flex items-center gap-2 cursor-pointer mb-3 list-none">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Done Today ({doneTasks.length})</h2>
            </summary>
            <div className="space-y-2 mt-2">
              {doneTasks.map((task) => <TaskCard key={task.id} task={task} onStart={() => {}} onComplete={() => {}} onCancel={() => {}} done />)}
            </div>
          </details>
        </section>
      )}

      {urgentTasks.length === 0 && pendingTasks.length === 0 && inProgressTasks.length === 0 && doneTasks.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No prep tasks for today.</p>
          <p className="text-xs mt-1">Click &quot;Generate Today&quot; to create tasks from routines.</p>
        </div>
      )}

      {/* Routines */}
      <section className="border-t border-gray-800 pt-5">
        <button
          onClick={() => setShowRoutines(!showRoutines)}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <RotateCcw size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex-1">Prep Routines ({routines.length})</h2>
          <span className="text-xs text-gray-600">{showRoutines ? "hide" : "show"}</span>
        </button>

        {showRoutines && (
          <div className="space-y-2">
            {routines.map((r) => (
              <div key={r.id} className={cn("flex items-center gap-3 bg-gray-900 border rounded-xl px-4 py-3", r.active ? "border-gray-700" : "border-gray-800 opacity-60")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{r.ingredient.name}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", r.active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500")}>
                      {r.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.targetQty} {r.ingredient.unit} · {r.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")} at {r.triggerTime}
                  </div>
                </div>
                <button
                  onClick={() => toggleRoutine(r.id, !r.active)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {r.active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => deleteRoutine(r.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setAddRoutineOpen(true)}
              className="flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors mt-1"
            >
              <Plus size={14} /> Add Routine
            </button>
          </div>
        )}
      </section>

      {/* Complete task confirmation modal */}
      {completingTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[440px] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FlaskConical size={16} className="text-orange-400" />
                Complete: {completingTask.ingredient.name}
              </h3>
              <button onClick={() => setCompletingTask(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-400">
              + {completingTask.targetQty} {completingTask.ingredient.unit} added to stock
            </div>
            {calcDeductions(completingTask).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Raw ingredients to deduct:</p>
                <div className="space-y-1.5">
                  {calcDeductions(completingTask).map((d, i) => (
                    <div key={i} className={cn("flex justify-between text-sm px-3 py-2 rounded-lg", d.willShort ? "bg-red-500/10 border border-red-500/30" : "bg-gray-800")}>
                      <span className={d.willShort ? "text-red-300" : "text-white"}>{d.name}</span>
                      <span className={d.willShort ? "text-red-400 font-medium" : "text-gray-400"}>
                        -{d.qty.toFixed(3)} {d.unit}
                        {d.willShort && <span className="ml-1 text-red-500">(low!)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCompletingTask(null)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => updateTask(completingTask.id, "DONE")}
                className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-sm font-medium transition-colors">
                Mark Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task modal */}
      {addTaskOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={addTask} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Add Prep Task</h3>
              <button type="button" onClick={() => setAddTaskOpen(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prep Item *</label>
              <select required value={newIngredientId} onChange={(e) => setNewIngredientId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Select...</option>
                {prepItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quantity *</label>
              <input required type="number" step="0.01" min="0.01" value={newQty} onChange={(e) => setNewQty(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as "ROUTINE" | "URGENT")}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setAddTaskOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm">Cancel</button>
              <button type="submit"
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium">Add</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Routine modal */}
      {addRoutineOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={addRoutine} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Add Prep Routine</h3>
              <button type="button" onClick={() => setAddRoutineOpen(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prep Item *</label>
              <select required value={routineIngredientId} onChange={(e) => setRoutineIngredientId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Select...</option>
                {prepItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Batch Qty *</label>
              <input required type="number" step="0.01" min="0.01" value={routineQty} onChange={(e) => setRoutineQty(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Days of Week</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => setRoutineDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort())}
                    className={cn("w-9 h-9 rounded-lg text-xs font-medium border transition-colors",
                      routineDays.includes(i) ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-gray-800 border-gray-700 text-gray-400")}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prep Time</label>
              <TimePicker value={routineTime} onChange={setRoutineTime} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setAddRoutineOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm">Cancel</button>
              <button type="submit"
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onStart, onComplete, onCancel, urgent = false, done = false }: {
  task: PrepTaskRow;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  urgent?: boolean;
  done?: boolean;
}) {
  const cfg = STATUS_CONFIG[task.status];
  const scheduled = task.scheduledFor ? new Date(task.scheduledFor).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className={cn(
      "flex items-center gap-3 border rounded-xl px-4 py-3",
      urgent ? "bg-red-500/5 border-red-500/30" : "bg-gray-900 border-gray-800",
      done && "opacity-60"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-medium">{task.ingredient.name}</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
          {urgent && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">Urgent</span>}
          {task.type === "ROUTINE" && !urgent && <span className="text-xs text-gray-600">Routine</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          <span className="font-mono font-medium text-white">{task.targetQty} {task.ingredient.unit}</span>
          {scheduled && <span className="flex items-center gap-1"><Clock size={10} /> {scheduled}</span>}
          {task.notes && <span className="truncate max-w-[200px]">{task.notes}</span>}
          <span className="text-xs text-gray-600">
            Stock: {task.ingredient.currentStock.toFixed(1)} / par {task.ingredient.parLevel}
          </span>
        </div>
      </div>
      {!done && (
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === "PENDING" && (
            <button onClick={onStart}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg transition-colors font-medium">
              Start
            </button>
          )}
          {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
            <button onClick={onComplete}
              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg transition-colors font-medium">
              Complete
            </button>
          )}
          <button onClick={onCancel} className="text-gray-600 hover:text-red-400 transition-colors p-1">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
