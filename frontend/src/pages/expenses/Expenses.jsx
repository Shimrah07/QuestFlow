import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { PlusCircle, Search, FileText, CheckCircle2, AlertCircle, RefreshCw, X, DollarSign, Edit2, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const Expenses = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Software");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEmployee = user?.role === "Employee";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";
  const canAddExpense = isEmployee || isManager || isAdmin;

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
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      showToast("Please enter a valid title and positive amount.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post("/expenses", {
        title,
        category,
        amount: parseFloat(amount),
      });

      showToast("Expense submission sent to manager review queue.", "success");
      setExpenses((prev) => [
        ...prev,
        {
          ...response.data,
          submitted_by: { first_name: user.first_name, email: user.email }
        }
      ]);
      window.dispatchEvent(new Event("approvals-updated"));
      
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to upload expense.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setSelectedExpense(item);
    setTitle(item.title);
    setCategory(item.category);
    setAmount(item.amount.toString());
    setShowEditModal(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || !selectedExpense || parseFloat(amount) <= 0) return;

    try {
      setSubmitting(true);
      const response = await api.put(`/expenses/${selectedExpense.id}`, {
        title,
        category,
        amount: parseFloat(amount),
      });
      showToast("Expense claim updated successfully.", "success");
      setExpenses((prev) =>
        prev.map((eItem) => (eItem.id === selectedExpense.id ? { ...eItem, ...response.data } : eItem))
      );
      window.dispatchEvent(new Event("approvals-updated"));
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update expense claim.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (item) => {
    setSelectedExpense(item);
    setShowDeleteModal(true);
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    try {
      setSubmitting(true);
      await api.delete(`/expenses/${selectedExpense.id}`);
      showToast("Expense claim deleted successfully.", "success");
      setExpenses((prev) => prev.filter((eItem) => eItem.id !== selectedExpense.id));
      window.dispatchEvent(new Event("approvals-updated"));
      setShowDeleteModal(false);
      setSelectedExpense(null);
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to delete expense claim.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (item) => {
    setSelectedExpense(item);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setTitle("");
    setCategory("Software");
    setAmount("");
    setSelectedExpense(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="rose" />
      </div>
    );
  }

  // Filter expenses based on search, category, and status selections
  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.id.toString().includes(search);
    const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "All Statuses" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate pagination bounds
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-neon-rose uppercase">Financial Ledger</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">EXPENSE TRACKER</h1>
        </div>
        {canAddExpense && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
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
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/60 border border-slate-900 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-slate-800 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-none bg-slate-950/60 border border-slate-900 rounded-lg py-2 px-3 text-xs text-slate-400 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              <option value="Software">Software</option>
              <option value="Equipment">Equipment</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-none bg-slate-950/60 border border-slate-900 rounded-lg py-2 px-3 text-xs text-slate-400 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        {paginatedExpenses.length === 0 ? (
          <Card glowColor="none" className="bg-bg-card border-slate-900/60 text-center py-12 text-slate-500">
            No expenses logged matching the current filter criteria.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {paginatedExpenses.map((item, idx) => {
              const canEditOrDelete = isAdmin || (item.submitted_by_id === user.id && item.status === "Pending");
              return (
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">EXP-{item.id}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openDetailModal(item)} title="View Details" className="text-slate-500 hover:text-slate-300">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button onClick={() => openEditModal(item)} title="Edit Claim" className="text-slate-500 hover:text-neon-rose">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openDeleteModal(item)} title="Delete Claim" className="text-slate-500 hover:text-neon-rose">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
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
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 text-xs font-mono text-slate-400">
            <span>
              Page {currentPage} of {totalPages} ({filteredExpenses.length} Total Claims)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Expense Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-rose to-neon-amber" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Upload Expense</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
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
                  {submitting ? <Spinner size="sm" color="white" /> : <span>Upload Claims</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-rose to-neon-amber" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Edit Expense Claim</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateExpense} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expense Title</label>
                  <input
                    type="text"
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
                  className="w-full mt-2 rounded-xl py-3.5 bg-neon-rose text-white font-bold text-xs uppercase tracking-widest hover:bg-neon-rose/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Spinner size="sm" color="white" /> : <span>Update Claim</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Expense Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-rose to-neon-amber" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-base text-slate-100 uppercase tracking-wider">{selectedExpense.title}</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-slate-300 border-t border-b border-slate-900/80 py-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Claim ID:</span>
                  <span className="font-bold text-slate-200">EXP-{selectedExpense.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-slate-100">${selectedExpense.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-200">{selectedExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-neon-amber">{selectedExpense.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted By:</span>
                  <span className="text-slate-200">{selectedExpense.submitted_by?.first_name || "Agent"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submission Date:</span>
                  <span className="text-slate-400">{new Date(selectedExpense.created_at).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full mt-2 rounded-xl py-2.5 bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      {showDeleteModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-card border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neon-rose/10 border border-neon-rose/20 text-neon-rose flex items-center justify-center mx-auto text-xl font-bold">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-slate-100 text-base uppercase tracking-wider">Delete Expense Claim?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-200 font-bold">"{selectedExpense.title}"</span> (${selectedExpense.amount.toFixed(2)})? This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExpense}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-neon-rose/30 bg-neon-rose text-white text-xs font-bold uppercase tracking-wider hover:bg-neon-rose/90 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Spinner size="sm" color="white" /> : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
