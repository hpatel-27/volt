import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "volt" | "blaze" | "sky" | "neutral";

const tones: Record<Tone, string> = {
  volt: "bg-volt-500/10 text-volt-500 border-volt-500/20",
  blaze: "bg-blaze-500/10 text-blaze-400 border-blaze-500/20",
  sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  neutral: "bg-ink-800 text-bone-300 border-white/5",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border",
        "text-[11px] font-semibold tracking-wide uppercase",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
