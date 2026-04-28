import { Card } from "../components/ui/Card";

const entries = [
  { weight: 182.4, when: "Today · 7:14 AM", delta: "▼ 0.4", tone: "good" as const },
  { weight: 182.8, when: "Yesterday · 7:02 AM", delta: "▼ 0.2", tone: "good" as const },
  { weight: 183.0, when: "Apr 24 · 7:31 AM", delta: "▬ 0.0", tone: "neutral" as const },
];

export default function Weight() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Weight</h1>
        <button className="w-10 h-10 rounded-full bg-volt-500 text-ink-950 font-bold text-xl flex items-center justify-center">+</button>
      </header>

      <div>
        <div className="text-caption">Current</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-display">182.4</span>
          <span className="text-bone-500 font-medium">lbs</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-volt-500/10 border border-volt-500/20 text-volt-500 text-xs font-semibold">
          ▼ 1.2 lbs · last 7 days
        </div>
      </div>

      <div className="flex gap-2">
        {["7D", "30D", "90D", "All"].map((r, i) => (
          <span
            key={r}
            className={
              "px-3 py-1.5 rounded-full text-xs " +
              (i === 0 ? "bg-ink-800 font-semibold" : "text-bone-300 font-medium")
            }
          >{r}</span>
        ))}
      </div>

      <Card className="h-44 p-4">
        <svg viewBox="0 0 300 130" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-volt-500)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-volt-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 30 L 50 40 L 100 25 L 150 50 L 200 70 L 250 60 L 300 85 L 300 130 L 0 130 Z" fill="url(#wg)" />
          <path d="M 0 30 L 50 40 L 100 25 L 150 50 L 200 70 L 250 60 L 300 85" fill="none" stroke="var(--color-volt-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="300" cy="85" r="5" fill="var(--color-volt-500)" />
        </svg>
      </Card>

      <div className="text-caption">Entries</div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <Card key={i} className="p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold font-mono">{e.weight} lbs</div>
              <div className="text-xs text-bone-500">{e.when}</div>
            </div>
            <span className={"text-xs font-semibold " + (e.tone === "good" ? "text-volt-500" : "text-bone-500")}>{e.delta}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
