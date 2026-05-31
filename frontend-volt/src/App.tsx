import { Routes, Route, Navigate } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { AppLayout } from "./components/layout/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import WorkoutPlan from "./pages/WorkoutPlan";
import Log from "./pages/Log";
import Exercises from "./pages/Exercises";
import Nutrition from "./pages/Nutrition";
import NutritionLog from "./pages/NutritionLog";
import Weight from "./pages/Weight";
import Profile from "./pages/Profile";
import NutritionLayout from "./components/layout/NutritionLayout";
import { useDelayedFlag } from "./hooks/useDelayedFlag";
import { Spinner } from "./components/ui/Spinner";
import { Toaster } from "sonner";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const showSpinner = useDelayedFlag(!isLoaded, 150);

  if (!isLoaded) {
    // Render a spinner while Clerk is initializing, if the 150 ms delay has passed
    return showSpinner ? <Spinner fullscreen={true} /> : null;
  } else if (isLoaded && !isSignedIn) {
    // Redirect to the login page if the user is not signed in
    return <Navigate to="/login" replace />;
  } else if (isLoaded && isSignedIn) {
    // Render the protected layout using AppLayout
    // AppLay itself contains the <Outlet /> where the nested routes will be rendered
    return <AppLayout />;
  }
}

export function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Workouts />} />
          <Route path="/plans/:planId" element={<WorkoutPlan />} />
          <Route path="/workouts" element={<Log />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route element={<NutritionLayout />}>
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/nutrition/:date" element={<NutritionLog />} />
          </Route>
          <Route path="/weight" element={<Weight />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
      <Toaster theme="dark" richColors />
    </ClerkProvider>
  );
}
