import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Button } from "../components/ui/Button";

const perks = [
  "Log a set with ease",
  "Track macros without the math",
  "Watch your progress over time",
];

export default function Register() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <AuthLayout>
          <h1 className="font-display text-4xl font-bold leading-none mb-2">
            Start your streak.
          </h1>
          <p className="text-bone-300 text-sm mb-10">
            Set up takes under a minute. Your first log takes ten seconds.
          </p>

          <ul className="flex flex-col gap-3 mb-10">
            {perks.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-3 text-sm text-bone-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-volt-500" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4">
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <Button type="button" className="cursor-pointer">
                Create account
              </Button>
            </SignUpButton>
          </div>

          <p className="text-xs text-bone-500 mt-10 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-volt-500 font-semibold">
              Sign in
            </Link>
          </p>
        </AuthLayout>
      </SignedOut>
    </>
  );
}
