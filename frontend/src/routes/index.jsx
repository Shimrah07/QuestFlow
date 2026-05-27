import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

// Layout templates
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

// Route security guards
import ProtectedRoute from "./ProtectedRoute";

// Page Views
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import Tasks from "../pages/tasks/Tasks";
import Expenses from "../pages/expenses/Expenses";
import Approvals from "../pages/approvals/Approvals";
import Gamification from "../pages/gamification/Gamification";
import ManageUsers from "../pages/admin/ManageUsers";
import ManageProjects from "../pages/admin/ManageProjects";
import SystemReports from "../pages/admin/SystemReports";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Session authentication routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Core authenticated workspace routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/expenses" element={<Expenses />} />
              
              {/* Role-Restricted Approvals Endpoint (Managers & Admins only) */}
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
                    <Approvals />
                  </ProtectedRoute>
                }
              />

              {/* Admin specific pages */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <ManageUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <ManageProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <SystemReports />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/gamification" element={<Gamification />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
