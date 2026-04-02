import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { initRealtime } from "./lib/realtime";

const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Repairs = lazy(() => import("./pages/Repairs"));
const RepairDetail = lazy(() => import("./pages/RepairDetail"));
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
  useEffect(() => initRealtime(queryClient), [queryClient]);
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/repairs" element={<Repairs />} />
                <Route path="/repairs/:id" element={<RepairDetail />} />
                <Route path="/donations" element={<Donations />} />
                <Route path="/donations/:id" element={<DonationDetail />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/crm-sync" element={<CrmSync />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/organizations/:id" element={<OrganizationDetail />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/stock-locations" element={<StockLocations />} />
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
