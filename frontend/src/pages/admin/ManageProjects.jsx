import React, { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { FolderGit2, PlusCircle, Trash2, Calendar, FileText } from "lucide-react";

const ManageProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

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

  const handleDeleteProject = async (id) => {
    if (!confirm("Are you sure you want to terminate this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      showToast("Project terminated and archived.", "success");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      showToast("Failed to delete project.", "error");
    }
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
                placeholder="Database Migration"
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
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">System Registry</span>
          <h2 className="text-2xl font-display font-extrabold text-slate-100 mt-1">ACTIVE SYSTEM PROJECTS</h2>
        </div>

        {projects.length === 0 ? (
          <Card glowColor="none" className="bg-bg-card border-slate-900/60 text-center py-12 text-slate-500">
            No active project operations found. Initialize one using the setup panel.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <Card key={p.id} glowColor="violet" hoverEffect={true} className="bg-bg-card border-slate-900 flex flex-col justify-between h-48">
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
                    <button
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-neon-rose hover:border-neon-rose/20 hover:bg-neon-rose/5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-4 line-clamp-3">
                    {p.description || "No operational scope description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-900/50 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Created: {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-neon-emerald/10 border border-neon-emerald/20 text-neon-emerald uppercase tracking-widest font-bold">
                    {p.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageProjects;
