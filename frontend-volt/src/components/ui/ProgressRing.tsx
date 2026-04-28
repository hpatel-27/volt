import type { ReactNode } from "react";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: "volt" | "blaze" | "sky";
  trackOpacity?: number;
  children?: ReactNode;
}

const colorVar = {
  volt: "var(--color-volt-500)",
  blaze: "var(--color-blaze-500)",
  sky: "var(--color-sky-500)",
};

export function ProgressRing({
  value,
  max,
  size = 160,
  stroke = 12,
  color = "volt",
  trackOpacity = 0.08,
  children,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circumference * pct;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeOpacity={trackOpacity}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar[color]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
