import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Clients, Invoices, Overview, Projects, Proposals, WorkspaceNotFound, WorkspaceShell, } from '@/components/workspace-ui';
import { Route, Switch, useLocation, Router as WouterRouter, } from 'wouter';
const queryClient = new QueryClient();
function Router() {
    return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    _jsx(RoutedErrorBoundary, { children: _jsx(WorkspaceShell, { children: _jsxs(Switch, { children: [_jsx(Route, { path: "/", component: Overview }), _jsx(Route, { path: "/clients", component: Clients }), _jsx(Route, { path: "/projects", component: Projects }), _jsx(Route, { path: "/proposals", component: Proposals }), _jsx(Route, { path: "/invoices", component: Invoices }), _jsx(Route, { component: WorkspaceNotFound })] }) }) }));
}
function RoutedErrorBoundary({ children }) {
    const [location] = useLocation();
    return _jsx(ErrorBoundary, { resetKey: location, children: children });
}
function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(TooltipProvider, { children: [_jsx(WouterRouter, { base: import.meta.env.BASE_URL.replace(/\/$/, ''), children: _jsx(Router, {}) }), _jsx(Toaster, {})] }) }));
}
export default App;
