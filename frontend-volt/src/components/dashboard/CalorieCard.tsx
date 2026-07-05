import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useNutritionToday } from "@/api/nutrition";
import { useGoals } from "@/api/goal";
import { todayLocalIso } from "@/lib/date";
import { MIN_H, resolveGoals } from "@/types/shared";

/**
 * Calories-remaining card for today. The headline number is what's left
 * (goal - consumed); the bar fills with consumed progress toward the goal,
 * matching the nutrition page's calorie treatment.
 */
export function CalorieCard() {
  const { data, isLoading: todayLoading } = useNutritionToday(todayLocalIso());
  const goalsQuery = useGoals();

  const goal = resolveGoals(goalsQuery.data).calories;
  const consumed = data?.totals.calories ?? 0;
  // Clamp so going over goal reads 0 left / 100% bar rather than inverting.
  const remaining = Math.max(0, goal - consumed);
  const consumedPct = Math.min(100, (consumed / goal) * 100);

  if (todayLoading) {
    return (
      <div
        className={`${MIN_H} rounded-2xl border border-white/5 bg-ink-900 animate-pulse`}
      />
    );
  }

  return (
    <Link to="/nutrition" className="block h-full">
      <Card interactive className="flex h-full flex-col">
        <div className="text-caption">Calories left</div>
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold tracking-tight text-sky-500">
              {remaining.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-bone-500">
              / {goal.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-700 ease-out"
              style={{ width: `${consumedPct}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
