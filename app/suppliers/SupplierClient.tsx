"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Edit,
  Eye,
  FileText,
  Landmark,
  Plus,
  Search,
  Trash2,
  Truck,
  Wallet,
  X,
  Printer,
} from "lucide-react";

import { toast } from "sonner";

type Supplier = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingBalance: number;
  isActive: boolean;
};

type Outstanding = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
};

type SupplierPayment = {
  id: string | number;
  supplierId: string | number;
  supplierCode: string;
  supplierName: string;
  purchaseId: string | number;
  purchaseNo: string;
  paymentMethod: string;
  amount: number;
  reference: string | null;
  note: string | null;
  paymentDate: string;
};

type StatementData = {
  supplier: {
    id: number;
    code: string;
    name: string;
    phone: string | null;
  };
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  ledger: Array<{
    id: string;
    purchaseId: number | null;
    description: string | null;
    debit: number;
    credit: number;
    createdAt: string;
  }>;
  purchases: Array<{
    id: number;
    purchaseNo: string;
    purchaseDate: string;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    payments: Array<{
      id: number;
      amount: number;
      paymentDate: string;
      reference: string | null;
      note: string | null;
      paymentMethod: string;
      paymentType: string;
    }>;
  }>;
};

type FormState = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  openingBalance: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  openingBalance: "0",
};

export default function SupplierClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [statement, setStatement] =
    useState<StatementData | null>(null);

  const [activeTab, setActiveTab] = useState<
    "SUPPLIERS" | "OUTSTANDING" | "PURCHASES" | "PAYMENTS" | "STATEMENT"
  >("SUPPLIERS");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  const [selectedOutstanding, setSelectedOutstanding] =
    useState<Outstanding | null>(null);

  const [selectedPurchaseId, setSelectedPurchaseId] =
    useState<number | null>(null);

  const [selectedPurchaseSupplierId, setSelectedPurchaseSupplierId] =
    useState<number | null>(null);

  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [additionalPaymentMethod, setAdditionalPaymentMethod] =
    useState("CASH");
  const [additionalPaymentReference, setAdditionalPaymentReference] =
    useState("");
  const [additionalPaymentNote, setAdditionalPaymentNote] =
    useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadAll();
    loadPayments();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const [supplierResponse, outstandingResponse] =
        await Promise.all([
          fetch("/api/suppliers", {
            cache: "no-store",
          }),
          fetch("/api/suppliers/outstanding", {
            cache: "no-store",
          }),
        ]);

      const supplierResult = await supplierResponse.json();
      const outstandingResult =
        await outstandingResponse.json();

      if (!supplierResponse.ok || !supplierResult.success) {
        throw new Error(
          supplierResult.message ||
          "Unable to load suppliers."
        );
      }

      if (
        !outstandingResponse.ok ||
        !outstandingResult.success
      ) {
        throw new Error(
          outstandingResult.message ||
          "Unable to load outstanding."
        );
      }

      setSuppliers(supplierResult.data ?? []);
      setOutstanding(outstandingResult.data ?? []);
    } catch (error) {
      console.error("LOAD SUPPLIER DATA ERROR:", error);

      toast.error("Unable to load supplier data.", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !query ||
        payment.supplierName.toLowerCase().includes(query) ||
        payment.supplierCode.toLowerCase().includes(query) ||
        payment.purchaseNo.toLowerCase().includes(query) ||
        (payment.reference ?? "").toLowerCase().includes(query);

      const matchesMethod =
        paymentMethodFilter === "ALL" ||
        payment.paymentMethod.toUpperCase().replace(/\s+/g, "_") ===
        paymentMethodFilter;

      const paymentDate = payment.paymentDate.slice(0, 10);

      const matchesFrom =
        !paymentDateFrom || paymentDate >= paymentDateFrom;

      const matchesTo =
        !paymentDateTo || paymentDate <= paymentDateTo;

      return (
        matchesSearch &&
        matchesMethod &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    payments,
    paymentSearch,
    paymentMethodFilter,
    paymentDateFrom,
    paymentDateTo,
  ]);

  const filteredPaymentTotal = useMemo(
    () =>
      filteredPayments.reduce(
        (total, payment) => total + Number(payment.amount),
        0
      ),
    [filteredPayments]
  );

  async function loadPayments() {
    try {
      const response = await fetch("/api/suppliers/payments", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load supplier payments."
        );
      }

      setPayments(result.data ?? []);
    } catch (error) {
      console.error("LOAD SUPPLIER PAYMENTS ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load supplier payments."
      );
    }
  }

  async function loadStatement(supplierId: number) {
    try {
      const response = await fetch(
        `/api/suppliers/${supplierId}/statement`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Unable to load supplier statement."
        );
      }

      setStatement(result.data);
    } catch (error) {
      console.error("LOAD STATEMENT ERROR:", error);

      toast.error("Unable to load supplier statement.", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      });
    }
  }

  async function recordPurchasePayment() {
    if (!selectedPurchase || !selectedPurchaseSupplierId) {
      toast.error("Please select a purchase.");
      return;
    }

    const amount = Number(paymentAmountInput);
    const purchaseId = selectedPurchase.id;
    const supplierId = selectedPurchaseSupplierId;

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (amount > Number(selectedPurchase.balanceAmount)) {
      toast.error("Payment cannot exceed the outstanding balance.");
      return;
    }

    try {
      setPaymentSaving(true);

      const response = await fetch(
        `/api/purchases/${purchaseId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            paymentMethodType: additionalPaymentMethod,
            reference: additionalPaymentReference,
            note: additionalPaymentNote,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to record payment."
        );
      }

      // Refresh supplier statement and outstanding balances.
      await loadStatement(supplierId);
      await loadAll();

      setPaymentAmountInput("");
      setAdditionalPaymentMethod("CASH");
      setAdditionalPaymentReference("");
      setAdditionalPaymentNote("");
      setShowPaymentForm(false);
      setSelectedPurchaseId(null);

      toast.success("Purchase payment recorded successfully.");
    } catch (error) {
      console.error("SUPPLIER PURCHASE PAYMENT ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to record payment."
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      code: supplier.code,
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      openingBalance: String(supplier.openingBalance),
    });

    setFormOpen(true);
  }

  async function saveSupplier() {
    if (!form.code.trim()) {
      toast.error("Supplier code is required.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }

    const openingBalance = Number(form.openingBalance);

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast.error("Opening balance is invalid.");
      return;
    }

    try {
      setSaving(true);

      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";

      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          openingBalance,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Unable to save supplier."
        );
      }

      toast.success(
        editingSupplier
          ? "Supplier updated successfully."
          : "Supplier created successfully."
      );

      setFormOpen(false);
      setEditingSupplier(null);
      setForm(emptyForm);

      await loadAll();
    } catch (error) {
      console.error("SAVE SUPPLIER ERROR:", error);

      toast.error("Supplier could not be saved.", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deactivateSupplier(supplier: Supplier) {
    try {
      const response = await fetch(
        `/api/suppliers/${supplier.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Unable to deactivate supplier."
        );
      }

      toast.success("Supplier deactivated.");

      await loadAll();
    } catch (error) {
      console.error("DEACTIVATE SUPPLIER ERROR:", error);

      toast.error("Supplier could not be deactivated.", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      });
    }
  }

  function formatMoney(value: number) {
    return value.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-LK");
  }

  const filteredSuppliers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return suppliers;

    return suppliers.filter(
      (supplier) =>
        supplier.code.toLowerCase().includes(value) ||
        supplier.name.toLowerCase().includes(value) ||
        (supplier.phone ?? "")
          .toLowerCase()
          .includes(value)
    );
  }, [suppliers, search]);

  const filteredOutstanding = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return outstanding;

    return outstanding.filter(
      (supplier) =>
        supplier.code.toLowerCase().includes(value) ||
        supplier.name.toLowerCase().includes(value) ||
        (supplier.phone ?? "")
          .toLowerCase()
          .includes(value)
    );
  }, [outstanding, search]);

  const totalOutstanding = outstanding.reduce(
    (sum, item) => sum + Math.max(item.outstanding, 0),
    0
  );

  const totalPurchases = outstanding.reduce(
    (sum, item) => sum + item.totalDebit,
    0
  );

  const totalPayments = outstanding.reduce(
    (sum, item) => sum + item.totalCredit,
    0
  );

  const ledgerWithBalance = useMemo(() => {
    if (!statement) return [];

    let balance = statement.openingBalance;

    return [...statement.ledger]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      )
      .map((item) => {
        balance += item.debit - item.credit;

        return {
          ...item,
          runningBalance: balance,
        };
      });
  }, [statement]);

  const selectedPurchase =
    statement?.purchases.find(
      (purchase) => purchase.id === selectedPurchaseId
    ) ?? null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Truck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Suppliers
              </h1>

              <p className="text-sm text-slate-500">
                Manage suppliers, purchases, payments and
                outstanding balances.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Active Suppliers
            </span>

            <Truck className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="mt-3 text-2xl font-black">
            {suppliers.filter((item) => item.isActive).length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Total Purchases
            </span>

            <FileText className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-3 text-2xl font-black">
            Rs. {formatMoney(totalPurchases)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Total Payments
            </span>

            <Wallet className="h-5 w-5 text-purple-600" />
          </div>

          <div className="mt-3 text-2xl font-black">
            Rs. {formatMoney(totalPayments)}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-700">
              Outstanding
            </span>

            <Landmark className="h-5 w-5 text-orange-600" />
          </div>

          <div className="mt-3 text-2xl font-black text-orange-700">
            Rs. {formatMoney(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {[
            ["SUPPLIERS", "Suppliers", Truck],
            ["OUTSTANDING", "Outstanding", Landmark],
            ["PURCHASES", "Purchase History", FileText],
            ["PAYMENTS", "Payments", Wallet],
            ["STATEMENT", "Statement / Ledger", BookOpen],
          ].map(([key, label, Icon]) => (
            <button
              key={String(key)}
              type="button"
              onClick={() => {
                setActiveTab(key as typeof activeTab);

                if (
                  key === "STATEMENT" &&
                  suppliers.length > 0
                ) {
                  const firstSupplier = suppliers[0];

                  void loadStatement(firstSupplier.id);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${activeTab === key
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Icon className="h-4 w-4" />
              {String(label)}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      {activeTab !== "STATEMENT" && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search supplier..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      )}

      {/* Suppliers */}
      {activeTab === "SUPPLIERS" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Supplier List
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading suppliers...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3 text-right">
                      Outstanding Balance
                    </th>
                    <th className="px-5 py-3 text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-center">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {supplier.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          {supplier.code}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {supplier.phone || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {supplier.email || "-"}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-orange-600">
                        Rs.{" "}
                        {formatMoney(
                          Math.max(
                            outstanding.find(
                              (item) => item.id === supplier.id
                            )?.outstanding ?? 0,
                            0
                          )
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${supplier.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          {supplier.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSupplier(supplier)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(supplier)
                            }
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {supplier.isActive && (
                            <button
                              type="button"
                              onClick={() =>
                                deactivateSupplier(
                                  supplier
                                )
                              }
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-400"
                      >
                        No suppliers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Outstanding */}
      {activeTab === "OUTSTANDING" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Supplier Outstanding
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current amount payable to each supplier.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-right">
                    Opening
                  </th>
                  <th className="px-5 py-3 text-right">
                    Purchases
                  </th>
                  <th className="px-5 py-3 text-right">
                    Payments
                  </th>
                  <th className="px-5 py-3 text-right">
                    Outstanding
                  </th>
                  <th className="px-5 py-3 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOutstanding.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold">
                        {item.name}
                      </div>

                      <div className="text-xs text-slate-500">
                        {item.code}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      Rs.{" "}
                      {formatMoney(
                        item.openingBalance
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      Rs.{" "}
                      {formatMoney(item.totalDebit)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      Rs.{" "}
                      {formatMoney(item.totalCredit)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-orange-600">
                      Rs.{" "}
                      {formatMoney(
                        Math.max(item.outstanding, 0)
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"

                        onClick={() => {
                          setSelectedOutstanding(item);
                          setActiveTab("STATEMENT");
                          void loadStatement(item.id);
                        }}

                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Purchase History */}
      {activeTab === "PURCHASES" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Purchase History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedPurchaseSupplierId !== null
                  ? `Purchases for ${suppliers.find(
                    (s) => s.id === selectedPurchaseSupplierId
                  )?.name ?? "Selected Supplier"
                  }`
                  : "Select a supplier to view purchase records."}
              </p>
            </div>

            {selectedPurchaseSupplierId !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPurchaseSupplierId(null);
                  setStatement(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50"
              >
                ← Back to Suppliers
              </button>
            )}
          </div>

          {selectedPurchaseSupplierId === null ? (
            <div className="space-y-3 p-5">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {supplier.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {supplier.code}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPurchaseSupplierId(supplier.id);
                      setSelectedOutstanding(
                        outstanding.find(
                          (item) => item.id === supplier.id
                        ) ?? null
                      );
                      setStatement(null);
                      setSelectedPurchaseId(null);
                      void loadStatement(supplier.id);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />
                    View Purchases
                  </button>
                </div>
              ))}

              {suppliers.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No suppliers found.
                </p>
              )}
            </div>
          ) : statement?.supplier.id !== selectedPurchaseSupplierId ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading purchase history...
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    Total Purchases
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    Rs.{" "}
                    {formatMoney(
                      statement.purchases.reduce(
                        (sum, purchase) => sum + purchase.total,
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    Total Paid
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">
                    Rs.{" "}
                    {formatMoney(
                      statement.purchases.reduce(
                        (sum, purchase) => sum + purchase.paidAmount,
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm text-orange-700">
                    Total Balance
                  </p>
                  <p className="mt-1 text-lg font-bold text-orange-700">
                    Rs.{" "}
                    {formatMoney(
                      statement.purchases.reduce(
                        (sum, purchase) => sum + purchase.balanceAmount,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[850px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-4 py-3">Purchase No.</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {statement.purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="px-4 py-4 font-semibold">
                          {purchase.purchaseNo}
                        </td>

                        <td className="px-4 py-4">
                          {formatDate(purchase.purchaseDate)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          Rs. {formatMoney(purchase.total)}
                        </td>

                        <td className="px-4 py-4 text-right text-emerald-700">
                          Rs. {formatMoney(purchase.paidAmount)}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-orange-700">
                          Rs. {formatMoney(purchase.balanceAmount)}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${purchase.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : purchase.status === "PARTIAL"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {purchase.balanceAmount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPurchaseId(purchase.id);
                                setPaymentAmountInput("");
                                setAdditionalPaymentMethod("CASH");
                                setAdditionalPaymentReference("");
                                setAdditionalPaymentNote("");
                                setShowPaymentForm(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="font-semibold text-emerald-700">
                              Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {statement.purchases.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No purchases found for this supplier.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {showPaymentForm && selectedPurchase && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">
                      Record Purchase Payment
                    </h3>

                    <p className="mb-4 text-sm text-slate-600">
                      Purchase: {selectedPurchase.purchaseNo}
                      {" · "}
                      Outstanding: Rs.{" "}
                      {formatMoney(selectedPurchase.balanceAmount)}
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Payment Amount (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          max={selectedPurchase.balanceAmount}
                          step="0.01"
                          value={paymentAmountInput}
                          onChange={(event) =>
                            setPaymentAmountInput(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          placeholder="Enter amount"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Payment Method
                        </label>
                        <select
                          value={additionalPaymentMethod}
                          onChange={(event) =>
                            setAdditionalPaymentMethod(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="ONLINE">Online</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Reference (Optional)
                        </label>
                        <input
                          type="text"
                          value={additionalPaymentReference}
                          onChange={(event) =>
                            setAdditionalPaymentReference(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          placeholder="Receipt or transaction reference"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold">
                          Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={additionalPaymentNote}
                          onChange={(event) =>
                            setAdditionalPaymentNote(event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          placeholder="Payment note"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void recordPurchasePayment()}
                        disabled={paymentSaving}
                        className="rounded-lg bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {paymentSaving ? "Saving..." : "Save Payment"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setSelectedPurchaseId(null);
                        }}
                        disabled={paymentSaving}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}



      {/* Payments */}
      {activeTab === "PAYMENTS" && (
        <div
          id="supplier-payments-print-area"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Supplier Payments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search and filter payments recorded against all supplier purchases.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>

          <div className="print-only px-5 py-4">
            <h1 className="text-2xl font-bold">
              Pubudu Creative Hub
            </h1>

            <h2 className="mt-2 text-lg font-semibold">
              Supplier Payments Report
            </h2>

            <p className="mt-2 text-sm">
              Generated: {new Date().toLocaleString("en-GB")}
            </p>

            <p className="mt-1 text-sm">
              Payment Method:{" "}
              {paymentMethodFilter === "ALL"
                ? "All Methods"
                : paymentMethodFilter.replaceAll("_", " ")}
            </p>

            <p className="mt-1 text-sm">
              Date From: {paymentDateFrom || "All Dates"}
              {"  |  "}
              Date To: {paymentDateTo || "All Dates"}
            </p>

            <p className="mt-2 font-semibold">
              Matching Payments: {filteredPayments.length}
            </p>

            <p className="mt-1 font-bold">
              Total Payments: Rs. {formatMoney(filteredPaymentTotal)}
            </p>
          </div>

          {/* Filters */}
          <div className="no-print grid grid-cols-1 gap-4 border-b border-slate-200 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={paymentSearch}
                onChange={(event) => setPaymentSearch(event.target.value)}
                placeholder="Supplier, purchase no. or reference"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(event) => setPaymentMethodFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Date From
              </label>
              <input
                type="date"
                value={paymentDateFrom}
                max={paymentDateTo || undefined}
                onChange={(event) => setPaymentDateFrom(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Date To
              </label>
              <input
                type="date"
                value={paymentDateTo}
                min={paymentDateFrom || undefined}
                onChange={(event) => setPaymentDateTo(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Filtered total */}
          <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-5 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Matching Payments
              </p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {filteredPayments.length}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">
                Total Filtered Payments
              </p>
              <p className="mt-2 text-xl font-black text-emerald-800">
                Rs. {formatMoney(filteredPaymentTotal)}
              </p>
            </div>
          </div>

          {/* Clear filters */}
          <div className="flex justify-end border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={() => {
                setPaymentSearch("");
                setPaymentMethodFilter("ALL");
                setPaymentDateFrom("");
                setPaymentDateTo("");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>

          {/* Payments table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Purchase</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Note</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">
                      <div>{payment.supplierName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {payment.supplierCode}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {payment.purchaseNo}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {formatDate(payment.paymentDate)}
                    </td>

                    <td className="px-5 py-4">
                      {payment.paymentMethod}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                      Rs. {formatMoney(Number(payment.amount))}
                    </td>

                    <td className="px-5 py-4">
                      {payment.reference || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {payment.note || "-"}
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      No payments match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statement */}
      {activeTab === "STATEMENT" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Select Supplier
            </label>

            <select
              value={statement?.supplier.id ?? ""}
              onChange={(event) => {
                const id = Number(event.target.value);

                if (id) {
                  void loadStatement(id);
                }
              }}
              className="h-11 w-full max-w-lg rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">
                Select supplier
              </option>

              {suppliers.map((supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.code} - {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {statement && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">
                    Opening
                  </p>

                  <p className="mt-2 text-xl font-black">
                    Rs.{" "}
                    {formatMoney(
                      statement.openingBalance
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">
                    Debit
                  </p>

                  <p className="mt-2 text-xl font-black">
                    Rs.{" "}
                    {formatMoney(
                      statement.totalDebit
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">
                    Credit
                  </p>

                  <p className="mt-2 text-xl font-black">
                    Rs.{" "}
                    {formatMoney(
                      statement.totalCredit
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <p className="text-sm text-orange-700">
                    Outstanding
                  </p>

                  <p className="mt-2 text-xl font-black text-orange-700">
                    Rs.{" "}
                    {formatMoney(
                      Math.max(
                        statement.outstanding,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-bold">
                    Supplier Ledger
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-5 py-3">
                          Date
                        </th>

                        <th className="px-5 py-3">
                          Description
                        </th>

                        <th className="px-5 py-3 text-right">
                          Debit
                        </th>

                        <th className="px-5 py-3 text-right">
                          Credit
                        </th>
                        <th className="px-5 py-3 text-right">
                          Running Balance
                        </th>
                      </tr>
                    </thead>


                    <tbody className="divide-y divide-slate-100">
                      {statement.openingBalance !== 0 && (
                        <tr className="bg-emerald-50/50">
                          <td className="px-5 py-4">-</td>

                          <td className="px-5 py-4 font-semibold">
                            Opening Balance
                          </td>

                          <td className="px-5 py-4 text-right">
                            Rs. {formatMoney(statement.openingBalance)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            Rs. {formatMoney(0)}
                          </td>

                          <td className="px-5 py-4 text-right font-bold">
                            Rs. {formatMoney(statement.openingBalance)}
                          </td>
                        </tr>
                      )}

                      {ledgerWithBalance.map((item) => (
                        <tr key={item.id}>
                          <td className="px-5 py-4">
                            {formatDate(item.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            {item.description || "-"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            Rs. {formatMoney(item.debit)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            Rs. {formatMoney(item.credit)}
                          </td>

                          <td className="px-5 py-4 text-right font-bold">
                            Rs. {formatMoney(item.runningBalance)}
                          </td>
                        </tr>
                      ))}

                      {statement.ledger.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-10 text-center text-sm text-slate-400"
                          >
                            No ledger transactions.
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-bold">
                    Purchase History
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-5 py-3">
                          Purchase
                        </th>

                        <th className="px-5 py-3">
                          Date
                        </th>

                        <th className="px-5 py-3 text-right">
                          Total
                        </th>

                        <th className="px-5 py-3 text-right">
                          Paid
                        </th>

                        <th className="px-5 py-3 text-right">
                          Balance
                        </th>

                        <th className="px-5 py-3 text-center">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {statement.purchases.map(
                        (purchase) => (
                          <tr key={purchase.id}>
                            <td className="px-5 py-4 font-bold">
                              {purchase.purchaseNo}
                            </td>

                            <td className="px-5 py-4">
                              {formatDate(
                                purchase.purchaseDate
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              Rs.{" "}
                              {formatMoney(
                                purchase.total
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              Rs.{" "}
                              {formatMoney(
                                purchase.paidAmount
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              Rs.{" "}
                              {formatMoney(
                                purchase.balanceAmount
                              )}
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {purchase.status}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Supplier Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-black">
                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}
                </h2>

                <p className="text-sm text-slate-500">
                  Supplier master information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Supplier Code
                </label>

                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      code: event.target.value,
                    })
                  }
                  placeholder="SUP002"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Supplier Name
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Supplier name"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Phone
                </label>

                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-bold">
                  Address
                </label>

                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-bold">
                  Opening Balance
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      openingBalance:
                        event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveSupplier}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier View Modal */}
      {selectedSupplier && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedSupplier(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-black">
                Supplier Details
              </h2>

              <button
                type="button"
                onClick={() =>
                  setSelectedSupplier(null)
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Code
                </p>

                <p className="mt-1 font-bold">
                  {selectedSupplier.code}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Name
                </p>

                <p className="mt-1 font-bold">
                  {selectedSupplier.name}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-bold">
                  {selectedSupplier.phone || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Email
                </p>

                <p className="mt-1 font-bold">
                  {selectedSupplier.email || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs text-slate-500">
                  Address
                </p>

                <p className="mt-1 font-bold">
                  {selectedSupplier.address || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Opening Balance
                </p>

                <p className="mt-1 font-black">
                  Rs.{" "}
                  {formatMoney(
                    selectedSupplier.openingBalance
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Status
                </p>

                <p className="mt-1 font-black text-emerald-700">
                  {selectedSupplier.isActive
                    ? "ACTIVE"
                    : "INACTIVE"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Purchase / Statement Modal */}
      {selectedPurchase && !showPaymentForm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedPurchaseId(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-black">
                  {selectedPurchase.purchaseNo}
                </h2>

                <p className="text-sm text-slate-500">
                  {statement?.supplier.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPurchaseId(null)
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-6">
              <div className="flex justify-between">
                <span>Total</span>

                <strong>
                  Rs.{" "}
                  {formatMoney(
                    selectedPurchase.total
                  )}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Paid</span>

                <strong>
                  Rs.{" "}
                  {formatMoney(
                    selectedPurchase.paidAmount
                  )}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Balance</span>

                <strong className="text-orange-600">
                  Rs.{" "}
                  {formatMoney(
                    selectedPurchase.balanceAmount
                  )}
                </strong>
              </div>

              <div className="border-t border-slate-200 pt-4">
                {selectedPurchase.payments.map(
                  (payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <div className="flex justify-between">
                        <span>
                          {payment.paymentMethod}
                        </span>

                        <strong className="text-emerald-700">
                          Rs.{" "}
                          {formatMoney(
                            payment.amount
                          )}
                        </strong>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {payment.reference ||
                          "No reference"}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}