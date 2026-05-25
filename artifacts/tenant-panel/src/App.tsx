import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Layout } from "./components/layout";
import LoginPage from "./pages/login";
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

type User = { id: string; email: string; name: string; role: string; tenantId: string };

function getStoredUser(): { user: User; token: string } | null {
  try {
    const raw = localStorage.getItem("saas_tenant_user");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.token && data?.user?.tenantId) return data;
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
    localStorage.setItem("saas_tenant_user", JSON.stringify({ user, token }));
    setSession({ user, token });
    setAuthTokenGetter(() => token);
  };

  const handleLogout = () => {
    localStorage.removeItem("saas_tenant_user");
    setAuthTokenGetter(null);
    setSession(null);
  };

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ApiAuthSetup token={session.token} />
        <Layout user={session.user} onLogout={handleLogout}>
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
