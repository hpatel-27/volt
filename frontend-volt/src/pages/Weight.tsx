import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { useLatestWeight, useWeights } from "../api/weights";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { WeightEntrySheet } from "../components/weight/WeightEntrySheet";
import { todayLocalIso, yesterdayLocalIso } from "../lib/date";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/Button";

function formatWhen(dateIso: string): string {
  const date = dateIso.slice(0, 10);
  if (date === todayLocalIso()) return "Today";
  if (date === yesterdayLocalIso()) return "Yesterday";

  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day); // multi arg form is local time
  const verboseDate = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return verboseDate;
}

function formatDelta(delta: number): {
  label: string;
  tone: "good" | "neutral";
} {
  if (delta < 0)
    return { label: `▼ ${Math.abs(delta).toFixed(1)}`, tone: "good" };
  if (delta > 0) return { label: `▲ ${delta.toFixed(1)}`, tone: "neutral" };
  return { label: "0.0", tone: "neutral" };
}

export default function Weight() {
  const LIMIT = 10;

  const listFilters = ["7D", "30D", "90D", "All"];
  const [filter, setFilter] = useState("7D");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const weightsQuery = useWeights({ page, limit: LIMIT });
  const latestWeight = useLatestWeight();
  const totalPages =
    weightsQuery.data?.total !== undefined &&
    weightsQuery.data?.limit !== undefined
      ? Math.ceil(weightsQuery.data?.total / weightsQuery.data?.limit)
      : 1;
  const openSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Weight</h1>
        <button
          onClick={openSheet}
          className="w-10 h-10 rounded-full transition bg-volt-500 hover:bg-volt-600 text-ink-950 font-bold text-xl flex items-center justify-center cursor-pointer"
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
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-volt-500/10 border border-volt-500/20 text-volt-500 text-xs font-semibold">
          ▼ 1.2 lbs · last 7 days
        </div>
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

      <Card className="h-44 p-4">
        <svg
          viewBox="0 0 300 130"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-volt-500)"
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor="var(--color-volt-500)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d="M 0 30 L 50 40 L 100 25 L 150 50 L 200 70 L 250 60 L 300 85 L 300 130 L 0 130 Z"
            fill="url(#wg)"
          />
          <path
            d="M 0 30 L 50 40 L 100 25 L 150 50 L 200 70 L 250 60 L 300 85"
            fill="none"
            stroke="var(--color-volt-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="300" cy="85" r="5" fill="var(--color-volt-500)" />
        </svg>
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
