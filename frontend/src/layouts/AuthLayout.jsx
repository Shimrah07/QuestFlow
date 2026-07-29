import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "../components/common/ThemeToggle";

const AuthLayout = () => {
  const { user } = useAuth();

  // Redirect to dashboard immediately if user is logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-screen flex bg-bg-deep font-sans overflow-hidden relative">
      {/* Dynamic Cyber Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

      {/* Floating neon ambient blur elements */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blur-1 blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blur-2 blur-[150px] pointer-events-none" />

      {/* Left Pane - Cinematic Cyberpunk Branding (Hidden on Small Screens) */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative border-r border-slate-900/50 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-neon-violet/10 border border-neon-violet/30 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-neon-violet" />
          </div>
          <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-100 neon-text-violet">
            Gamified Task & Expense Management System
          </span>

        </div>

        <div className="flex flex-col gap-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-neon-violet bg-neon-violet/10 border border-neon-violet/25">
              Protocol v2.10
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl xl:text-5xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-neon-violet leading-tight"
          >
            Gamified Task & Expense Pipeline.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-400 text-base leading-relaxed"
          >
            Optimize workflows, verify employee expense requests with cryptographically secure trails, and level up your engineering output.
          </motion.p>
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-neon-emerald" />
          <span>Secured with AES-256 and RBAC Protocol</span>
        </div>
      </div>

      {/* Right Pane - Form container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
