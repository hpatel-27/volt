import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useUpdateProfile } from "../../api/user";
import type { UpdateUserInput, User } from "../../types/user";
import { parseBoundedString, parsePositiveNumber } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";

interface ProfileEntrySheetProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

/**
 * Compares the current form values against the user as last loaded and returns
 * the PATCH payload to send — only the fields that actually changed.
 *
 * @returns an `UpdateUserInput` with the changed fields, or `null` if a value is
 *   invalid (so the caller can surface an error instead of sending a bad request).
 *   An empty object `{}` means "nothing changed".
 */
function buildUpdatePayload(
  form: { firstName: string; lastName: string; height: string },
  original: User,
): UpdateUserInput | null {
  // Don't add empty string or invalid values to the payload
  // Empty strings and falsy values will throw an error on the backend
  const payload: UpdateUserInput = {};
  const firstName = parseBoundedString(form.firstName, {
    maxLen: LIMITS.PERSON_NAME_MAX,
    allowEmpty: true,
  });
  const lastName = parseBoundedString(form.lastName, {
    maxLen: LIMITS.PERSON_NAME_MAX,
    allowEmpty: true,
  });

  const height = parsePositiveNumber(form.height, LIMITS.HEIGHT_MAX, {
    allowEmpty: true,
  });

  if (firstName && firstName !== original.firstName)
    payload.firstName = firstName;
  if (lastName && lastName !== original.lastName) payload.lastName = lastName;

  // Height string or null (indicates a empty string)
  if (height) {
    if (height !== original.height) payload.height = height;
  } else if (height === false) {
    // Could be false (invalid height)
    return null;
  }

  return payload;
}

export function ProfileEntrySheet({
  open,
  onClose,
  user,
}: ProfileEntrySheetProps) {
  // The parent remounts this sheet on every open (via a changing key), so these
  // lazy initializers re-run with the current user — no prop→state effect needed.
  const [firstName, setFirstName] = useState(() => user.firstName ?? "");
  const [lastName, setLastName] = useState(() => user.lastName ?? "");
  const [height, setHeight] = useState(() =>
    user.height != null ? String(user.height) : "",
  );

  const updateProfile = useUpdateProfile();

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = buildUpdatePayload({ firstName, lastName, height }, user);
    if (payload === null) {
      toast.error("Please check your details - those values look off.");
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast("Nothing to update - make a change first.");
      return;
    }

    updateProfile.mutate(payload, {
      onSuccess: () => {
        toast.success("Profile updated.");
        onClose();
      },
      onError: () => toast.error("Could not update profile. Please try again."),
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            optional
            value={firstName}
            maxLength={LIMITS.PERSON_NAME_MAX}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
          <Input
            label="Last name"
            optional
            value={lastName}
            maxLength={LIMITS.PERSON_NAME_MAX}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>

        <Input
          label="Height (cm)"
          optional
          type="number"
          inputMode="decimal"
          step="0.1"
          value={height}
          max={LIMITS.HEIGHT_MAX}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="165"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={updateProfile.isPending}
          className="hover:bg-volt-600"
        >
          {updateProfile.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Sheet>
  );
}
