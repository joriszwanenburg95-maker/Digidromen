import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Repairs from './pages/Repairs';
import Donations from './pages/Donations';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CrmSync from './pages/CrmSync';
import Login from './pages/Login';
import OrderDetail from './pages/OrderDetail';
import RepairDetail from './pages/RepairDetail';
import DonationDetail from './pages/DonationDetail';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
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
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
