"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CreditCard, Banknote, Split, Check, Users, ReceiptText, Ticket, Tag, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { PaymentMethod, OrderItemDetail } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  tax: number;
  discount: number;
  items: OrderItemDetail[];
  onConfirm: (method: PaymentMethod, discount: number, breakdown: { cashPaid?: number; cardPaid?: number; voucherPaid?: number; voucherCode?: string }) => Promise<void>;
}

function quickAmounts(amount: number): number[] {
  const c = [
    Math.ceil(amount),
    Math.ceil(amount / 5)  * 5,
    Math.ceil(amount / 10) * 10,
    Math.ceil(amount / 20) * 20,
    Math.ceil(amount / 50) * 50,
  ];
  return [...new Set(c)].filter((v) => v > amount).slice(0, 4);
}

type BillMode = "single" | "even" | "byItem";
type SeatMethod = "CASH" | "CARD";

interface SeatPayment { method: SeatMethod; cashPaid: string; done: boolean }

const SEAT_LABEL = ["Customer 1","Customer 2","Customer 3","Customer 4","Customer 5","Customer 6","Customer 7","Customer 8"];
const SEAT_CLR   = [
  "border-sky-500/50 bg-sky-500/10 text-sky-400",
  "border-violet-500/50 bg-violet-500/10 text-violet-400",
  "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  "border-amber-500/50 bg-amber-500/10 text-amber-400",
  "border-pink-500/50 bg-pink-500/10 text-pink-400",
  "border-orange-500/50 bg-orange-500/10 text-orange-400",
];

export default function PaymentModal({ open, onClose, subtotal, tax, discount: initDiscount, items, onConfirm }: Props) {
  const [discountVal, setDiscountVal] = useState(String(initDiscount));
  const [billMode,    setBillMode]    = useState<BillMode>("single");

  // ── Single ──────────────────────────────────────────────────────────────────
  const [singleMethod, setSingleMethod] = useState<PaymentMethod>("CASH");
  const [cashPaid,     setCashPaid]     = useState("");
  const [cardPaid,     setCardPaid]     = useState("");

  // ── Voucher ─────────────────────────────────────────────────────────────────
  const [voucherCode,       setVoucherCode]       = useState("");
  const [voucherAmount,     setVoucherAmount]      = useState("");
  const [voucherRemMethod,  setVoucherRemMethod]   = useState<"CASH" | "CARD">("CASH");
  const [voucherRemCash,    setVoucherRemCash]     = useState("");

  // ── Split evenly ────────────────────────────────────────────────────────────
  const [evenCount, setEvenCount] = useState(2);

  // ── Split by item ───────────────────────────────────────────────────────────
  const [byItemCount,  setByItemCount]  = useState(2);
  const [assignments,  setAssignments]  = useState<Record<string, number>>({}); // itemId → seat (1-indexed)

  // ── Promo code ──────────────────────────────────────────────────────────────
  const [promoInput,   setPromoInput]   = useState("");
  const [promoMsg,     setPromoMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // ── Shared seat payment flow ────────────────────────────────────────────────
  const [phase,        setPhase]        = useState<"setup" | "paying">("setup");
  const [currentSeat,  setCurrentSeat]  = useState(1);
  const [seatPayments, setSeatPayments] = useState<SeatPayment[]>([]);
  const [processing,   setProcessing]   = useState(false);

  const cashInputRef = useRef<HTMLInputElement>(null);

  const discountNum = parseFloat(discountVal) || 0;
  const total       = Math.max(0, subtotal + tax - discountNum);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setDiscountVal(String(initDiscount));
    setBillMode("single"); setSingleMethod("CASH");
    setCashPaid(""); setCardPaid("");
    setVoucherCode(""); setVoucherAmount(""); setVoucherRemCash(""); setVoucherRemMethod("CASH");
    setEvenCount(2); setByItemCount(2); setAssignments({});
    setPromoInput(""); setPromoMsg(null);
    setPhase("setup"); setCurrentSeat(1); setSeatPayments([]);
  }, [open, initDiscount]);

  // Auto-fill card remainder in single SPLIT mode
  useEffect(() => {
    if (singleMethod !== "SPLIT") return;
    const rem = total - (parseFloat(cashPaid) || 0);
    setCardPaid(rem > 0 ? rem.toFixed(2) : "0");
  }, [cashPaid, singleMethod, total]);

  // Auto-focus cash when entering a cash seat
  useEffect(() => {
    if (!open) return;
    const sp = seatPayments[currentSeat - 1];
    if (phase === "paying" && sp && sp.method === "CASH")
      setTimeout(() => cashInputRef.current?.focus(), 50);
  }, [open, phase, currentSeat, seatPayments]);

  // ── Single calcs ─────────────────────────────────────────────────────────────
  const cashNum    = parseFloat(cashPaid) || 0;
  const cashChange = cashNum - total;
  const cashShort  = cashNum > 0 && cashChange < -0.005;
  const cashExact  = Math.abs(cashChange) < 0.005;

  const splitCash  = parseFloat(cashPaid) || 0;
  const splitCard  = parseFloat(cardPaid) || 0;
  const splitPaid  = splitCash + splitCard;
  const splitDiff  = splitPaid - total;
  const splitShort = splitDiff < -0.005;
  const splitOver  = splitDiff > 0.005;

  // ── Voucher calcs ────────────────────────────────────────────────────────────
  const voucherNum  = parseFloat(voucherAmount) || 0;
  const voucherRem  = Math.max(0, total - voucherNum);        // remaining after voucher
  const voucherFull = voucherNum >= total - 0.005;            // voucher covers everything
  const voucherRemCashNum = parseFloat(voucherRemCash) || 0;
  const voucherRemChange  = voucherRemCashNum - voucherRem;
  const voucherRemShort   = voucherRemMethod === "CASH" && voucherRemCashNum > 0 && voucherRemChange < -0.005;
  const voucherRemExact   = Math.abs(voucherRemChange) < 0.005;
  const voucherCanConfirm = voucherNum > 0 && (
    voucherFull ||
    (voucherRemMethod === "CARD") ||
    (voucherRemMethod === "CASH" && voucherRemCashNum >= voucherRem)
  );

  // ── Seat helpers ──────────────────────────────────────────────────────────────
  const numSeats = billMode === "even" ? evenCount : byItemCount;

  function seatTotal(seat: number): number {
    if (billMode === "even") return parseFloat((total / evenCount).toFixed(2));
    const seatItems = items.filter((i) => (assignments[i.id] ?? 1) === seat);
    if (!seatItems.length) return 0;
    const seatSub = seatItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const ratio   = subtotal > 0 ? seatSub / subtotal : 0;
    return parseFloat((total * ratio).toFixed(2));
  }

  function seatItems(seat: number) {
    return items.filter((i) => (assignments[i.id] ?? 1) === seat);
  }

  function startCollecting() {
    setSeatPayments(Array.from({ length: numSeats }, () => ({ method: "CASH", cashPaid: "", done: false })));
    setCurrentSeat(1);
    setPhase("paying");
  }

  const sp           = seatPayments[currentSeat - 1];
  const spTotal      = seatTotal(currentSeat);
  const spCash       = parseFloat(sp?.cashPaid ?? "") || 0;
  const spChange     = spCash - spTotal;
  const spShort      = sp?.method === "CASH" && spCash > 0 && spChange < -0.005;
  const spExact      = Math.abs(spChange) < 0.005;
  const spCanPay     = sp && (sp.method === "CARD" || (sp.method === "CASH" && spCash >= spTotal));
  const allSeatsDone = seatPayments.length > 0 && seatPayments.every((s) => s.done);

  function updateSp(key: keyof SeatPayment, val: string | boolean) {
    setSeatPayments((prev) => { const n = [...prev]; n[currentSeat - 1] = { ...n[currentSeat - 1], [key]: val }; return n; });
  }

  function markSeatDone() {
    setSeatPayments((prev) => { const n = [...prev]; n[currentSeat - 1] = { ...n[currentSeat - 1], done: true }; return n; });
    if (currentSeat < numSeats) setCurrentSeat((s) => s + 1);
  }

  async function handleConfirm() {
    setProcessing(true);
    let method: PaymentMethod = billMode === "single" ? singleMethod : "SPLIT";
    let breakdown: { cashPaid?: number; cardPaid?: number; voucherPaid?: number; voucherCode?: string } = {};

    if (billMode === "single") {
      if (singleMethod === "CASH")  breakdown = { cashPaid: total };
      if (singleMethod === "CARD")  breakdown = { cardPaid: total };
      if (singleMethod === "SPLIT") breakdown = { cashPaid: splitCash, cardPaid: splitCard };
      if (singleMethod === "VOUCHER") {
        breakdown = {
          voucherPaid: voucherNum,
          voucherCode: voucherCode || undefined,
          ...((!voucherFull && voucherRemMethod === "CASH") ? { cashPaid: voucherRem } : {}),
          ...((!voucherFull && voucherRemMethod === "CARD") ? { cardPaid: voucherRem } : {}),
        };
      }
    } else {
      // Sum cash/card across all seat payments
      let totalCash = 0, totalCard = 0;
      seatPayments.forEach((sp, idx) => {
        const st = seatTotal(idx + 1);
        if (sp.method === "CASH") totalCash += st;
        else totalCard += st;
      });
      if (totalCash > 0) breakdown.cashPaid = parseFloat(totalCash.toFixed(2));
      if (totalCard > 0) breakdown.cardPaid  = parseFloat(totalCard.toFixed(2));
    }

    await onConfirm(method, discountNum, breakdown);
    setProcessing(false);
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true); setPromoMsg(null);
    const res = await fetch("/api/finance/promotions/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput.trim(), subtotal }),
    });
    const data = await res.json();
    if (res.ok) {
      setDiscountVal(data.discount.toFixed(2));
      setPromoMsg({ text: `${data.promo.name} — ${formatCurrency(data.discount)} applied`, ok: true });
    } else {
      setPromoMsg({ text: data.error ?? "Invalid code", ok: false });
    }
    setPromoLoading(false);
  }

  const canConfirm = !processing && (
    billMode === "single"
      ? (singleMethod === "CARD" ||
         (singleMethod === "CASH"    && cashNum >= total) ||
         (singleMethod === "SPLIT"   && !splitShort) ||
         (singleMethod === "VOUCHER" && voucherCanConfirm))
      : allSeatsDone
  );

  const confirmLabel = (() => {
    if (processing) return "Processing…";
    if (billMode === "single") {
      if (singleMethod === "CASH" && cashNum > 0 && !cashShort) return `Confirm — Change ${formatCurrency(cashChange)}`;
      if (singleMethod === "SPLIT" && splitOver) return `Confirm — Change ${formatCurrency(splitDiff)}`;
    }
    return `Confirm Payment — ${formatCurrency(total)}`;
  })();

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">

          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-white font-semibold text-lg">Payment</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          {/* Bill breakdown */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
            {/* Promo code row */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoMsg(null); }}
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    placeholder="Promo code"
                    className="w-full pl-7 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <button
                  onClick={applyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {promoLoading ? <Loader2 size={11} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {promoMsg && (
                <p className={cn("text-xs", promoMsg.ok ? "text-emerald-400" : "text-red-400")}>{promoMsg.text}</p>
              )}
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Discount ($)</span>
              <input type="number" min="0" step="0.01" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)}
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right text-sm" />
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold text-lg">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Bill mode tabs */}
          {phase === "setup" && (
            <div className="flex gap-1 mb-4 bg-gray-800 p-1 rounded-lg">
              {([
                { v: "single",  label: "Full Bill",     icon: ReceiptText },
                { v: "even",    label: "Split Evenly",  icon: Split       },
                { v: "byItem",  label: "By Item",       icon: Users       },
              ] as { v: BillMode; label: string; icon: React.ElementType }[]).map(({ v, label, icon: Icon }) => (
                <button key={v} onClick={() => setBillMode(v)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors",
                    billMode === v ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                  )}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
          )}

          {/* ── SINGLE mode ─────────────────────────────────────────── */}
          {billMode === "single" && (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {([
                  { value: "CASH",    label: "Cash",    icon: Banknote  },
                  { value: "CARD",    label: "Card",    icon: CreditCard },
                  { value: "SPLIT",   label: "Split",   icon: Split      },
                  { value: "VOUCHER", label: "Voucher", icon: Ticket     },
                ] as { value: PaymentMethod; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setSingleMethod(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-xs font-medium transition-colors",
                      singleMethod === value ? "border-orange-500 bg-orange-500/15 text-orange-400" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                    )}>
                    <Icon size={18} />{label}
                  </button>
                ))}
              </div>

              {/* CASH */}
              {singleMethod === "CASH" && (
                <CashPanel ref={cashInputRef} total={total} value={cashPaid} onChange={setCashPaid}
                  cashNum={cashNum} change={cashChange} short={cashShort} exact={cashExact} />
              )}

              {/* SPLIT cash+card */}
              {singleMethod === "SPLIT" && (
                <SplitPanel
                  cashRef={cashInputRef} total={total}
                  cashPaid={cashPaid} onCashChange={setCashPaid}
                  cardPaid={cardPaid} onCardChange={setCardPaid}
                  splitCash={splitCash} splitCard={splitCard}
                  remaining={-splitDiff} change={splitDiff} short={splitShort} over={splitOver}
                />
              )}

              {/* VOUCHER */}
              {singleMethod === "VOUCHER" && (
                <VoucherPanel
                  total={total}
                  code={voucherCode} onCodeChange={setVoucherCode}
                  amount={voucherAmount} onAmountChange={setVoucherAmount}
                  voucherNum={voucherNum} remaining={voucherRem} full={voucherFull}
                  remMethod={voucherRemMethod} onRemMethodChange={setVoucherRemMethod}
                  remCash={voucherRemCash} onRemCashChange={setVoucherRemCash}
                  remCashNum={voucherRemCashNum} remChange={voucherRemChange}
                  remShort={voucherRemShort} remExact={voucherRemExact}
                />
              )}
            </>
          )}

          {/* ── EVEN mode setup ──────────────────────────────────────── */}
          {billMode === "even" && phase === "setup" && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">Number of people</p>
                <div className="flex gap-2">
                  {[2,3,4,5,6].map((n) => (
                    <button key={n} onClick={() => setEvenCount(n)}
                      className={cn("w-10 h-10 rounded-lg border text-sm font-semibold transition-colors",
                        evenCount === n ? "border-orange-500 bg-orange-500/15 text-orange-400" : "border-gray-700 text-gray-400 hover:border-gray-600")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-gray-400 text-sm">Each person pays</span>
                <span className="text-white font-bold text-xl">{formatCurrency(total / evenCount)}</span>
              </div>
            </div>
          )}

          {/* ── BY ITEM mode setup ───────────────────────────────────── */}
          {billMode === "byItem" && phase === "setup" && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">Number of customers</p>
                <div className="flex gap-2">
                  {[2,3,4,5,6].map((n) => (
                    <button key={n} onClick={() => setByItemCount(n)}
                      className={cn("w-10 h-10 rounded-lg border text-sm font-semibold transition-colors",
                        byItemCount === n ? "border-orange-500 bg-orange-500/15 text-orange-400" : "border-gray-700 text-gray-400 hover:border-gray-600")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item assignment */}
              <div className="space-y-1.5">
                {items.map((item) => {
                  const seat = assignments[item.id] ?? 1;
                  return (
                    <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-gray-700/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">×{item.quantity} {item.menuItem.name}</p>
                        <p className="text-gray-500 text-[10px]">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: byItemCount }, (_, i) => i + 1).map((n) => (
                          <button key={n} onClick={() => setAssignments((p) => ({ ...p, [item.id]: n }))}
                            className={cn(
                              "w-7 h-7 rounded-lg border text-[11px] font-bold transition-colors",
                              seat === n ? SEAT_CLR[(n - 1) % SEAT_CLR.length] : "border-gray-700 text-gray-600 hover:border-gray-600 hover:text-gray-400"
                            )}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seat subtotals preview */}
              <div className="flex gap-2 flex-wrap pt-1">
                {Array.from({ length: byItemCount }, (_, i) => i + 1).map((n) => (
                  <div key={n} className={cn("flex-1 min-w-[80px] rounded-lg border px-2 py-1.5 text-center", SEAT_CLR[(n-1) % SEAT_CLR.length])}>
                    <p className="text-[10px] opacity-70">Cust. {n}</p>
                    <p className="text-sm font-bold">{formatCurrency(seatTotal(n))}</p>
                    <p className="text-[10px] opacity-60">{seatItems(n).length} item{seatItems(n).length !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SEAT PAYING FLOW (shared by even + byItem) ──────────── */}
          {(billMode === "even" || billMode === "byItem") && phase === "paying" && sp && (
            <div className="space-y-3 mb-4">
              {/* Progress */}
              <div className="flex gap-1.5">
                {seatPayments.map((s, i) => (
                  <div key={i} onClick={() => !s.done && setCurrentSeat(i + 1)}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-colors",
                      s.done ? "bg-emerald-500" : i + 1 === currentSeat ? "bg-orange-500" : "bg-gray-700"
                    )} />
                ))}
              </div>

              <div className={cn("rounded-lg border px-3 py-2 flex items-center justify-between", SEAT_CLR[(currentSeat - 1) % SEAT_CLR.length])}>
                <span className="font-semibold text-sm">{SEAT_LABEL[currentSeat - 1]}</span>
                <span className="font-bold text-lg">{formatCurrency(spTotal)}</span>
              </div>

              {/* Items for this seat (byItem only) */}
              {billMode === "byItem" && (
                <div className="bg-gray-800 rounded-lg px-3 py-2 space-y-1">
                  {seatItems(currentSeat).map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-400">
                      <span>×{item.quantity} {item.menuItem.name}</span>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Method toggle */}
              <div className="flex gap-2">
                {(["CASH", "CARD"] as SeatMethod[]).map((m) => (
                  <button key={m} onClick={() => updateSp("method", m)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                      sp.method === m ? "border-orange-500 bg-orange-500/15 text-orange-400" : "border-gray-700 text-gray-400 hover:border-gray-600"
                    )}>
                    {m === "CASH" ? <Banknote size={14} /> : <CreditCard size={14} />}{m === "CASH" ? "Cash" : "Card"}
                  </button>
                ))}
              </div>

              {/* Cash input for this seat */}
              {sp.method === "CASH" && (
                <div className="space-y-2">
                  <input ref={cashInputRef} type="number" min="0" step="0.01"
                    placeholder={spTotal.toFixed(2)} value={sp.cashPaid}
                    onChange={(e) => updateSp("cashPaid", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xl font-semibold text-right focus:outline-none focus:border-orange-500/60" />
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => updateSp("cashPaid", spTotal.toFixed(2))}
                      className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">Exact</button>
                    {quickAmounts(spTotal).map((amt) => (
                      <button key={amt} onClick={() => updateSp("cashPaid", String(amt))}
                        className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">${amt}</button>
                    ))}
                  </div>
                  {spCash > 0 && (
                    <div className={cn("rounded-lg px-4 py-2.5 flex justify-between items-center",
                      spShort ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/30")}>
                      <span className={cn("text-sm font-semibold", spShort ? "text-red-400" : "text-emerald-400")}>
                        {spShort ? "Short" : spExact ? "Exact" : "Change"}
                      </span>
                      <span className={cn("text-xl font-bold", spShort ? "text-red-400" : "text-emerald-300")}>
                        {spShort ? `−${formatCurrency(Math.abs(spChange))}` : formatCurrency(spChange)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mark seat as paid */}
              <button onClick={markSeatDone} disabled={!spCanPay}
                className={cn(
                  "w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2",
                  !spCanPay
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                )}>
                <Check size={15} />
                {sp.method === "CASH" && spCash > 0 && !spShort
                  ? `${SEAT_LABEL[currentSeat-1]} Paid — Change ${formatCurrency(spChange)}`
                  : `${SEAT_LABEL[currentSeat-1]} Paid`}
              </button>

              {/* Paid seats summary */}
              {seatPayments.some((s) => s.done) && (
                <div className="flex gap-2 flex-wrap">
                  {seatPayments.map((s, i) => s.done ? (
                    <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Check size={9} /> Cust. {i + 1}
                    </span>
                  ) : null)}
                </div>
              )}
            </div>
          )}

          {/* Start collecting button (split modes) */}
          {(billMode === "even" || billMode === "byItem") && phase === "setup" && (
            <button onClick={startCollecting}
              className="w-full mb-4 py-2.5 rounded-lg bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
              <Users size={15} />
              Start Collecting — {numSeats} customers
            </button>
          )}

          {/* Back link when in paying phase */}
          {phase === "paying" && (
            <button onClick={() => setPhase("setup")} className="text-xs text-gray-500 hover:text-gray-300 mb-3 transition-colors">
              ← Back to setup
            </button>
          )}

          {/* Confirm */}
          <button onClick={handleConfirm} disabled={!canConfirm}
            className={cn(
              "w-full py-3 rounded-lg font-semibold text-sm transition-colors",
              !canConfirm ? "bg-orange-500/30 text-white/30 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600"
            )}>
            {confirmLabel}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface VoucherPanelProps {
  total: number;
  code: string; onCodeChange: (v: string) => void;
  amount: string; onAmountChange: (v: string) => void;
  voucherNum: number; remaining: number; full: boolean;
  remMethod: "CASH" | "CARD"; onRemMethodChange: (m: "CASH" | "CARD") => void;
  remCash: string; onRemCashChange: (v: string) => void;
  remCashNum: number; remChange: number; remShort: boolean; remExact: boolean;
}
function VoucherPanel({
  total, code, onCodeChange, amount, onAmountChange,
  voucherNum, remaining, full,
  remMethod, onRemMethodChange, remCash, onRemCashChange,
  remCashNum, remChange, remShort, remExact,
}: VoucherPanelProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
      {/* Voucher code */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Voucher code (optional)</label>
        <input type="text" placeholder="e.g. PROMO-1234" value={code} onChange={(e) => onCodeChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60" />
      </div>

      {/* Voucher value */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Voucher value ($)</label>
        <input autoFocus type="number" min="0" step="0.01" placeholder={total.toFixed(2)} value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-xl font-semibold text-right focus:outline-none focus:border-orange-500/60" />
        <div className="flex gap-2 mt-2">
          <button onClick={() => onAmountChange(total.toFixed(2))}
            className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">Full amount</button>
          {[50, 100, 200].filter((v) => v < total).map((v) => (
            <button key={v} onClick={() => onAmountChange(String(v))}
              className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">${v}</button>
          ))}
        </div>
      </div>

      {/* Coverage result */}
      {voucherNum > 0 && (
        full ? (
          <div className="rounded-lg px-4 py-3 flex justify-between items-center bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-emerald-400 text-sm font-semibold">Fully Covered</span>
            <span className="text-emerald-300 text-xl font-bold">{formatCurrency(voucherNum)}</span>
          </div>
        ) : (
          <div className="rounded-lg px-4 py-2.5 flex justify-between items-center bg-amber-500/10 border border-amber-500/30">
            <div>
              <p className="text-amber-400 text-sm font-semibold">Remaining balance</p>
              <p className="text-amber-300/60 text-xs">Voucher covers {formatCurrency(voucherNum)}</p>
            </div>
            <span className="text-amber-300 text-xl font-bold">{formatCurrency(remaining)}</span>
          </div>
        )
      )}

      {/* Remainder payment (only when voucher is partial) */}
      {voucherNum > 0 && !full && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-400">Pay remaining {formatCurrency(remaining)} by</p>
          <div className="flex gap-2">
            {(["CASH", "CARD"] as const).map((m) => (
              <button key={m} onClick={() => onRemMethodChange(m)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                  remMethod === m ? "border-orange-500 bg-orange-500/15 text-orange-400" : "border-gray-700 text-gray-400 hover:border-gray-600"
                )}>
                {m === "CASH" ? <Banknote size={13} /> : <CreditCard size={13} />}
                {m === "CASH" ? "Cash" : "Card"}
              </button>
            ))}
          </div>

          {remMethod === "CASH" && (
            <div className="space-y-2">
              <input type="number" min="0" step="0.01" placeholder={remaining.toFixed(2)} value={remCash}
                onChange={(e) => onRemCashChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg font-semibold text-right focus:outline-none focus:border-orange-500/60" />
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => onRemCashChange(remaining.toFixed(2))}
                  className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">Exact</button>
                {quickAmounts(remaining).map((amt) => (
                  <button key={amt} onClick={() => onRemCashChange(String(amt))}
                    className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">${amt}</button>
                ))}
              </div>
              {remCashNum > 0 && (
                <div className={cn("rounded-lg px-4 py-2.5 flex justify-between items-center",
                  remShort ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/30")}>
                  <span className={cn("text-sm font-semibold", remShort ? "text-red-400" : "text-emerald-400")}>
                    {remShort ? "Short" : remExact ? "Exact" : "Change"}
                  </span>
                  <span className={cn("text-xl font-bold", remShort ? "text-red-400" : "text-emerald-300")}>
                    {remShort ? `−${formatCurrency(Math.abs(remChange))}` : formatCurrency(remChange)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CashPanelProps {
  total: number; value: string; onChange: (v: string) => void;
  cashNum: number; change: number; short: boolean; exact: boolean;
}
const CashPanel = function CashPanel({ total, value, onChange, cashNum, change, short, exact }: CashPanelProps, ref: React.Ref<HTMLInputElement>) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Cash received ($)</label>
        <input ref={ref} type="number" min="0" step="0.01" placeholder={total.toFixed(2)} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-xl font-semibold text-right focus:outline-none focus:border-orange-500/60" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onChange(total.toFixed(2))}
          className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">Exact</button>
        {quickAmounts(total).map((amt) => (
          <button key={amt} onClick={() => onChange(String(amt))}
            className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">${amt}</button>
        ))}
      </div>
      {cashNum > 0 && (
        <div className={cn("rounded-lg px-4 py-3 flex justify-between items-center",
          short ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/30")}>
          <span className={cn("text-sm font-semibold", short ? "text-red-400" : "text-emerald-400")}>
            {short ? "Short" : exact ? "Exact" : "Change"}
          </span>
          <span className={cn("text-2xl font-bold", short ? "text-red-400" : "text-emerald-300")}>
            {short ? `−${formatCurrency(Math.abs(change))}` : formatCurrency(change)}
          </span>
        </div>
      )}
    </div>
  );
} as unknown as (props: CashPanelProps & { ref?: React.Ref<HTMLInputElement> }) => React.ReactElement;

interface SplitPanelProps {
  cashRef: React.Ref<HTMLInputElement>; total: number;
  cashPaid: string; onCashChange: (v: string) => void;
  cardPaid: string; onCardChange: (v: string) => void;
  splitCash: number; splitCard: number;
  remaining: number; change: number; short: boolean; over: boolean;
}
function SplitPanel({ cashRef, total, cashPaid, onCashChange, cardPaid, onCardChange, splitCash, splitCard, remaining, change, short, over }: SplitPanelProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5"><Banknote size={13} className="text-yellow-400" /><label className="text-xs text-gray-400">Cash ($)</label></div>
        <input ref={cashRef} type="number" min="0" step="0.01" placeholder="0.00" value={cashPaid} onChange={(e) => onCashChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg font-semibold text-right focus:outline-none focus:border-yellow-500/60" />
        <div className="flex gap-2 flex-wrap mt-2">
          {[10,20,50,100].filter((v) => v <= total).map((amt) => (
            <button key={amt} onClick={() => onCashChange(String(amt))}
              className="px-2.5 py-1 rounded bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors">${amt}</button>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-700" />
      <div>
        <div className="flex items-center gap-2 mb-1.5"><CreditCard size={13} className="text-sky-400" /><label className="text-xs text-gray-400">Card ($)</label></div>
        <input type="number" min="0" step="0.01" placeholder="0.00" value={cardPaid} onChange={(e) => onCardChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-lg font-semibold text-right focus:outline-none focus:border-sky-500/60" />
      </div>
      <div className={cn("rounded-lg px-3 py-2.5 space-y-1.5 text-sm border",
        short ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30")}>
        <div className="flex justify-between text-gray-400">
          <span className="flex items-center gap-1"><Banknote size={11} />Cash</span><span>{formatCurrency(splitCash)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span className="flex items-center gap-1"><CreditCard size={11} />Card</span><span>{formatCurrency(splitCard)}</span>
        </div>
        <div className={cn("border-t pt-1.5 flex justify-between font-semibold", short ? "border-red-500/30" : "border-emerald-500/30")}>
          <span className={short ? "text-red-400" : "text-emerald-400"}>{short ? "Remaining" : over ? "Change" : "Exact"}</span>
          <span className={cn("text-lg font-bold", short ? "text-red-400" : "text-emerald-300")}>
            {short ? formatCurrency(remaining) : over ? formatCurrency(change) : "✓"}
          </span>
        </div>
      </div>
    </div>
  );
}
