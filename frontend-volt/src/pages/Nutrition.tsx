import { Link } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const today = { id: "today", date: "Today · Apr 26", kcal: 1558, target: 2400 };
const past = [
  { id: "2026-04-25", date: "Yesterday", kcal: 2310 },
  { id: "2026-04-24", date: "Apr 24", kcal: 2204 },
  { id: "2026-04-23", date: "Apr 23", kcal: 2502 },
];

export default function Nutrition() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-caption">{today.date}</div>
          <h1 className="font-display text-2xl font-bold">Nutrition</h1>
        </div>
        <Button variant="sky" size="sm">+ Meal</Button>
      </header>

      <Link to={`/app/nutrition/${today.id}`}>
        <Card interactive accent="sky" className="border-sky-500/20">
          <div className="text-caption mb-2">Today</div>
          <div className="flex items-baseline gap-2">
            <span className="text-stat font-display text-sky-500">{today.kcal}</span>
            <span className="text-bone-500 text-xs">/ {today.target} kcal</span>
          </div>
        </Card>
      </Link>

      <div className="text-caption">Past 6 days</div>
      <div className="space-y-2">
        {past.map((d) => (
          <Link key={d.id} to={`/app/nutrition/${d.id}`}>
            <Card interactive className="flex items-center justify-between p-4">
              <div className="text-sm font-semibold">{d.date}</div>
              <div className="font-mono text-sm">{d.kcal} kcal</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
