import { formatFullDate, todayLocalIso } from "@/lib/date";
import { useCurrentUser } from "@/api/user";
import { PlanDayCard } from "../components/dashboard/PlanDayCard";
import { CalorieCard } from "../components/dashboard/CalorieCard";
import { WeightCard } from "../components/dashboard/WeightCard";

export default function Dashboard() {
  const todayIso = todayLocalIso();
  const userInfo = useCurrentUser();
  const firstName = userInfo?.data?.firstName;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-caption">{formatFullDate(todayIso)}</div>
        <h1 className="text-h1">
          {firstName ? `Hey, ${firstName}` : `Welcome, LeBron`}
        </h1>
      </header>

      <PlanDayCard />

      <div className="grid grid-cols-2 gap-3">
        <CalorieCard />
        <WeightCard />
      </div>
    </div>
  );
}
