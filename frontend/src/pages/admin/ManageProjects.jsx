import React, { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { FolderGit2, PlusCircle, Trash2, Calendar, FileText, Edit2, Eye, X, Archive, Check, Search } from "lucide-react";

const ManageProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  // Modal states
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("Active");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      showToast("Failed to load project database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.post("/projects", {
        name,
        description,
      });
      showToast("Project created successfully.", "success");
      setProjects((prev) => [...prev, response.data]);
      setName("");
      setDescription("");
    } catch (error) {
      showToast("Failed to create new project.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditStatus(project.status || "Active");
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !selectedProject) return;

    try {
      setSubmitting(true);
      const response = await api.put(`/projects/${selectedProject.id}`, {
        name: editName,
        description: editDescription,
        status: editStatus,
      });
      showToast("Project updated successfully.", "success");
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProject.id ? response.data : p))
      );
      setShowEditModal(false);
      setSelectedProject(null);
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update project.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openArchiveModal = (project) => {
    setSelectedProject(project);
    setShowArchiveModal(true);
  };

  const handleArchiveProject = async () => {
    if (!selectedProject) return;
    try {
      setSubmitting(true);
      const response = await api.delete(`/projects/${selectedProject.id}`);
      showToast("Project soft-deleted / archived successfully.", "success");
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProject.id ? response.data : p))
      );
      setShowArchiveModal(false);
      setSelectedProject(null);
    } catch (error) {
      showToast("Failed to archive project.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" color="violet" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create project Form */}
      <div className="flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-neon-violet uppercase">Operations Setup</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">INITIALIZE PROJECT</h1>
        </div>

        <Card glowColor="violet" hoverEffect={false} className="bg-bg-card border-slate-900">
          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Project Name
              </label>
              <input
                type="text"
                data-testid="project-name-input"
                placeholder="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 focus:ring-1 focus:ring-neon-violet/10 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Operational Scope / Description
              </label>
              <textarea
                data-testid="project-description-input"
                placeholder="Migrate the local MS SQL databases to Azure cloud services..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={4}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 focus:ring-1 focus:ring-neon-violet/10 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              data-testid="create-project"
              disabled={submitting}
              className="w-full mt-2 rounded-xl py-3 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Spinner size="sm" color="white" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Deploy Project</span>
                </>
              )}
            </button>
          </form>
        </Card>
      </div>

      {/* Projects List */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">System Registry</span>
            <h2 className="text-2xl font-display font-extrabold text-slate-100 mt-1">ACTIVE SYSTEM PROJECTS</h2>
          </div>
          {/* Search bar above project list */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              data-testid="project-search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-neon-violet/50 transition-colors"
            />
          </div>
        </div>

        {(() => {
          const filteredProjects = projects.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
          );

          if (filteredProjects.length === 0) {
            return (
              <Card glowColor="none" className="bg-bg-card border-slate-900/60 text-center py-12 text-slate-500">
                {search.trim() ? "No projects match your search query." : "No active project operations found. Initialize one using the setup panel."}
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((p) => (
              <Card key={p.id} glowColor={p.status === "Archived" ? "none" : "violet"} hoverEffect={true} className={`bg-bg-card border-slate-900 flex flex-col justify-between h-52 ${p.status === "Archived" ? "opacity-60" : ""}`}>
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-neon-violet/10 border border-neon-violet/20 text-neon-violet">
                        <FolderGit2 className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wide truncate max-w-[120px]">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDetailModal(p)}
                        title="View Details"
                        className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        data-testid="edit-project-btn"
                        title="Edit Project"
                        className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-neon-violet hover:bg-neon-violet/10 transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {p.status !== "Archived" && (
                        <button
                          onClick={() => openArchiveModal(p)}
                          title="Archive Project"
                          className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-neon-rose hover:bg-neon-rose/10 transition-all cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-4 line-clamp-3">
                    {p.description || "No operational scope description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-900/50 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Created: {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded uppercase tracking-widest font-bold border ${
                    p.status === "Archived" 
                      ? "bg-slate-900 border-slate-800 text-slate-500" 
                      : "bg-neon-emerald/10 border-neon-emerald/20 text-neon-emerald"
                  }`}>
                    {p.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          );
        })()}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-lg text-slate-100 uppercase tracking-wider">Edit Project</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg border border-transparent text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateProject} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Name</label>
                  <input
                    type="text"
                    data-testid="edit-project-name-input"
                    placeholder="Project Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Scope</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 focus:outline-none focus:border-neon-violet/50 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none focus:border-neon-violet/50 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <button
                  type="submit"
                  data-testid="edit-project-submit"
                  disabled={submitting}
                  className="w-full mt-2 rounded-xl py-3 bg-neon-violet text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-neon-violet/30 hover:bg-neon-violet/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Spinner size="sm" color="white" /> : <span>Update Project</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Project Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-card border border-slate-800 rounded-2xl shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-violet to-neon-emerald" />
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-neon-violet" />
                  <h3 className="font-display font-extrabold text-base text-slate-100 uppercase tracking-wider">{selectedProject.name}</h3>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs text-slate-300 border-t border-b border-slate-900/80 py-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Identifier:</span>
                  <span className="font-bold text-slate-200">PRJ-{selectedProject.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-neon-emerald">{selectedProject.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created Date:</span>
                  <span className="text-slate-300">{new Date(selectedProject.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Scope</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  {selectedProject.description || "No detailed scope specified."}
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

      {/* Archive Confirmation Modal */}
      {showArchiveModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-card border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neon-rose/10 border border-neon-rose/20 text-neon-rose flex items-center justify-center mx-auto text-xl font-bold">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-slate-100 text-base uppercase tracking-wider">Archive Project?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to soft-delete / archive <span className="text-slate-200 font-bold">"{selectedProject.name}"</span>? The project status will be marked as Archived to preserve task data integrity.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveProject}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-neon-rose/30 bg-neon-rose text-white text-xs font-bold uppercase tracking-wider hover:bg-neon-rose/90 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Spinner size="sm" color="white" /> : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProjects;
