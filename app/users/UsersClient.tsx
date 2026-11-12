"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Edit2,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type RoleOption = {
  id: number;
  name: string;
  description: string | null;
};

type AppUser = {
  id: number;
  username: string;
  email: string | null;
  fullName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  roleId: number;
  role: { id: number; name: string; description: string | null } | null;
  lastLoginAt: string | null;
  createdAt: string;
  salesCount: number;
  jobsCount: number;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleBadge(roleName?: string) {
  switch (roleName) {
    case "SUPER_ADMIN":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "MANAGER":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "CASHIER":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default function UsersClient() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");
  const [formNewPassword, setFormNewPassword] = useState("");

  const fetchUsersData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedRole !== "ALL") params.set("roleId", selectedRole);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const res = await fetch(`/api/users?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setUsers(json.data || []);
        if (json.roles) setRoles(json.roles);
      } else {
        toast.error(json.message || "Failed to load users");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading users");
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole, selectedStatus]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  function handleManualRefresh() {
    setLoading(true);
    fetchUsersData();
  }

  // Open Create Modal
  function openCreateModal() {
    setFormUsername("");
    setFormFullName("");
    setFormEmail("");
    setFormPassword("");
    setFormRoleId(roles[0]?.id ? String(roles[0].id) : "");
    setFormStatus("ACTIVE");
    setAddModalOpen(true);
  }

  // Open Edit Modal
  function openEditModal(u: AppUser) {
    setEditingUser(u);
    setFormFullName(u.fullName);
    setFormEmail(u.email || "");
    setFormRoleId(String(u.roleId));
    setFormStatus(u.status);
    setFormNewPassword("");
    setEditModalOpen(true);
  }

  // Create User
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!formUsername.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!formFullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!formRoleId) {
      toast.error("Role is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername.trim(),
          fullName: formFullName.trim(),
          email: formEmail.trim() || null,
          password: formPassword,
          roleId: formRoleId,
          status: formStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to create user");
        return;
      }

      toast.success("User account created successfully");
      setAddModalOpen(false);
      handleManualRefresh();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  // Update User
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (!formFullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formFullName.trim(),
          email: formEmail.trim() || null,
          roleId: formRoleId,
          status: formStatus,
          newPassword: formNewPassword.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update user");
        return;
      }

      toast.success("User profile updated");
      setEditModalOpen(false);
      handleManualRefresh();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  // Deactivate User
  async function handleDeactivateUser(id: number, username: string) {
    if (!confirm(`Are you sure you want to deactivate user account "@${username}"?`)) return;

    try {
      setDeactivatingId(id);
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to deactivate user");
        return;
      }

      toast.success(`User @${username} deactivated`);
      handleManualRefresh();
    } catch {
      toast.error("Failed to deactivate user");
    } finally {
      setDeactivatingId(null);
    }
  }

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
                <p className="text-sm text-slate-500">
                  Manage staff accounts, assign system roles, and control access permissions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total System Users</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">{users.length}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Configured operator accounts</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">{activeCount}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Can log in and operate POS</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Configured Roles</span>
              <ShieldCheck className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">{roles.length}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Role-based access categories</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, email..."
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 pl-10 pr-4 text-sm text-slate-900 dark:text-foreground placeholder-slate-400 focus:border-primary focus:bg-white dark:focus:bg-card focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            {(search || selectedRole !== "ALL" || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedRole("ALL");
                  setSelectedStatus("ALL");
                }}
                className="h-10 rounded-xl border border-slate-200 dark:border-border px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">Loading user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="h-12 w-12 stroke-[1.2]" />
              <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">No users found</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Create staff or cashier accounts to grant access.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 dark:border-border bg-slate-50/75 dark:bg-muted/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Contact / Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Activity</th>
                    <th className="px-5 py-3.5">Last Login</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-foreground">{u.fullName}</p>
                            <p className="font-mono text-xs text-slate-400 dark:text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600 dark:text-muted-foreground">
                        {u.email || <span className="text-slate-400 dark:text-muted-foreground italic">No email set</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${getRoleBadge(
                            u.role?.name
                          )}`}
                        >
                          {u.role?.name || "No Role"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600 dark:text-muted-foreground">
                        <span>{u.salesCount} sales</span>
                        <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                        <span>{u.jobsCount} jobs</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 dark:text-muted-foreground">
                        {formatDateTime(u.lastLoginAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-700 dark:hover:text-foreground"
                            title="Edit User & Password"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {u.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => handleDeactivateUser(u.id, u.username)}
                              disabled={deactivatingId === u.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                              title="Deactivate User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">Add New User</h3>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">Create credentials and assign access permissions</p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-600 dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Kasun Bandara"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Username *
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. kasun"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm font-mono text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. kasun@pubudu.lk"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  required
                  minLength={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Role *
                  </label>
                  <select
                    value={formRoleId}
                    onChange={(e) => setFormRoleId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED")}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-border pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">Edit User Profile</h3>
                <p className="text-xs text-slate-500 dark:text-muted-foreground font-mono">@{editingUser.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-600 dark:hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Role *
                  </label>
                  <select
                    value={formRoleId}
                    onChange={(e) => setFormRoleId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED")}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-800 dark:text-foreground shadow-sm focus:border-primary focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50/75 dark:bg-muted/30 p-3.5">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={formNewPassword}
                  onChange={(e) => setFormNewPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  minLength={6}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
