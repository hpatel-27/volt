import Landing from "./pages/Landing";
import { Routes, Route } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

export function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </ClerkProvider>
  );
}
