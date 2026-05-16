"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FlaskConical, Send, Plus, ChevronLeft, ChevronRight,
  BookOpen, CheckCircle, XCircle, Trash2, Copy, Loader2,
  MessageSquare, DollarSign, AlertTriangle, Clock, Users,
} from "lucide-react";
import type { AIRecipeData, LabSessionItem, LabMessageItem, LabRecipeRow, LabRecipeStatus } from "@/types";

interface Message {
  role: "USER" | "ASSISTANT";
  content: string;
  streaming?: boolean;
}

interface LabSessionFull {
  id: string;
  title: string;
  messages: LabMessageItem[];
  labRecipes: LabRecipeRow[];
}

function RecipePanel({
  recipe,
  onSave,
  onApprove,
  onReject,
  saving,
  userRole,
}: {
  recipe: AIRecipeData;
  onSave: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  saving: boolean;
  userRole: string;
}) {
  const canReview = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF"].includes(userRole);
  return (
    <div className="space-y-4">
      <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white text-lg">{recipe.name}</h3>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">{recipe.category}</span>
          </div>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">AI Generated</span>
        </div>
        {recipe.description && (
          <p className="text-sm text-zinc-300">{recipe.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-emerald-400">${recipe.estimatedCost?.toFixed(2)}</div>
          <div className="text-xs text-zinc-400">Est. Cost</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-blue-400">${recipe.suggestedPrice?.toFixed(2)}</div>
          <div className="text-xs text-zinc-400">Sell Price</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)}m</div>
          <div className="text-xs text-zinc-400">Total Time</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{recipe.servings}</div>
          <div className="text-xs text-zinc-400">Servings</div>
        </div>
      </div>

      {recipe.allergens && recipe.allergens.length > 0 && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Allergens</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {recipe.allergens.map((a) => (
              <span key={a} className="text-xs bg-red-800/50 text-red-300 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        </div>
      )}

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="bg-zinc-800 rounded-xl p-3">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Ingredients</h4>
          <div className="space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between text-xs text-zinc-400">
                <span>{ing.name}</span>
                <span>{ing.quantity} {ing.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe.nutritionalInfo && (
        <div className="bg-zinc-800 rounded-xl p-3">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Nutrition (per serving)</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {recipe.nutritionalInfo.calories !== undefined && (
              <span className="text-zinc-400">Calories: <span className="text-white">{recipe.nutritionalInfo.calories}</span></span>
            )}
            {recipe.nutritionalInfo.protein !== undefined && (
              <span className="text-zinc-400">Protein: <span className="text-white">{recipe.nutritionalInfo.protein}g</span></span>
            )}
            {recipe.nutritionalInfo.carbs !== undefined && (
              <span className="text-zinc-400">Carbs: <span className="text-white">{recipe.nutritionalInfo.carbs}g</span></span>
            )}
            {recipe.nutritionalInfo.fat !== undefined && (
              <span className="text-zinc-400">Fat: <span className="text-white">{recipe.nutritionalInfo.fat}g</span></span>
            )}
          </div>
        </div>
      )}

      {recipe.platingNotes && (
        <div className="bg-zinc-800 rounded-xl p-3">
          <h4 className="text-sm font-medium text-zinc-300 mb-1">Plating</h4>
          <p className="text-xs text-zinc-400">{recipe.platingNotes}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          Save to Library
        </button>
        {canReview && onApprove && onReject && (
          <>
            <button
              onClick={onApprove}
              disabled={saving}
              className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onReject}
              disabled={saving}
              className="flex items-center gap-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function parseRecipeFromText(text: string): AIRecipeData | null {
  const match = text.match(/<recipe_json>([\s\S]*?)<\/recipe_json>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as AIRecipeData;
  } catch {
    return null;
  }
}

function stripRecipeJson(text: string): string {
  return text.replace(/<recipe_json>[\s\S]*?<\/recipe_json>/, "").trim();
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "USER";
  const displayText = stripRecipeJson(msg.content);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-amber-600 text-white rounded-br-sm"
            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
        }`}
      >
        {displayText || (msg.streaming ? <span className="opacity-60">...</span> : "")}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}

export default function LabPage({ userRole }: { userRole: string }) {
  const [sessions, setSessions] = useState<LabSessionItem[]>([]);
  const [activeSession, setActiveSession] = useState<LabSessionFull | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveRecipe, setLiveRecipe] = useState<AIRecipeData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recipePanelOpen, setRecipePanelOpen] = useState(true);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    fetch("/api/lab/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/lab/sessions/${sessionId}`);
    if (!res.ok) return;
    const data: LabSessionFull = await res.json();
    setActiveSession(data);
    setMessages(
      data.messages.map((m) => ({ role: m.role, content: m.content }))
    );
    // Find most recent recipe from messages
    const allTexts = data.messages.filter((m) => m.role === "ASSISTANT").map((m) => m.content);
    for (let i = allTexts.length - 1; i >= 0; i--) {
      const r = parseRecipeFromText(allTexts[i]);
      if (r) { setLiveRecipe(r); break; }
    }
    const savedIds = new Set(
      data.labRecipes.filter((r) => r.status !== "REJECTED").map((r) => r.name)
    );
    setSavedRecipeIds(savedIds);
  }, []);

  const newSession = useCallback(() => {
    setActiveSession(null);
    setMessages([]);
    setLiveRecipe(null);
    setSavedRecipeIds(new Set());
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { role: "USER", content: text },
      { role: "ASSISTANT", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/lab/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession?.id, message: text }),
      });

      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const newSessionId = res.headers.get("X-Session-Id");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "ASSISTANT", content: fullText, streaming: true };
          return updated;
        });

        const recipe = parseRecipeFromText(fullText);
        if (recipe) {
          setLiveRecipe(recipe);
          setRecipePanelOpen(true);
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "ASSISTANT", content: fullText };
        return updated;
      });

      // Update session list
      if (newSessionId && !activeSession) {
        const updatedSessions = await fetch("/api/lab/sessions").then((r) => r.json());
        setSessions(updatedSessions);
        setActiveSession({ id: newSessionId, title: text.slice(0, 60), messages: [], labRecipes: [] });
      } else if (activeSession) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSession.id ? { ...s, updatedAt: new Date() } : s
          )
        );
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "ASSISTANT",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, activeSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveRecipe = useCallback(async () => {
    if (!liveRecipe || !activeSession) return;
    if (savedRecipeIds.has(liveRecipe.name)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lab/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          name: liveRecipe.name,
          recipeJson: liveRecipe,
        }),
      });
      if (res.ok) {
        setSavedRecipeIds((prev) => new Set([...prev, liveRecipe.name]));
      }
    } finally {
      setSaving(false);
    }
  }, [liveRecipe, activeSession, savedRecipeIds]);

  const reviewRecipe = useCallback(async (action: "approve" | "reject") => {
    if (!liveRecipe || !activeSession) return;
    setSaving(true);
    try {
      // Find the lab recipe row
      const sessionData = await fetch(`/api/lab/sessions/${activeSession.id}`).then((r) => r.json()) as LabSessionFull;
      const labRecipe = sessionData.labRecipes.find((r) => r.name === liveRecipe.name && r.status === "PENDING");
      if (!labRecipe) return;

      await fetch("/api/lab/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labRecipeId: labRecipe.id, action }),
      });
    } finally {
      setSaving(false);
    }
  }, [liveRecipe, activeSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await fetch(`/api/lab/sessions/${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSession?.id === sessionId) newSession();
  }, [activeSession, newSession]);

  const alreadySaved = liveRecipe ? savedRecipeIds.has(liveRecipe.name) : false;

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-900">
      {/* Session Sidebar */}
      <div
        className={`flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ${
          sidebarOpen ? "w-64 min-w-[16rem]" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white text-sm">Lab Sessions</span>
          </div>
          <button
            onClick={newSession}
            className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            title="New session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {sessions.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">No sessions yet.<br />Start chatting!</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`group flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeSession?.id === s.id
                  ? "bg-amber-600/20 border border-amber-600/30"
                  : "hover:bg-zinc-800"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-200 truncate">{s.title}</p>
                <p className="text-xs text-zinc-500">{s._count.messages} messages</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 ml-1 p-1 bg-zinc-800 hover:bg-zinc-700 rounded-r-lg text-zinc-400 transition-all"
        style={{ marginLeft: sidebarOpen ? "16rem" : "0" }}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="font-semibold text-white text-sm">AI Kitchen Lab</h1>
            <p className="text-xs text-zinc-400">
              {activeSession ? activeSession.title : "New conversation"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-600/20 flex items-center justify-center">
                <FlaskConical className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold mb-1">Welcome to the AI Kitchen Lab</h2>
                <p className="text-zinc-400 text-sm max-w-sm">
                  Ask me to create a recipe, calculate food costs, detect allergens, suggest substitutions, or analyze nutrition.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  "Create a lamb tagine recipe for 4 people",
                  "What's a good gluten-free pasta dish?",
                  "Scale my beef bourguignon to 50 portions",
                  "Suggest a substitute for heavy cream",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="text-left text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about recipes, costs, allergens, substitutions..."
              rows={1}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              style={{ minHeight: "48px", maxHeight: "160px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="p-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Recipe Panel */}
      <div
        className={`flex flex-col border-l border-zinc-800 bg-zinc-950 transition-all duration-300 ${
          recipePanelOpen && liveRecipe ? "w-80 min-w-[20rem]" : "w-0 overflow-hidden"
        }`}
      >
        {liveRecipe && (
          <>
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white text-sm">Recipe Panel</span>
              </div>
              <div className="flex items-center gap-1">
                {alreadySaved && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Saved
                  </span>
                )}
                <button
                  onClick={() => setRecipePanelOpen(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <RecipePanel
                recipe={liveRecipe}
                onSave={saveRecipe}
                onApprove={() => reviewRecipe("approve")}
                onReject={() => reviewRecipe("reject")}
                saving={saving || alreadySaved}
                userRole={userRole}
              />
            </div>
          </>
        )}
      </div>

      {/* Recipe Panel Toggle (when closed but recipe exists) */}
      {liveRecipe && !recipePanelOpen && (
        <button
          onClick={() => setRecipePanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-l-lg transition-colors"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
