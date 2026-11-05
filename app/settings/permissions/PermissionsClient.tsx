"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Save,
  Check,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Role = {
  id: number;
  name: string;
  description: string | null;
};

type Permission = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

type PermissionGroup = {
  module: string;
  permissions: Permission[];
};

type PermissionsResponse = {
  success: boolean;
  message?: string;
  data?: {
    roles: Role[];
    permissions: Permission[];
    selectedPermissionIds: number[];
  };
};

function getModuleName(code: string) {
  const prefix = code.split("_")[0];

  const moduleNames: Record<string, string> = {
    DASHBOARD: "Dashboard",
    POS: "POS",
    JOB: "Jobs",
    PRODUCT: "Products",
    CATEGORY: "Categories",
    BRAND: "Brands",
    UNIT: "Units",
    TAX: "Taxes",
    SERVICE: "Services",
    INVENTORY: "Inventory",
    PURCHASE: "Purchases",
    SALE: "Sales",
    CUSTOMER: "Customers",
    SUPPLIER: "Suppliers",
    EXPENSE: "Expenses",
    REPORT: "Reports",
    USER: "Users",
    ROLE: "Roles & Permissions",
    SETTINGS: "Settings",
    AUDIT: "Audit Logs",
  };

  return moduleNames[prefix] ?? prefix;
}

export default function PermissionsClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = selectedRole === "SUPER_ADMIN";

  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const groups = new Map<string, Permission[]>();

    permissions.forEach((permission) => {
      const moduleName = getModuleName(permission.code);

      if (!groups.has(moduleName)) {
        groups.set(moduleName, []);
      }

      groups.get(moduleName)!.push(permission);
    });

    return Array.from(groups.entries()).map(
      ([module, modulePermissions]) => ({
        module,
        permissions: modulePermissions,
      })
    );
  }, [permissions]);

  const totalPermissions = permissions.length;

  async function loadRolePermissions(
    roleName: string,
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setLoadingRole(true);
      }

      const response = await fetch(
        `/api/settings/permissions?role=${encodeURIComponent(
          roleName
        )}`,
        {
          cache: "no-store",
        }
      );

      const result: PermissionsResponse =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ||
            "Unable to load permissions."
        );
      }

      setRoles(result.data.roles);
      setPermissions(result.data.permissions);

      let selectedIds =
        result.data.selectedPermissionIds;

      if (roleName === "SUPER_ADMIN") {
        selectedIds = result.data.permissions.map(
          (permission) => permission.id
        );
      }

      setSelectedPermissions(selectedIds);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load permissions."
      );
    } finally {
      if (showLoading) {
        setLoadingRole(false);
      }
    }
  }

  async function loadInitialData() {
    try {
      // loading is true by default

      const response = await fetch(
        "/api/settings/permissions?role=SUPER_ADMIN",
        {
          cache: "no-store",
        }
      );

      const result: PermissionsResponse =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ||
            "Unable to load permissions."
        );
      }

      setRoles(result.data.roles);
      setPermissions(result.data.permissions);

      const defaultRole =
        result.data.roles.find(
          (role) => role.name === "SUPER_ADMIN"
        ) || result.data.roles[0];

      if (defaultRole) {
        setSelectedRole(defaultRole.name);

        if (defaultRole.name === "SUPER_ADMIN") {
          setSelectedPermissions(
            result.data.permissions.map(
              (permission) => permission.id
            )
          );
        } else {
          setSelectedPermissions(
            result.data.selectedPermissionIds
          );
        }
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRoleChange = async (
    roleName: string
  ) => {
    setSelectedRole(roleName);

    await loadRolePermissions(roleName);
  };

  const togglePermission = (
    permissionId: number
  ) => {
    if (isSuperAdmin) {
      return;
    }

    setSelectedPermissions((current) =>
      current.includes(permissionId)
        ? current.filter(
            (id) => id !== permissionId
          )
        : [...current, permissionId]
    );
  };

  const selectAll = () => {
    if (isSuperAdmin) {
      return;
    }

    setSelectedPermissions(
      permissions.map(
        (permission) => permission.id
      )
    );
  };

  const clearAll = () => {
    if (isSuperAdmin) {
      return;
    }

    setSelectedPermissions([]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch(
        "/api/settings/permissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleName: selectedRole,
            permissionIds:
              selectedPermissions,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to save permissions."
        );
      }

      toast.success(
        result.message ||
          "Permissions saved successfully."
      );

      await loadRolePermissions(
        selectedRole,
        false
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Roles & Permissions
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Control which tasks each role can access.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
              <Lock className="h-4 w-4" />
              Super Admin Only
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-sm">
              <label className="mb-2 block text-sm font-medium">
                Select Role
              </label>

              <select
                value={selectedRole}
                onChange={(e) =>
                  handleRoleChange(
                    e.target.value
                  )
                }
                disabled={
                  loadingRole || saving
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.name}
                  >
                    {role.name.replaceAll(
                      "_",
                      " "
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={
                  isSuperAdmin ||
                  loadingRole ||
                  saving
                }
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAll}
                disabled={
                  isSuperAdmin ||
                  loadingRole ||
                  saving
                }
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
              SUPER_ADMIN has full system access.
              All permissions are enabled
              automatically.
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Selected Role
            </p>

            <p className="mt-1 text-lg font-semibold">
              {selectedRole.replaceAll(
                "_",
                " "
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Total Permissions
            </p>

            <p className="mt-1 text-lg font-semibold">
              {totalPermissions}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Enabled Permissions
            </p>

            <p className="mt-1 text-lg font-semibold text-primary">
              {selectedPermissions.length}
            </p>
          </div>
        </div>

        {/* Permission Groups */}
        <div className="space-y-4">
          {permissionGroups.map(
            (group) => (
              <div
                key={group.module}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="border-b bg-muted/30 px-5 py-4">
                  <h2 className="font-semibold">
                    {group.module}
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.permissions.length}{" "}
                    permission
                    {group.permissions
                      .length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <div className="divide-y">
                  {group.permissions.map(
                    (permission) => {
                      const checked =
                        selectedPermissions.includes(
                          permission.id
                        );

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {
                                permission.name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {
                                permission.code
                              }
                            </p>
                          </div>

                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={
                              checked
                            }
                            disabled={
                              isSuperAdmin ||
                              loadingRole ||
                              saving
                            }
                            onClick={() =>
                              togglePermission(
                                permission.id
                              )
                            }
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background"
                            } ${
                              isSuperAdmin
                                ? "cursor-not-allowed opacity-90"
                                : "cursor-pointer"
                            }`}
                          >
                            {checked && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Save */}
        <div className="sticky bottom-4 z-10 mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSuperAdmin ||
              saving ||
              loadingRole
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}