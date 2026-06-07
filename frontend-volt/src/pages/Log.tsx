import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { WorkoutDatePickerSheet } from "../components/workout/WorkoutDatePickerSheet";
import { Spinner } from "@/components/ui/Spinner";
import {
  useCreateWorkoutLog,
  useWorkoutLogs,
  useWorkoutLogsToday,
} from "@/api/workoutLog";
import { formatRelativeDate, todayLocalIso } from "@/lib/date";
import { LIMIT, DATE_REGEX } from "@/types/shared";
import type { WorkoutLogSummary } from "@/types/workoutLog";

function computeTodayStats(today: WorkoutLogSummary[]): {
  sessions: number;
  exercises: number;
} {
  const exerciseCount = today.reduce(
    (sum, workoutSession) => sum + workoutSession.exerciseCount,
    0,
  );
  return { sessions: today.length, exercises: exerciseCount };
}

export default function Log() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  // Date-picker sheet: creation is deferred until the user confirms a date,
  // so an accidental tap no longer writes an empty log. Bumping the key on
  // open remounts the sheet so its date field resets to today each time.
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [dateSheetKey, setDateSheetKey] = useState(0);

  const pageQuery = useWorkoutLogs({ page, limit: LIMIT });
  const totalPages =
    pageQuery.data?.total !== undefined &&
    pageQuery.data?.limit !== undefined &&
    pageQuery.data?.total !== 0
      ? Math.ceil(pageQuery.data.total / pageQuery.data.limit)
      : 1;

  const todayIso = todayLocalIso();
  const todayQuery = useWorkoutLogsToday(todayIso);
  const createLog = useCreateWorkoutLog();

  const todayStats = computeTodayStats(todayQuery.data ?? []);
  const logs = pageQuery.data?.workoutLogs ?? [];

  function openDateSheet() {
    setDateSheetKey((k) => k + 1);
    setDateSheetOpen(true);
  }

  function handleConfirmDate(date: string) {
    if (!date || !DATE_REGEX.test(date) || todayIso < date) {
      toast.error("Invalid date provided.");
      return;
    }
    createLog.mutate(
      { date },
      {
        onSuccess: (data) => {
          setDateSheetOpen(false);
          toast.success(`Workout log created for: ${formatRelativeDate(date)}`);
          navigate(`/workouts/${data.id}`);
        },
        onError: () =>
          toast.error(
            `Could not create workout log for: ${formatRelativeDate(date)}. Please try again.`,
          ),
      },
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-caption text-bone-500">
            {formatRelativeDate(todayIso)} · {todayStats.sessions}{" "}
            {todayStats.sessions === 1 ? "session" : "sessions"}
          </div>
          <h1 className="font-display text-2xl font-bold">Workouts</h1>
        </div>
        <Button
          size="sm"
          leading={<Plus className="h-4 w-4" />}
          onClick={openDateSheet}
          disabled={createLog.isPending}
        >
          Start
        </Button>
      </header>

      {/* Today hero — the count of work done today is the headline figure. */}
      <Card className="flex flex-col items-center gap-1 py-8">
        <span className="font-display text-display font-bold leading-none text-volt-500">
          {todayStats.exercises}
        </span>
        <span className="text-caption text-bone-500">
          {todayStats.exercises === 1 ? "exercise" : "exercises"} today
        </span>
      </Card>

      {pageQuery.isLoading ? (
        <div className="pt-8">
          <Spinner />
        </div>
      ) : logs.length > 0 ? (
        <div>
          <div className="mb-3 text-caption text-bone-500">All workouts</div>
          <div className="space-y-px overflow-hidden rounded-2xl border border-white/5">
            {logs.map((log) => (
              <Link
                key={log.id}
                to={`/workouts/${log.id}`}
                className="flex items-center gap-4 bg-ink-900 px-4 py-3.5 transition-colors hover:bg-ink-850"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-bone-50">
                    {formatRelativeDate(log.date)}
                  </div>
                  <div className="mt-0.5 text-caption text-bone-500">
                    {log.workoutDay ? `${log.workoutDay.name} · ` : ""}
                    {log.exerciseCount}{" "}
                    {log.exerciseCount === 1 ? "exercise" : "exercises"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-bone-500" />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                leading={<ChevronLeft className="h-4 w-4" />}
                onClick={() => setPage((p) => p - 1)}
              >
                <span className="-translate-y-[1.5px]">Prev</span>
              </Button>
              <span className="px-2 font-mono text-xs text-bone-500">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page === totalPages}
                trailing={<ChevronRight className="h-4 w-4" />}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="-translate-y-[1.5px]">Next</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-volt-500/10">
            <Dumbbell className="h-6 w-6 text-volt-500" />
          </div>
          <p className="font-display text-lg font-semibold text-bone-50">
            No workouts yet
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Start a workout to log your exercises and sets.
          </p>
          <Button
            size="sm"
            leading={<Plus className="h-4 w-4" />}
            onClick={openDateSheet}
            disabled={createLog.isPending}
            className="mt-1"
          >
            Start workout
          </Button>
        </div>
      )}

      <WorkoutDatePickerSheet
        key={`date-${dateSheetKey}`}
        open={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        onConfirm={handleConfirmDate}
        submitting={createLog.isPending}
      />
    </div>
  );
}
