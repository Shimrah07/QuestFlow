import React, { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { BarChart3, TrendingUp, DollarSign, CheckCircle2, Users, FolderGit2 } from "lucide-react";

const SystemReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get("/reports/summary");
        setData(response.data);
      } catch (error) {
        showToast("Failed to fetch system reports data.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="violet" />
      </div>
    );
  }

  const taskCompletionRate = data.tasks.total > 0 
    ? Math.round((data.tasks.completed / data.tasks.total) * 100) 
    : 0;

  const totalExpenseBudget = data.expenses.approved_amount + data.expenses.pending_amount + data.expenses.rejected_amount;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-neon-rose uppercase">Data Analytics</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">SYSTEM INSIGHTS & REPORTS</h1>
      </div>

      {/* Numerical Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card glowColor="violet" className="bg-bg-card border-slate-900 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Staff Registry</span>
            <span className="text-2xl font-display font-extrabold text-slate-100">{data.users_count}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neon-violet/10 border border-neon-violet/20 text-neon-violet">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card glowColor="emerald" className="bg-bg-card border-slate-900 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Projects</span>
            <span className="text-2xl font-display font-extrabold text-slate-100">{data.projects_count}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neon-emerald/10 border border-neon-emerald/20 text-neon-emerald">
            <FolderGit2 className="w-5 h-5" />
          </div>
        </Card>

        <Card glowColor="rose" className="bg-bg-card border-slate-900 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Paid Out Expenses</span>
            <span className="text-2xl font-display font-extrabold text-slate-100">${data.expenses.approved_amount.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neon-rose/10 border border-neon-rose/20 text-neon-rose">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card glowColor="amber" className="bg-bg-card border-slate-900 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pending Ledger Claims</span>
            <span className="text-2xl font-display font-extrabold text-slate-100">${data.expenses.pending_amount.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neon-amber/10 border border-neon-amber/20 text-neon-amber">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completions analytics card */}
        <Card glowColor="violet" hoverEffect={false} className="bg-bg-card border-slate-900">
          <h3 className="font-display font-bold text-sm tracking-wider uppercase text-slate-200 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neon-violet" /> Task Completion Statistics
          </h3>

          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-slate-900/60">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Completed Nodes Ratio</span>
                <span className="text-3xl font-display font-extrabold text-slate-200 mt-1">{taskCompletionRate}%</span>
              </div>
              <div className="w-24 h-24 rounded-full border-4 border-slate-900 flex items-center justify-center relative">
                <span className="text-sm font-extrabold font-mono text-neon-violet">{data.tasks.completed}/{data.tasks.total}</span>
              </div>
            </div>

            {/* Distribution metrics */}
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>STAGING AREA (TODO)</span>
                  <span>{data.tasks.todo} Tasks</span>
                </div>
                <div className="h-2 rounded bg-slate-950 border border-slate-900 overflow-hidden">
                  <div className="h-full bg-neon-amber" style={{ width: `${data.tasks.total > 0 ? (data.tasks.todo / data.tasks.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>ACTIVE CYCLE (IN PROGRESS)</span>
                  <span>{data.tasks.in_progress} Tasks</span>
                </div>
                <div className="h-2 rounded bg-slate-950 border border-slate-900 overflow-hidden">
                  <div className="h-full bg-neon-violet" style={{ width: `${data.tasks.total > 0 ? (data.tasks.in_progress / data.tasks.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>COMPLETED NODES (COMPLETED)</span>
                  <span>{data.tasks.completed} Tasks</span>
                </div>
                <div className="h-2 rounded bg-slate-950 border border-slate-900 overflow-hidden">
                  <div className="h-full bg-neon-emerald" style={{ width: `${data.tasks.total > 0 ? (data.tasks.completed / data.tasks.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Expense financial analytics card */}
        <Card glowColor="rose" hoverEffect={false} className="bg-bg-card border-slate-900">
          <h3 className="font-display font-bold text-sm tracking-wider uppercase text-slate-200 mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neon-rose" /> Expense Ledger Distribution
          </h3>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Total Expense Budget Logged</span>
              <span className="text-3xl font-display font-extrabold text-slate-200 mt-1">${totalExpenseBudget.toFixed(2)}</span>
            </div>

            {/* Financial allocation bars */}
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex justify-between items-center py-2.5 px-3 rounded-lg border border-slate-900 bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded bg-neon-emerald" />
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Approved (Disbursed)</span>
                </div>
                <span className="font-bold text-slate-200">${data.expenses.approved_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2.5 px-3 rounded-lg border border-slate-900 bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded bg-neon-amber" />
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Pending (In Audit Queue)</span>
                </div>
                <span className="font-bold text-slate-200">${data.expenses.pending_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2.5 px-3 rounded-lg border border-slate-900 bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded bg-neon-rose" />
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Rejected (Denied Claims)</span>
                </div>
                <span className="font-bold text-slate-200">${data.expenses.rejected_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SystemReports;
