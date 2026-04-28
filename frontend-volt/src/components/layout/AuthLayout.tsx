import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-ink-950 text-bone-50">
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        <div
          className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--color-volt-500), transparent 70%)" }}
        />
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-volt-500 flex items-center justify-center">
            <span className="text-ink-950 font-black text-lg">V</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">VOLT</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight">
            Train hard.<br />
            <span className="text-volt-500">Track everything.</span>
          </h1>
          <p className="mt-6 text-bone-300 max-w-md">
            The training log built for athletes who care about the numbers.
          </p>
        </div>
        <div className="relative text-caption">© Volt</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
