import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";

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

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
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
