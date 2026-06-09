import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Button } from "../components/ui/Button";

export default function Login() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <AuthLayout>
          <div className="mb-5 font-mono text-xs tracking-[0.3em] text-bone-500">
            // SIGN IN
          </div>
          <h1 className="font-display text-4xl font-bold leading-none mb-2">
            Welcome back.
          </h1>
          <p className="text-bone-300 text-sm mb-10">
            Sign in to log today's session.
          </p>

          <div className="flex flex-col gap-4">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button type="button" className="cursor-pointer">
                Sign in
              </Button>
            </SignInButton>
          </div>

          <p className="text-xs text-bone-500 mt-10 text-center">
            Don't have an account?{" "}
            <Link to="/register" className="text-volt-500 font-semibold">
              Sign up
            </Link>
          </p>
        </AuthLayout>
      </SignedOut>
    </>
  );
}
