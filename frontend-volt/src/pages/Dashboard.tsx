import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";

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
      <header className="flex items-center justify-between">
        <div>
          <div className="text-caption">Saturday, Apr 26</div>
          <h1 className="font-display text-2xl font-bold">Hey, Harsh</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-ink-700" />
      </header>

      {/* TODO(human): Today's workout hero card.
          Mockup reference: mockups.html, "Dashboard" phone, the volt-gradient card.
          Use `today` mock data above. Should visually dominate the screen and have a
          clear "Start →" affordance that links to /app/log. */}

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
                (h === 80 ? "bg-volt-500" : i === 6 ? "bg-ink-800 border border-dashed border-white/10" : "bg-ink-700")
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
