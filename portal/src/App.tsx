import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { initRealtime } from "./lib/realtime";
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

const RequireRole: React.FC<{
  allowed: Role[];
  children: React.ReactElement;
}> = ({ allowed, children }) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role as Role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
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

const staffRoles: Role[] = ["digidromen_staff", "digidromen_admin"];
const operationsRoles: Role[] = [
  "digidromen_staff",
  "digidromen_admin",
  "service_partner",
];
const adminRoles: Role[] = ["digidromen_admin"];

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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/repairs" element={<Navigate to="/orders" replace />} />
                <Route path="/repairs/:id" element={<Navigate to="/orders" replace />} />
                <Route path="/planning" element={<RequireRole allowed={operationsRoles}><Planning /></RequireRole>} />
                <Route path="/donations" element={<RequireRole allowed={operationsRoles}><Donations /></RequireRole>} />
                <Route path="/donations/:id" element={<RequireRole allowed={operationsRoles}><DonationDetail /></RequireRole>} />
                <Route path="/inventory" element={<RequireRole allowed={operationsRoles}><Inventory /></RequireRole>} />
                <Route path="/reports" element={<RequireRole allowed={staffRoles}><Reports /></RequireRole>} />
                <Route path="/crm-sync" element={<RequireRole allowed={staffRoles}><CrmSync /></RequireRole>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<RequireRole allowed={adminRoles}><Users /></RequireRole>} />
                <Route path="/organizations" element={<RequireRole allowed={staffRoles}><Organizations /></RequireRole>} />
                <Route path="/organizations/:id" element={<RequireRole allowed={staffRoles}><OrganizationDetail /></RequireRole>} />
                <Route path="/forecast" element={<RequireRole allowed={staffRoles}><Forecast /></RequireRole>} />
                <Route path="/audit-log" element={<RequireRole allowed={adminRoles}><AuditLog /></RequireRole>} />
                <Route path="/stock-locations" element={<RequireRole allowed={staffRoles}><StockLocations /></RequireRole>} />
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
