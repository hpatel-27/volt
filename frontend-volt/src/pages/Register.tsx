import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Button } from "../components/ui/Button";

const perks = [
  "Sets, reps, and weight in seconds",
  "Macros counted for each day",
  "Your weight trend at a glance",
];

export default function Register() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <AuthLayout>
          <div className="mb-5 font-mono text-xs tracking-[0.3em] text-bone-500">
            // CREATE ACCOUNT
          </div>
          <h1 className="font-display text-4xl font-bold leading-none mb-2">
            Log day one.
          </h1>
          <p className="text-bone-300 text-sm mb-10">
            Setup takes a minute. Your first set takes ten seconds.
          </p>

          <ul className="flex flex-col gap-3 mb-10">
            {perks.map((perk, i) => (
              <li
                key={perk}
                className="flex items-center gap-3 text-sm text-bone-200"
              >
                <span className="font-mono text-[11px] tabular-nums text-volt-500">
                  0{i + 1}
                </span>
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
