import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Pencil, Trash2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ProfileEntrySheet } from "../components/profile/ProfileEntrySheet";
import { DeleteAccountSheet } from "../components/profile/DeleteAccountSheet";
import { useCurrentUser, useDeleteAccount } from "@/api/user";

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

  const openSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
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

      <DeleteAccountSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        pending={deleteAccount.isPending}
      />
    </div>
  );
}
