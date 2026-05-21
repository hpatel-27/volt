import { useParams, Link, useOutletContext } from "react-router";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useNutritionDetail } from "@/api/nutrition";
import type { NutritionOutletContext } from "@/components/layout/NutritionLayout";
import { formatRelativeDate } from "@/lib/date";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/cn";

// TODO: lift to user settings / shared nutrition config — duplicated in Nutrition.tsx
const GOALS = {
  calories: 2100,
  protein: 140, // 560 calories
  carbs: 210, // 840 calories
  fat: 50, // 450 calories
};

function totalsFromMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

const MACROS = [
  {
    key: "protein",
    label: "Protein",
    color: "text-volt-500",
    bar: "bg-volt-500",
  },
  { key: "carbs", label: "Carbs", color: "text-sky-500", bar: "bg-sky-500" },
  { key: "fat", label: "Fat", color: "text-blaze-500", bar: "bg-blaze-500" },
] as const;

export default function NutritionLog() {
  const { date } = useParams<{ date: string }>();
  const { openMealSheet } = useOutletContext<NutritionOutletContext>();
  const detailQuery = useNutritionDetail(date!);

  // Bars/ring render at 0, then ease to their real
  // value on the next frame. Key off loaded log to replay per day.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (detailQuery.data) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [detailQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <div className="pt-8">
        <Spinner />
      </div>
    );
  }

  const log = detailQuery.data;
  const meals = log?.meals ?? [];
  const totals = totalsFromMeals(meals);
  const remaining = Math.max(GOALS.calories - totals.calories, 0);
  const over = totals.calories > GOALS.calories;

  return (
    <div className="space-y-6 pt-4">
      <header className="flex items-center gap-3">
        <Link
          to="/nutrition"
          className="grid h-9 w-9 place-items-center rounded-xl text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="text-caption text-bone-500">Nutrition</div>
          <h1 className="font-display text-xl font-bold leading-tight">
            {date ? formatRelativeDate(date) : "Log"}
          </h1>
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

      {/* The calorie ring should dominate, everything else is supporting detail. */}
      <Card className="flex flex-col items-center gap-6 m-4 py-8">
        <ProgressRing
          value={mounted ? totals.calories : 0}
          max={GOALS.calories}
          size={196}
          stroke={14}
          color={over ? "blaze" : "sky"}
        >
          <span className="text-caption text-bone-500">
            {over ? "Over by" : "Remaining"}
          </span>
          <span
            className={cn(
              "font-display text-3xl font-bold leading-none",
              over ? "text-blaze-500" : "text-bone-50",
            )}
          >
            {over ? totals.calories - GOALS.calories : remaining}
          </span>
          <span className="font-mono text-xs text-bone-500 pt-2">
            {totals.calories.toLocaleString()} /{" "}
            {GOALS.calories.toLocaleString()} kcal
          </span>
        </ProgressRing>

        <div className="grid w-full grid-cols-3 gap-3">
          {MACROS.map((m) => {
            const value = totals[m.key];
            const goal = GOALS[m.key];
            const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
            return (
              <div key={m.key} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-caption text-bone-500">{m.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`font-display text-lg font-bold ${m.color}`}>
                    {value}
                  </span>
                  <span className="font-mono text-[11px] text-bone-500">
                    /{goal}g
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={`h-full rounded-full ${m.bar} transition-[width] duration-700 ease-out`}
                    style={{ width: mounted ? `${pct}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {meals.length > 0 ? (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-caption text-bone-500">Meals</span>
          </div>
          <div className="space-y-px overflow-hidden rounded-2xl border border-white/5">
            {meals.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openMealSheet(m)}
                className="flex w-full items-center gap-4 bg-ink-900 px-4 py-3.5 text-left transition-colors hover:bg-ink-850 focus-visible:outline-none focus-visible:bg-ink-850"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-bone-50">
                    {m.name}
                  </div>
                  <div className="mt-1 flex gap-3 font-mono text-[11px] text-bone-500">
                    <span className="text-volt-500">{m.protein}g Protein</span>
                    <span className="text-sky-500">{m.carbs}g Carbs</span>
                    <span className="text-blaze-500">{m.fat}g Fat</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-lg font-bold text-bone-50">
                    {m.calories}
                  </span>
                  <span className="ml-1 text-caption text-bone-500">kcal</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-bone-600" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-base font-semibold text-bone-50">
            Nothing logged yet
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Add your first meal to start filling the ring for this day.
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
