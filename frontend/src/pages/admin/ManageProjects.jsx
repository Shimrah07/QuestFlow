import { useEffect, useMemo, useState } from "react";
import {
  FolderSimple,
  FolderSimplePlus,
  MagnifyingGlass,
  PencilSimple,
  Archive,
  Eye,
  CalendarBlank,
  Plus,
} from "@phosphor-icons/react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Card from "../../components/common/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import { TextInput } from "../../components/ui/inputs";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  Skeleton,
  Segmented,
  formatDate,
} from "../../components/ui/primitives";

const ManageProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
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
    } catch {
      showToast("Couldn't load projects.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showToast("Project created.", "success");
      setProjects((prev) => [...prev, response.data]);
      setName("");
      setDescription("");
    } catch {
      showToast("Couldn't create the project.", "error");
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
      showToast(error.response?.data?.detail || "Couldn't update the project.", "error");
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
      showToast("Project archived. Its tasks are kept.", "success");
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProject.id ? response.data : p))
      );
      setShowArchiveModal(false);
      setSelectedProject(null);
    } catch {
      showToast("Couldn't archive the project.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const counts = useMemo(
    () => ({
      All: projects.length,
      Active: projects.filter((p) => p.status !== "Archived").length,
      Archived: projects.filter((p) => p.status === "Archived").length,
    }),
    [projects]
  );

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === "All" || (statusFilter === "Archived" ? p.status === "Archived" : p.status !== "Archived");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Projects" description="Group related tasks. Archived projects keep their task history." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Create project */}
        <Card className="lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-accent/25 bg-accent/10 text-accent-text">
              <FolderSimplePlus size={17} weight="bold" />
            </span>
            <h2 className="text-[0.9375rem] font-semibold text-fg">New project</h2>
          </div>
          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            <Field label="Name">
              {(p) => (
                <input
                  {...p}
                  type="text"
                  data-testid="project-name-input"
                  placeholder="Project name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="control"
                  required
                />
              )}
            </Field>
            <Field label="Description" optional>
              {(p) => (
                <textarea
                  {...p}
                  data-testid="project-description-input"
                  placeholder="What the project covers and when it's done"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="control"
                />
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              icon={Plus}
              loading={submitting}
              data-testid="create-project"
              className="w-full"
            >
              Create project
            </Button>
          </form>
        </Card>

        {/* Project list */}
        <section aria-labelledby="project-list-heading" className="flex min-w-0 flex-col gap-4">
          <h2 id="project-list-heading" className="sr-only">All projects</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              ariaLabel="Filter by status"
              layoutId="project-status-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "All", label: "All", count: counts.All },
                { value: "Active", label: "Active", count: counts.Active },
                { value: "Archived", label: "Archived", count: counts.Archived },
              ]}
            />
            <div className="w-full sm:w-64">
              <TextInput
                icon={MagnifyingGlass}
                type="search"
                data-testid="project-search"
                aria-label="Search projects"
                placeholder="Search projects"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!h-9 !text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="mt-2 h-8 w-full" />
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <EmptyState
                icon={FolderSimple}
                title={search.trim() || statusFilter !== "All" ? "No matching projects" : "No projects yet"}
                description={
                  search.trim() || statusFilter !== "All"
                    ? "Try a different search or status filter."
                    : "Create your first project with the form on this page."
                }
                action={
                  (search.trim() || statusFilter !== "All") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("All");
                      }}
                    >
                      Clear filters
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredProjects.map((p) => {
                const archived = p.status === "Archived";
                return (
                  <li key={p.id} className="min-w-0">
                    <Card
                      padding="p-0"
                      interactive
                      className={`flex h-full flex-col ${archived ? "bg-surface/60" : ""}`}
                    >
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start gap-3">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border ${
                              archived ? "border-line bg-surface-2 text-fg-subtle" : "border-accent/25 bg-accent/10 text-accent-text"
                            }`}
                          >
                            <FolderSimple size={18} weight={archived ? "regular" : "fill"} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className={`truncate text-[0.9375rem] font-semibold ${archived ? "text-fg-muted" : "text-fg"}`} title={p.name}>
                              {p.name}
                            </h3>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
                              <CalendarBlank size={12} />
                              Created {formatDate(p.created_at, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <StatusBadge status={p.status} className="shrink-0" />
                        </div>
                        <p className={`mt-3.5 line-clamp-3 text-sm leading-relaxed ${p.description ? "text-fg-muted" : "italic text-fg-subtle"}`}>
                          {p.description || "No description"}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t border-line px-3 py-2">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => openDetailModal(p)} title="View details">
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={PencilSimple}
                          onClick={() => openEditModal(p)}
                          data-testid="edit-project-btn"
                          title="Edit project"
                        >
                          Edit
                        </Button>
                        {!archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Archive}
                            onClick={() => openArchiveModal(p)}
                            title="Archive project"
                            data-testid="archive-project-btn"
                            className="hover:!text-danger"
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Edit Project Modal */}
      <Modal
        open={showEditModal && !!selectedProject}
        onClose={() => setShowEditModal(false)}
        title="Edit project"
        testId="edit-project-modal"
        footer={
          <>
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" form="edit-project-form" variant="primary" loading={submitting} data-testid="edit-project-submit">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-project-form" onSubmit={handleUpdateProject} className="flex flex-col gap-4">
          <Field label="Name">
            {(p) => (
              <input
                {...p}
                type="text"
                data-testid="edit-project-name-input"
                placeholder="Project name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="control"
                required
              />
            )}
          </Field>
          <Field label="Description" optional>
            {(p) => (
              <textarea
                {...p}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="control"
              />
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <select {...p} value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="control">
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            )}
          </Field>
        </form>
      </Modal>

      {/* Detail Project Modal */}
      <Modal
        open={showDetailModal && !!selectedProject}
        onClose={() => setShowDetailModal(false)}
        title={selectedProject?.name}
        footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>}
      >
        {selectedProject && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-fg-subtle">Project ID</dt>
              <dd className="num text-right text-fg">PRJ-{selectedProject.id}</dd>
              <dt className="text-fg-subtle">Status</dt>
              <dd className="text-right">
                <StatusBadge status={selectedProject.status} />
              </dd>
              <dt className="text-fg-subtle">Created</dt>
              <dd className="text-right text-fg">{new Date(selectedProject.created_at).toLocaleString()}</dd>
            </dl>
            <div>
              <p className="field-label">Description</p>
              <p className={`rounded-[10px] border border-line bg-bg-sunken p-3.5 text-sm leading-relaxed ${selectedProject.description ? "text-fg-muted" : "italic text-fg-subtle"}`}>
                {selectedProject.description || "No description"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        open={showArchiveModal && !!selectedProject}
        onClose={() => setShowArchiveModal(false)}
        size="sm"
        title="Archive this project?"
        footer={
          <>
            <Button onClick={() => setShowArchiveModal(false)}>Cancel</Button>
            <Button variant="danger" icon={Archive} onClick={handleArchiveProject} loading={submitting} data-testid="confirm-archive-project">
              Archive project
            </Button>
          </>
        }
      >
        {selectedProject && (
          <p className="text-sm leading-relaxed text-fg-muted">
            <span className="font-semibold text-fg">{selectedProject.name}</span> will be marked as archived. Its tasks
            stay in place, and you can make it active again from Edit.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default ManageProjects;
