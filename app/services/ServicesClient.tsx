"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Search,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Service = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  categoryId: number;
  taxId: number | null;
  basePrice: string | number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;

  servicecategory?: {
    id: number;
    name: string;
  };

  tax?: {
    id: number;
    name: string;
    rate: string | number;
  } | null;
};

type ServiceCategory = {
  id: number;
  name: string;
  isActive: boolean;
};

type Tax = {
  id: number;
  name: string;
  rate: string | number;
  isActive: boolean;
};

export default function ServicesClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<
    ServiceCategory[]
  >([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  const [permissions, setPermissions] = useState<
    string[]
  >([]);

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [code, setCode] = useState("");

  const [name, setName] = useState("");

  const [description, setDescription] =
    useState("");

  const [categoryId, setCategoryId] =
    useState("");

  const [taxId, setTaxId] = useState("");

  const [basePrice, setBasePrice] =
    useState("");

  const [statusDialogOpen, setStatusDialogOpen] =
    useState(false);

  const [statusService, setStatusService] =
    useState<Service | null>(null);

  /* ============================================================
     PERMISSIONS
  ============================================================ */

  const canView =
    permissions.includes("SERVICE_VIEW");

  const canCreate =
    permissions.includes("SERVICE_CREATE");

  const canUpdate =
    permissions.includes("SERVICE_UPDATE");

  /* ============================================================
     LOAD PERMISSIONS
  ============================================================ */

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const response = await fetch(
        "/api/auth/permissions",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.data)
      ) {
        throw new Error(
          result.message ||
            "Failed to load permissions."
        );
      }

      setPermissions(result.data);
    } catch (error) {
      console.error(
        "Permission loading error:",
        error
      );

      setPermissions([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load permissions."
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  /* ============================================================
     LOAD SERVICES
  ============================================================ */

  async function loadServices() {
    if (!canView) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/services",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to load services."
        );
      }

      const serviceData = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      setServices(serviceData);
    } catch (error) {
      console.error(
        "Service loading error:",
        error
      );

      setServices([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load services."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     LOAD SERVICE CATEGORIES
  ============================================================ */

  async function loadCategories() {
    try {
      const response = await fetch(
        "/api/products/service-categories",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to load service categories."
        );
      }

      const categoryData = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      setCategories(
        categoryData.filter(
          (item: ServiceCategory) =>
            item.isActive
        )
      );
    } catch (error) {
      console.error(
        "Service category loading error:",
        error
      );

      setCategories([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load service categories."
      );
    }
  }

  /* ============================================================
     LOAD TAXES
  ============================================================ */

  async function loadTaxes() {
    try {
      const response = await fetch(
        "/api/taxes",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to load taxes."
        );
      }

      const taxData = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      setTaxes(
        taxData.filter(
          (item: Tax) => item.isActive
        )
      );
    } catch (error) {
      console.error(
        "Tax loading error:",
        error
      );

      setTaxes([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load taxes."
      );
    }
  }

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (!loadingPermissions) {
      loadCategories();
      loadTaxes();

      if (canView) {
        loadServices();
      } else {
        setServices([]);
        setLoading(false);
      }
    }
  }, [loadingPermissions, canView]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredServices = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.code
          .toLowerCase()
          .includes(keyword) ||
        service.name
          .toLowerCase()
          .includes(keyword) ||
        (
          service.description ?? ""
        )
          .toLowerCase()
          .includes(keyword) ||
        (
          service.servicecategory?.name ?? ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [services, search]);

  /* ============================================================
     RESET FORM
  ============================================================ */

  function resetForm() {
    setCode("");
    setName("");
    setDescription("");
    setCategoryId("");
    setTaxId("");
    setBasePrice("");
    setEditingService(null);
  }

  /* ============================================================
     OPEN ADD MODAL
  ============================================================ */

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create services."
      );
      return;
    }

    resetForm();

    setModalOpen(true);
  }

  /* ============================================================
     OPEN EDIT MODAL
  ============================================================ */

  function openEditModal(
    service: Service
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update services."
      );
      return;
    }

    setEditingService(service);

    setCode(service.code);

    setName(service.name);

    setDescription(
      service.description ?? ""
    );

    setCategoryId(
      String(service.categoryId)
    );

    setTaxId(
      service.taxId
        ? String(service.taxId)
        : ""
    );

    setBasePrice(
      String(service.basePrice)
    );

    setModalOpen(true);
  }

  /* ============================================================
     SAVE SERVICE
  ============================================================ */

  async function saveService() {
    if (
      editingService &&
      !canUpdate
    ) {
      toast.error(
        "You do not have permission to update services."
      );

      return;
    }

    if (
      !editingService &&
      !canCreate
    ) {
      toast.error(
        "You do not have permission to create services."
      );

      return;
    }

    const trimmedCode =
      code.trim();

    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    if (!trimmedCode) {
      toast.error(
        "Service code is required."
      );

      return;
    }

    if (!trimmedName) {
      toast.error(
        "Service name is required."
      );

      return;
    }

    if (!categoryId) {
      toast.error(
        "Please select a service category."
      );

      return;
    }

    if (!basePrice.trim()) {
      toast.error(
        "Base price is required."
      );

      return;
    }

    const price =
      Number(basePrice);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      toast.error(
        "Please enter a valid base price."
      );

      return;
    }

    try {
      setSaving(true);

      const payload =
        editingService
          ? {
              id: editingService.id,
              code: trimmedCode,
              name: trimmedName,
              description:
                trimmedDescription ||
                null,
              categoryId:
                Number(categoryId),
              taxId: taxId
                ? Number(taxId)
                : null,
              basePrice: price,
              status:
                editingService.status,
            }
          : {
              code: trimmedCode,
              name: trimmedName,
              description:
                trimmedDescription ||
                null,
              categoryId:
                Number(categoryId),
              taxId: taxId
                ? Number(taxId)
                : null,
              basePrice: price,
            };

      const response =
        await fetch(
          "/api/services",
          {
            method:
              editingService
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to save service."
        );
      }

      toast.success(
        editingService
          ? "Service updated successfully."
          : "Service created successfully."
      );

      setModalOpen(false);

      resetForm();

      await loadServices();
    } catch (error) {
      console.error(
        "Save service error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save service."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     OPEN STATUS CONFIRMATION
  ============================================================ */

  function openStatusConfirmation(
    service: Service
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update services."
      );

      return;
    }

    setStatusService(service);

    setStatusDialogOpen(true);
  }

  /* ============================================================
     TOGGLE STATUS
  ============================================================ */

  async function toggleStatus() {
    if (
      !statusService ||
      !canUpdate
    ) {
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/services",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: statusService.id,

              code:
                statusService.code,

              name:
                statusService.name,

              description:
                statusService.description,

              categoryId:
                statusService.categoryId,

              taxId:
                statusService.taxId,

              basePrice:
                Number(
                  statusService.basePrice
                ),

              status:
                statusService.status ===
                "ACTIVE"
                  ? "INACTIVE"
                  : "ACTIVE",
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to update service status."
        );
      }

      toast.success(
        statusService.status ===
          "ACTIVE"
          ? "Service deactivated."
          : "Service activated."
      );

      setStatusDialogOpen(
        false
      );

      setStatusService(null);

      await loadServices();
    } catch (error) {
      console.error(
        "Service status error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update service status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     REFRESH
  ============================================================ */

  async function refreshServices() {
    await loadServices();
  }

  /* ============================================================
     PERMISSION LOADING
  ============================================================ */

  if (loadingPermissions) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Loading permissions...
        </div>
      </div>
    );
  }

  /* ============================================================
     NO VIEW PERMISSION
  ============================================================ */

  if (!canView) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <Wrench className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

        <h2 className="text-xl font-semibold">
          Access Restricted
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view
          services.
        </p>
      </div>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Services
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage services offered by
            Pubudu Creative Hub.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              refreshServices
            }
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={
                openAddModal
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />

              Add Service
            </button>
          )}
        </div>
      </div>

      {/* SEARCH */}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  #
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Code
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Service Name
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Category
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Base Price
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Tax
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading services...
                  </td>
                </tr>
              ) : filteredServices.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map(
                  (
                    service,
                    index
                  ) => (
                    <tr
                      key={
                        service.id
                      }
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {
                          service.code
                        }
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {
                            service.name
                          }
                        </div>

                        {service.description && (
                          <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                            {
                              service.description
                            }
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {service
                          .servicecategory
                          ?.name ??
                          "-"}
                      </td>

                      <td className="px-4 py-3 text-right font-medium">
                        Rs.{" "}
                        {Number(
                          service.basePrice
                        ).toLocaleString(
                          "en-LK",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {service.tax
                          ? `${service.tax.name} (${Number(
                              service.tax.rate
                            ).toLocaleString(
                              "en-LK"
                            )}%)`
                          : "-"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            service.status ===
                            "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {service.status ===
                          "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    service
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Pencil className="h-3.5 w-3.5" />

                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openStatusConfirmation(
                                    service
                                  )
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                  service.status ===
                                  "ACTIVE"
                                    ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                                    : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30"
                                }`}
                              >
                                {service.status ===
                                "ACTIVE"
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                {editingService
                  ? "Edit Service"
                  : "Add Service"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {editingService
                  ? "Update service details."
                  : "Create a new service."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* CODE */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Service Code
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                    )
                  }
                  maxLength={50}
                  placeholder="e.g. PRINT-A4"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* NAME */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Service Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="e.g. A4 Colour Printing"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Service Category
                </label>

                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* TAX */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Tax
                </label>

                <select
                  value={taxId}
                  onChange={(e) =>
                    setTaxId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">
                    No Tax
                  </option>

                  {taxes.map(
                    (tax) => (
                      <option
                        key={tax.id}
                        value={tax.id}
                      >
                        {tax.name} (
                        {Number(
                          tax.rate
                        ).toLocaleString(
                          "en-LK"
                        )}
                        %)
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* BASE PRICE */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Base Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) =>
                    setBasePrice(
                      e.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  maxLength={5000}
                  rows={4}
                  placeholder="Enter service description..."
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveService
                }
                disabled={
                  saving ||
                  (editingService
                    ? !canUpdate
                    : !canCreate)
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingService
                    ? "Update Service"
                    : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION */}

      <AlertDialog
        open={
          statusDialogOpen
        }
        onOpenChange={
          setStatusDialogOpen
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusService?.status ===
              "ACTIVE"
                ? "Deactivate Service?"
                : "Activate Service?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to{" "}
              {statusService?.status ===
              "ACTIVE"
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {
                  statusService?.name
                }
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                toggleStatus();
              }}
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : statusService?.status ===
                    "ACTIVE"
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}