import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, Show, SignIn, useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import TenantsPage from "@/pages/tenants";
import TenantDetailPage from "@/pages/tenant-detail";
import PlansPage from "@/pages/plans";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ApiAuthSetup() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function SignInRoute() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <SignIn routing="hash" fallbackRedirectUrl={basePath + "/dashboard"} />
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <>
      <ApiAuthSetup />
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/tenants" component={TenantsPage} />
          <Route path="/tenants/:id">
            {(params) => <TenantDetailPage tenantId={params.id} />}
          </Route>
          <Route path="/plans" component={PlansPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

function GuestRouter() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInRoute} />
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
          <WouterRouter base={basePath}>
            <Show when="signed-in">
              <AuthenticatedRouter />
            </Show>
            <Show when="signed-out">
              <GuestRouter />
            </Show>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
