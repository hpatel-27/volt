import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { useLatestWeight, useWeights, useWeightsRange } from "../api/weights";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { WeightEntrySheet } from "../components/weight/WeightEntrySheet";
import {
  filterToRange,
  formatVerboseDate,
  todayLocalIso,
  yesterdayLocalIso,
} from "../lib/date";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/Button";
import type { WeightFilter } from "../types/weight";
import WeightsChart from "@/components/weight/WeightsChart";

const FILTER_LABELS: Record<WeightFilter, string> = {
  "7D": "last 7 days",
  "30D": "last 30 days",
  "90D": "last 90 days",
  All: "all time",
};

function formatWhen(dateIso: string): string {
  const date = dateIso.slice(0, 10);
  if (date === todayLocalIso()) return "Today";
  if (date === yesterdayLocalIso()) return "Yesterday";

  return formatVerboseDate(dateIso);
}

function formatDelta(delta: number): {
  label: string;
  tone: "good" | "neutral";
} {
  if (delta < 0)
    return { label: `▼ ${Math.abs(delta).toFixed(1)} lbs`, tone: "good" };
  if (delta > 0) return { label: `▲ ${delta.toFixed(1)} lbs`, tone: "neutral" };
  return { label: "0.0", tone: "neutral" };
}

export default function Weight() {
  const LIMIT = 10;

  const listFilters: WeightFilter[] = ["7D", "30D", "90D", "All"];
  const [filter, setFilter] = useState<WeightFilter>("7D");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const weightsQuery = useWeights({ page, limit: LIMIT });
  const latestWeight = useLatestWeight();
  const totalPages =
    weightsQuery.data?.total !== undefined &&
    weightsQuery.data?.limit !== undefined &&
    weightsQuery.data?.total !== 0
      ? Math.ceil(weightsQuery.data?.total / weightsQuery.data?.limit)
      : 1;
  const dateRange = filterToRange(filter);
  const weightsRangeQuery = useWeightsRange(dateRange);

  const openSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4 py-4 px-2">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Weight</h1>
        <button
          onClick={openSheet}
          className="w-10 h-10 rounded-full bg-volt-500 hover:bg-volt-600 active:bg-volt-700 text-ink-950
                     font-bold text-xl flex items-center justify-center cursor-pointer transition"
        >
          <Plus />
        </button>
      </header>

      <WeightEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      <div>
        <div className="text-caption">Current</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-display">{latestWeight.data?.amount}</span>
          <span className="text-bone-500 font-medium">lbs</span>
        </div>
        {(() => {
          const rangeWeights = weightsRangeQuery.data?.weights ?? [];
          if (rangeWeights.length < 2) return null;
          const delta =
            rangeWeights[rangeWeights.length - 1].amount -
            rangeWeights[0].amount;
          const { label, tone } = formatDelta(delta);
          return (
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
                tone === "good"
                  ? "bg-volt-500/10 border border-volt-500/20 text-volt-500"
                  : "bg-ink-800 border border-ink-700 text-bone-500",
              )}
            >
              {label} · {FILTER_LABELS[filter]}
            </div>
          );
        })()}
      </div>

      <div className="flex gap-2">
        {listFilters.map((r) => (
          <button
            key={r}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs cursor-pointer transition",
              "hover:bg-ink-700 hover:text-bone-300 active:bg-ink-800",
              r === filter
                ? "bg-ink-800 text-bone-300 font-semibold"
                : "text-bone-500 font-medium",
            )}
            onClick={() => {
              setFilter(r);
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <Card className="h-44 p-4 pt-6">
        {weightsRangeQuery.isPending ? (
          <Spinner fullscreen />
        ) : weightsRangeQuery.data ? (
          <WeightsChart weights={weightsRangeQuery.data.weights} />
        ) : null}
      </Card>

      <div className="text-caption">Entries</div>
      {weightsQuery.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : weightsQuery.data && weightsQuery.data.weights.length === 0 ? (
        <div className="text-center py-8 text-sm text-bone-500">
          No entries yet — tap + to log your first weight.
        </div>
      ) : (
        <div className="space-y-2">
          {weightsQuery.data?.weights.map((w, i, arr) => {
            const previous = arr[i + 1];
            const delta = previous ? w.amount - previous.amount : 0;
            const { label, tone } = formatDelta(delta);
            return (
              <Card
                key={w.id}
                className="p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold font-mono">
                    {w.amount.toFixed(1)} lbs
                  </div>
                  <div className="text-xs text-bone-500">
                    {formatWhen(w.date)}
                  </div>
                </div>
                <span
                  className={
                    "text-xs font-semibold " +
                    (tone === "good" ? "text-volt-500" : "text-bone-500")
                  }
                >
                  {label}
                </span>
              </Card>
            );
          })}
          <div className="flex pt-6 justify-center gap-2">
            <Button
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="hover:bg-volt-600 hover:text-ink-950 hover:font-semibold active:bg-volt-700 cursor-pointer transition"
            >
              <ChevronLeft />
              Prev
            </Button>
            <Button
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="hover:bg-volt-600 hover:text-ink-950 hover:font-semibold active:bg-volt-700 cursor-pointer transition"
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
