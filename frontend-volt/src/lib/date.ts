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
