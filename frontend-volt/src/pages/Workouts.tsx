import { Link } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const plans = [
  { id: "ppl-hyp", title: "PPL · Hypertrophy Block", state: "Active" as const, meta: "5 days/wk", sub: "6 weeks · week 3 of 6", progress: 50 },
  { id: "531-bbb", title: "5/3/1 BBB", state: "Archived" as const, meta: "4 days/wk", sub: "Last performed · Mar 12" },
  { id: "summer-cut", title: "Summer Cut Plan", state: "Draft" as const, meta: "3 days/wk", sub: "No exercises yet" },
];

export default function Workouts() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Plans</h1>
        <Button size="sm">+ New</Button>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {["All", "Strength", "Hypertrophy", "Cut"].map((t, i) => (
          <span
            key={t}
            className={
              "shrink-0 px-3 py-1.5 rounded-full text-xs " +
              (i === 0 ? "bg-ink-800 font-semibold" : "text-bone-300 font-medium")
            }
          >
            {t}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <Link key={plan.id} to={`/app/workouts/${plan.id}`}>
            <Card
              interactive
              accent={plan.state === "Active" ? "volt" : undefined}
              className={plan.state === "Active" ? "border-volt-500/30" : ""}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={
                  "text-[10px] font-bold tracking-widest uppercase " +
                  (plan.state === "Active" ? "text-volt-500" : "text-bone-500")
                }>{plan.state}</span>
                <span className="text-[10px] text-bone-500">{plan.meta}</span>
              </div>
              <div className="font-display text-xl font-bold">{plan.title}</div>
              <div className="text-xs text-bone-500 mt-1">{plan.sub}</div>
              {plan.progress !== undefined && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <div className="h-full bg-volt-500" style={{ width: `${plan.progress}%` }} />
                  </div>
                  <span className="text-xs font-mono text-bone-300">{plan.progress}%</span>
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
