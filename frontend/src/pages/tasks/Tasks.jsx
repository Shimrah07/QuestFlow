import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { ListTodo, CheckCircle, Flame, Sparkles, User, Folder, Plus, X, ArrowRight, Edit2, Eye, Trash2 } from "lucide-react";

const Tasks = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

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

  const isEmployee = user?.role === "Employee";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";
  const canAssign = isAdmin || isManager;
  const canUpdate = isAdmin || isEmployee || isManager;
  const canDelete = isAdmin || isManager;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/projects").catch(() => ({ data: [] }))
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data || []);

      if (canAssign) {
        const staffRes = await api.get("/users");
        setStaff(staffRes.data);
      }
    } catch (error) {
      showToast("Failed to initialize tasks pipeline data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

      showToast("Task assigned and deployed successfully.", "success");
      setTasks((prev) => [...prev, response.data]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to assign task.", "error");
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
      const response = await api.put(`/tasks/${selectedTask.id}`, {
        title,
        description,
        xp: parseInt(xp),
        assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
        project_id: projectId ? parseInt(projectId) : null,
        status,
      });

      showToast("Task updated successfully.", "success");
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? response.data : t))
      );
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update task.", "error");
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
      showToast("Task deleted successfully.", "success");
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setShowDeleteModal(false);
      setSelectedTask(null);
    } catch (error) {
      showToast("Failed to delete task.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/tasks/${taskId}/status`, {
        status: newStatus,
      });
      showToast(`Task status shifted to '${newStatus}'.`, "success");
      
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: response.data.status } : t))
      );
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to shift task status.", "error");
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="violet" />
      </div>
    );
  }

  // Filter tasks into columns
  const todoTasks = tasks.filter((t) => t.status === "Todo");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const completedTasks = tasks.filter((t) => t.status === "Completed");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-neon-violet uppercase">Operations Grid</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">OPERATIONS PIPELINE</h1>
        </div>
        {canAssign && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neon-violet text-white font-bold text-xs uppercase tracking-widest border border-neon-violet/30 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Operation</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Todo Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900/60">
            <ListTodo className="w-4 h-4 text-neon-violet" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-300">Staging Area</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-900 text-slate-500 font-mono">
              {todoTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {todoTasks.map((task) => (
              <Card key={task.id} glowColor="violet" className="bg-bg-card border-slate-900/50">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-neon-violet/10 border border-neon-violet/25 text-neon-violet uppercase tracking-widest">
                      Todo
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetailModal(task)} title="View Detail" className="text-slate-500 hover:text-slate-300">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canAssign && (
                        <button onClick={() => openEditModal(task)} title="Edit Task" className="text-slate-500 hover:text-neon-violet">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => openDeleteModal(task)} title="Delete Task" className="text-slate-500 hover:text-neon-rose">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-neon-violet font-mono uppercase tracking-wider ml-1">
                        {task.xp} XP
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 leading-relaxed">{task.title}</h4>
                  {task.description && (
                    <p className="text-[10px] text-slate-400 font-sans">{task.description}</p>
                  )}
                  
                  {/* Metadata and Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-900/60 text-[9px] text-slate-500 font-mono">
                    <div className="flex justify-between">
                      {task.project && (
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {task.project.name}</span>
                      )}
                      {task.assigned_to && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assigned_to.first_name}</span>
                      )}
                    </div>
                    {canUpdate && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, "In Progress")}
                        className="w-full mt-1 py-1 rounded bg-neon-violet/10 hover:bg-neon-violet hover:text-white border border-neon-violet/20 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all"
                      >
                        Start Task <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900/60">
            <Flame className="w-4 h-4 text-neon-amber animate-pulse" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-300">Active Cycle</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-900 text-slate-500 font-mono">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {inProgressTasks.map((task) => (
              <Card key={task.id} glowColor="amber" className="bg-bg-card border-slate-900/50">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-neon-amber/10 border border-neon-amber/25 text-neon-amber uppercase tracking-widest">
                      Running
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetailModal(task)} title="View Detail" className="text-slate-500 hover:text-slate-300">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canAssign && (
                        <button onClick={() => openEditModal(task)} title="Edit Task" className="text-slate-500 hover:text-neon-amber">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => openDeleteModal(task)} title="Delete Task" className="text-slate-500 hover:text-neon-rose">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-neon-amber font-mono uppercase tracking-wider ml-1">
                        {task.xp} XP
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 leading-relaxed">{task.title}</h4>
                  {task.description && (
                    <p className="text-[10px] text-slate-400 font-sans">{task.description}</p>
                  )}
                  
                  {/* Metadata and Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-900/60 text-[9px] text-slate-500 font-mono">
                    <div className="flex justify-between">
                      {task.project && (
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {task.project.name}</span>
                      )}
                      {task.assigned_to && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assigned_to.first_name}</span>
                      )}
                    </div>
                    {canUpdate && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, "Completed")}
                        className="w-full mt-1 py-1 rounded bg-neon-emerald/10 hover:bg-neon-emerald hover:text-white border border-neon-emerald/20 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all"
                      >
                        Complete Task ✓
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900/60">
            <CheckCircle className="w-4 h-4 text-neon-emerald" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-300">Completed Nodes</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-900 text-slate-500 font-mono">
              {completedTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 opacity-80">
            {completedTasks.map((task) => (
              <Card key={task.id} glowColor="none" hoverEffect={false} className="bg-bg-card border-slate-900/80">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-neon-emerald/10 border border-neon-emerald/25 text-neon-emerald uppercase tracking-widest">
                      Completed
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetailModal(task)} title="View Detail" className="text-slate-500 hover:text-slate-300">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && (
                        <button onClick={() => openDeleteModal(task)} title="Delete Task" className="text-slate-500 hover:text-neon-rose">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-neon-emerald font-mono uppercase tracking-wider ml-1">
                        +{task.xp} XP
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-400 line-through leading-relaxed">{task.title}</h4>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-slate-900/60 text-[9px] text-slate-600 font-mono">
                    {task.project && (
                      <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {task.project.name}</span>
                    )}
                    {task.assigned_to && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assigned_to.first_name}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Deploy Operation</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Title</label>
                  <input
                    type="text"
                    placeholder="Implement active directory modules"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    placeholder="Provide full description of operations tasks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience (XP)</label>
                    <input
                      type="number"
                      value={xp}
                      onChange={(e) => setXp(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 font-mono"
                      min={10}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                  >
                    <option value="">Select Assignee</option>
                    {staff.map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 rounded-xl py-3.5 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Deploy Operation</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Edit Task Operation</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience (XP)</label>
                    <input
                      type="number"
                      value={xp}
                      onChange={(e) => setXp(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 font-mono"
                      min={10}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
                    <select
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                    >
                      <option value="">Select Assignee</option>
                      {staff.map((u) => (
                        <option key={u.id} value={u.id}>{u.first_name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 rounded-xl py-3 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Spinner size="sm" color="white" /> : <span>Update Task</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail View Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-base text-slate-100 uppercase tracking-wider">{selectedTask.title}</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-slate-300 border-t border-b border-slate-900/80 py-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-neon-violet">{selectedTask.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">XP Reward:</span>
                  <span className="font-bold text-neon-emerald">+{selectedTask.xp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned To:</span>
                  <span className="text-slate-200">{selectedTask.assigned_to ? selectedTask.assigned_to.first_name : "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Project:</span>
                  <span className="text-slate-200">{selectedTask.project ? selectedTask.project.name : "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deployed Date:</span>
                  <span className="text-slate-400">{new Date(selectedTask.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Scope</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  {selectedTask.description || "No detailed instructions attached."}
                </p>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-card border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neon-rose/10 border border-neon-rose/20 text-neon-rose flex items-center justify-center mx-auto text-xl font-bold">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-slate-100 text-base uppercase tracking-wider">Delete Task?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-200 font-bold">"{selectedTask.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
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

export default Tasks;
