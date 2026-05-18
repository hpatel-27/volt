import { Outlet, useParams } from "react-router";
import DayStrip from "../nutrition/DayStrip";
import { todayLocalIso } from "@/lib/date";

const NutritionLayout = () => {
  const params = useParams();
  const selectedDate = params.date ?? todayLocalIso();

  return (
    <>
      <DayStrip selectedDate={selectedDate} />
      <Outlet />
    </>
  );
};

export default NutritionLayout;
