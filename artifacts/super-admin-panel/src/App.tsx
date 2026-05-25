import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type User = { id: string; email: string; name: string; role: string };

function getStoredUser(): { user: User; token: string } | null {
  try {
    const raw = localStorage.getItem("saas_admin_user");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.token && data?.user?.role === "super_admin") return data;
  } catch { /* ignore */ }
  return null;
}

function ApiAuthSetup({ token }: { token: string }) {
  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => setAuthTokenGetter(null);
  }, [token]);
  return null;
}

function App() {
  const stored = getStoredUser();
  const [session, setSession] = useState<{ user: User; token: string } | null>(stored);

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem("saas_admin_user", JSON.stringify({ user, token }));
    setSession({ user, token });
    // Also pre-configure the query client to use the new token
    setAuthTokenGetter(() => token);
  };

  const handleLogout = () => {
    localStorage.removeItem("saas_admin_user");
    setAuthTokenGetter(null);
    setSession(null);
  };

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Switch>
              <Route path="/" component={() => <LoginPage onLogin={handleLogin} />} />
              <Route component={() => <LoginPage onLogin={handleLogin} />} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ApiAuthSetup token={session.token} />
          <Layout user={session.user} onLogout={handleLogout}>
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
