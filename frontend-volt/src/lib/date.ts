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

/**
 * The current local week as a Monday -> Sunday ISO range. Used by the dashboard
 * volume card, whose 7 bars are fixed weekday slots (M T W T F S S).
 */
export function currentWeekRange() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat → days since Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: formatLocalIso(monday), to: formatLocalIso(sunday) };
}

/** Weekday index of a YYYY-MM-DD date, Monday=0 ... Sunday=6, parsed in local time. */
export function dayIndexMon0(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const local = new Date(year, month - 1, day); // multi-arg form = local time
  return (local.getDay() + 6) % 7;
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

export function formatFullDate(date: string) {
  const trimDate = date.slice(0, 10);
  const [year, month, day] = trimDate.split("-").map(Number);
  const localDate = new Date(year, month - 1, day); // multi arg form is local time
  const fullDate = localDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "long",
  });
  return fullDate;
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

/** "Today" / "Yesterday" / "May 19"; relative labels read more human than a bare date. */
export function formatRelativeDate(date: string) {
  const iso = date.slice(0, 10);
  if (iso === todayLocalIso()) return "Today";
  if (iso === yesterdayLocalIso()) return "Yesterday";
  return formatVerboseDate(iso);
}
