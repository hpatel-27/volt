import type { WeightsRange } from "../../types/weight";

const WeightsChart = ({ weights, total }: WeightsRange) => {
  console.log("chart data", weights, total);
  return (
    <div>
      <h1>WeightsChart</h1>
      <p>{total}</p>
      {weights.map((w) => (
        <p>
          {w.amount} | {w.date}
        </p>
      ))}
    </div>
  );
};

export default WeightsChart;
