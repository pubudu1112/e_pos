"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Plus,
  Pencil,
  Search,
  RefreshCw,
  Wrench,
  Calculator,
  TrendingUp,
  Coins,
  Percent,
  Printer,
  Copy,
  BookOpen,
  ShieldCheck,
  Layers,
  Trash2,
  Package,
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

function getCostFieldLabels(categoryName: string) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("bind")) {
    return {
      field1: "Spine / Spiral / Coil / Tape Cost (Rs.)",
      field1Short: "Spine",
      field2: "Cover Sheets (PVC Front + Board Back) Cost (Rs.)",
      field2Short: "Covers",
      field3: "Machine Punch & Labor Wear (Rs.)",
      field3Short: "Labor/Mch",
      unitName: "binding",
      sectionTitle: "Binding Production & Hidden Costs (Rs.)",
      sectionSubtitle: "Spine materials, front PVC / back covers, and punch/labor wear",
    };
  }
  if (cat.includes("lam")) {
    return {
      field1: "Laminating Film / Pouch Cost (Rs.)",
      field1Short: "Pouch",
      field2: "Electricity & Pre-heat Cost (Rs.)",
      field2Short: "Power",
      field3: "Machine Maintenance Cost (Rs.)",
      field3Short: "Machine",
      unitName: "lamination",
      sectionTitle: "Lamination Production & Power Costs (Rs.)",
      sectionSubtitle: "Thermal pouches, electricity consumption, and roller wear",
    };
  }
  if (cat.includes("photo") || cat.includes("print")) {
    return {
      field1: "Paper Cost (Rs.)",
      field1Short: "Paper",
      field2: "Toner / Ink Cost (Rs.)",
      field2Short: "Toner",
      field3: "Machine Maintenance Cost (Rs.)",
      field3Short: "Machine",
      unitName: "copy",
      sectionTitle: "Print & Photocopy Unit Costs (Rs.)",
      sectionSubtitle: "Paper ream rate, toner cartridge yield, and drum/roller wear",
    };
  }
  return {
    field1: "Primary Material Cost (Rs.)",
    field1Short: "Material",
    field2: "Packaging & Hidden Fees (Rs.)",
    field2Short: "Extras",
    field3: "Machine & Labor Cost (Rs.)",
    field3Short: "Labor",
    unitName: "unit",
    sectionTitle: "Unit Production & Hidden Costs (Rs.)",
    sectionSubtitle: "Raw materials, hidden overheads, and machine/labor",
  };
}

type CostComponent = {
  id: string;
  costType: "INVENTORY" | "MANUAL";
  name: string;
  cost: number;
  productId?: number | null;
  productName?: string | null;
  quantity: number;
};

type CostComponentForm = {
  id: string;
  name: string;
  cost: string;
  productId: string;
  quantity: string;
};

type InventoryProductItem = {
  id: number;
  code: string;
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stockQty: number;
};

type Service = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  costComponents?: CostComponent[];
  inventoryCost?: number;
  manualCost?: number;
  customCost?: number;
  categoryId: number;
  taxId: number | null;
  basePrice: string | number;
  paperCost?: string | number | null;
  tonerCost?: string | number | null;
  machineCost?: string | number | null;
  totalCost?: number;
  netProfit?: number;
  marginPercent?: number;
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

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

  // Service Production Costs (Sri Lankan Rupees - Rs.)
  const [paperCost, setPaperCost] = useState("");
  const [tonerCost, setTonerCost] = useState("");
  const [machineCost, setMachineCost] = useState("");

  // Keep stock-linked parts and manual expenses in separate form groups.
  const [inventoryProducts, setInventoryProducts] = useState<
    InventoryProductItem[]
  >([]);
  const [inventoryCostComponents, setInventoryCostComponents] = useState<
    CostComponentForm[]
  >([]);
  const [manualCostComponents, setManualCostComponents] = useState<
    CostComponentForm[]
  >([]);

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
      if (Array.isArray(result?.inventoryProducts)) {
        setInventoryProducts(result.inventoryProducts);
      }
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
     SEARCH & CATEGORY FILTER
  ============================================================ */

  const filteredServices = useMemo(() => {
    let result = services;

    if (selectedCategoryFilter !== "All") {
      result = result.filter((s) => {
        const catName = (s.servicecategory?.name || "").toLowerCase();
        return catName === selectedCategoryFilter.toLowerCase();
      });
    }

    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return result;
    }

    return result.filter((service) => {
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
  }, [services, selectedCategoryFilter, search]);

  /* ============================================================
     PHOTOCOPY, PRINTING & BINDING SERVICE KPI METRICS
  ============================================================ */

  const stats = useMemo(() => {
    const active = services.filter((s) => s.status === "ACTIVE");
    const photocopyServices = active.filter(
      (s) =>
        (s.servicecategory?.name || "").toLowerCase().includes("photo") ||
        s.name.toLowerCase().includes("photocopy")
    );
    const printingServices = active.filter(
      (s) =>
        (s.servicecategory?.name || "").toLowerCase().includes("print") ||
        s.name.toLowerCase().includes("print")
    );
    const bindingServices = active.filter(
      (s) =>
        (s.servicecategory?.name || "").toLowerCase().includes("bind") ||
        s.name.toLowerCase().includes("bind")
    );
    const laminatingServices = active.filter(
      (s) =>
        (s.servicecategory?.name || "").toLowerCase().includes("lam") ||
        s.name.toLowerCase().includes("lam")
    );

    const workshopServices = [
      ...new Set([
        ...photocopyServices,
        ...printingServices,
        ...bindingServices,
        ...laminatingServices,
      ]),
    ];

    const totalProfit = workshopServices.reduce(
      (acc, s) => acc + (Number(s.netProfit) || 0),
      0
    );
    const avgProfitPerUnit =
      workshopServices.length > 0 ? totalProfit / workshopServices.length : 0;

    const avgMargin =
      workshopServices.length > 0
        ? workshopServices.reduce(
          (acc, s) => acc + (Number(s.marginPercent) || 0),
          0
        ) / workshopServices.length
        : 0;

    return {
      totalActive: active.length,
      printingCount: [
        ...new Set([...photocopyServices, ...printingServices]),
      ].length,
      bindingCount: bindingServices.length,
      laminatingCount: laminatingServices.length,
      avgProfitPerUnit,
      avgMargin,
    };
  }, [services]);

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
    setPaperCost("");
    setTonerCost("");
    setMachineCost("");
    setInventoryCostComponents([]);
    setManualCostComponents([]);
    setEditingService(null);
  }

  function createCostComponent(): CostComponentForm {
    return {
      id: "part-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
      name: "",
      cost: "",
      productId: "",
      quantity: "1",
    };
  }

  function addInventoryCostComponent() {
    setInventoryCostComponents((prev) => [...prev, createCostComponent()]);
  }

  function addManualCostComponent() {
    setManualCostComponents((prev) => [...prev, createCostComponent()]);
  }

  function updateComponentList(
    setter: Dispatch<SetStateAction<CostComponentForm[]>>,
    id: string,
    field: keyof CostComponentForm,
    value: string,
    isInventory: boolean
  ) {
    setter((prev) =>
      prev.map((component) => {
        if (component.id !== id) return component;
        const updated = { ...component, [field]: value };
        if (isInventory && field === "productId") {
          const product = inventoryProducts.find((p) => String(p.id) === value);
          if (product) {
            updated.name = product.name;
            // Default to the product purchase cost. The user can edit this value afterwards.
            updated.cost = String(Number(product.purchasePrice) || 0);
          } else {
            updated.name = "";
            updated.cost = "";
          }
        }
        return updated;
      })
    );
  }

  function updateInventoryCostComponent(
    id: string,
    field: keyof CostComponentForm,
    value: string
  ) {
    updateComponentList(setInventoryCostComponents, id, field, value, true);
  }

  function updateManualCostComponent(
    id: string,
    field: keyof CostComponentForm,
    value: string
  ) {
    updateComponentList(setManualCostComponents, id, field, value, false);
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

    setPaperCost(
      service.paperCost !== null && service.paperCost !== undefined
        ? String(service.paperCost)
        : ""
    );

    setTonerCost(
      service.tonerCost !== null && service.tonerCost !== undefined
        ? String(service.tonerCost)
        : ""
    );

    setMachineCost(
      service.machineCost !== null && service.machineCost !== undefined
        ? String(service.machineCost)
        : ""
    );

    const existingComponents = Array.isArray(service.costComponents)
      ? service.costComponents
      : [];

    setInventoryCostComponents(
      existingComponents
        .filter((component) => component.costType === "INVENTORY")
        .map((component) => ({
          id: component.id || String(Date.now() + Math.random()),
          name: component.name || "",
          cost: (() => {
            const savedCost =
              component.cost !== undefined && component.cost !== null
                ? Number(component.cost)
                : 0;

            // When an existing inventory component has no saved unit cost,
            // use the selected product's purchase price as the default.
            // A non-zero saved cost is preserved so manual edits are not lost.
            if (savedCost > 0) {
              return String(savedCost);
            }

            const selectedProduct = inventoryProducts.find(
              (product) => String(product.id) === String(component.productId)
            );

            return selectedProduct
              ? String(Number(selectedProduct.purchasePrice) || 0)
              : String(savedCost);
          })(),
          productId: component.productId ? String(component.productId) : "",
          quantity: component.quantity ? String(component.quantity) : "1",
        }))
    );

    setManualCostComponents(
      existingComponents
        .filter((component) => component.costType === "MANUAL")
        .map((component) => ({
          id: component.id || String(Date.now() + Math.random()),
          name: component.name || "",
          cost: component.cost !== undefined && component.cost !== null ? String(component.cost) : "",
          productId: "",
          quantity: "1",
        }))
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

    // Unit costs are now managed only through Inventory Parts and Manual Cost Parts.
    const paper = 0;
    const toner = 0;
    const machine = 0;

    const incompleteInventoryPart = inventoryCostComponents.find(
      (component) =>
        !component.productId ||
        !Number.isFinite(Number(component.quantity)) ||
        Number(component.quantity) <= 0 ||
        !Number.isFinite(Number(component.cost)) ||
        Number(component.cost) < 0
    );

    if (incompleteInventoryPart) {
      toast.error("Please select an inventory product and enter a valid positive quantity and unit cost.");
      return;
    }

    const incompleteManualPart = manualCostComponents.find(
      (component) =>
        !component.name.trim() ||
        !Number.isFinite(Number(component.cost)) ||
        Number(component.cost) < 0
    );

    if (incompleteManualPart) {
      toast.error("Please enter a name and valid cost for every manual cost part.");
      return;
    }

    const formattedComponents = [
      ...inventoryCostComponents
        .filter((c) => c.productId && (c.name.trim() || Number(c.cost) > 0))
        .map((c) => ({
          costType: "INVENTORY" as const,
          name: c.name.trim(),
          cost: Math.max(0, Number(c.cost) || 0),
          productId: Number(c.productId),
          quantity: Math.max(0.001, Number(c.quantity) || 1),
        })),
      ...manualCostComponents
        .filter((c) => c.name.trim() || Number(c.cost) > 0)
        .map((c) => ({
          costType: "MANUAL" as const,
          name: c.name.trim(),
          cost: Math.max(0, Number(c.cost) || 0),
          productId: null,
          quantity: 1,
        })),
    ];

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
            paperCost: paper,
            tonerCost: toner,
            machineCost: machine,
            costComponents: formattedComponents,
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
            paperCost: paper,
            tonerCost: toner,
            machineCost: machine,
            costComponents: formattedComponents,
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
              code: statusService.code,
              name: statusService.name,
              description: statusService.description,
              categoryId: statusService.categoryId,
              taxId: statusService.taxId,
              basePrice: Number(statusService.basePrice),

              paperCost: Number(statusService.paperCost) || 0,
              tonerCost: Number(statusService.tonerCost) || 0,
              machineCost: Number(statusService.machineCost) || 0,

              costComponents: (statusService.costComponents || []).map((c) => ({
                costType: c.costType,
                name: c.name,
                cost: Number(c.cost) || 0,
                productId:
                  c.costType === "INVENTORY" ? Number(c.productId) : null,
                quantity:
                  c.costType === "INVENTORY" ? Number(c.quantity) : 1,
              })),

              status:
                statusService.status === "ACTIVE"
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Services Management
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage services (Photocopy, Color Printing, Binding, Laminating) with hidden material, labor & wear costs to track exact net profit (Rs.).
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
              className={`h-4 w-4 ${loading
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-sm"
            >
              <Plus className="h-4 w-4" />

              Add Service
            </button>
          )}
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Services</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.totalActive}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total offered service catalog items</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Photocopy &amp; Print</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Printer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.printingCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Paper &amp; toner cost tracked</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Binding &amp; Finishing</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.bindingCount + stats.laminatingCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.bindingCount} Binding + {stats.laminatingCount} Laminating
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg. Unit Net Profit</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            Rs. {stats.avgProfitPerUnit.toFixed(2)}
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {stats.avgMargin.toFixed(1)}% avg profit margin
          </p>
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTER TABS */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "All", label: "All Services", count: services.length },
            {
              id: "Photocopy",
              label: "Photocopy",
              count: services.filter((s) =>
                (s.servicecategory?.name || "").toLowerCase().includes("photo")
              ).length,
            },
            {
              id: "Color printing",
              label: "Color Printing",
              count: services.filter(
                (s) =>
                  (s.servicecategory?.name || "").toLowerCase().includes("print") &&
                  !(s.servicecategory?.name || "").toLowerCase().includes("photo")
              ).length,
            },
            {
              id: "Binding",
              label: "Binding",
              count: services.filter((s) =>
                (s.servicecategory?.name || "").toLowerCase().includes("bind")
              ).length,
            },
            {
              id: "Laminating",
              label: "Laminating",
              count: services.filter((s) =>
                (s.servicecategory?.name || "").toLowerCase().includes("lam")
              ).length,
            },
            {
              id: "Scanning",
              label: "Scanning",
              count: services.filter((s) =>
                (s.servicecategory?.name || "").toLowerCase().includes("scan")
              ).length,
            },
          ].map((cat) => {
            const isSelected = selectedCategoryFilter.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-700 shadow-xs dark:bg-slate-700 dark:text-slate-200"
                    }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search service name, code (e.g. SRV-BND) or description..."
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
        <div className="overflow-x-auto min-w-full">
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
                  Selling Price
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Unit Cost Breakdown
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Net Profit / Copy
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
                    colSpan={10}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading services...
                  </td>
                </tr>
              ) : filteredServices.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                  ) => {
                    const paper = Number(service.paperCost || 0);
                    const toner = Number(service.tonerCost || 0);
                    const machine = Number(service.machineCost || 0);

                    const totalCost = Number(
                      service.totalCost ??
                      (
                        paper +
                        toner +
                        machine +
                        (Number(service.inventoryCost) || 0) +
                        (Number(service.manualCost) || 0)
                      )
                    );

                    const netProfit = Number(
                      service.netProfit ??
                      (Number(service.basePrice) - totalCost)
                    );

                    const margin = Number(
                      service.marginPercent ??
                      (
                        Number(service.basePrice) > 0
                          ? (netProfit / Number(service.basePrice)) * 100
                          : 0
                      )
                    );
                    const catLabels = getCostFieldLabels(service.servicecategory?.name || "");

                    return (
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {service
                              .servicecategory
                              ?.name ??
                              "-"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
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
                          {totalCost > 0 ? (
                            <div className="text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Rs. {totalCost.toFixed(2)}
                              </span>
                              <div className="text-[10px] text-muted-foreground">
                                {catLabels.field1Short}: {paper.toFixed(2)} | {catLabels.field2Short}: {toner.toFixed(2)} | {catLabels.field3Short}: {machine.toFixed(2)}
                              </div>
                              {service.costComponents &&
                                service.costComponents.length > 0 && (
                                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                                    Inventory: Rs. {Number(service.inventoryCost || 0).toFixed(2)}
                                    {" | "}
                                    Manual: Rs. {Number(service.manualCost || 0).toFixed(2)}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No cost set</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {totalCost > 0 ? (
                            <div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${netProfit >= 0
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                  }`}
                              >
                                {netProfit >= 0 ? "+" : ""}Rs. {netProfit.toFixed(2)}
                                <span className="ml-1 text-[10px] font-normal opacity-80">/{catLabels.unitName}</span>
                              </span>
                              <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                                {margin.toFixed(1)}% margin
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
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
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${service.status ===
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
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${service.status ===
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
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (() => {
        const livePrice = Number(basePrice) || 0;
        const liveInventoryCost = inventoryCostComponents.reduce(
          (sum, component) =>
            sum +
            (Number(component.cost) || 0) *
            Math.max(0.001, Number(component.quantity) || 1),
          0
        );

        const liveManualCost = manualCostComponents.reduce(
          (sum, component) => sum + (Number(component.cost) || 0),
          0
        );

        const liveTotalCost = liveInventoryCost + liveManualCost;
        const liveNetProfit = livePrice - liveTotalCost;
        const liveMargin = livePrice > 0 ? (liveNetProfit / livePrice) * 100 : 0;

        const selectedCatName =
          categories.find((c) => String(c.id) === categoryId)?.name || "";
        const catLabels = getCostFieldLabels(selectedCatName);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="shrink-0 border-b border-border p-5 bg-card">
                <h2 className="text-lg font-bold">
                  {editingService
                    ? "Edit Service & Unit Cost Breakdown"
                    : "Add Service & Cost Breakdown"}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Set the customer selling price, add stock-linked inventory parts and manual expenses, and track net profit per service unit (Rs.).
                </p>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* CODE */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Service Code
                    </label>

                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={50}
                      placeholder={selectedCatName.toLowerCase().includes("bind") ? "e.g. SRV-BND-SP" : "e.g. SRV-PC-A4"}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  {/* NAME */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Service Name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={200}
                      placeholder={selectedCatName.toLowerCase().includes("bind") ? "e.g. A4 Spiral Binding" : "e.g. A4 One Side Photocopy"}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Service Category
                    </label>

                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TAX */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tax
                    </label>

                    <select
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                    >
                      <option value="">No Tax</option>
                      {taxes.map((tax) => (
                        <option key={tax.id} value={tax.id}>
                          {tax.name} ({Number(tax.rate).toLocaleString("en-LK")}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELLING / BASE PRICE */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Customer Selling Price (Rs.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="150.00"
                        className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-3 text-base font-extrabold outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-4">
                    {/* INVENTORY PARTS */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3 dark:border-blue-900/50 dark:bg-blue-950/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                            <Package className="h-4 w-4" />
                            Inventory Parts
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Select products from stock. Quantity is deducted for each service sold.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addInventoryCostComponent}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Inventory Part
                        </button>
                      </div>

                      {inventoryCostComponents.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-blue-200 bg-background/70 px-3 py-3 text-center text-xs text-muted-foreground">
                          No inventory parts added.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inventoryCostComponents.map((component, index) => {
                            const selectedProduct = inventoryProducts.find(
                              (product) => String(product.id) === component.productId
                            );
                            return (
                              <div key={component.id} className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold">Inventory Part #{index + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setInventoryCostComponents((prev) => prev.filter((item) => item.id !== component.id))}
                                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                                    aria-label="Remove inventory part"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-12">
                                  <div className="sm:col-span-6">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Inventory Product</label>
                                    <select
                                      value={component.productId}
                                      onChange={(e) => updateInventoryCostComponent(component.id, "productId", e.target.value)}
                                      className="w-full rounded-md border bg-background px-2.5 py-2 text-xs"
                                    >
                                      <option value="">Select inventory product</option>
                                      {inventoryProducts.map((product) => (
                                        <option key={product.id} value={product.id}>
                                          {product.code} - {product.name} (Stock: {product.stockQty})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="sm:col-span-3">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Quantity / Service</label>
                                    <input
                                      type="number"
                                      min="0.001"
                                      step="0.001"
                                      value={component.quantity}
                                      onChange={(e) => updateInventoryCostComponent(component.id, "quantity", e.target.value)}
                                      className="w-full rounded-md border bg-background px-2.5 py-2 text-xs"
                                    />
                                  </div>
                                  <div className="sm:col-span-3">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Unit Cost (Rs.)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={component.cost}
                                      onChange={(e) => updateInventoryCostComponent(component.id, "cost", e.target.value)}
                                      placeholder="0.00"
                                      className="w-full rounded-md border bg-background px-2.5 py-2 text-xs"
                                    />
                                  </div>
                                </div>
                                {selectedProduct && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Selected: {selectedProduct.name} · Available stock: {selectedProduct.stockQty}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* MANUAL COST PARTS */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            <Coins className="h-4 w-4" />
                            Manual Cost Parts
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Add expenses that are not linked to inventory stock.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addManualCostComponent}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Manual Cost
                        </button>
                      </div>

                      {manualCostComponents.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-emerald-200 bg-background/70 px-3 py-3 text-center text-xs text-muted-foreground">
                          No manual costs added.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {manualCostComponents.map((component, index) => (
                            <div key={component.id} className="rounded-lg border bg-card p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-bold">Manual Cost #{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setManualCostComponents((prev) => prev.filter((item) => item.id !== component.id))}
                                  className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                                  aria-label="Remove manual cost"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Cost Name</label>
                                  <input
                                    type="text"
                                    value={component.name}
                                    onChange={(e) => updateManualCostComponent(component.id, "name", e.target.value)}
                                    placeholder="e.g. Glue, Labour, Extra Fee"
                                    className="w-full rounded-md border bg-background px-2.5 py-2 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Cost per Service (Rs.)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={component.cost}
                                    onChange={(e) => updateManualCostComponent(component.id, "cost", e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-md border bg-background px-2.5 py-2 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* LIVE NET PROFIT PREVIEW BOX */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                            Live Net Profit Per {catLabels.unitName.toUpperCase()}:
                          </div>
                          <div className="text-xs text-emerald-800 dark:text-emerald-400">
                            Selling Rs. {livePrice.toFixed(2)} - Total Cost Rs. {liveTotalCost.toFixed(2)}
                            {" "}(Inventory: Rs. {liveInventoryCost.toFixed(2)} + Manual: Rs. {liveManualCost.toFixed(2)})
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-xl font-black ${liveNetProfit >= 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-600 dark:text-rose-400"
                              }`}
                          >
                            {liveNetProfit >= 0 ? "+" : ""}Rs. {liveNetProfit.toFixed(2)}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                            {liveMargin.toFixed(1)}% profit margin
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Description &amp; Specifications
                    </label>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={5000}
                      rows={2}
                      placeholder={selectedCatName.toLowerCase().includes("bind") ? "e.g. Spiral coil with transparent front PVC and heavy card back cover" : "e.g. Standard 80gsm paper, single-sided"}
                      className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="shrink-0 border-t border-border bg-muted/40 p-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border px-4 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveService}
                  disabled={
                    saving ||
                    (editingService
                      ? !canUpdate
                      : !canCreate)
                  }
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
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
        );
      })()}

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