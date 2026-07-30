import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
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
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    if (!user || user.role === "Employee") return;
    try {
      const response = await api.get("/expenses");
      const pending = response.data.filter((e) => e.status === "Pending");
      setPendingCount(pending.length);
    } catch (error) {
      // ignore silently if network fails
    }
  };

  useEffect(() => {
    fetchPendingCount();

    const handleUpdate = () => fetchPendingCount();
    window.addEventListener("approvals-updated", handleUpdate);
    const interval = setInterval(fetchPendingCount, 10000);

    return () => {
      window.removeEventListener("approvals-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [user]);

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
      roles: ["Admin", "Manager", "Employee"],
    },
    {
      to: "/approvals",
      label: "Approvals",
      icon: FileCheck,
      roles: ["Admin", "Manager"], // Block Employees in RBAC
      badge: pendingCount > 0 ? `Pending (${pendingCount})` : null,
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
        <div className="h-16 px-6 border-b border-slate-900/60 flex items-center gap-3">
          <img src="/logo.svg" alt="QuestFlow Logo" className="w-8 h-8 object-contain flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-display font-extrabold text-sm tracking-wider text-slate-100 neon-text-violet uppercase leading-tight">
              QuestFlow
            </span>
            <span className="text-[7.5px] font-mono tracking-tight text-slate-400 truncate leading-tight mt-0.5">
              Complete Tasks. Earn Progress. Stay Motivated.
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3.5 flex flex-col gap-1.5 mt-2">
          {links
            .filter((link) => link.roles.includes(user?.role))
            .map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all group duration-300 min-w-0
                    ${isActive
                      ? "bg-neon-violet/10 border-neon-violet/30 text-neon-violet shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 hover:border-slate-800/40"
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 flex-shrink-0 transition-colors" />
                    <span className="truncate whitespace-nowrap">{link.label}</span>
                  </div>

                  {link.badge && user?.role !== "Employee" && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-neon-amber/10 border border-neon-amber/20 text-neon-amber uppercase tracking-wider whitespace-nowrap flex-shrink-0 ml-1.5 animate-pulse">
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

