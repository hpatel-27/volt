import type { ReactNode } from "react";
import { GridBackdrop } from "../marketing/GridBackdrop";

const domains = ["STRENGTH", "NUTRITION", "BODYWEIGHT"];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-ink-950 text-bone-50 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 p-12 lg:flex">
        <GridBackdrop glow="volt" />
        <div className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-volt-500/40 to-transparent" />

        <div className="relative flex items-center gap-2">
          <img
            src="/thunder.svg"
            alt="Volt logo — lightning bolt"
            className="h-7 w-7"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            VOLT
          </span>
        </div>

        <div className="relative">
          <div className="mb-6 font-mono text-xs tracking-[0.3em] text-bone-500">
            // TRAINING LOG
          </div>
          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight">
            Train hard.
            <br />
            <span className="text-volt-500">Track the work.</span>
          </h1>
          <p className="mt-6 max-w-md text-bone-300">
            Your lifts, meals, and bodyweight, written down. So progress isn't a
            guess.
          </p>
        </div>

        <div className="relative flex items-center justify-between font-mono text-[11px] tracking-wider text-bone-600">
          <span>{domains.join("  ·  ")}</span>
          <span>&copy; HARSH PATEL</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
