import { NavLink } from "react-router";
import { navItems } from "./navItems";
import { cn } from "../../lib/cn";
import { UserButton } from "@clerk/clerk-react";

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-ink-950 px-4 py-6 sticky top-0 h-dvh">
      <div className="flex items-center gap-2 px-2 mb-10">
        <div className="w-8 h-8 rounded-xl bg-volt-500 flex items-center justify-center">
          <span className="text-ink-950 font-black text-lg">V</span>
        </div>
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

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          {/* <div className="w-9 h-9 rounded-full bg-pink-500" /> */}
          <UserButton />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Athlete</div>
            <div className="text-xs text-bone-500 truncate">Free plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
