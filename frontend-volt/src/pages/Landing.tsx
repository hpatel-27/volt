import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";
import { Button } from "../components/ui/Button";
import { GridBackdrop } from "../components/marketing/GridBackdrop";
import { useMounted } from "../lib/useMounted";
import { useCountUp } from "../lib/useCountUp";

const features = [
  {
    index: "01",
    label: "Volume",
    accent: "volt",
    title: "Built to keep up between sets.",
    body: "Plans, sets, reps, and weight. Logged in the moment, not from memory.",
  },
  {
    index: "02",
    label: "Macros",
    accent: "sky",
    title: "Macros without the spreadsheet.",
    body: "Protein, carbs, and fat. Counted per meal, summed for the day.",
  },
  {
    index: "03",
    label: "Progress",
    accent: "blaze",
    title: "An honest view of your progress.",
    body: "Trendlines you can actually read.",
  },
];

const accentText: Record<string, string> = {
  volt: "text-volt-500",
  sky: "text-sky-500",
  blaze: "text-blaze-500",
};

// const accentBar: Record<string, string> = {
//   volt: "bg-volt-500",
//   sky: "bg-sky-500",
//   blaze: "bg-blaze-500",
// };

/** A faux dashboard tile — previews the real app UI, with sample numbers. */
function PreviewReadout() {
  const volumeRef = useCountUp<HTMLSpanElement>(12480);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/5 bg-ink-900/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-caption">Today</span>
        <span className="font-mono text-[11px] tracking-wider text-bone-600">
          PREVIEW
        </span>
      </div>

      <div className="mt-5">
        <div className="text-caption mb-1 text-bone-500">Total volume</div>
        <div className="flex items-baseline gap-2">
          <span
            ref={volumeRef}
            className="text-display text-volt-500 tabular-nums"
          >
            0
          </span>
          <span className="font-mono text-sm text-bone-500">lbs</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 font-mono">
        <div className="bg-ink-900 p-4">
          <div className="text-[11px] tracking-wider text-bone-600">KCAL</div>
          <div className="mt-1 text-lg text-sky-500 tabular-nums">2,140</div>
        </div>
        <div className="bg-ink-900 p-4">
          <div className="text-[11px] tracking-wider text-bone-600">WEIGHT</div>
          <div className="mt-1 text-lg text-blaze-500 tabular-nums">163.9</div>
        </div>
      </div>
    </div>
  );
}

const Landing = () => {
  const mounted = useMounted();

  // Staggered entrance: shared transition class + per-element delay via style.
  const enterCls = `transition-all duration-700 ease-out ${
    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`;

  return (
    <div className="min-h-dvh bg-ink-950 text-bone-50">
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <div className="relative overflow-hidden rounded-none bg-ink-950 md:m-6 md:rounded-3xl md:border md:border-white/5">
          <GridBackdrop glow="volt" />

          {/* Hero */}
          <section className="relative px-6 py-12 md:px-16">
            <nav className="relative mb-16 flex items-center justify-between md:mb-24">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <img
                    src="/thunder.svg"
                    alt="Volt logo - lightning bolt"
                    className="h-7 w-7"
                  />
                  <span className="font-display text-xl font-bold tracking-tight">
                    VOLT
                  </span>
                </div>
                <span className="hidden items-center gap-2 font-mono text-[11px] tracking-wider text-bone-500 sm:flex">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-volt-500" />
                  </span>
                  <p className="mt-0.75">SYSTEM ONLINE</p>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            </nav>

            <div className="relative grid items-end gap-12 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl">
                <div
                  className={`mb-6 font-mono text-xs tracking-[0.3em] text-bone-500 ${enterCls}`}
                >
                  STRENGTH · NUTRITION · BODYWEIGHT
                </div>
                <h1
                  className={`font-display font-bold leading-[0.9] tracking-tight ${enterCls}`}
                  style={{
                    fontSize: "clamp(3rem, 9vw, 7rem)",
                    transitionDelay: "80ms",
                  }}
                >
                  TRAIN.
                  <br />
                  EAT.
                  <br />
                  <span className="text-volt-500">TRACK.</span>
                </h1>
                <p
                  className={`mt-8 max-w-xl text-lg text-bone-300 ${enterCls}`}
                  style={{ transitionDelay: "160ms" }}
                >
                  Every set, every meal, every weigh-in, in one log.
                </p>
                <div
                  className={`mt-10 flex flex-wrap gap-3 ${enterCls}`}
                  style={{ transitionDelay: "240ms" }}
                >
                  <Link to="/register">
                    <Button size="lg">Start logging</Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">
                      Sign in
                    </Button>
                  </Link>
                </div>
              </div>

              <div className={enterCls} style={{ transitionDelay: "320ms" }}>
                <PreviewReadout />
              </div>
            </div>
          </section>

          {/* Feature readout — numbered hairline rows, one accent each */}
          <section className="relative mt-8 border-t border-white/5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group relative grid grid-cols-[auto_1fr] items-baseline gap-x-6 px-6 py-8 md:grid-cols-[auto_9rem_1fr] md:px-16 ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <span
                  className={`font-mono text-sm tabular-nums ${accentText[feature.accent]}`}
                >
                  {feature.index}
                </span>
                <span className="hidden font-mono text-[11px] uppercase tracking-wider text-bone-500 md:block">
                  {feature.label}
                </span>
                <div className="col-span-1 max-w-xl md:col-auto">
                  <h3 className="font-display text-2xl font-bold">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-bone-300">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-8 font-mono text-[11px] tracking-wider text-bone-600 md:px-12">
          <span>VOLT · TRAINING LOG</span>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-bone-300">
              PRIVACY
            </Link>
            <Link to="/terms" className="hover:text-bone-300">
              TERMS
            </Link>
            <span>&copy; HARSH PATEL</span>
          </div>
        </footer>
      </SignedOut>
    </div>
  );
};

export default Landing;
