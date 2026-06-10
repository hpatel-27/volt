import { Link, useOutletContext } from "react-router";
import { useState } from "react";
import type { NutritionOutletContext } from "@/components/layout/NutritionLayout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useNutritionLogs, useNutritionToday } from "@/api/nutrition";
import { formatRelativeDate, todayLocalIso } from "@/lib/date";
import { ChevronLeft, ChevronRight, Plus, Utensils } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { CALORIE_GOAL, LIMIT } from "@/types/shared";

// TODO: lift to user goals

export default function Nutrition() {
  const [page, setPage] = useState(1);
  const pageQuery = useNutritionLogs({ page, limit: LIMIT });
  const totalPages =
    pageQuery.data?.total !== undefined &&
    pageQuery.data?.limit !== undefined &&
    pageQuery.data?.total !== 0
      ? Math.ceil(pageQuery.data?.total / pageQuery.data?.limit)
      : 1;

  const todayIso = todayLocalIso();
  const todayQuery = useNutritionToday(todayIso);
  const { openMealSheet } = useOutletContext<NutritionOutletContext>();

  const todayCalories = todayQuery.data?.totals.calories ?? 0;
  const todayPct = Math.min((todayCalories / CALORIE_GOAL) * 100, 100);
  const logs = pageQuery.data?.nutritionLogs ?? [];

  return (
    <div className="space-y-6 pt-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-caption text-bone-500">
            {formatRelativeDate(todayIso)} · {todayQuery.data?.mealCount ?? 0}{" "}
            meals
          </div>
          <h1 className="text-h1">Nutrition</h1>
        </div>
        <Button
          size="sm"
          variant="sky"
          leading={<Plus className="h-4 w-4" />}
          onClick={() => openMealSheet()}
        >
          Meal
        </Button>
      </header>

      {/* Today hero — the calorie count is the headline number for the screen. */}
      <Link to={`/nutrition/${todayIso}`} className="block">
        <Card interactive>
          <div className="text-caption mb-3 text-bone-500">Today</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-display font-bold leading-none text-sky-500">
              {todayCalories.toLocaleString()}
            </span>
            <span className="font-mono text-sm text-bone-500">
              / {CALORIE_GOAL.toLocaleString()} kcal
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-700 ease-out"
              style={{ width: `${todayPct}%` }}
            />
          </div>
        </Card>
      </Link>

      {pageQuery.isLoading ? (
        <div className="pt-8">
          <Spinner fullscreen />
        </div>
      ) : logs.length > 0 ? (
        <div>
          <div className="mb-3 text-caption text-bone-500">Earlier</div>
          <div className="space-y-px overflow-hidden rounded-2xl border border-white/5">
            {logs.map((day) => (
              <Link
                key={day.id}
                to={`/nutrition/${day.date}`}
                className="flex items-center gap-4 bg-ink-900 px-4 py-3.5 transition-colors hover:bg-ink-850"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-bone-50">
                    {formatRelativeDate(day.date)}
                  </div>
                  {day.mealCount !== undefined && (
                    <div className="mt-0.5 text-caption text-bone-500">
                      {day.mealCount} {day.mealCount === 1 ? "meal" : "meals"}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-display text-lg font-bold text-bone-50">
                    {day.totals.calories.toLocaleString()}
                  </span>
                  <span className="ml-1 text-caption text-bone-500">kcal</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-bone-500" />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                leading={<ChevronLeft className="h-4 w-4" />}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="-translate-y-[1.5px]">Prev</span>
              </Button>
              <span className="px-2 font-mono text-xs text-bone-500">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page === totalPages}
                trailing={<ChevronRight className="h-4 w-4" />}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="-translate-y-[1.5px]">Next</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 min-h-[40vh] justify-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/10">
            <Utensils className="h-6 w-6 text-sky-500" />
          </div>
          <p className="font-display text-lg font-semibold text-bone-50">
            Let's get started
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Log your first meal to start tracking your nutrition.
          </p>
          <Button
            size="sm"
            variant="sky"
            leading={<Plus className="h-4 w-4" />}
            onClick={() => openMealSheet()}
            className="mt-1"
          >
            Add meal
          </Button>
        </div>
      )}
    </div>
  );
}
