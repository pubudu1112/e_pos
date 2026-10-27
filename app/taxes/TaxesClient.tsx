"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Search } from "lucide-react";
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

type Tax = {
  id: number;
  name: string;
  rate: number | string;
  isActive: boolean;
};

export default function TaxesClient() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // Permissions
  // ============================================================

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const canView =
    permissions.includes("TAX_VIEW");

  const canCreate =
    permissions.includes("TAX_CREATE");

  const canUpdate =
    permissions.includes("TAX_UPDATE");

  // ============================================================
  // Modal
  // ============================================================

  const [showModal, setShowModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

  const [rate, setRate] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [search, setSearch] =
    useState("");

  // ============================================================
  // Confirmation
  // ============================================================

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [selectedTax, setSelectedTax] =
    useState<Tax | null>(null);

  // ============================================================
  // Initial Load
  // ============================================================

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (!loadingPermissions && canView) {
      loadTaxes();
    } else if (
      !loadingPermissions &&
      !canView
    ) {
      setTaxes([]);
      setLoading(false);
    }
  }, [loadingPermissions, canView]);

  // ============================================================
  // Load Permissions
  // ============================================================

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const response = await fetch(
        "/api/auth/permissions",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (
        response.ok &&
        result.success &&
        Array.isArray(result.data)
      ) {
        setPermissions(result.data);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error(
        "LOAD TAX PERMISSIONS ERROR:",
        error
      );

      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  // ============================================================
  // Load Taxes
  // Permission: TAX_VIEW
  // ============================================================

  async function loadTaxes() {
    if (!canView) {
      setTaxes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/taxes",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
            "Unable to load taxes."
        );

        return;
      }

      setTaxes(result.data || []);
    } catch (error) {
      console.error(
        "LOAD TAXES ERROR:",
        error
      );

      toast.error(
        "Unable to load taxes."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Open Add Modal
  // Permission: TAX_CREATE
  // ============================================================

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create taxes."
      );

      return;
    }

    setEditingId(null);
    setName("");
    setRate("");
    setIsActive(true);
    setShowModal(true);
  }

  // ============================================================
  // Open Edit Modal
  // Permission: TAX_UPDATE
  // ============================================================

  function openEditModal(tax: Tax) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update taxes."
      );

      return;
    }

    setEditingId(tax.id);
    setName(tax.name);
    setRate(String(tax.rate));
    setIsActive(tax.isActive);
    setShowModal(true);
  }

  // ============================================================
  // Close Modal
  // ============================================================

  function closeModal() {
    if (!saving) {
      setShowModal(false);
    }
  }

  // ============================================================
  // Save Tax
  // CREATE -> TAX_CREATE
  // UPDATE -> TAX_UPDATE
  // ============================================================

  async function saveTax() {
    if (editingId) {
      if (!canUpdate) {
        toast.error(
          "You do not have permission to update taxes."
        );

        return;
      }
    } else {
      if (!canCreate) {
        toast.error(
          "You do not have permission to create taxes."
        );

        return;
      }
    }

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!name.trim()) {
      toast.error(
        "Tax name is required."
      );

      return;
    }

    if (!rate.trim()) {
      toast.error(
        "Tax rate is required."
      );

      return;
    }

    const numericRate =
      Number(rate);

    if (Number.isNaN(numericRate)) {
      toast.error(
        "Enter a valid tax rate."
      );

      return;
    }

    if (
      numericRate < 0 ||
      numericRate > 100
    ) {
      toast.error(
        "Tax rate must be between 0 and 100."
      );

      return;
    }

    try {
      setSaving(true);

      const method = editingId
        ? "PUT"
        : "POST";

      const body = editingId
        ? {
            id: editingId,
            name,
            rate: numericRate,
            isActive,
          }
        : {
            name,
            rate: numericRate,
          };

      const response = await fetch(
        "/api/taxes",
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
            "Unable to save tax."
        );

        return;
      }

      // --------------------------------------------------------
      // Update
      // --------------------------------------------------------

      if (editingId) {
        setTaxes(
          (current) =>
            current
              .map((tax) =>
                tax.id === editingId
                  ? result.data
                  : tax
              )
              .sort((a, b) =>
                a.name.localeCompare(
                  b.name
                )
              )
        );

        toast.success(
          "Tax updated successfully."
        );
      }

      // --------------------------------------------------------
      // Create
      // --------------------------------------------------------

      else {
        setTaxes(
          (current) =>
            [
              ...current,
              result.data,
            ].sort((a, b) =>
              a.name.localeCompare(
                b.name
              )
            )
        );

        toast.success(
          "Tax created successfully."
        );
      }

      setShowModal(false);
      setEditingId(null);
      setName("");
      setRate("");
      setIsActive(true);
    } catch (error) {
      console.error(
        "SAVE TAX ERROR:",
        error
      );

      toast.error(
        "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Open Status Confirmation
  // Permission: TAX_UPDATE
  // ============================================================

  function openStatusConfirmation(
    tax: Tax
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update taxes."
      );

      return;
    }

    setSelectedTax(tax);
    setConfirmOpen(true);
  }

  // ============================================================
  // Toggle Tax Status
  // Permission: TAX_UPDATE
  // ============================================================

  async function toggleTaxStatus() {
    if (!selectedTax) {
      return;
    }

    if (!canUpdate) {
      toast.error(
        "You do not have permission to update taxes."
      );

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/taxes",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: selectedTax.id,
            name: selectedTax.name,
            rate: Number(
              selectedTax.rate
            ),
            isActive:
              !selectedTax.isActive,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
            "Unable to update tax status."
        );

        return;
      }

      setTaxes(
        (current) =>
          current
            .map((tax) =>
              tax.id ===
              selectedTax.id
                ? result.data
                : tax
            )
            .sort((a, b) =>
              a.name.localeCompare(
                b.name
              )
            )
      );

      toast.success(
        result.data.isActive
          ? "Tax activated successfully."
          : "Tax deactivated successfully."
      );

      setConfirmOpen(false);
      setSelectedTax(null);
    } catch (error) {
      console.error(
        "TOGGLE TAX STATUS ERROR:",
        error
      );

      toast.error(
        "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Filter
  // ============================================================

  const filteredTaxes =
    taxes.filter((tax) => {
      const searchText =
        search
          .toLowerCase()
          .trim();

      if (!searchText) {
        return true;
      }

      return (
        tax.name
          .toLowerCase()
          .includes(searchText) ||
        String(tax.rate).includes(
          searchText
        )
      );
    });

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <div className="p-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Taxes
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage tax rates used for products and
              services.
            </p>

          </div>

          {/* Add Tax */}
          {!loadingPermissions &&
            canCreate && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Tax
              </button>
            )}

        </div>

        {/* Permission Loading / Access */}
        {loadingPermissions ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Checking permissions...
          </div>
        ) : !canView ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">

            <div className="mb-3 text-4xl">
              🔒
            </div>

            <p className="font-medium text-slate-700">
              You do not have permission to view taxes.
            </p>

          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">

              <div className="relative max-w-md">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search taxes..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />

              </div>

            </div>

            {/* Tax Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px] text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        #
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        Tax Name
                      </th>

                      <th className="px-5 py-3 text-right font-semibold text-slate-600">
                        Rate
                      </th>

                      <th className="px-5 py-3 text-center font-semibold text-slate-600">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right font-semibold text-slate-600">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          Loading taxes...
                        </td>
                      </tr>
                    ) : filteredTaxes.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No taxes found.
                        </td>
                      </tr>
                    ) : (
                      filteredTaxes.map(
                        (tax, index) => (
                          <tr
                            key={tax.id}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                          >

                            <td className="px-5 py-4 text-slate-500">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-900">
                              {tax.name}
                            </td>

                            <td className="px-5 py-4 text-right font-medium text-slate-900">
                              {Number(
                                tax.rate
                              ).toFixed(2)}
                              %
                            </td>

                            <td className="px-5 py-4 text-center">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  tax.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {tax.isActive
                                  ? "Active"
                                  : "Inactive"}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                {/* Edit */}
                                {!loadingPermissions &&
                                  canUpdate && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEditModal(
                                          tax
                                        )
                                      }
                                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                  )}

                                {/* Activate / Deactivate */}
                                {!loadingPermissions &&
                                  canUpdate && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openStatusConfirmation(
                                          tax
                                        )
                                      }
                                      className={`rounded-lg p-2 transition ${
                                        tax.isActive
                                          ? "text-red-500 hover:bg-red-50"
                                          : "text-emerald-600 hover:bg-emerald-50"
                                      }`}
                                      title={
                                        tax.isActive
                                          ? "Deactivate"
                                          : "Activate"
                                      }
                                    >
                                      <Power className="h-4 w-4" />
                                    </button>
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

            {/* Summary */}
            <div className="mt-4 text-sm text-slate-500">

              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredTaxes.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {taxes.length}
              </span>{" "}
              taxes

            </div>
          </>
        )}

      </div>

      {/* Add / Edit Modal */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            {/* Modal Header */}
            <div className="border-b border-slate-200 px-6 py-4">

              <h2 className="text-lg font-semibold text-slate-900">
                {editingId
                  ? "Edit Tax"
                  : "Add Tax"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingId
                  ? "Update the tax details."
                  : "Create a new tax rate."}
              </p>

            </div>

            {/* Form */}
            <div className="space-y-4 px-6 py-5">

              {/* Tax Name */}
              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tax Name
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="e.g. VAT"
                  disabled={saving}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />

              </div>

              {/* Tax Rate */}
              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tax Rate (%)
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={rate}
                    onChange={(event) =>
                      setRate(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    disabled={saving}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    %
                  </span>

                </div>

              </div>

              {/* Active */}
              {editingId && (

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) =>
                      setIsActive(
                        event.target.checked
                      )
                    }
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Active
                  </span>

                </label>

              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveTax}
                disabled={
                  saving ||
                  (editingId
                    ? !canUpdate
                    : !canCreate)
                }
                className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Tax"
                    : "Save Tax"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* Status Confirmation */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setConfirmOpen(false);
            setSelectedTax(null);
          }
        }}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              {selectedTax?.isActive
                ? "Deactivate Tax?"
                : "Activate Tax?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to{" "}
              {selectedTax?.isActive
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {selectedTax?.name}
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
                toggleTaxStatus();
              }}
              disabled={
                saving ||
                !canUpdate
              }
              className={
                selectedTax?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {saving
                ? "Updating..."
                : selectedTax?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>
    </>
  );
}