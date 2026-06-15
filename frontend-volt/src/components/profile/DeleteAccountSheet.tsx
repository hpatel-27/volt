import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";

interface DeleteAccountSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}

/**
 * Confirmation step for the irreversible account deletion. Presentational only>:
 * the parent owns the actual deletion via `onConfirm` and reports progress
 * through `pending`.
 */
export function DeleteAccountSheet({
  open,
  onClose,
  onConfirm,
  pending,
}: DeleteAccountSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Delete account">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-bone-300">
          This permanently deletes your account and{" "}
          <span className="font-semibold text-bone-50">all of your data</span>:
          weight entries, workout plans and logs, and nutrition logs.{" "}
          <span className="font-semibold text-blaze-500">
            This cannot be undone.
          </span>
        </p>

        <div className="flex flex-col gap-2">
          <Button variant="danger" full onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting..." : "Delete my account"}
          </Button>
          <Button variant="ghost" full onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
