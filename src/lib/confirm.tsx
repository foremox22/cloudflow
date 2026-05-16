"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

export type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  const confirm: ConfirmFn = useCallback(
    (message, options = {}) =>
      new Promise<boolean>((resolve) => setReq({ message, ...options, resolve })),
    []
  );

  function respond(value: boolean) {
    req?.resolve(value);
    setReq(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4",
              req.variant === "danger" ? "bg-red-500/15" : "bg-amber-500/15"
            )}>
              {req.variant === "danger"
                ? <Trash2 size={22} className="text-red-400" />
                : <AlertTriangle size={22} className="text-amber-400" />}
            </div>
            <h2 className="text-white font-semibold text-center mb-2">
              {req.title ?? "Are you sure?"}
            </h2>
            <p className="text-gray-400 text-sm text-center leading-relaxed mb-6">
              {req.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => respond(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                {req.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => respond(true)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors",
                  req.variant === "danger"
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-amber-500 hover:bg-amber-400"
                )}
              >
                {req.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
