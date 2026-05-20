import { useParams, Link, useOutletContext } from "react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { useNutritionDetail } from "@/api/nutrition";
import type { NutritionOutletContext } from "@/components/layout/NutritionLayout";
import { formatVerboseDate } from "@/lib/date";
import { ArrowLeft, Plus, Utensils } from "lucide-react";
import type { Meal } from "@/types/meal";

const GOALS = {
  calories: 2400,
  protein: 180,
  carbs: 240,
  fat: 70,
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

export default function NutritionLog() {
  const { date } = useParams<{ date: string }>();
  const { openMealSheet } = useOutletContext<NutritionOutletContext>();
  const detailQuery = useNutritionDetail(date!);

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
  const caloriePct =
    GOALS.calories > 0
      ? Math.min((totals.calories / GOALS.calories) * 100, 100)
      : 0;

  const macroBars = [
    {
      label: "Protein",
      value: totals.protein,
      goal: GOALS.protein,
      color: "bg-volt-500",
    },
    {
      label: "Carbs",
      value: totals.carbs,
      goal: GOALS.carbs,
      color: "bg-sky-500",
    },
    { label: "Fat", value: totals.fat, goal: GOALS.fat, color: "bg-blaze-500" },
  ];

  return (
    <div className="space-y-4 pt-4">
      <header className="flex items-center gap-3">
        <Link to="/nutrition" className="text-bone-300">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="flex-1 font-display text-lg font-bold">
          {date ? formatVerboseDate(date) : "Nutrition Log"}
        </h1>
        <Button
          variant="sky"
          size="sm"
          className="cursor-pointer active:bg-sky-700"
          onClick={openMealSheet}
        >
          <Plus className="w-4 h-4 shrink-0 translate-y-px" />
          <span>Meal</span>
        </Button>
      </header>

      <Card className="bg-linear-to-br from-sky-500/15 via-ink-900 to-ink-900 border-sky-500/20 flex items-center gap-5">
        <div
          className="w-32 h-32 rounded-full grid place-items-center shrink-0"
          style={{
            background: `conic-gradient(var(--color-sky-500) ${caloriePct}%, rgba(255,255,255,0.08) 0)`,
          }}
        >
          <div className="w-[calc(100%-16px)] h-[calc(100%-16px)] rounded-full bg-ink-900 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-bone-500 font-semibold">
              Left
            </span>
            <span className="font-display text-2xl font-bold text-sky-400">
              {remaining}
            </span>
            <span className="text-[10px] text-bone-500 font-mono">
              / {GOALS.calories.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {macroBars.map((m) => {
            const pct =
              m.goal > 0 ? Math.min((m.value / m.goal) * 100, 100) : 0;
            return (
              <div key={m.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-caption">{m.label}</span>
                  <span className="text-xs font-mono">
                    {m.value} / {m.goal}g
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div
                    className={`h-full ${m.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {meals.length > 0 ? (
        <div className="space-y-2 pt-2">
          <span className="text-caption">Meals</span>
          {meals.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-4 mt-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-500">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-bone-500 font-mono mt-0.5">
                  Protein {m.protein}g · Carbs {m.carbs}g · Fat {m.fat}g
                </div>
              </div>
              <div className="font-mono text-sm font-semibold">
                {m.calories} Cal
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-12 gap-2">
          <Utensils className="w-10 h-10 text-bone-500" />
          <p className="font-display text-base font-semibold text-bone-500">
            No meals logged yet.
          </p>
          <p className="text-caption max-w-xs">
            Tap "Meal" to log your first meal for this day.
          </p>
        </div>
      )}
    </div>
  );
}
