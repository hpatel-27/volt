import type { ReactNode } from "react";
import {
  Dumbbell,
  House,
  NotebookPen,
  User,
  UtensilsCrossed,
  WeightTilde,
} from "lucide-react";
export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  primary?: boolean;
  // Shown in the desktop sidebar but not the mobile bottom nav. Keeps the
  // bottom nav at an odd count so the raised "Log" tab stays centered.
  desktopOnly?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Home",
    icon: <House size={20} />,
  },
  {
    to: "/plans",
    label: "Plans",
    icon: <NotebookPen size={20} />,
  },
  {
    to: "/workouts",
    label: "Logs",
    icon: <Dumbbell size={20} />,
    primary: true,
  },
  {
    to: "/nutrition",
    label: "Nutrition",
    icon: <UtensilsCrossed size={20} />,
  },
  {
    to: "/weight",
    label: "Weight",
    icon: <WeightTilde size={20} />,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: <User size={20} />,
    desktopOnly: true,
  },
];
