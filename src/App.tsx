/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CashCounter from './pages/CashCounter';
import FuelManagement from './pages/FuelManagement';
import PartyLedger from './pages/PartyLedger';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import SellTransactions from './pages/SellTransactions';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes wrapped in Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="cash" element={<CashCounter />} />
            <Route path="fuels" element={<FuelManagement />} />
            <Route path="ledger" element={<PartyLedger />} />
            <Route path="inventory" element={<Inventory />} />
            
            {/* Admin Only Routes */}
            <Route 
              path="users" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Users />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="transactions" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SellTransactions />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
