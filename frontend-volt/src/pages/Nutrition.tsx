import { Link } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useNutritionLogs, useNutritionRange } from "@/api/nutrition";
import { useState } from "react";
import { formatVerboseDate, todayLocalIso } from "@/lib/date";
import { ChevronLeft, ChevronRight, Plus, Utensils } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

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
  const todayIso = todayLocalIso();
  // Workout to get summarized nutrition data for a dynamic "today"
  // Currently i haven't gotten around to updating the API to return
  // a summary of the meals for a day instead of all the actual meals
  // but that will make it easy to display the calories info for the
  // index nutrition page
  const todayQuery = useNutritionRange({ from: todayIso, to: todayIso });
  console.log(todayQuery.data);
  return (
    <div className="space-y-4 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-caption">
            Today · {formatVerboseDate(todayIso)}
          </div>
          <h1 className="font-display text-2xl font-bold">Nutrition</h1>
        </div>
        <Button
          variant="sky"
          size="sm"
          className="cursor-pointer active:bg-sky-700"
          onClick={() => console.log("clicked main meal log button")}
        >
          <Plus className="w-4 h-4 shrink-0 translate-y-px" />
          <span className="">Meal</span>
        </Button>
      </header>

      <Link to={`/nutrition/${todayIso}`}>
        <Card interactive accent="sky" className="border-sky-500/20">
          <div className="text-caption mb-2">Today</div>
          <div className="flex items-baseline gap-2">
            <span className="text-stat font-display text-sky-500">
              {todayQuery.data?.logs.length !== 0
                ? todayQuery.data?.logs[0]?.id
                : 0}
            </span>
            <span className="text-bone-500 text-xs">/ {2500} kcal</span>
          </div>
        </Card>
      </Link>

      {pageQuery.isLoading ? (
        <Spinner />
      ) : (pageQuery.data?.nutritionLogs.length ?? 0) > 0 ? (
        <div className="space-y-2 pt-6">
          <span className="text-caption">Other Entries</span>
          {pageQuery.data?.nutritionLogs.map((day) => (
            <Link key={day.id} to={`/nutrition/${day.id}`}>
              <Card
                interactive
                className="flex items-center justify-between p-4 mt-2"
              >
                <div className="text-sm font-semibold">
                  {formatVerboseDate(day.date)}
                </div>
                <div className="font-mono text-sm">{0} kcal</div>
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
      ) : (
        <div className="flex flex-col items-center text-center py-16 gap-2">
          <Utensils className="w-12 h-12 text-bone-500" />
          <p className="font-display text-lg font-semibold text-bone-500">
            Let's get started.
          </p>
          <p className="text-caption max-w-xs">
            Log your first meal to start tracking your nutrition.
          </p>
          <Button
            variant="sky"
            size="sm"
            className="cursor-pointer active:bg-sky-700"
            onClick={() => console.log("clicked empty state button")}
          >
            <span>Log a meal</span>
          </Button>
        </div>
      )}
    </div>
  );
}
