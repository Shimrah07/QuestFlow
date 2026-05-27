import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { PlusCircle, Search, FileText, CheckCircle2, AlertCircle, RefreshCw, X, DollarSign } from "lucide-react";

const Expenses = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  // Expense creation form state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Software");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEmployee = user?.role === "Employee";
  const isAdmin = user?.role === "Admin";
  const canAddExpense = isEmployee || isAdmin;

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/expenses");
      setExpenses(response.data);
    } catch (error) {
      showToast("Failed to retrieve expense ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    try {
      setSubmitting(true);
      const response = await api.post("/expenses", {
        title,
        category,
        amount: parseFloat(amount),
      });

      showToast("Expense submission sent to manager review queue.", "success");
      
      // Refresh list
      setExpenses((prev) => [
        ...prev,
        {
          ...response.data,
          submitted_by: { first_name: user.first_name, email: user.email }
        }
      ]);
      
      setShowModal(false);
      setTitle("");
      setCategory("Software");
      setAmount("");
    } catch (error) {
      showToast("Failed to upload expense.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="rose" />
      </div>
    );
  }

  // Filter expenses based on search and category selection
  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.id.toString().includes(search);
    const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-neon-rose uppercase">Financial Ledger</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">EXPENSE TRACKER</h1>
        </div>
        {canAddExpense && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-rose text-white font-bold text-xs uppercase tracking-widest border border-neon-rose/30 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Expense</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Search & filters controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl border border-slate-900 bg-bg-panel/40 backdrop-blur-sm">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-900 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-950/60 border border-slate-900 rounded-lg py-2 px-3 text-xs text-slate-400 focus:outline-none focus:border-slate-800"
            >
              <option value="All Categories">All Categories</option>
              <option value="Software">Software</option>
              <option value="Equipment">Equipment</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <Card glowColor="none" className="bg-bg-card border-slate-900/60 text-center py-12 text-slate-500">
            No expenses logged in this sector.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredExpenses.map((item, idx) => (
              <Card
                key={idx}
                glowColor={item.status === "Pending" ? "amber" : item.status === "Approved" ? "emerald" : "rose"}
                hoverEffect={false}
                className="bg-bg-card border-slate-900/60"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900/60 text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">EXP-{item.id}</span>
                      <span className="text-sm font-bold text-slate-200 mt-0.5">{item.title}</span>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                        <span>Category: {item.category}</span>
                        <span>•</span>
                        <span>Submitted By: {item.submitted_by?.first_name || "Agent"}</span>
                        <span>•</span>
                        <span>Date: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-base font-display font-extrabold text-slate-100 font-mono">
                      ${item.amount.toFixed(2)}
                    </span>

                    <span className={`
                      text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 border
                      ${
                        item.status === "Approved"
                          ? "bg-neon-emerald/10 border-neon-emerald/20 text-neon-emerald"
                          : item.status === "Rejected"
                          ? "bg-neon-rose/10 border-neon-rose/20 text-neon-rose"
                          : "bg-neon-amber/10 border-neon-amber/20 text-neon-amber animate-pulse"
                      }
                    `}>
                      {item.status === "Approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {item.status === "Rejected" && <AlertCircle className="w-3.5 h-3.5" />}
                      {item.status === "Pending" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{item.status}</span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-rose to-neon-amber" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Upload Expense</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expense Title</label>
                  <input
                    type="text"
                    placeholder="AWS Hosting Credits"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-rose/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-rose/50 cursor-pointer"
                    >
                      <option value="Software">Software</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Travel">Travel</option>
                      <option value="Meals">Meals</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="350.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 pl-8 pr-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-rose/50 font-mono"
                        min="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 rounded-xl py-3.5 bg-neon-rose text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-rose/30 hover:bg-neon-rose/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <>
                      <span>Upload Claims</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
