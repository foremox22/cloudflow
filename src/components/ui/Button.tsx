import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<string, string> = {
  primary:   "bg-orange-500 hover:bg-orange-600 text-white",
  secondary: "border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white",
  ghost:     "text-gray-400 hover:bg-gray-800 hover:text-white",
  danger:    "bg-red-600 hover:bg-red-500 text-white",
  warning:   "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
