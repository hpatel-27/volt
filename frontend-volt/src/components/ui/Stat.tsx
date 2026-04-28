import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; tone?: "good" | "bad" | "neutral" };
  accent?: "volt" | "blaze" | "sky" | "bone";
  size?: "md" | "lg" | "display";
}

const accentColor = {
  volt: "text-volt-500",
  blaze: "text-blaze-500",
  sky: "text-sky-500",
  bone: "text-bone-50",
};

const sizeClass = {
  md: "text-stat",
  lg: "text-4xl font-bold tracking-tight",
  display: "text-display",
};

export function Stat({
  label,
  value,
  unit,
  delta,
  accent = "bone",
  size = "md",
}: StatProps) {
  const deltaColor =
    delta?.tone === "good"
      ? "text-volt-500"
      : delta?.tone === "bad"
        ? "text-blaze-500"
        : "text-bone-300";
  const arrow =
    delta?.direction === "up" ? "▲" : delta?.direction === "down" ? "▼" : "▬";

  return (
    <div className="flex flex-col gap-2">
      <div className="text-caption">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={cn(sizeClass[size], accentColor[accent], "font-display")}>
          {value}
        </span>
        {unit && <span className="text-bone-500 text-sm font-medium">{unit}</span>}
      </div>
      {delta && (
        <div className={cn("text-xs font-medium flex items-center gap-1", deltaColor)}>
          <span>{arrow}</span>
          <span>{delta.value}</span>
        </div>
      )}
    </div>
  );
}
