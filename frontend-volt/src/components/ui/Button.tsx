import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "danger" | "ghost" | "outline" | "sky";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-volt-500 text-ink-950 hover:bg-volt-400 active:bg-volt-600 font-semibold cursor-pointer",
  danger:
    "bg-blaze-500 text-bone-50 hover:bg-blaze-600 active:bg-blaze-700 font-semibold cursor-pointer",
  sky: "bg-sky-500 text-ink-950 hover:bg-sky-600 active:bg-sky-700 font-semibold cursor-pointer",
  ghost:
    "bg-transparent text-bone-200 hover:bg-ink-800 active:bg-ink-700 cursor-pointer",
  outline:
    "bg-transparent text-bone-50 border border-white/10 hover:bg-ink-800 hover:border-white/20 cursor-pointer",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-13 px-6 text-base rounded-2xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center transition-colors leading-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-500/60",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
