import { Outlet, useParams } from "react-router";
import { useState } from "react";
import DayStrip from "../nutrition/DayStrip";
import { MealEntrySheet } from "../nutrition/MealEntrySheet";
import { todayLocalIso } from "@/lib/date";

export type NutritionOutletContext = {
  openMealSheet: () => void;
};

const NutritionLayout = () => {
  const params = useParams();
  const selectedDate = params.date ?? todayLocalIso();
  const [sheetOpen, setSheetOpen] = useState(false);

  const context: NutritionOutletContext = {
    openMealSheet: () => setSheetOpen(true),
  };

  return (
    <>
      <DayStrip selectedDate={selectedDate} />
      <Outlet context={context} />
      <MealEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={selectedDate}
      />
    </>
  );
};

export default NutritionLayout;
