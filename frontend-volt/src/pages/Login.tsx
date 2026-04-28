import { AuthLayout } from "../components/layout/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function Login() {
  return (
    <AuthLayout>
      <h1 className="font-display text-4xl font-bold leading-[1] mb-2">Welcome back.</h1>
      <p className="text-bone-300 text-sm mb-10">Sign in to log today's session.</p>
      <form className="flex flex-col gap-4">
        <Input label="Email" type="email" defaultValue="athlete@volt.app" />
        <Input label="Password" type="password" defaultValue="••••••••••" />
        <Button type="submit" className="mt-2">Sign in</Button>
        <Button variant="outline" type="button">Continue with Google</Button>
      </form>
      <p className="text-xs text-bone-500 mt-10 text-center">
        Don't have an account? <a href="/register" className="text-volt-500 font-semibold">Sign up</a>
      </p>
    </AuthLayout>
  );
}
