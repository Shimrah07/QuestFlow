import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/common/Spinner";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-bg-deep flex items-center justify-center relative">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <Spinner size="lg" color="violet" />
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-Based Access Control (RBAC) check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Notify user of insufficient permission scopes
    showToast(`Access Denied: Operational tier '${user.role}' lacks credentials.`, "error");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
