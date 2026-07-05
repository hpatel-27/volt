import { formatFullDate, todayLocalIso } from "@/lib/date";
import { useCurrentUser } from "@/api/user";
import { PlanDayCard } from "../components/dashboard/PlanDayCard";
import { CalorieCard } from "../components/dashboard/CalorieCard";
import { WeightCard } from "../components/dashboard/WeightCard";
import { VolumeCard } from "../components/dashboard/VolumeCard";
import { GoalsPromptCard } from "../components/dashboard/GoalsPromptCard";
import { MIN_H } from "@/types/shared";

export default function Dashboard() {
  const todayIso = todayLocalIso();
  const { data, isLoading } = useCurrentUser();
  const firstName = data?.firstName;

  if (isLoading) {
    return (
      <div
        className={`${MIN_H} rounded-2xl border border-white/5 bg-ink-900 animate-pulse`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <div className="text-caption">{formatFullDate(todayIso)}</div>
        <h1 className="text-h1">
          {firstName ? `Hey, ${firstName}` : `Let's get to work`}
        </h1>
      </header>

      <GoalsPromptCard />

      <PlanDayCard />

      <div className="grid grid-cols-2 gap-3">
        <CalorieCard />
        <WeightCard />
      </div>

      <VolumeCard />
    </div>
  );
}
