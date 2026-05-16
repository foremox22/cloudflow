"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-md", className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full p-4",
            maxWidth
          )}
        >
          <div className={cn("bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl", className)}>
            {title && (
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-white font-semibold text-base">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
