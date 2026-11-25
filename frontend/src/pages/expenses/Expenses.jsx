import { useEffect, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  Eye,
  PencilSimple,
  Trash,
  CaretLeft,
  CaretRight,
  Receipt,
  Code,
  Desktop,
  AirplaneTilt,
  ForkKnife,
  FunnelSimple,
} from "@phosphor-icons/react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import { TextInput } from "../../components/ui/inputs";
import ReceiptScanner from "../../components/expenses/ReceiptScanner";
import {
  PageHeader,
  StatusBadge,
  Avatar,
  EmptyState,
  Skeleton,
  Segmented,
  formatMoney,
  formatDate,
} from "../../components/ui/primitives";

const CATEGORIES = ["Software", "Equipment", "Travel", "Meals"];
const CATEGORY_ICON = { Software: Code, Equipment: Desktop, Travel: AirplaneTilt, Meals: ForkKnife };
const ROW_GRID = "md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-4";

const CategoryIcon = ({ category, size = 16 }) => {
  const Icon = CATEGORY_ICON[category] || Receipt;
  return <Icon size={size} weight="regular" aria-hidden />;
};

/** Title, category and amount inputs shared by the create and edit dialogs. */
const ExpenseFields = ({ title, setTitle, category, setCategory, amount, setAmount, testIds = true }) => (
  <div className="flex flex-col gap-4">
    <Field label="Title">
      {(p) => (
        <TextInput
          {...p}
          type="text"
          data-testid={testIds ? "expense-title-input" : undefined}
          data-autofocus
          placeholder="e.g. Client dinner"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      )}
    </Field>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Category">
        {(p) => (
          <select
            {...p}
            className="control"
            data-testid={testIds ? "expense-category-select" : undefined}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Amount">
        {(p) => (
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">$</span>
            <input
              {...p}
              type="number"
              inputMode="decimal"
              data-testid={testIds ? "expense-amount-input" : undefined}
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="control num pl-8"
              required
            />
          </div>
        )}
      </Field>
    </div>
  </div>
);

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

  // Load claims once on mount; stale responses are ignored (StrictMode double-mount safe).
  useEffect(() => {
    let ignore = false;
    api
      .get("/expenses")
      .then((response) => {
        if (!ignore) setExpenses(response.data);
      })
      .catch(() => {
        if (!ignore) showToast("Couldn't load expense claims.", "error");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      showToast("Enter a title and an amount greater than zero.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post("/expenses", {
        title,
        category,
        amount: parseFloat(amount),
      });

      showToast("Claim submitted for manager review.", "success");
      setExpenses((prev) => [
        ...prev,
        {
          ...response.data,
          submitted_by: { first_name: user.first_name, email: user.email },
        },
      ]);
      window.dispatchEvent(new Event("approvals-updated"));

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't submit the claim.", "error");
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
      showToast("Claim updated.", "success");
      setExpenses((prev) =>
        prev.map((eItem) => (eItem.id === selectedExpense.id ? { ...eItem, ...response.data } : eItem))
      );
      window.dispatchEvent(new Event("approvals-updated"));
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't update the claim.", "error");
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
      showToast("Claim deleted.", "success");
      setExpenses((prev) => prev.filter((eItem) => eItem.id !== selectedExpense.id));
      window.dispatchEvent(new Event("approvals-updated"));
      setShowDeleteModal(false);
      setSelectedExpense(null);
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't delete the claim.", "error");
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

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All Categories");
    setStatusFilter("All Statuses");
    setCurrentPage(1);
  };

  // Filter expenses based on search, category, and status selections
  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) || item.id.toString().includes(search);
    const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "All Statuses" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate pagination bounds
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary figures over everything this user can see
  const sumBy = (status) => expenses.filter((e) => e.status === status).reduce((s, e) => s + e.amount, 0);
  const countBy = (status) => expenses.filter((e) => e.status === status).length;
  const summary = [
    { label: "Pending review", value: formatMoney(sumBy("Pending")), sub: `${countBy("Pending")} claims`, accent: true },
    { label: "Approved", value: formatMoney(sumBy("Approved")), sub: `${countBy("Approved")} claims` },
    { label: "Rejected", value: formatMoney(sumBy("Rejected")), sub: `${countBy("Rejected")} claims` },
    { label: "All claims", value: expenses.length.toString(), sub: "visible to you" },
  ];

  const statusOptions = [
    { value: "All Statuses", label: "All", count: expenses.length },
    { value: "Pending", label: "Pending", count: countBy("Pending") },
    { value: "Approved", label: "Approved", count: countBy("Approved") },
    { value: "Rejected", label: "Rejected", count: countBy("Rejected") },
  ];

  const description = isAdmin
    ? "Every claim submitted across the workspace."
    : isManager
      ? "Your own claims, plus team claims waiting for review."
      : "Your expense claims and where each one stands.";

  const filtersActive = search || categoryFilter !== "All Categories" || statusFilter !== "All Statuses";
  const firstShown = filteredExpenses.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const lastShown = Math.min(currentPage * itemsPerPage, filteredExpenses.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        description={description}
        actions={
          canAddExpense && (
            <Button
              variant="primary"
              icon={Plus}
              data-testid="create-expense-btn"
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              New claim
            </Button>
          )
        }
      />

      {/* Summary strip */}
      <section aria-label="Claim totals" className="surface grid grid-cols-2 lg:grid-cols-4">
        {summary.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1 p-4 sm:p-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <span className="text-xs font-medium text-fg-subtle">{s.label}</span>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <span className={`num text-xl font-semibold sm:text-[1.375rem] ${s.accent ? "text-accent-text" : "text-fg"}`}>{s.value}</span>
            )}
            <span className="text-xs text-fg-subtle">{loading ? " " : s.sub}</span>
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          ariaLabel="Filter by status"
          layoutId="expense-status"
          options={statusOptions}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-72">
            <TextInput
              icon={MagnifyingGlass}
              type="search"
              aria-label="Search claims"
              placeholder="Search by title or ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10"
            />
          </div>
          <div className="relative sm:w-48">
            <FunnelSimple size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="control h-10 pl-10"
            >
              <option value="All Categories">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Claims list */}
      <section aria-label="Expense claims" className="surface overflow-hidden">
        <div className={`hidden border-b border-line bg-surface-2/50 px-5 py-2.5 text-xs font-medium text-fg-subtle ${ROW_GRID}`}>
          <span>Claim</span>
          <span>Category</span>
          <span>Submitted by</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
          <span>Status</span>
          <span className="w-[6.5rem] text-right">Actions</span>
        </div>

        {loading ? (
          <ul aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
                <Skeleton className="h-9 w-9 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-20" />
              </li>
            ))}
          </ul>
        ) : paginatedExpenses.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={MagnifyingGlass}
              title="No claims match these filters"
              description="Try a different search term, category or status."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No expense claims yet"
              description="Submit a claim for travel, meals, software or equipment and a manager will review it."
              action={
                canAddExpense && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => {
                      resetForm();
                      setShowCreateModal(true);
                    }}
                  >
                    New claim
                  </Button>
                )
              }
            />
          )
        ) : (
          <ul>
            {paginatedExpenses.map((item) => {
              const canEditOrDelete = isAdmin || (item.submitted_by_id === user.id && item.status === "Pending");
              const isMine = item.submitted_by_id === user.id;
              const submitter = isMine ? "You" : item.submitted_by?.first_name || "Unknown";
              return (
                <li
                  key={item.id}
                  data-testid="expense-row"
                  className={`row-hover flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5 ${ROW_GRID}`}
                >
                  {/* Claim */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-fg-muted">
                      <CategoryIcon category={item.category} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openDetailModal(item)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-fg hover:text-accent-text"
                      >
                        {item.title}
                      </button>
                      <span className="num text-xs text-fg-subtle">EXP-{item.id}</span>
                    </div>
                    <span className="num text-[0.9375rem] font-semibold text-fg md:hidden">{formatMoney(item.amount)}</span>
                  </div>

                  {/* Mobile meta line */}
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 text-xs text-fg-muted md:hidden ${canEditOrDelete ? "pr-[6.75rem]" : "pr-10"}`}>
                    <StatusBadge status={item.status} />
                    <span>{item.category}</span>
                    <span>{submitter}</span>
                    <span>{formatDate(item.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>

                  {/* Desktop cells */}
                  <span className="hidden truncate text-sm text-fg-muted md:block">{item.category}</span>
                  <span className="hidden min-w-0 items-center gap-2 md:flex">
                    <Avatar name={item.submitted_by?.first_name || "?"} size={24} highlight={isMine} />
                    <span className="truncate text-sm text-fg-muted">{submitter}</span>
                  </span>
                  <span className="hidden text-sm text-fg-muted md:block">
                    {formatDate(item.created_at, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="num hidden text-right text-sm font-semibold text-fg md:block">{formatMoney(item.amount)}</span>
                  <span className="hidden md:block">
                    <StatusBadge status={item.status} />
                  </span>

                  {/* Actions */}
                  <div className="-mb-1.5 -mt-9 ml-auto flex items-center justify-end gap-0.5 md:m-0 md:w-[6.5rem]">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={Eye}
                      title="View details"
                      aria-label={`View ${item.title}`}
                      onClick={() => openDetailModal(item)}
                    />
                    {canEditOrDelete && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={PencilSimple}
                          title="Edit claim"
                          aria-label={`Edit ${item.title}`}
                          data-testid="expense-edit"
                          onClick={() => openEditModal(item)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={Trash}
                          title="Delete claim"
                          aria-label={`Delete ${item.title}`}
                          data-testid="expense-delete"
                          className="hover:!text-danger"
                          onClick={() => openDeleteModal(item)}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <span className="text-xs text-fg-subtle">
              Showing <span className="num text-fg-muted">{firstShown}-{lastShown}</span> of{" "}
              <span className="num text-fg-muted">{filteredExpenses.length}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                icon={CaretLeft}
                aria-label="Previous page"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              />
              <span className="num px-2 text-xs text-fg-muted">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                icon={CaretRight}
                aria-label="Next page"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              />
            </div>
          </div>
        )}
      </section>

      {/* New claim */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New expense claim"
        description="Claims go to a manager for review."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-expense-form" variant="primary" loading={submitting} data-testid="expense-submit">
              Submit claim
            </Button>
          </>
        }
      >
        <form id="create-expense-form" onSubmit={handleCreateExpense} className="flex flex-col gap-5">
          <ReceiptScanner
            disabled={submitting}
            onApply={({ title: t, amount: a, category: c }) => {
              if (t) setTitle(t);
              if (a) setAmount(a);
              if (c) setCategory(c);
            }}
          />
          <ExpenseFields
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            amount={amount}
            setAmount={setAmount}
          />
        </form>
      </Modal>

      {/* Edit claim */}
      <Modal
        open={showEditModal && !!selectedExpense}
        onClose={() => setShowEditModal(false)}
        title="Edit claim"
        description="You can edit a claim while it's still pending."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-expense-form" variant="primary" loading={submitting} data-testid="expense-update">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-expense-form" onSubmit={handleUpdateExpense}>
          <ExpenseFields
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            amount={amount}
            setAmount={setAmount}
            testIds={false}
          />
        </form>
      </Modal>

      {/* Claim details */}
      <Modal
        open={showDetailModal && !!selectedExpense}
        onClose={() => setShowDetailModal(false)}
        title={selectedExpense?.title}
        description={selectedExpense ? `EXP-${selectedExpense.id}` : undefined}
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {selectedExpense && (
          <div>
            <p className="num text-[2rem] font-semibold leading-none text-fg">{formatMoney(selectedExpense.amount)}</p>
            <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
              <dt className="text-fg-subtle">Status</dt>
              <dd className="text-right">
                <StatusBadge status={selectedExpense.status} />
              </dd>
              <dt className="text-fg-subtle">Category</dt>
              <dd className="flex items-center justify-end gap-1.5 text-fg">
                <CategoryIcon category={selectedExpense.category} size={14} />
                {selectedExpense.category}
              </dd>
              <dt className="text-fg-subtle">Submitted by</dt>
              <dd className="truncate text-right text-fg">{selectedExpense.submitted_by?.first_name || "Unknown"}</dd>
              <dt className="text-fg-subtle">Submitted on</dt>
              <dd className="text-right text-fg">{new Date(selectedExpense.created_at).toLocaleString()}</dd>
            </dl>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDeleteModal && !!selectedExpense}
        onClose={() => setShowDeleteModal(false)}
        title="Delete this claim?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash} loading={submitting} onClick={handleDeleteExpense} data-testid="confirm-delete">
              Delete claim
            </Button>
          </>
        }
      >
        {selectedExpense && (
          <p className="text-sm leading-relaxed text-fg-muted">
            <span className="font-semibold text-fg">{selectedExpense.title}</span> for{" "}
            <span className="num font-semibold text-fg">{formatMoney(selectedExpense.amount)}</span> will be removed. This can't be
            undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default Expenses;
