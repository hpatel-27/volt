import { useParams, Link } from "react-router";
import { Card } from "../components/ui/Card";

const exercises = [
  { name: "Barbell Bench Press", scheme: "4 × 6–8 · 90s rest" },
  { name: "Overhead Press", scheme: "4 × 8 · 90s rest" },
  { name: "Incline DB Press", scheme: "3 × 10–12" },
  { name: "Cable Lateral Raise", scheme: "4 × 12–15" },
];

const days = ["Push", "Pull", "Legs", "Upper"];

export default function WorkoutPlan() {
  const { planId } = useParams();
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link to="/app/workouts" className="text-bone-300">←</Link>
        <div className="flex-1">
          <div className="text-caption">Editing plan</div>
          <h1 className="font-display text-lg font-bold">{planId}</h1>
        </div>
        <span className="text-volt-500 text-xs font-semibold uppercase tracking-wider">Saved</span>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {days.map((d, i) => (
          <span
            key={d}
            className={
              "shrink-0 px-3 py-1.5 rounded-full text-xs " +
              (i === 0 ? "bg-volt-500 text-ink-950 font-bold" : "bg-ink-800 text-bone-300 font-medium")
            }
          >{d}</span>
        ))}
        <span className="shrink-0 px-3 py-1.5 rounded-full bg-ink-800 text-bone-500 text-xs font-medium">+ Day</span>
      </div>

      <div className="space-y-3">
        {exercises.map((ex) => (
          <Card key={ex.name} className="flex items-center gap-3 p-4">
            <span className="text-bone-500 text-xs font-mono">⋮⋮</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">{ex.name}</div>
              <div className="text-xs text-bone-500 font-mono mt-0.5">{ex.scheme}</div>
            </div>
            <button className="text-bone-500 text-lg">⋯</button>
          </Card>
        ))}
        <button className="w-full h-12 rounded-2xl border border-dashed border-white/15 text-bone-300 text-sm font-medium hover:bg-ink-900">
          + Add exercise
        </button>
      </div>
    </div>
  );
}
