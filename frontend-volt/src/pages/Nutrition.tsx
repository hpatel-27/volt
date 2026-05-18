import { Link } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useNutritionLogs } from "@/api/nutrition";
import { useState } from "react";
import { formatVerboseDate, todayLocalIso } from "@/lib/date";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const today = { id: "today", date: "Today · Apr 26", kcal: 1558, target: 2500 };
const past = [
  { id: "2026-04-25", date: "Yesterday", kcal: 2310 },
  { id: "2026-04-24", date: "Apr 24", kcal: 2204 },
  { id: "2026-04-23", date: "Apr 23", kcal: 2502 },
];

export default function Nutrition() {
  const LIMIT = 10;

  const [page, setPage] = useState(1);
  const pageQuery = useNutritionLogs({ page, limit: LIMIT });
  const totalPages =
    pageQuery.data?.total !== undefined &&
    pageQuery.data?.limit !== undefined &&
    pageQuery.data?.total !== 0
      ? Math.ceil(pageQuery.data?.total / pageQuery.data?.limit)
      : 1;

  return (
    <div className="space-y-4 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-caption">
            Today · {formatVerboseDate(todayLocalIso())}
          </div>
          <h1 className="font-display text-2xl font-bold">Nutrition</h1>
        </div>
        <Button
          variant="sky"
          size="sm"
          className="cursor-pointer active:bg-sky-700"
        >
          <Plus className="w-5 h-5" /> <span>Meal</span>
        </Button>
      </header>

      <Link to={`/nutrition/${today.id}`}>
        <Card interactive accent="sky" className="border-sky-500/20">
          <div className="text-caption mb-2">Today</div>
          <div className="flex items-baseline gap-2">
            <span className="text-stat font-display text-sky-500">
              {today.kcal}
            </span>
            <span className="text-bone-500 text-xs">/ {today.target} kcal</span>
          </div>
        </Card>
      </Link>

      {/* <div className="text-caption">Past 6 days</div> */}
      <div className="space-y-2 pt-6">
        <span className="text-caption">Other Entries</span>
        {past.map((d) => (
          <Link key={d.id} to={`/nutrition/${d.id}`}>
            <Card
              interactive
              className="flex items-center justify-between p-4 mt-2"
            >
              <div className="text-sm font-semibold">{d.date}</div>
              <div className="font-mono text-sm">{d.kcal} kcal</div>
            </Card>
          </Link>
        ))}
        <div className="flex pt-6 justify-center gap-2">
          <Button
            size="sm"
            variant="sky"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="hover:text-ink-950 hover:font-semibold active:bg-sky-700 cursor-pointer transition"
          >
            <ChevronLeft />
            Prev
          </Button>
          <Button
            size="sm"
            variant="sky"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="hover:text-ink-950 hover:font-semibold active:bg-sky-700 cursor-pointer transition"
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
