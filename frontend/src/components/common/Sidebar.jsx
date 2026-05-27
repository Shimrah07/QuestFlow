import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  CheckSquare,
  Receipt,
  FileCheck,
  Trophy,
  ShieldCheck,
  Cpu,
  Users,
  FolderGit2,
  BarChart3
} from "lucide-react";

const Sidebar = () => {
  const { user } = useAuth();

  const links = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "Manager", "Employee"],
    },
    {
      to: "/tasks",
      label: "Task Operations",
      icon: CheckSquare,
      roles: ["Admin", "Manager", "Employee"],
    },
    {
      to: "/expenses",
      label: "Expense Tracking",
      icon: Receipt,
      roles: ["Admin", "Employee"],
    },
    {
      to: "/approvals",
      label: "Review Queues",
      icon: FileCheck,
      roles: ["Admin", "Manager"], // Block Employees in RBAC
      badge: "Pending",
    },
    {
      to: "/admin/users",
      label: "Manage Users",
      icon: Users,
      roles: ["Admin"],
    },
    {
      to: "/admin/projects",
      label: "Manage Projects",
      icon: FolderGit2,
      roles: ["Admin"],
    },
    {
      to: "/admin/reports",
      label: "System Reports",
      icon: BarChart3,
      roles: ["Admin"],
    },
    {
      to: "/gamification",
      label: "Leaderboards",
      icon: Trophy,
      roles: ["Admin", "Manager", "Employee"],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-900/60 bg-bg-deep flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Branding Panel */}
      <div className="flex flex-col">
        <div className="h-16 px-6 border-b border-slate-900/60 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-violet/10 border border-neon-violet/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-neon-violet" />
          </div>
          <span className="font-display font-bold tracking-wider text-[9px] text-slate-100 neon-text-violet">
            Gamified Task & Expense Management System
          </span>

        </div>

        {/* Navigation list */}
        <nav className="p-4 flex flex-col gap-1.5 mt-4">
          {links
            .filter((link) => link.roles.includes(user?.role))
            .map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `
                    flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all group duration-300
                    ${
                      isActive
                        ? "bg-neon-violet/10 border-neon-violet/30 text-neon-violet shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 hover:border-slate-800/40"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 transition-colors" />
                    <span>{link.label}</span>
                  </div>
                  
                  {link.badge && user?.role !== "Employee" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-neon-amber/10 border border-neon-amber/20 text-neon-amber uppercase tracking-widest animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Role Footer Indicators */}
      <div className="p-4 border-t border-slate-900/60 bg-slate-950/20">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-900/40 bg-slate-950/40">
            <ShieldCheck className="w-4 h-4 text-neon-emerald" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                Access Tier:
              </span>
              <span className="text-xs font-extrabold text-neon-emerald uppercase tracking-wider font-mono leading-none mt-1">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
