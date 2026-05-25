import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import WelcomePage from "@/pages/welcome";
import BusinessPage from "@/pages/business-page";
import JoinQueuePage from "@/pages/join-queue";
import BookPage from "@/pages/book";
import TrackPage from "@/pages/track";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomePage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/:slug/book" component={BookPage} />
      <Route path="/:slug/join" component={JoinQueuePage} />
      <Route path="/:slug" component={BusinessPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
