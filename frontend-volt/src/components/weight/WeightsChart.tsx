import type { Weight } from "../../types/weight";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

type WeightsChartProps = {
  weights: Weight[];
};

const chartConfig = {
  amount: { label: "Weight", color: "var(--color-volt-500)" },
} satisfies ChartConfig;

function formatTick(dateIso: string): string {
  const [y, m, d] = dateIso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const WeightsChart = ({ weights }: WeightsChartProps) => {
  const sorted = weights
    .map((w) => ({ ...w, date: w.date.slice(0, 10) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
      <AreaChart
        data={sorted}
        margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-amount)"
              stopOpacity={0.5}
            />
            <stop
              offset="100%"
              stopColor="var(--color-amount)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <Area
          dataKey="amount"
          type={"monotone"}
          fill="url(#wg)"
          stroke="var(--color-amount)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: "var(--color-amount)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
};

export default WeightsChart;
