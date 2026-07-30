import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import {
  Trophy,
  CheckCircle2,
  Hourglass,
  DollarSign,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tasksRes, expensesRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/expenses").catch(() => ({ data: [] }))
        ]);
        setTasks(tasksRes.data);
        setExpenses(expensesRes.data || []);
      } catch (error) {
        showToast("Error retrieving dashboard summary.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="violet" />
      </div>
    );
  }

  // Calculate dynamic stats
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const activeTasks = tasks.filter((t) => t.status === "In Progress" || t.status === "Todo");
  
  const pendingExpenses = expenses.filter((e) => e.status === "Pending");
  const approvedExpenses = expenses.filter((e) => e.status === "Approved");
  const totalApprovedLedger = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingLedger = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const stats = [
    {
      label: "Accrued Experience",
      value: `${user?.points || 0} XP`,
      subtext: `Level ${user?.level || 1} Operator`,
      icon: Trophy,
      color: "violet",
    },
    {
      label: "Operations Completed",
      value: `${completedTasks.length}`,
      subtext: `${activeTasks.length} Active pipeline operations`,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Expense Submissions",
      value: `${pendingExpenses.length} Pending`,
      subtext: `${approvedExpenses.length} Claims approved`,
      icon: Hourglass,
      color: "amber",
    },
    {
      label: "Disbursed Ledger",
      value: `$${totalApprovedLedger.toFixed(2)}`,
      subtext: `$${totalPendingLedger.toFixed(2)} under audit review`,
      icon: DollarSign,
      color: "rose",
    },
  ];

  // Get top 3 tasks for display
  const recentTasks = tasks.slice(-3).reverse();

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="relative p-8 rounded-2xl border border-neon-violet/10 bg-gradient-to-r from-bg-panel/80 via-slate-900/50 to-bg-panel/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-neon-violet/5 blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest text-neon-violet uppercase">
              System Dashboard Grid
            </span>
            <h1 className="text-3xl font-display font-extrabold text-slate-100">
              Welcome Back, Agent {user?.first_name}
            </h1>
            <p className="text-sm text-slate-400">
              Workspace connection verified. Access Tier: {user?.role}. Operational cycle is active.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of HUD Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} glowColor={stat.color} className="relative overflow-hidden bg-bg-card">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {stat.label}
                  </span>
                  <span className="text-2xl font-display font-extrabold text-slate-100 mt-1">
                    {stat.value}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    {stat.subtext}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg border bg-slate-950/40 border-slate-900/60 text-neon-${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Grid layout for further components */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Activity Summary List */}
        <Card glowColor="none" hoverEffect={false} className="lg:col-span-2 bg-bg-card border-slate-900/60">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-sm tracking-wider uppercase text-slate-200">
              Assigned Operations Pipeline
            </h3>
            <Link to="/tasks" className="text-[10px] font-bold text-neon-violet hover:underline flex items-center gap-1 uppercase tracking-wider">
              See Board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-sans text-xs">
              No tasks currently deployed in this sector.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentTasks.map((task, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-900/40 bg-slate-950/20 hover:border-slate-800/60 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === "Todo" ? "bg-neon-amber" : 
                      task.status === "In Progress" ? "bg-neon-violet" : 
                      "bg-neon-emerald"
                    }`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-300 pr-2">{task.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">Status: {task.status}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neon-violet/10 border border-neon-violet/25 text-neon-violet font-mono uppercase tracking-wider">
                    {task.xp} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Gamified Achievements Spotlight panel */}
        <Card glowColor="none" hoverEffect={false} className="bg-bg-card border-slate-900/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm tracking-wider uppercase text-slate-200">
                Achievements Radar
              </h3>
              <Link to="/leaderboard" className="text-[10px] font-bold text-neon-violet hover:underline uppercase tracking-wider flex items-center gap-1">
                Gallery <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {[
                {
                  title: "First Ascent",
                  desc: "Achieved Level 2 clearance",
                  unlocked: (user?.level || 1) >= 2,
                  icon: "⛰️",
                },
                {
                  title: "Bug Squash Commando",
                  desc: "Accumulated 300+ XP",
                  unlocked: (user?.points || 0) >= 300,
                  icon: "🐞",
                },
                {
                  title: "Financial Architect",
                  desc: "Accumulated 1000+ XP",
                  unlocked: (user?.points || 0) >= 1000,
                  icon: "🏦",
                },
                {
                  title: "Ledger Sentinel",
                  desc: "Manager or Admin role",
                  unlocked: user?.role === "Manager" || user?.role === "Admin",
                  icon: "🛡️",
                },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                    badge.unlocked
                      ? "border-neon-violet/20 bg-neon-violet/5 text-slate-200"
                      : "border-slate-900/60 bg-slate-950/40 opacity-45"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      badge.unlocked
                        ? "bg-neon-violet/10 border border-neon-violet/20"
                        : "bg-slate-900 border border-slate-800"
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{badge.title}</span>
                    <span className="text-[9px] text-slate-400 font-mono truncate">{badge.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-neon-emerald" /> Radar Active</span>
            <span className="text-[10px] text-neon-emerald font-bold uppercase">Live Sync</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
