import { NavLink } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { navItems } from "./navItems";
import { cn } from "../../lib/cn";
import { AccountButton } from "./AccountButton";

export function Sidebar() {
  // Pair the name with the avatar from the same source (Clerk) — the sidebar
  // foot is the only consumer, so reading it inline stays contained.
  const { user } = useUser();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-ink-950 px-4 py-6 sticky top-0 h-dvh">
      <div className="flex items-center gap-2 px-2 mb-10">
        <img
          src="/thunder.svg"
          alt="Volt Logo (thunder icon)"
          className="w-6 h-6"
        />
        <span className="font-display font-bold text-lg tracking-tight">
          VOLT
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-ink-800 text-bone-50"
                  : "text-bone-300 hover:bg-ink-900 hover:text-bone-50",
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 px-2 pt-4">
        <AccountButton />
        <span className="truncate text-sm font-medium text-bone-200">
          {user?.fullName ?? "Account"}
        </span>
      </div>
    </aside>
  );
}
