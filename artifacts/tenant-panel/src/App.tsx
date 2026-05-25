import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, Show, SignIn, SignUp } from "@clerk/react";

import { Layout } from "./components/layout";
import Dashboard from "./pages/dashboard";
import Businesses from "./pages/businesses";
import QueuePage from "./pages/queue";
import AppointmentsPage from "./pages/appointments";
import ServicesPage from "./pages/services";
import ProfessionalsPage from "./pages/professionals";
import SettingsPage from "./pages/settings";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function SignInRoute() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <SignIn routing="hash" fallbackRedirectUrl={basePath + "/dashboard"} />
    </div>
  );
}

function SignUpRoute() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <SignUp routing="hash" fallbackRedirectUrl={basePath + "/dashboard"} />
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/queue" component={QueuePage} />
        <Route path="/queues" component={QueuePage} />
        <Route path="/appointments" component={AppointmentsPage} />
        <Route path="/businesses" component={Businesses} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/professionals" component={ProfessionalsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function GuestRouter() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInRoute} />
      <Route path="/sign-up/*?" component={SignUpRoute} />
      <Route path="/" component={SignInRoute} />
      <Route component={SignInRoute} />
    </Switch>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Missing Clerk Publishable Key</h1>
          <p className="text-muted-foreground">The Clerk publishable key is not configured. Please check your environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Show when="signed-in">
            <AuthenticatedRouter />
          </Show>
          <Show when="signed-out">
            <GuestRouter />
          </Show>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
