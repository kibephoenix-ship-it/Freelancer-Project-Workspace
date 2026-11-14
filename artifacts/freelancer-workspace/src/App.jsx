import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthPage from '@/components/auth-page';
import {
  Clients,
  Invoices,
  Projects,
  Proposals,
  WorkspaceNotFound,
  WorkspaceShell,
} from '@/components/workspace-ui';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function MarketingPage() {
  return (
    <iframe
      title="SyncFlow freelancer workspace"
      src="/syncflow-workflow.html"
      className="block h-screen w-full border-0"
    />
  );
}

function DashboardPage() {
  return (
    <iframe
      title="SyncFlow client retainer and scope dashboard"
      src="/syncflow-client-retainer-dashboard.html"
      className="fixed inset-0 h-screen w-full border-0"
    />
  );
}

function WorkspaceRoutes() {
  return (
    <WorkspaceShell>
      <Switch>
        <Route path="/clients" component={Clients} />
        <Route path="/projects" component={Projects} />
        <Route path="/proposals" component={Proposals} />
        <Route path="/invoices" component={Invoices} />
        <Route component={WorkspaceNotFound} />
      </Switch>
    </WorkspaceShell>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={MarketingPage} />
        <Route path="/login" component={AuthPage} />
        <Route path="/signup" component={AuthPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route component={WorkspaceRoutes} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }) {
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
