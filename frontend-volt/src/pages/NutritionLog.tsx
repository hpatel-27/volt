import { useParams, Link } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const meals = [
  {
    type: "Breakfast",
    name: "Eggs, oats, banana",
    p: 32,
    c: 58,
    f: 14,
    kcal: 512,
    icon: "🥚",
    tone: "sky" as const,
  },
  {
    type: "Lunch",
    name: "Chicken, rice, broccoli",
    p: 55,
    c: 72,
    f: 12,
    kcal: 624,
    icon: "🍗",
    tone: "volt" as const,
  },
  {
    type: "Snack",
    name: "Greek yogurt + almonds",
    p: 28,
    c: 18,
    f: 18,
    kcal: 328,
    icon: "🥜",
    tone: "blaze" as const,
  },
];

const toneBg = {
  sky: "bg-sky-500/10 text-sky-500",
  volt: "bg-volt-500/10 text-volt-500",
  blaze: "bg-blaze-500/10 text-blaze-400",
};

export default function NutritionLog() {
  const { logId } = useParams();
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link to="/app/nutrition" className="text-bone-300">
          ←
        </Link>
        <h1 className="flex-1 font-display text-lg font-bold">{logId}</h1>
        <Button variant="sky" size="sm">
          + Meal
        </Button>
      </header>

      <Card className="bg-linear-to-br from-sky-500/15 via-ink-900 to-ink-900 border-sky-500/20 flex items-center gap-5">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="white"
              strokeOpacity="0.08"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--color-sky-500)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="212 327"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-bone-500 font-semibold">
              Left
            </span>
            <span className="font-display text-2xl font-bold text-sky-400">
              842
            </span>
            <span className="text-[10px] text-bone-500 font-mono">/ 2,400</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {[
            { label: "Protein", v: "142 / 180g", w: 78, color: "bg-volt-500" },
            { label: "Carbs", v: "160 / 240g", w: 66, color: "bg-sky-500" },
            { label: "Fat", v: "52 / 70g", w: 74, color: "bg-blaze-500" },
          ].map((m) => (
            <div key={m.label}>
              <div className="flex justify-between mb-1">
                <span className="text-caption">{m.label}</span>
                <span className="text-xs font-mono">{m.v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                <div
                  className={`h-full ${m.color}`}
                  style={{ width: `${m.w}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {meals.map((m) => (
        <div key={m.type}>
          <div className="text-caption mb-1">{m.type}</div>
          <Card className="flex items-center gap-3 p-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneBg[m.tone]}`}
            >
              {m.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="text-xs text-bone-500 font-mono mt-0.5">
                P {m.p} · C {m.c} · F {m.f}
              </div>
            </div>
            <div className="font-mono text-sm font-semibold">{m.kcal}</div>
          </Card>
        </div>
      ))}
    </div>
  );
}
