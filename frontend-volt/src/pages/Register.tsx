import { AuthLayout } from "../components/layout/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function Register() {
  return (
    <AuthLayout>
      <h1 className="font-display text-4xl font-bold leading-[1] mb-2">Create your account.</h1>
      <p className="text-bone-300 text-sm mb-10">Start logging in under a minute.</p>
      <form className="flex flex-col gap-4">
        <Input label="Name" />
        <Input label="Email" type="email" />
        <Input label="Password" type="password" />
        <Button type="submit" className="mt-2">Create account</Button>
      </form>
      <p className="text-xs text-bone-500 mt-10 text-center">
        Already have an account? <a href="/login" className="text-volt-500 font-semibold">Sign in</a>
      </p>
    </AuthLayout>
  );
}
