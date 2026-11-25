import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Plus,
  Play,
  CheckCircle,
  PencilSimple,
  Trash,
  FolderSimple,
  CalendarBlank,
  MagnifyingGlass,
  Lightning,
  Circle,
  CircleHalf,
  Kanban,
  Warning,
  DotsSixVertical,
} from "@phosphor-icons/react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import { TextInput } from "../../components/ui/inputs";
import TaskAssistantPanel from "../../components/tasks/TaskAssistantPanel";
import {
  PageHeader,
  StatusBadge,
  Avatar,
  EmptyState,
  Skeleton,
  Segmented,
  formatDate,
} from "../../components/ui/primitives";

const COLUMNS = [
  { key: "Todo", label: "To do", icon: Circle, tone: "text-fg-subtle" },
  { key: "In Progress", label: "In progress", icon: CircleHalf, tone: "text-info" },
  { key: "Completed", label: "Done", icon: CheckCircle, tone: "text-success" },
];

const isOverdue = (task) =>
  task.due_date && task.status !== "Completed" && new Date(task.due_date).getTime() < Date.now();

/* ---------- Task card ---------- */

const TaskCard = ({ task, canEdit, canDelete, canStart, canComplete, onOpen, onEdit, onDelete, onStart, onComplete, isMine, dragHandle, overlay = false }) => {
  const done = task.status === "Completed";
  const overdue = isOverdue(task);

  return (
    <motion.article
      layout={overlay ? false : "position"}
      data-testid={overlay ? undefined : "task-card"}
      data-task-id={overlay ? undefined : task.id}
      initial={overlay ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
      transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
      className={`group surface-flat relative flex flex-col gap-3 p-4 transition-[border-color] duration-150 hover:border-line-strong ${
        done ? "bg-surface/60" : ""
      } ${overlay ? "rotate-[1.5deg] cursor-grabbing !border-accent/50 shadow-[0_18px_40px_-12px_rgb(var(--shadow-color)/0.6)]" : ""}`}
    >
      <div className="flex items-start gap-3">
        {dragHandle}
        <button
          type="button"
          onClick={() => onOpen(task)}
          className={`min-w-0 flex-1 text-left text-[0.9375rem] font-semibold leading-snug transition-colors hover:text-accent-text ${
            done ? "text-fg-muted line-through decoration-fg-subtle/50" : "text-fg"
          }`}
          title="View details"
        >
          {task.title}
        </button>
        <span
          className={`num inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] px-1.5 text-xs font-semibold ${
            done ? "bg-success/12 text-success" : "bg-accent/12 text-accent-text"
          }`}
        >
          <Lightning size={12} weight="fill" />
          {done ? "+" : ""}
          {task.xp}
        </span>
      </div>

      {task.description && !done && (
        <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-fg-muted">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
        {task.project && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <FolderSimple size={13} className="shrink-0" />
            <span className="truncate">{task.project.name}</span>
          </span>
        )}
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-danger" : ""}`}>
            {overdue ? <Warning size={13} weight="fill" /> : <CalendarBlank size={13} />}
            {overdue ? "Overdue " : "Due "}
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs text-fg-muted">
          {task.assigned_to ? (
            <>
              <Avatar name={task.assigned_to.first_name} size={22} highlight={isMine} />
              <span className="truncate">{isMine ? "You" : task.assigned_to.first_name}</span>
            </>
          ) : (
            <span className="text-fg-subtle">Unassigned</span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              title="Edit task"
              aria-label={`Edit ${task.title}`}
              data-testid="task-edit"
              className="btn btn-ghost btn-sm btn-icon"
            >
              <PencilSimple size={15} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              title="Delete task"
              aria-label={`Delete ${task.title}`}
              data-testid="task-delete"
              className="btn btn-ghost btn-sm btn-icon hover:!text-danger"
            >
              <Trash size={15} />
            </button>
          )}
          {task.status === "Todo" && canStart && (
            <Button size="sm" variant="secondary" icon={Play} onClick={() => onStart(task)} data-testid="task-start" className="ml-1">
              Start
            </Button>
          )}
          {task.status === "In Progress" && canComplete && (
            <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => onComplete(task)} data-testid="task-complete" className="ml-1">
              Complete
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

/* ---------- Drag and drop ---------- */

/**
 * Wraps a card so it can be dragged between columns. Pointer and touch drags start anywhere on the
 * card (after a few pixels of movement, so clicks still work). Keyboard drags start only from the
 * grip button, so Enter on "Complete" or "Edit" never picks the card up by accident.
 */
// React 19 passes `ref` as a prop; AnimatePresence (popLayout) needs it on this wrapper.
const DraggableTaskCard = ({ task, draggable, children, ref }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });
  const handleRef = useRef(null);
  const { onKeyDown, ...pointerListeners } = listeners || {};

  const handle = draggable ? (
    <button
      type="button"
      ref={(node) => {
        handleRef.current = node;
        setActivatorNodeRef(node);
      }}
      {...attributes}
      aria-label={`Move "${task.title}". Press space to pick up, arrow keys to move, space to drop.`}
      data-testid="task-drag-handle"
      className="-ml-1.5 -mt-0.5 grid h-6 w-5 shrink-0 cursor-grab place-items-center rounded-[5px] text-fg-subtle opacity-40 transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
    >
      <DotsSixVertical size={16} weight="bold" />
    </button>
  ) : null;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      {...pointerListeners}
      onKeyDown={(e) => {
        if (e.target === handleRef.current) onKeyDown?.(e);
      }}
      className={`touch-manipulation ${draggable ? "cursor-grab select-none active:cursor-grabbing" : ""} ${isDragging ? "opacity-35" : ""}`}
      data-dragging={isDragging || undefined}
    >
      {children(handle)}
    </div>
  );
};

/** A board column that accepts drops. `state` tints it while a card is in the air. */
const DroppableColumn = ({ id, children, className, state, ...rest }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const ring =
    state === "allowed"
      ? isOver
        ? "ring-2 ring-accent/70 bg-accent/[0.06]"
        : "ring-1 ring-accent/35"
      : state === "blocked"
        ? "opacity-55"
        : "";
  return (
    <section
      ref={setNodeRef}
      {...rest}
      data-drop-state={state}
      data-over={isOver || undefined}
      className={`${className} transition-[box-shadow,background-color,opacity] duration-150 ${ring}`}
    >
      {children}
    </section>
  );
};

const STATUS_LABEL = { Todo: "To do", "In Progress": "In progress", Completed: "Done" };

/**
 * Keyboard moves for the board: Left and Right jump straight to the neighbouring column
 * (dnd-kit's default nudges 25px per key press, which never reaches another column).
 */
const columnKeyboardCoordinates = (event, { context: { droppableRects, droppableContainers, collisionRect } }) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return undefined;
  event.preventDefault();
  if (!collisionRect) return undefined;
  const columns = droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c) => c.rect && c.rect.width > 0)
    .sort((a, b) => a.rect.left - b.rect.left);
  if (!columns.length) return undefined;
  const centerX = collisionRect.left + collisionRect.width / 2;
  const current = columns.reduce(
    (best, c, i) => (Math.abs(c.rect.left + c.rect.width / 2 - centerX) < best.d ? { i, d: Math.abs(c.rect.left + c.rect.width / 2 - centerX) } : best),
    { i: 0, d: Infinity }
  ).i;
  const target = columns[Math.min(columns.length - 1, Math.max(0, current + (event.code === "ArrowRight" ? 1 : -1)))].rect;
  return { x: target.left + (target.width - collisionRect.width) / 2, y: target.top + 56 };
};

/* ---------- Loading skeleton ---------- */

const BoardSkeleton = () => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-busy="true" aria-label="Loading tasks">
    {COLUMNS.map((c, i) => (
      <div key={c.key} className={`flex flex-col gap-3 ${i > 0 ? "hidden md:flex" : ""}`}>
        <Skeleton className="h-5 w-28" />
        {[0, 1, 2].map((n) => (
          <div key={n} className="surface-flat flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ---------- Page ---------- */

const Tasks = () => {
  const { user, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const reduce = useReducedMotion();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState(100);
  const [assignedToId, setAssignedToId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("Todo");
  const [submitting, setSubmitting] = useState(false);

  // View-only filters (client side, do not change data)
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [mobileColumn, setMobileColumn] = useState("Todo");
  const [showAllDone, setShowAllDone] = useState(false);
  // Ids changed during this visit; they sort first so a task you just moved is never hidden.
  const [touched, setTouched] = useState([]);
  const markTouched = (id) => id && setTouched((prev) => [id, ...prev.filter((x) => x !== id)]);

  const isEmployee = user?.role === "Employee";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";
  const canAssign = isAdmin || isManager;
  const canDelete = isAdmin || isManager;

  const canStartTask = (task) => {
    if (isAdmin || isManager) return true;
    if (isEmployee) return task.assigned_to_id === user?.id;
    return false;
  };

  const canCompleteTask = (task) => {
    if (isAdmin || isManager) return true;
    if (isEmployee) return task.assigned_to_id === user?.id;
    return false;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Employees can't list projects (the API returns 403) and never need the picker, so skip it.
      const [tasksRes, projectsRes] = await Promise.all([
        api.get("/tasks"),
        canAssign ? api.get("/projects").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data || []);

      if (canAssign) {
        const staffRes = await api.get("/users");
        setStaff(staffRes.data);
      }
    } catch {
      showToast("Couldn't load tasks. Please refresh the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.post("/tasks", {
        title,
        description,
        xp: parseInt(xp),
        assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
        project_id: projectId ? parseInt(projectId) : null,
      });

      showToast("Task created.", "success");
      setTasks((prev) => [...prev, response.data]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't create the task.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setXp(task.xp);
    setAssignedToId(task.assigned_to_id ? task.assigned_to_id.toString() : "");
    setProjectId(task.project_id ? task.project_id.toString() : "");
    setStatus(task.status);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedTask) return;

    try {
      setSubmitting(true);
      const isCompleting = status === "Completed" && selectedTask.status !== "Completed";
      const oldLevel = user?.level || 1;

      const response = await api.put(`/tasks/${selectedTask.id}`, {
        title,
        description,
        xp: parseInt(xp),
        assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
        project_id: projectId ? parseInt(projectId) : null,
        status,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? response.data : t))
      );
      setShowEditModal(false);
      resetForm();

      if (isCompleting && selectedTask.assigned_to_id === user?.id) {
        const freshUser = await refreshUserProfile();
        const newLevel = freshUser?.level || oldLevel;
        showToast(`Task complete. +${selectedTask.xp} XP earned.`, "success");
        // Level-ups are celebrated by <LevelUpCelebration /> in the layout.
        void newLevel;
      } else {
        showToast("Task updated.", "success");
      }
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't update the task.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (task) => {
    setSelectedTask(task);
    setShowDeleteModal(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      await api.delete(`/tasks/${selectedTask.id}`);
      showToast("Task deleted.", "success");
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setShowDeleteModal(false);
      setSelectedTask(null);
    } catch {
      showToast("Couldn't delete the task.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const oldLevel = user?.level || 1;
    const isCompleting = newStatus === "Completed" && targetTask && targetTask.status !== "Completed";

    try {
      const response = await api.put(`/tasks/${taskId}/status`, {
        status: newStatus,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: response.data.status } : t))
      );

      if (isCompleting && targetTask?.assigned_to_id === user?.id) {
        const freshUser = await refreshUserProfile();
        const newLevel = freshUser?.level || oldLevel;
        showToast(`Task complete. +${targetTask.xp} XP earned.`, "success");
        // Level-ups are celebrated by <LevelUpCelebration /> in the layout.
        void newLevel;
      } else {
        showToast(`Task moved to ${newStatus === "In Progress" ? "In progress" : newStatus === "Completed" ? "Done" : "To do"}.`, "success");
      }
      return true;
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't change the task status.", "error");
      return false;
    }
  };

  /* ---------- Drag and drop between columns ---------- */

  // Done cards are locked for everyone. Managers and admins can move open tasks between any
  // columns, as their Edit dialog already allows. Employees get exactly the next step the
  // Start / Complete buttons offer on their own tasks: To do -> In progress -> Done.
  const canMoveTo = (task, target) => {
    if (!task || task.status === target || task.status === "Completed") return false;
    if (canAssign) return true;
    if (task.status === "Todo") return target === "In Progress" && canStartTask(task);
    if (task.status === "In Progress") return target === "Completed" && canCompleteTask(task);
    return false;
  };
  const canDragTask = (task) => task.status !== "Completed" && (canStartTask(task) || canCompleteTask(task));

  const [activeTaskId, setActiveTaskId] = useState(null);
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates })
  );
  const collision = (args) => {
    const hits = pointerWithin(args);
    return hits.length ? hits : rectIntersection(args);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTaskId(null);
    const task = tasks.find((t) => t.id === active.id);
    const target = over?.id;
    if (!task || !target || !canMoveTo(task, target)) return;
    const previous = task.status;
    // Move the card immediately; roll back if the server refuses.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: target } : t)));
    markTouched(task.id);
    const ok = await handleUpdateStatus(task.id, target);
    if (!ok) setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previous } : t)));
  };

  const titleOf = (active) => active.data.current?.task?.title || "Task";
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${titleOf(active)} is over ${STATUS_LABEL[over.id]}${canMoveTo(active.data.current?.task, over.id) ? "" : ", which it can't move to"}.`
        : `${titleOf(active)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over && canMoveTo(active.data.current?.task, over.id) ? `Moved ${titleOf(active)} to ${STATUS_LABEL[over.id]}.` : `${titleOf(active)} was not moved.`,
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active)} was not moved.`,
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setXp(100);
    setAssignedToId("");
    setProjectId("");
    setStatus("Todo");
    setSelectedTask(null);
  };

  // Client-side view filtering (search + scope). Does not alter the task list itself.
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (scope === "mine" && t.assigned_to_id !== user?.id) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.project?.name || "").toLowerCase().includes(q) ||
        (t.assigned_to?.first_name || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, search, scope, user?.id]);

  const byStatus = (key) => visibleTasks.filter((t) => t.status === key);
  const DONE_PREVIEW = 6;
  const rank = (t) => {
    const i = touched.indexOf(t.id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  // Done column: recently touched first, then newest; collapsed unless expanded or searching.
  const columnTasks = (key) => {
    const list = byStatus(key);
    if (key !== "Completed") return list;
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || b.id - a.id);
    return showAllDone || search.trim() ? sorted : sorted.slice(0, DONE_PREVIEW);
  };
  const mineCount = tasks.filter((t) => t.assigned_to_id === user?.id).length;
  const openNew = () => {
    resetForm();
    setShowCreateModal(true);
  };

  /* Shared form body for create and edit. Status only appears when editing. */
  const renderTaskFields = (withStatus) => (
    <div className="flex flex-col gap-4">
      <Field label="Title">
        {(p) => (
          <input
            {...p}
            type="text"
            className="control"
            placeholder="Write the onboarding email sequence"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="task-title-input"
            data-autofocus
            required
          />
        )}
      </Field>

      <Field label="Description" optional>
        {(p) => (
          <textarea
            {...p}
            className="control"
            rows={3}
            placeholder="What does done look like?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </Field>

      {/* Live suggestions while creating a task (managers and admins only reach this dialog) */}
      {!withStatus && (
        <TaskAssistantPanel
          title={title}
          description={description}
          projectId={projectId}
          tasks={tasks}
          staff={staff}
          xp={xp}
          assignedToId={assignedToId}
          onApplyXp={(value) => setXp(value)}
          onAssign={(id) => setAssignedToId(id)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="XP reward" hint="Between 10 and 5000.">
          {(p) => (
            <input
              {...p}
              type="number"
              className="control num"
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              min={10}
              required
            />
          )}
        </Field>

        {withStatus ? (
          <Field label="Status">
            {(p) => (
              <select {...p} className="control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Todo">To do</option>
                <option value="In Progress">In progress</option>
                <option value="Completed">Done</option>
              </select>
            )}
          </Field>
        ) : (
          <Field label="Project">
            {(p) => (
              <select {...p} className="control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            )}
          </Field>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${withStatus ? "sm:grid-cols-2" : ""}`}>
        {withStatus && (
          <Field label="Project">
            {(p) => (
              <select {...p} className="control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Assignee">
          {(p) => (
            <select {...p} className="control" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} ({u.role})</option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        description={
          canAssign
            ? "Plan work, assign it to your team and track it to done. Finished tasks pay out XP."
            : "Your assigned tasks. Start them, finish them and earn XP."
        }
        actions={
          canAssign && (
            <Button variant="primary" icon={Plus} onClick={openNew} data-testid="new-task-btn">
              New task
            </Button>
          )
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canAssign ? (
          <Segmented
            ariaLabel="Task scope"
            layoutId="tasks-scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "All tasks", count: tasks.length },
              { value: "mine", label: "Assigned to me", count: mineCount },
            ]}
          />
        ) : (
          // Employees only ever receive their own tasks from the API, so there is nothing to switch.
          <p className="text-sm text-fg-muted" data-testid="my-task-count">
            <span className="num font-semibold text-fg">{tasks.length}</span> {tasks.length === 1 ? "task" : "tasks"} assigned to you
          </p>
        )}
        <div className="w-full sm:w-72">
          <TextInput
            icon={MagnifyingGlass}
            type="search"
            placeholder="Search tasks"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {loading ? (
        <BoardSkeleton />
      ) : tasks.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={Kanban}
            title="No tasks yet"
            description={canAssign ? "Create the first task and assign it to someone on your team." : "When a manager assigns you a task it will show up here."}
            action={canAssign && <Button variant="primary" icon={Plus} onClick={openNew}>New task</Button>}
          />
        </div>
      ) : (
        <>
          {/* Column switcher on phones; all three columns side by side from md up */}
          <div className="md:hidden">
            <Segmented
              ariaLabel="Board column"
              layoutId="tasks-column"
              value={mobileColumn}
              onChange={setMobileColumn}
              className="w-full [&>button]:flex-1"
              options={COLUMNS.map((c) => ({ value: c.key, label: c.label, count: byStatus(c.key).length }))}
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={({ active }) => setActiveTaskId(active.id)}
            onDragCancel={() => setActiveTaskId(null)}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable:
                  "To move a task, press space or enter on its grip. Use the arrow keys to move between columns, then press space or enter to drop it, or escape to cancel.",
              },
            }}
          >
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const total = byStatus(col.key).length;
              const list = columnTasks(col.key);
              const hiddenCount = total - list.length;
              const Icon = col.icon;
              const dropState = activeTask
                ? activeTask.status === col.key
                  ? "origin"
                  : canMoveTo(activeTask, col.key)
                    ? "allowed"
                    : "blocked"
                : undefined;
              return (
                <DroppableColumn
                  key={col.key}
                  id={col.key}
                  state={dropState}
                  data-testid={`column-${col.key}`}
                  aria-labelledby={`col-${col.key}`}
                  className={`min-w-0 flex-col gap-3 rounded-[18px] border border-line bg-bg-sunken/60 p-2.5 ${
                    mobileColumn === col.key ? "flex" : "hidden"
                  } md:flex`}
                >
                  <header className="flex items-center gap-2 px-1.5 pt-1">
                    <Icon size={16} weight={col.key === "Completed" ? "fill" : "bold"} className={col.tone} />
                    <h2 id={`col-${col.key}`} className="text-sm font-semibold text-fg">{col.label}</h2>
                    <span className="num ml-auto text-xs text-fg-subtle">{total}</span>
                  </header>

                  <div className="flex flex-col gap-2.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {list.map((task) => (
                        <DraggableTaskCard key={task.id} task={task} draggable={canDragTask(task)}>
                        {(handle) => (
                        <TaskCard
                          dragHandle={handle}
                          task={task}
                          isMine={task.assigned_to_id === user?.id}
                          canEdit={canAssign && col.key !== "Completed"}
                          canDelete={canDelete}
                          canStart={canStartTask(task)}
                          canComplete={canCompleteTask(task)}
                          onOpen={openDetailModal}
                          onEdit={openEditModal}
                          onDelete={openDeleteModal}
                          onStart={(t) => {
                            markTouched(t.id);
                            handleUpdateStatus(t.id, "In Progress");
                          }}
                          onComplete={(t) => {
                            markTouched(t.id);
                            handleUpdateStatus(t.id, "Completed");
                          }}
                        />
                        )}
                        </DraggableTaskCard>
                      ))}
                    </AnimatePresence>
                    {col.key === "Completed" && (hiddenCount > 0 || (showAllDone && total > DONE_PREVIEW)) && !search.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowAllDone((v) => !v)}
                        aria-expanded={showAllDone}
                        className="btn btn-ghost btn-sm w-full"
                        data-testid="toggle-done"
                      >
                        {showAllDone ? "Show fewer" : `Show all ${total}`}
                      </button>
                    )}
                    {list.length === 0 && (
                      <motion.p
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-fg-subtle"
                      >
                        {search || scope === "mine" ? "Nothing matches these filters." : col.key === "Completed" ? "Finished tasks land here." : "No tasks in this column."}
                      </motion.p>
                    )}
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay dropAnimation={reduce ? null : { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
            {activeTask ? (
              <TaskCard
                overlay
                task={activeTask}
                isMine={activeTask.assigned_to_id === user?.id}
                canEdit={false}
                canDelete={false}
                canStart={false}
                canComplete={false}
                onOpen={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onStart={() => {}}
                onComplete={() => {}}
              />
            ) : null}
          </DragOverlay>
          </DndContext>
        </>
      )}

      {/* Create */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New task"
        description="Assign work and set how much XP it pays out."
        testId="create-task-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" form="create-task-form" variant="primary" icon={Plus} loading={submitting} data-testid="task-submit">
              Create task
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={handleCreateTask}>
          {renderTaskFields(false)}
        </form>
      </Modal>

      {/* Edit */}
      <Modal
        open={showEditModal && !!selectedTask}
        onClose={() => setShowEditModal(false)}
        title="Edit task"
        description="Marking a task done awards its XP to the assignee."
        testId="edit-task-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" form="edit-task-form" variant="primary" loading={submitting} data-testid="task-update-submit">
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="edit-task-form"
          onSubmit={(e) => {
            markTouched(selectedTask?.id);
            handleUpdateTask(e);
          }}
        >
          {renderTaskFields(true)}
        </form>
      </Modal>

      {/* Details */}
      <Modal
        open={showDetailModal && !!selectedTask}
        onClose={() => setShowDetailModal(false)}
        title={selectedTask?.title}
        testId="task-detail-modal"
        footer={<Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>}
      >
        {selectedTask && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-fg-subtle">Status</dt>
                <dd className="mt-1"><StatusBadge status={selectedTask.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">XP reward</dt>
                <dd className="num mt-1 font-semibold text-accent-text">+{selectedTask.xp} XP</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle">Assignee</dt>
                <dd className="mt-1 flex items-center gap-2 text-fg">
                  {selectedTask.assigned_to ? (
                    <>
                      <Avatar name={selectedTask.assigned_to.first_name} size={22} />
                      <span className="truncate">{selectedTask.assigned_to.first_name}</span>
                    </>
                  ) : (
                    <span className="text-fg-muted">Unassigned</span>
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle">Project</dt>
                <dd className="mt-1 truncate text-fg">{selectedTask.project ? selectedTask.project.name : <span className="text-fg-muted">None</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Created</dt>
                <dd className="mt-1 text-fg-muted">{new Date(selectedTask.created_at).toLocaleString()}</dd>
              </div>
              {selectedTask.due_date && (
                <div>
                  <dt className="text-xs text-fg-subtle">Due</dt>
                  <dd className={`mt-1 ${isOverdue(selectedTask) ? "font-medium text-danger" : "text-fg-muted"}`}>
                    {formatDate(selectedTask.due_date, { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              )}
            </dl>
            <div>
              <p className="text-xs text-fg-subtle">Description</p>
              <p className="mt-1.5 whitespace-pre-line rounded-[12px] border border-line bg-bg-sunken p-3.5 text-sm leading-relaxed text-fg-muted">
                {selectedTask.description || "No description added."}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDeleteModal && !!selectedTask}
        onClose={() => setShowDeleteModal(false)}
        title="Delete this task?"
        size="sm"
        testId="delete-task-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash} onClick={handleDeleteTask} loading={submitting} data-testid="confirm-delete">
              Delete task
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          <span className="font-semibold text-fg">{selectedTask?.title}</span> will be removed for everyone. This can't be undone.
        </p>
      </Modal>
    </div>
  );
};

export default Tasks;
