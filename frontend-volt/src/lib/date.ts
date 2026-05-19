import type { WeightFilter } from "../types/weight";

function formatLocalIso(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayLocalIso() {
  return formatLocalIso(new Date());
}

export function yesterdayLocalIso() {
  return daysAgoLocalIso(1);
}

export function daysAgoLocalIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalIso(d);
}

export function filterToRange(filter: WeightFilter) {
  const to = todayLocalIso();
  let from;
  let _exhaustive: never;
  switch (filter) {
    case "7D":
      from = daysAgoLocalIso(7);
      break;
    case "30D":
      from = daysAgoLocalIso(30);
      break;
    case "90D":
      from = daysAgoLocalIso(90);
      break;
    case "All":
      from = `1970-01-01`;
      break;
    default:
      _exhaustive = filter;
      throw new Error(`Unhandled filter: ${_exhaustive}`);
  }
  return { from, to };
}

export function formatVerboseDate(date: string) {
  const trimDate = date.slice(0, 10);
  const [year, month, day] = trimDate.split("-").map(Number);
  const localDate = new Date(year, month - 1, day); // multi arg form is local time
  const verboseDate = localDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return verboseDate;
}
