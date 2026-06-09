import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { initRealtime } from "./lib/realtime";
import { isRouteAllowed } from "./lib/roleSurface";
import type { Role } from "./lib/workflow";

const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Planning = lazy(() => import("./pages/Planning"));
const Donations = lazy(() => import("./pages/Donations"));
const DonationDetail = lazy(() => import("./pages/DonationDetail"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const CrmSync = lazy(() => import("./pages/CrmSync"));
const Login = lazy(() => import("./pages/Login"));
const Users = lazy(() => import("./pages/Users"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const Forecast = lazy(() => import("./pages/Forecast"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const StockLocations = lazy(() => import("./pages/StockLocations"));

const RouteFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Portal laden...</div>
);

const RouteGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user || !isRouteAllowed(user.role as Role, pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Afgeslankte bestelportal: het dashboard ("Start"/"Regie") is gearchiveerd voor
// hulporganisatie, medewerker en beheerder. Zij landen direct op de bestellingen.
// Service partner houdt voorlopig zijn werkvoorraad-dashboard.
const DashboardRoute: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;
  if (
    role === "help_org" ||
    role === "digidromen_staff" ||
    role === "digidromen_admin"
  ) {
    return <Navigate to="/orders" replace />;
  }
  return <Dashboard />;
};

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

const LoginRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
};

const RealtimeInit: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = (user?.role as Role | undefined) ?? null;
  const organizationId = user?.organizationId;
  useEffect(
    () => initRealtime(queryClient, { role, organizationId }),
    [queryClient, role, organizationId],
  );
  return null;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <RealtimeInit />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />

              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardRoute />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/repairs" element={<Navigate to="/orders" replace />} />
                <Route path="/repairs/:id" element={<Navigate to="/orders" replace />} />
                <Route path="/planning" element={<RouteGuard><Planning /></RouteGuard>} />
                <Route path="/donations" element={<RouteGuard><Donations /></RouteGuard>} />
                <Route path="/donations/:id" element={<RouteGuard><DonationDetail /></RouteGuard>} />
                <Route path="/inventory" element={<RouteGuard><Inventory /></RouteGuard>} />
                <Route path="/reports" element={<RouteGuard><Reports /></RouteGuard>} />
                <Route path="/crm-sync" element={<RouteGuard><CrmSync /></RouteGuard>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<RouteGuard><Users /></RouteGuard>} />
                <Route path="/organizations" element={<RouteGuard><Organizations /></RouteGuard>} />
                <Route path="/organizations/:id" element={<RouteGuard><OrganizationDetail /></RouteGuard>} />
                <Route path="/forecast" element={<RouteGuard><Forecast /></RouteGuard>} />
                <Route path="/audit-log" element={<RouteGuard><AuditLog /></RouteGuard>} />
                <Route path="/stock-locations" element={<RouteGuard><StockLocations /></RouteGuard>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
