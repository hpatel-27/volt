import { NavLink } from "react-router";
import { navItems } from "./navItems";
import { cn } from "../../lib/cn";

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-ink-900/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-end justify-around h-16 px-2 py-2.5">
        {navItems
          .filter((item) => !item.desktopOnly)
          .map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 h-full",
                  item.primary
                    ? "text-ink-950"
                    : isActive
                      ? "text-volt-500"
                      : "text-bone-500",
                )
              }
            >
              {item.primary ? (
                <span className="w-12 h-12 -mt-6 rounded-full bg-volt-500 flex items-center justify-center shadow-lg shadow-volt-500/30 ring-4 ring-ink-950">
                  {item.icon}
                </span>
              ) : (
                <>
                  {item.icon}
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
