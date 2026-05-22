import { Outlet, useParams } from "react-router";
import { useState } from "react";
import DayStrip from "../nutrition/DayStrip";
import { MealEntrySheet } from "../nutrition/MealEntrySheet";
import { todayLocalIso } from "@/lib/date";
import type { Meal } from "@/types/meal";

export type NutritionOutletContext = {
  // No argument → create a new meal. Pass a meal → open the sheet to edit it.
  openMealSheet: (meal?: Meal) => void;
};

const NutritionLayout = () => {
  const params = useParams();
  const selectedDate = params.date ?? todayLocalIso();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const context: NutritionOutletContext = {
    openMealSheet: (meal?: Meal) => {
      setEditingMeal(meal ?? null);
      setSheetOpen(true);
    },
  };

  return (
    <>
      <DayStrip selectedDate={selectedDate} />
      <Outlet context={context} />
      <MealEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={selectedDate}
        meal={editingMeal}
      />
    </>
  );
};

export default NutritionLayout;
