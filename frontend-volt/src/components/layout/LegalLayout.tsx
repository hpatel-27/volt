import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Shared shell for static legal pages (Privacy, Terms). Public — renders no
 * auth state and fetches nothing. Brand header links home, content is a single
 * readable column, footer matches the Landing page.
 */
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink-950 text-bone-50">
      <header className="flex items-center justify-between px-6 py-8 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/thunder.svg"
            alt="Volt logo — lightning bolt"
            className="h-7 w-7"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            VOLT
          </span>
        </Link>
        <Link
          to="/"
          className="flex items-center font-mono text-[11px] tracking-wider text-bone-500 hover:text-bone-300"
        >
          <ArrowLeft size={12} /> <span className="pl-1">BACK</span>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-4 md:pt-8">
        <div className="mb-2 font-mono text-xs tracking-[0.3em] text-bone-500">
          // {title.toUpperCase()}
        </div>
        <h1 className="font-display text-4xl font-bold leading-none">
          {title}
        </h1>
        <p className="mt-3 font-mono text-[11px] tracking-wider text-bone-600">
          LAST UPDATED · {lastUpdated.toUpperCase()}
        </p>
        <div className="mt-10">{children}</div>
      </main>

      <footer className="flex items-center justify-between px-6 py-8 font-mono text-[11px] tracking-wider text-bone-600 md:px-12">
        <span>VOLT · TRAINING LOG</span>
        <span>&copy; HARSH PATEL</span>
      </footer>
    </div>
  );
}

/** A titled block of legal copy. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-h2 font-bold">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-bone-300">
        {children}
      </div>
    </section>
  );
}

/** A bulleted list inside a Section. */
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-bone-300">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-bone-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
