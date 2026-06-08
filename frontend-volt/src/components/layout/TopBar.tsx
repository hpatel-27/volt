import { AccountButton } from "./AccountButton";

export function TopBar() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <img src="/thunder.svg" alt="Volt logo" className="h-6 w-6" />
        <span className="font-display text-lg font-bold tracking-tight">
          VOLT
        </span>
      </div>

      <AccountButton />
    </header>
  );
}
