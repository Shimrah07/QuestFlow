import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { ThemeProvider } from "../context/ThemeContext";
import { NotificationProvider } from "../context/NotificationContext";
import Spinner from "../components/common/Spinner";

// Layout templates
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

// Route security guards
import ProtectedRoute from "./ProtectedRoute";

// Lazy-loaded Page Views
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Tasks = lazy(() => import("../pages/tasks/Tasks"));
const Expenses = lazy(() => import("../pages/expenses/Expenses"));
const Approvals = lazy(() => import("../pages/approvals/Approvals"));
const Gamification = lazy(() => import("../pages/gamification/Gamification"));
const ManageUsers = lazy(() => import("../pages/admin/ManageUsers"));
const ManageProjects = lazy(() => import("../pages/admin/ManageProjects"));
const SystemReports = lazy(() => import("../pages/admin/SystemReports"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Spinner size="lg" color="violet" />
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Session authentication routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
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
              </Suspense>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
