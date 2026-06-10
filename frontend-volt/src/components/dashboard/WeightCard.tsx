import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useLatestWeight, useWeights, useWeightsRange } from "@/api/weights";
import { filterToRange } from "@/lib/date";
import type { Weight, WeightDelta } from "@/types/weight";
import {
  ArrowRight,
  ChartLine,
  Minus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { LIMIT } from "@/types/shared";

/**
 * Reduce a 7-day window of weight entries to a single delta for the card.
 * Returns null when there aren't enough entries to compare.
 */
function computeSevenDayDelta(weights: Weight[]): WeightDelta | null {
  if (weights.length < 2) return null;
  const oldest = weights.at(0);
  const newest = weights.at(-1);
  const delta = (newest?.amount ?? 0) - (oldest?.amount ?? 0);
  const absDelta = Math.abs(delta).toString();

  if (delta < 0) {
    return { value: absDelta, direction: "down" };
  } else if (delta > 0) {
    return { value: absDelta, direction: "up" };
  } else {
    return { value: absDelta, direction: "flat" };
  }
}

const deltaIcon: Record<WeightDelta["direction"], LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export function WeightCard() {
  const { data: latest } = useLatestWeight();
  const { data: range } = useWeightsRange(filterToRange("7D"));
  useWeights({ page: 1, limit: LIMIT });
  const delta = range ? computeSevenDayDelta(range.weights) : null;

  // Empty state: no weight logged yet = invite the user to start tracking.
  if (!latest) {
    return (
      <Link to="/weight" className="block h-full">
        <Card interactive className="flex h-full flex-col">
          <div className="text-caption">Weight · 7d</div>
          <div className="mt-auto pt-4">
            <div className="font-display text-4xl font-bold tracking-tight text-bone-500">
              <ChartLine size={36} />
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-bone-500">
              <p className="mb-1">Start tracking</p> <ArrowRight size={16} />
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link to="/weight" className="block h-full">
      <Card interactive className="flex h-full flex-col">
        <div className="text-caption">Weight · 7d</div>
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold tracking-tight">
              {latest.amount}
            </span>
            <span className="text-sm font-medium text-bone-500">lbs</span>
          </div>
          {delta &&
            (() => {
              const Icon = deltaIcon[delta.direction];
              return (
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-bone-300">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{delta.value} lbs</span>
                </div>
              );
            })()}
        </div>
      </Card>
    </Link>
  );
}
