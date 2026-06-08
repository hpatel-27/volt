import { UserButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { Pencil } from "lucide-react";

/**
 * The single account avatar for the whole app (mobile top bar + desktop
 * sidebar). Clerk's UserButton renders the avatar (image or initials) and owns
 * account management + sign-out; we add one custom item that routes to our own
 * profile page. Using UserButton.Action with `useNavigate` keeps the jump
 * client-side — a UserButton.Link href would hard-reload, since this app's
 * ClerkProvider has no router integration configured.
 */
export function AccountButton() {
  const navigate = useNavigate();

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Edit profile"
          labelIcon={<Pencil size={14} />}
          onClick={() => navigate("/profile")}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
