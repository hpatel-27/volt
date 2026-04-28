import { Button } from "../components/ui/Button";

export default function Log() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button className="text-bone-300 text-sm">✕ End</button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volt-500 animate-pulse" />
          <span className="font-mono text-sm text-bone-300">42:18</span>
        </div>
        <span className="text-xs text-bone-500 font-mono">12,840 lbs</span>
      </header>

      <div>
        <div className="text-caption">Push Day · Exercise 1 of 5</div>
        <h1 className="font-display text-3xl font-bold leading-tight mt-1">Barbell Bench Press</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-bone-500 font-mono">
          <span>Last: 225 × 6</span>
          <span className="text-blaze-500 font-bold">PR · 235 lbs</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 px-2 text-caption">
        <span className="col-span-2">Set</span>
        <span className="col-span-4">Weight</span>
        <span className="col-span-4">Reps</span>
        <span className="col-span-2 text-right">✓</span>
      </div>

      {[
        { set: 1, w: 225, r: 8, done: true },
        { set: 2, w: 235, r: 6, done: true },
        { set: 3, w: 235, r: null, done: false, active: true },
        { set: 4, w: null, r: null, done: false },
      ].map((s) => (
        <div
          key={s.set}
          className={
            "grid grid-cols-12 gap-2 items-center rounded-xl p-2 " +
            (s.active
              ? "bg-ink-900 border-2 border-volt-500 shadow-lg shadow-volt-500/10"
              : s.w === null
                ? "bg-ink-900/50 border border-white/5 opacity-50"
                : "bg-ink-900 border border-white/5")
          }
        >
          <span className={"col-span-2 font-mono text-center " + (s.active ? "text-volt-500 font-bold" : "text-bone-300")}>{s.set}</span>
          <div className="col-span-4 bg-ink-800 rounded-lg h-10 flex items-center justify-center font-mono font-semibold">
            {s.w ?? ""}
          </div>
          <div className="col-span-4 bg-ink-800 rounded-lg h-10 flex items-center justify-center font-mono font-semibold">
            {s.r ?? (s.active ? "—" : "")}
          </div>
          <div className="col-span-2 flex justify-end">
            <div className={
              "w-9 h-9 rounded-lg flex items-center justify-center " +
              (s.done ? "bg-volt-500 text-ink-950 font-bold" : "bg-ink-800 border border-white/10 text-bone-500")
            }>{s.done ? "✓" : ""}</div>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" full>Skip exercise</Button>
        <Button full>Next →</Button>
      </div>
    </div>
  );
}
