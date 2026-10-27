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

type Unit = {
  id: number;
  name: string;
  shortName: string;
  description: string | null;
  isActive: boolean;
};

export default function UnitsClient() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // Permissions
  // ============================================================

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const canView =
    permissions.includes("UNIT_VIEW");

  const canCreate =
    permissions.includes("UNIT_CREATE");

  const canUpdate =
    permissions.includes("UNIT_UPDATE");

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

  const [shortName, setShortName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [search, setSearch] =
    useState("");

  // ============================================================
  // Status Confirmation
  // ============================================================

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [selectedUnit, setSelectedUnit] =
    useState<Unit | null>(null);

  // ============================================================
  // Initial Load
  // ============================================================

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (!loadingPermissions && canView) {
      loadUnits();
    } else if (!loadingPermissions && !canView) {
      setUnits([]);
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
        "LOAD UNIT PERMISSIONS ERROR:",
        error
      );

      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  // ============================================================
  // Load Units
  // Permission: UNIT_VIEW
  // ============================================================

  async function loadUnits() {
    if (!canView) {
      setUnits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/products/units",
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
            "Unable to load units."
        );

        return;
      }

      setUnits(result.data || []);
    } catch (error) {
      console.error(error);

      toast.error(
        "Unable to load units."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Open Add Modal
  // Permission: UNIT_CREATE
  // ============================================================

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create units."
      );

      return;
    }

    setEditingId(null);
    setName("");
    setShortName("");
    setDescription("");
    setIsActive(true);
    setShowModal(true);
  }

  // ============================================================
  // Open Edit Modal
  // Permission: UNIT_UPDATE
  // ============================================================

  function openEditModal(
    unit: Unit
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update units."
      );

      return;
    }

    setEditingId(unit.id);
    setName(unit.name);
    setShortName(unit.shortName);
    setDescription(
      unit.description || ""
    );
    setIsActive(unit.isActive);
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
  // Save Unit
  // CREATE -> UNIT_CREATE
  // UPDATE -> UNIT_UPDATE
  // ============================================================

  async function saveUnit() {
    // ----------------------------------------------------------
    // Permission
    // ----------------------------------------------------------

    if (editingId) {
      if (!canUpdate) {
        toast.error(
          "You do not have permission to update units."
        );

        return;
      }
    } else {
      if (!canCreate) {
        toast.error(
          "You do not have permission to create units."
        );

        return;
      }
    }

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!name.trim()) {
      toast.error(
        "Unit name is required."
      );

      return;
    }

    if (!shortName.trim()) {
      toast.error(
        "Short name is required."
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
            shortName,
            description,
            isActive,
          }
        : {
            name,
            shortName,
            description,
          };

      const response = await fetch(
        "/api/products/units",
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
            "Unable to save unit."
        );

        return;
      }

      // --------------------------------------------------------
      // Update
      // --------------------------------------------------------

      if (editingId) {
        setUnits(
          (current) =>
            current
              .map((unit) =>
                unit.id === editingId
                  ? result.data
                  : unit
              )
              .sort((a, b) =>
                a.name.localeCompare(
                  b.name
                )
              )
        );

        toast.success(
          "Unit updated successfully."
        );
      }

      // --------------------------------------------------------
      // Create
      // --------------------------------------------------------

      else {
        setUnits(
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
          "Unit created successfully."
        );
      }

      setShowModal(false);
    } catch (error) {
      console.error(error);

      toast.error(
        "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Open Status Confirmation
  // Permission: UNIT_UPDATE
  // ============================================================

  function openStatusConfirmation(
    unit: Unit
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update units."
      );

      return;
    }

    setSelectedUnit(unit);
    setConfirmOpen(true);
  }

  // ============================================================
  // Toggle Unit Status
  // Permission: UNIT_UPDATE
  // ============================================================

  async function toggleUnitStatus() {
    if (!selectedUnit) {
      return;
    }

    if (!canUpdate) {
      toast.error(
        "You do not have permission to update units."
      );

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/products/units",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: selectedUnit.id,
            name: selectedUnit.name,
            shortName:
              selectedUnit.shortName,
            description:
              selectedUnit.description ||
              "",
            isActive:
              !selectedUnit.isActive,
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
            "Unable to update unit status."
        );

        return;
      }

      setUnits(
        (current) =>
          current
            .map((unit) =>
              unit.id ===
              selectedUnit.id
                ? result.data
                : unit
            )
            .sort((a, b) =>
              a.name.localeCompare(
                b.name
              )
            )
      );

      toast.success(
        result.data.isActive
          ? "Unit activated successfully."
          : "Unit deactivated successfully."
      );

      setConfirmOpen(false);
      setSelectedUnit(null);
    } catch (error) {
      console.error(error);

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

  const filteredUnits =
    units.filter((unit) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) {
        return true;
      }

      return (
        unit.name
          .toLowerCase()
          .includes(searchText) ||
        unit.shortName
          .toLowerCase()
          .includes(searchText) ||
        (unit.description || "")
          .toLowerCase()
          .includes(searchText)
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
              Units
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage product measurement units.
            </p>

          </div>

          {/* Add Unit */}
          {!loadingPermissions &&
            canCreate && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Unit
              </button>
            )}

        </div>

        {/* Permission Loading */}
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
              You do not have permission to view units.
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
                  placeholder="Search units..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />

              </div>

            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[750px] text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        #
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        Unit Name
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        Short Name
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-slate-600">
                        Description
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
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          Loading units...
                        </td>
                      </tr>
                    ) : filteredUnits.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No units found.
                        </td>
                      </tr>
                    ) : (
                      filteredUnits.map(
                        (unit, index) => (
                          <tr
                            key={unit.id}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                          >

                            <td className="px-5 py-4 text-slate-500">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-900">
                              {unit.name}
                            </td>

                            <td className="px-5 py-4">

                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {unit.shortName}
                              </span>

                            </td>

                            <td className="max-w-xs px-5 py-4 text-slate-500">
                              {unit.description ||
                                "-"}
                            </td>

                            <td className="px-5 py-4 text-center">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  unit.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {unit.isActive
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
                                          unit
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
                                          unit
                                        )
                                      }
                                      className={`rounded-lg p-2 transition ${
                                        unit.isActive
                                          ? "text-red-500 hover:bg-red-50"
                                          : "text-emerald-600 hover:bg-emerald-50"
                                      }`}
                                      title={
                                        unit.isActive
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
                {filteredUnits.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {units.length}
              </span>{" "}
              units

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
                  ? "Edit Unit"
                  : "Add Unit"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingId
                  ? "Update the unit details."
                  : "Create a new product measurement unit."}
              </p>

            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-5">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Unit Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  maxLength={50}
                  placeholder="e.g. Kilogram"
                  disabled={saving}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Short Name
                </label>

                <input
                  type="text"
                  value={shortName}
                  onChange={(event) =>
                    setShortName(
                      event.target.value
                    )
                  }
                  maxLength={20}
                  placeholder="e.g. kg"
                  disabled={saving}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  maxLength={255}
                  rows={3}
                  placeholder="Optional description"
                  disabled={saving}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />

              </div>

              {/* Active - Edit only */}
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
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUnit}
                disabled={
                  saving ||
                  (editingId
                    ? !canUpdate
                    : !canCreate)
                }
                className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Unit"
                    : "Save Unit"}
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
            setSelectedUnit(null);
          }

        }}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              {selectedUnit?.isActive
                ? "Deactivate Unit?"
                : "Activate Unit?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to{" "}
              {selectedUnit?.isActive
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {selectedUnit?.name}
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
                toggleUnitStatus();
              }}
              disabled={
                saving ||
                !canUpdate
              }
              className={
                selectedUnit?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {saving
                ? "Updating..."
                : selectedUnit?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>
    </>
  );
}