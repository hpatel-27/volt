import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";
import { Link } from "react-router";

const today = {
  day: "Push Day",
  exerciseCount: 5,
  preview: "Bench, OHP, Dips",
  estMinutes: 52,
};

const recentPR = {
  exercise: "Bench Press",
  weight: 235,
  delta: "+10 lbs from last attempt",
  ago: "2 days ago",
};

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <header>
        <div className="text-caption">Saturday, Apr 26</div>
        <h1 className="font-display text-2xl font-bold">Hey, Harsh</h1>
      </header>

      <Link to="/log" className="block">
        <div className="rounded-2xl bg-linear-to-br from-volt-500 to-volt-600 text-ink-950 p-5 hover:from-volt-600 hover:to-volt-600 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Today · {today.day}
            </span>
            <span className="text-[11px] font-semibold opacity-70">
              {today.exerciseCount} exercises
            </span>
          </div>
          <div className="font-display text-3xl font-bold">{today.preview}</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80">
              ≈ {today.estMinutes} min
            </span>
            <span className="bg-ink-950 text-volt-500 font-semibold rounded-xl h-9 px-4 text-sm inline-flex items-center cursor-pointer">
              Start →
            </span>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Stat
            label="Calories left"
            value="842"
            unit="/ 2,400"
            accent="sky"
            size="lg"
          />
          <div className="mt-3 h-1.5 rounded-full bg-ink-800 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: "65%" }} />
          </div>
        </Card>
        <Card>
          <Stat
            label="Weight · 7d"
            value="182.4"
            unit="lbs"
            size="lg"
            delta={{ value: "1.2 lbs", direction: "down", tone: "good" }}
          />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-caption">Weekly volume</span>
          <span className="text-xs text-bone-300 font-medium">42,810 lbs</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {[30, 55, 40, 80, 60, 70, 20].map((h, i) => (
            <div
              key={i}
              className={
                "flex-1 rounded-md " +
                (h === 80
                  ? "bg-volt-500"
                  : i === 6
                    ? "bg-ink-800 border border-dashed border-white/10"
                    : "bg-ink-700")
              }
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-bone-500 font-medium">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </Card>

      <Card accent="blaze" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blaze-500/10 flex items-center justify-center text-blaze-500 font-bold">
          PR
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">
            {recentPR.exercise} · {recentPR.weight} lbs
          </div>
          <div className="text-xs text-bone-500">
            {recentPR.delta} · {recentPR.ago}
          </div>
        </div>
      </Card>
    </div>
  );
}
