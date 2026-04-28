import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  primary?: boolean;
}

const stroke = "stroke-current";

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 ${stroke}`}
  >
    <path d={d} />
  </svg>
);

export const navItems: NavItem[] = [
  { to: "/app/dashboard", label: "Home", icon: <Icon d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /> },
  { to: "/app/workouts", label: "Workouts", icon: <Icon d="M5 9v6M19 9v6M2 12h3M19 12h3M8 6v12M16 6v12" /> },
  { to: "/app/log", label: "Log", icon: <Icon d="M12 5v14M5 12h14" />, primary: true },
  { to: "/app/nutrition", label: "Nutrition", icon: <Icon d="M12 3a7 7 0 0 1 7 7c0 5-3.5 11-7 11S5 15 5 10a7 7 0 0 1 7-7zM12 7v6" /> },
  { to: "/app/weight", label: "Weight", icon: <Icon d="M4 7h16l-1 13H5zM9 7V5a3 3 0 0 1 6 0v2" /> },
];
