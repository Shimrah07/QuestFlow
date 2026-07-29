import React, { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { Check, X, FileText, User } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const Approvals = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/expenses");
      // Filter for only pending expenses
      const pending = response.data.filter((e) => e.status === "Pending");
      setItems(pending);
    } catch (error) {
      showToast("Failed to fetch pending review claims.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingExpenses();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/expenses/${id}/status`, {
        status: action,
      });
      showToast(`Transaction claims ${action === "Approved" ? "approved" : "rejected"} successfully.`, action === "Approved" ? "success" : "error");
      setItems((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("approvals-updated"));
    } catch (error) {
      showToast("Failed to process transaction decision.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="amber" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-neon-amber uppercase">Managerial Oversight</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">OPERATIONAL REVIEW QUEUE</h1>
      </div>

      {items.length === 0 ? (
        <Card glowColor="emerald" className="bg-bg-card border-neon-emerald/20 flex flex-col items-center justify-center p-12 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-neon-emerald/10 border border-neon-emerald/20 flex items-center justify-center text-neon-emerald text-xl">
            ✓
          </div>
          <h3 className="font-display font-bold text-slate-200">Review Queue Cleared</h3>
          <p className="text-xs text-slate-400">All submitted employee expenses have been processed and indexed.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <Card key={idx} glowColor="amber" hoverEffect={false} className="bg-bg-card border-slate-900/60">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/60 text-neon-amber">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neon-amber font-mono uppercase tracking-wider">EXP-{item.id}</span>
                      <span className="text-slate-600 font-mono text-[9px] uppercase">Awaiting Action</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200 mt-1">{item.title}</span>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Employee: {item.submitted_by?.first_name || "Agent"}
                      </span>
                      <span>•</span>
                      <span>Category: {item.category}</span>
                      <span>•</span>
                      <span>Date: {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-900/60 pt-3 md:pt-0">
                  <span className="text-lg font-display font-extrabold text-slate-100 font-mono">
                    ${item.amount.toFixed(2)}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(item.id, "Rejected")}
                      className="p-2.5 rounded-lg border border-neon-rose/30 bg-neon-rose/5 text-neon-rose hover:bg-neon-rose hover:text-white hover:shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "Approved")}
                      className="p-2.5 rounded-lg border border-neon-emerald/30 bg-neon-emerald/5 text-neon-emerald hover:bg-neon-emerald hover:text-white hover:shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals;
