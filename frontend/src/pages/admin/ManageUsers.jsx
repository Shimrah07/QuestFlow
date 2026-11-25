import { useEffect, useState } from "react";
import { UsersThree, Lightning } from "@phosphor-icons/react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import { PageHeader, Avatar, EmptyState, Skeleton, Badge } from "../../components/ui/primitives";

const ROLES = ["Employee", "Manager", "Admin"];

/** Switch-style toggle for a user's active state. Native button with role="switch". */
const ActiveSwitch = ({ user, onToggle, testable = true }) => (
  <button
    type="button"
    role="switch"
    aria-checked={user.is_active}
    aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.first_name}`}
    title={user.is_active ? "Deactivate" : "Activate"}
    data-testid={testable ? `user-status-${user.id}` : undefined}
    onClick={() => onToggle(user)}
    className="group inline-flex items-center gap-2.5 rounded-[8px] py-1 text-[0.8125rem] font-medium"
  >
    <span
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
        user.is_active ? "border-success/40 bg-success/80" : "border-line-strong bg-surface-3"
      }`}
    >
      <span
        className={`absolute left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          user.is_active ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
    <span className={user.is_active ? "text-fg" : "text-fg-subtle"}>{user.is_active ? "Active" : "Inactive"}</span>
  </button>
);

const RoleSelect = ({ user, onChange, testable = true }) => (
  <select
    value={user.role}
    onChange={(e) => onChange(user, e.target.value)}
    aria-label={`Role for ${user.first_name}`}
    data-testid={testable ? `user-role-${user.id}` : undefined}
    className="control !h-9 w-full min-w-[8.5rem] !text-[0.8125rem] sm:w-36"
  >
    {ROLES.map((r) => (
      <option key={r} value={r}>
        {r}
      </option>
    ))}
  </select>
);

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user: me } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      setUsers(response.data);
    } catch {
      showToast("Couldn't load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const response = await api.put(`/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      showToast(`${user.first_name} is now ${response.data.is_active ? "active" : "inactive"}.`, "success");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: response.data.is_active } : u))
      );
    } catch {
      showToast("Couldn't change this user's status.", "error");
    }
  };

  const handleChangeRole = async (user, newRole) => {
    try {
      const response = await api.put(`/users/${user.id}/role`, {
        role: newRole,
      });
      showToast(`${user.first_name} is now ${newRole === "Admin" ? "an" : "a"} ${newRole}.`, "success");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: response.data.role } : u))
      );
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't update this user's role.", "error");
    }
  };

  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={
          loading ? undefined : (
            <>
              <span className="num">{users.length}</span> people, <span className="num">{activeCount}</span> active
            </>
          )
        }
      />

      {loading ? (
        <Card padding="p-0" className="overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
              <Skeleton className="h-9 w-9 !rounded-[10px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="hidden h-9 w-36 sm:block" />
              <Skeleton className="hidden h-5 w-20 md:block" />
            </div>
          ))}
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState icon={UsersThree} title="No users yet" description="People appear here once they register." />
        </Card>
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          {/* Desktop / tablet table */}
          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="border-b border-line text-xs font-medium text-fg-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Member</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Level</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">XP</th>
                <th scope="col" className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`row-hover border-b border-line last:border-b-0 ${u.is_active ? "" : "opacity-70"}`}>
                  <td className="w-[40%] max-w-0 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.first_name} size={36} highlight={u.id === me?.id} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-fg">
                          <span className="truncate">{u.first_name}</span>
                          {u.id === me?.id && <Badge tone="accent">You</Badge>}
                        </p>
                        <p className="truncate text-[0.8125rem] text-fg-subtle" title={u.email}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <RoleSelect user={u} onChange={handleChangeRole} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="num inline-flex items-center gap-1 text-sm text-fg">
                      <Lightning size={13} weight="fill" className="text-accent-text" />
                      {u.level}
                    </span>
                  </td>
                  <td className="num px-4 py-3.5 text-right text-sm text-fg-muted">{u.points.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <ActiveSwitch user={u} onToggle={handleToggleStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phone: stacked rows */}
          <ul className="md:hidden">
            {users.map((u) => (
              <li key={u.id} className={`border-b border-line px-4 py-4 last:border-b-0 ${u.is_active ? "" : "opacity-70"}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={u.first_name} size={38} highlight={u.id === me?.id} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <span className="truncate">{u.first_name}</span>
                      {u.id === me?.id && <Badge tone="accent">You</Badge>}
                    </p>
                    <p className="truncate text-[0.8125rem] text-fg-subtle">{u.email}</p>
                  </div>
                  <span className="num shrink-0 text-right text-xs text-fg-muted">
                    <span className="flex items-center justify-end gap-1 text-sm text-fg">
                      <Lightning size={12} weight="fill" className="text-accent-text" />
                      Lv {u.level}
                    </span>
                    {u.points.toLocaleString()} XP
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <RoleSelect user={u} onChange={handleChangeRole} testable={false} />
                  </div>
                  <ActiveSwitch user={u} onToggle={handleToggleStatus} testable={false} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default ManageUsers;
