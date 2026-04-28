import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  inset?: boolean;
  accent?: "volt" | "blaze" | "sky";
  children: ReactNode;
}

const accentBar: Record<NonNullable<CardProps["accent"]>, string> = {
  volt: "before:bg-volt-500",
  blaze: "before:bg-blaze-500",
  sky: "before:bg-sky-500",
};

export function Card({
  interactive,
  inset,
  accent,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "relative rounded-2xl border border-white/5 p-5",
        inset ? "bg-ink-850" : "bg-ink-900",
        interactive &&
          "transition-colors hover:bg-ink-850 hover:border-white/10 cursor-pointer",
        accent &&
          cn(
            "before:absolute before:left-0 before:top-5 before:bottom-5 before:w-1 before:rounded-full",
            accentBar[accent],
          ),
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        {caption && <div className="text-caption mb-1">{caption}</div>}
        <h3 className="text-base font-semibold text-bone-50">{title}</h3>
      </div>
      {action}
    </div>
  );
}
