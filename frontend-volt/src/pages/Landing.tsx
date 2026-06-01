import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";
import { Button } from "../components/ui/Button";
import { Zap, Activity, TrendingUp } from "lucide-react";
// Real totals pulled from the API once endpoints exist
// const stats = [
//   { label: "Total volume tracked", value: "—", accent: "text-volt-500" },
//   { label: "PRs broken this week", value: "—", accent: "text-bone-50" },
//   { label: "Macros logged daily", value: "—", accent: "text-sky-500" },
// ];

const features = [
  {
    icon: <Zap className="w-7 h-7" />,
    accent: "volt",
    title: "Logging that keeps up with you.",
    body: "Log workouts with ease. Track your progress over time.",
  },
  {
    icon: <Activity className="w-7 h-7" />,
    accent: "sky",
    title: "Macros without the spreadsheet.",
    body: "Protein, carbs, and fat. Tracked per meal, summed per day.",
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
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

const Landing = () => {
  return (
    <div className="min-h-dvh bg-ink-950 text-bone-50">
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <div className="rounded-none md:rounded-3xl md:m-6 bg-ink-950 md:border md:border-white/5 overflow-hidden relative">
          {/* Hero */}
          <section className="relative px-6 md:px-16 py-12 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-volt-500/6 to-transparent pointer-events-none" />

            <nav className="relative flex items-center justify-between mb-16 md:mb-20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                  <span className="text-ink-950 font-black">
                    <img src="/thunder.svg" alt="Volt Logo - lightning bolt" />
                  </span>
                </div>
                <span className="font-display font-bold text-xl tracking-tight">
                  VOLT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="cursor-pointer">
                    Get started
                  </Button>
                </Link>
              </div>
            </nav>

            <div className="relative max-w-3xl">
              <h1
                className="font-display font-bold tracking-tight leading-[0.9]"
                style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
              >
                TRAIN.
                <br />
                EAT.
                <br />
                <span className="text-volt-500">TRACK.</span>
              </h1>
              <p className="mt-8 text-lg text-bone-300 max-w-xl">
                The training log for tracking lifts, macros, and bodyweight in
                one place.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button size="lg" className="cursor-pointer">
                    Start training free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="cursor-pointer"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Stat band */}
          {/* <section className="grid grid-cols-1 md:grid-cols-3 border-y border-white/5">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-8 ${
                  i < stats.length - 1
                    ? "md:border-r border-b md:border-b-0 border-white/5"
                    : ""
                }`}
              >
                <div className="text-caption mb-2">{stat.label}</div>
                <div className={`text-stat ${stat.accent}`}>{stat.value}</div>
              </div>
            ))}
          </section> */}

          {/* Feature blocks */}
          <section className="grid md:grid-cols-3 gap-px border-t border-white/5 bg-white/5">
            {features.map((feature) => (
              <div key={feature.title} className="bg-ink-950 p-10">
                <span className={`${accentText[feature.accent]} mb-6 block`}>
                  {feature.icon}
                </span>
                <h3 className="font-display text-2xl font-bold mb-2">
                  {feature.title}
                </h3>
                <p className="text-bone-300 text-sm leading-relaxed">
                  {feature.body}
                </p>
              </div>
            ))}
          </section>
        </div>

        <footer className="text-caption text-center py-8">
          &copy; Harsh Patel. All rights reserved.
        </footer>
      </SignedOut>
    </div>
  );
};

export default Landing;
