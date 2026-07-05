import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Pencil, Trash2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { ProfileEntrySheet } from "../components/profile/ProfileEntrySheet";
import { GoalEntrySheet } from "../components/profile/GoalEntrySheet";
import { DeleteAccountSheet } from "../components/profile/DeleteAccountSheet";
import { useCurrentUser, useDeleteAccount } from "@/api/user";
import { useGoals } from "@/api/goal";

// "MAINTAIN" -> "Maintain". Goal types are stored uppercase (backend enum).
function goalTypeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export default function Profile() {
  const userQuery = useCurrentUser();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Bumping the key remounts the sheet so its fields re-initialize from the
  // latest user data each time it opens (uncontrolled-with-a-key pattern).
  const [sheetKey, setSheetKey] = useState(0);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const deleteAccount = useDeleteAccount();

  // Goals
  const goalsQuery = useGoals();
  const goals = goalsQuery?.data;

  // Separate sheet for goals; same remount-on-open key pattern as the profile
  // sheet so it re-seeds from the latest goals (or defaults) each time.
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [goalSheetKey, setGoalSheetKey] = useState(0);

  const openSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  };

  const openGoalSheet = () => {
    setGoalSheetKey((k) => k + 1);
    setGoalSheetOpen(true);
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        setDeleteOpen(false);
        queryClient.clear();
        await signOut();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  if (userQuery.isPending) return <Spinner fullscreen />;
  if (userQuery.isError || !userQuery.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1">Profile</h1>
        <Card>
          <p className="text-sm text-bone-300">
            We couldn't load your profile. Please try again.
          </p>
        </Card>
      </div>
    );
  }

  const user = userQuery.data;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Your name";

  return (
    <div className="space-y-4">
      <h1 className="text-h1">Profile</h1>

      <Card>
        <div className="font-semibold">{fullName}</div>
        <div className="text-xs text-bone-500">{user.email}</div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-caption">Details</div>
          <Button
            size="sm"
            variant="ghost"
            leading={<Pencil className="h-3.5 w-3.5" />}
            onClick={openSheet}
          >
            Edit
          </Button>
        </div>
        <dl className="space-y-px overflow-hidden rounded-2xl border border-white/5">
          <div className="flex items-center justify-between bg-ink-850 px-4 py-3">
            <dt className="text-sm text-bone-300">Name</dt>
            <dd className="text-sm font-medium text-bone-50">{fullName}</dd>
          </div>
          <div className="flex items-center justify-between bg-ink-850 px-4 py-3">
            <dt className="text-sm text-bone-300">Height</dt>
            <dd className="font-mono text-sm font-medium text-bone-50">
              {user.height != null ? `${user.height} cm` : <Minus size={24} />}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="text-caption">Goals</div>
            {goals && <Badge>{goalTypeLabel(goals.goalType)}</Badge>}
          </div>
          {goals && (
            <Button
              size="sm"
              variant="ghost"
              leading={<Pencil className="h-3.5 w-3.5" />}
              onClick={openGoalSheet}
            >
              Edit
            </Button>
          )}
        </div>

        {goalsQuery.isPending ? (
          <div className="h-32 animate-pulse rounded-2xl bg-ink-850" />
        ) : goalsQuery.isError ? (
          <p className="text-sm text-bone-300">
            We couldn't load your goals. Please try again.
          </p>
        ) : goals ? (
          <dl className="space-y-px overflow-hidden rounded-2xl border border-white/5">
            {[
              { label: "Target weight", value: `${goals.targetWeight} lbs` },
              {
                label: "Daily calories",
                value: `${goals.calorieGoal.toLocaleString()} kcal`,
              },
              { label: "Protein", value: `${goals.proteinGoal} g` },
              { label: "Carbs", value: `${goals.carbGoal} g` },
              { label: "Fat", value: `${goals.fatGoal} g` },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between bg-ink-850 px-4 py-3"
              >
                <dt className="text-sm text-bone-300">{row.label}</dt>
                <dd className="font-mono text-sm font-medium text-bone-50">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-display text-base font-semibold text-bone-50">
              No goals set
            </p>
            <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
              Set your weight and nutrition targets to personalize your
              dashboard.
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={openGoalSheet}
              className="mt-1"
            >
              Set goals
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-1 text-caption text-blaze-500">Danger zone</div>
        <p className="mb-4 text-sm text-bone-300">
          Permanently delete your account and all of your data.
        </p>
        <Button
          variant="danger"
          leading={<Trash2 className="h-4 w-4" />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete account
        </Button>
      </Card>

      <ProfileEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        user={user}
      />

      <GoalEntrySheet
        key={`goal-${goalSheetKey}`}
        open={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        goal={goals ?? null}
      />

      <DeleteAccountSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        pending={deleteAccount.isPending}
      />
    </div>
  );
}
