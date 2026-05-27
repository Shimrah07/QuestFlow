import React, { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useToast } from "../../context/ToastContext";
import { UserCheck, UserX, Shield, Award, Calendar } from "lucide-react";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (error) {
      showToast("Failed to retrieve user registry.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const response = await api.put(`/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      showToast(`User status for ${user.first_name} updated successfully.`, "success");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: response.data.is_active } : u))
      );
    } catch (error) {
      showToast("Failed to modify user status.", "error");
    }
  };

  const handleChangeRole = async (user, newRole) => {
    try {
      const response = await api.put(`/users/${user.id}/role`, {
        role: newRole,
      });
      showToast(`Access tier for ${user.first_name} elevated to ${newRole}.`, "success");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: response.data.role } : u))
      );
    } catch (error) {
      showToast(error.response?.data?.detail || "Failed to update user authorization role.", "error");
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
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-neon-violet uppercase">System Administration</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">USER REGISTRY MANAGER</h1>
      </div>

      <Card glowColor="violet" hoverEffect={false} className="bg-bg-card border-slate-900 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Email Address</th>
              <th className="py-3 px-4">Access Level</th>
              <th className="py-3 px-4">Gamified Score</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-900/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-950/20 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-200">{u.first_name}</td>
                <td className="py-4 px-4 text-slate-400 font-mono">{u.email}</td>
                <td className="py-4 px-4">
                  <div className="relative inline-block w-32">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-900 rounded-lg py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:border-neon-violet/50"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </td>
                <td className="py-4 px-4 text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-neon-emerald" />
                    <span>Lvl {u.level} ({u.points} XP)</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                    u.is_active 
                      ? "bg-neon-emerald/10 border-neon-emerald/20 text-neon-emerald" 
                      : "bg-neon-rose/10 border-neon-rose/20 text-neon-rose"
                  }`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(u)}
                    className={`p-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      u.is_active 
                        ? "border-neon-rose/30 bg-neon-rose/5 text-neon-rose hover:bg-neon-rose hover:text-white" 
                        : "border-neon-emerald/30 bg-neon-emerald/5 text-neon-emerald hover:bg-neon-emerald hover:text-white"
                    }`}
                  >
                    {u.is_active ? (
                      <span className="flex items-center gap-1"><UserX className="w-3.5 h-3.5" /> Deactivate</span>
                    ) : (
                      <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Activate</span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ManageUsers;
