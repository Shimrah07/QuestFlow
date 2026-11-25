import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/common/Spinner";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const denied = !loading && user && allowedRoles && !allowedRoles.includes(user.role);

  // Notify after render (not during it) so the toast fires exactly once per redirect.
  useEffect(() => {
    if (denied) {
      showToast(`Your ${user.role} role doesn't have access to that page.`, "error");
    }
  }, [denied, showToast, user?.role]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] w-full place-items-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-Based Access Control (RBAC) check
  if (denied) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
