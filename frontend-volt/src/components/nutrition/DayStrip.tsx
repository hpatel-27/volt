import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Dot } from "lucide-react";
import { useNutritionRange } from "@/api/nutrition";
import { daysAgoLocalIso } from "@/lib/date";
import type { DayStripSelected, NutritionLog } from "@/types/nutrition";
import { cn } from "@/lib/cn";

const STRIP_SIZE = 7;

const DayStrip = ({ selectedDate }: DayStripSelected) => {
  // offset = how many days the rightmost pill is shifted into the past.
  // offset === 0 means the right edge is today; right chevron disabled.
  const [offset, setOffset] = useState(0);

  const dates = useMemo(() => {
    const stripDates = Array.from({ length: STRIP_SIZE }, (_, i) =>
      daysAgoLocalIso(offset + (STRIP_SIZE - 1 - i)),
    );
    return stripDates;
  }, [offset]);

  const from = dates[0];
  const to = dates[dates.length - 1];

  const rangeQuery = useNutritionRange({ from, to });
  const logsByDate = useMemo(() => {
    const map = new Map<string, NutritionLog>();
    rangeQuery.data?.logs.forEach((log) => log && map.set(log.date, log));
    return map;
  }, [rangeQuery.data]);

  const atToday = offset === 0;

  return (
    <div className="flex items-center gap-2 py-4 px-2">
      <button
        type="button"
        onClick={() => setOffset((o) => o + STRIP_SIZE)}
        className="p-1 cursor-pointer disabled:opacity-30"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex flex-1 justify-between gap-1">
        {dates.map((iso) => {
          const log = logsByDate.get(iso);
          const isSelected = iso === selectedDate;
          return (
            <div
              key={iso}
              className="relative flex flex-col items-center overflow-visible"
            >
              <Link
                to={`/nutrition/${iso}`}
                className={cn(
                  "flex flex-col items-center rounded-lg px-2 py-1 text-xs hover:bg-ink-700 transition",
                  isSelected &&
                    "bg-sky-500 text-ink-950 font-semibold hover:bg-sky-600 active:bg-sky-700",
                )}
              >
                <span>{weekdayLetter(iso)}</span>
                <span className="font-mono">{dayNumber(iso)}</span>
              </Link>
              {log?.date && <Dot className="absolute top-full" />}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOffset((o) => Math.max(0, o - STRIP_SIZE))}
        disabled={atToday}
        className={cn(
          "p-1 disabled:opacity-30",
          atToday ? "cursor-not-allowed" : "cursor-pointer",
        )}
        aria-label="Next week"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

function weekdayLetter(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "narrow",
  });
}

function dayNumber(iso: string) {
  return Number(iso.split("-")[2]);
}

export default DayStrip;
