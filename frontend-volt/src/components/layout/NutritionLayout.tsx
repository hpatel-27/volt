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
  // Bumped on each open so the sheet remounts and re-picks its lazy initial state.
  const [sheetKey, setSheetKey] = useState(0);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const context: NutritionOutletContext = {
    openMealSheet: (meal?: Meal) => {
      setEditingMeal(meal ?? null);
      setSheetKey((k) => k + 1);
      setSheetOpen(true);
    },
  };

  return (
    <>
      <DayStrip selectedDate={selectedDate} />
      <Outlet context={context} />
      <MealEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={selectedDate}
        meal={editingMeal}
      />
    </>
  );
};

export default NutritionLayout;
