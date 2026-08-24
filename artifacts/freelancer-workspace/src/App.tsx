import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Clients,
  Invoices,
  Overview,
  Projects,
  Proposals,
  WorkspaceNotFound,
  WorkspaceShell,
} from '@/components/workspace-ui';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <WorkspaceShell>
        <Switch>
        <Route path="/" component={Overview} />
        <Route path="/clients" component={Clients} />
        <Route path="/projects" component={Projects} />
        <Route path="/proposals" component={Proposals} />
        <Route path="/invoices" component={Invoices} />
        <Route component={WorkspaceNotFound} />
        </Switch>
      </WorkspaceShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
