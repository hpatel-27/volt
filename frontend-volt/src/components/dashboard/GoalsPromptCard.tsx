import { useState } from "react";
import { Link } from "react-router";
import { Target, X } from "lucide-react";
import { Card } from "../ui/Card";
import { useGoals } from "@/api/goal";

// Persist dismissal so the nudge doesn't re-appear on every reload for a user
// who has chosen not to set goals yet. (Setting goals hides it on its own - the
// query flips from null to a Goal - so this only matters for explicit dismissal.)
const DISMISS_KEY = "volt:goals-prompt-dismissed";

export function GoalsPromptCard() {
  const goalsQuery = useGoals();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true",
  );

  // Only nudge once we know goals are unset (data === null). Stay hidden while
  // loading or on error (undefined), once goals exist, or after dismissal.
  if (dismissed || goalsQuery.data !== null) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <Card accent="volt" className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt-500/10">
        <Target className="h-5 w-5 text-volt-500" />
      </div>
      {/* Lands on the profile, where the empty Goals card points to "Set goals". */}
      <Link to="/profile" className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-bone-50">Set your goals</div>
        <div className="text-caption text-bone-500 normal-case tracking-normal">
          Personalize your calorie and macro targets.
        </div>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-bone-500 transition-colors hover:bg-ink-800 hover:text-bone-100"
      >
        <X className="h-4 w-4" />
      </button>
    </Card>
  );
}
