import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Redirect to login if user is not authenticated
  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get current page title dynamically from route paths
  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return "Dashboard Grid";
    return path.split("/")[0].replace("-", " ") + " Hub";
  };

  return (
    <div className="flex bg-bg-deep min-h-screen text-slate-100 font-sans relative">
      {/* Dynamic Cyber Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Floating neon ambient blur elements */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-blur-1 blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] rounded-full bg-blur-2 blur-[120px] pointer-events-none" />

      {/* Persistent Left Nav Navigation */}
      <Sidebar />

      {/* Core main workspace layout */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar pageTitle={getPageTitle()} />

        {/* Inner workspace viewport container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
