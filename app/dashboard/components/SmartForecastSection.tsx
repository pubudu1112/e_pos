
"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    BriefcaseBusiness,
    Activity,
    Bell,
    Clock,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type ForecastPeriod = 7 | 30 | 90;

type SalesForecastPoint = {
    date: string;
    actual: number;
    forecast: number | null;
};

type ProductDemand = {
    productId: number;
    code: string;
    name: string;
    availableStock: number;
    averageDailyDemand: number;
    forecastDemand: number;
    safetyStock: number;
    suggestedPurchase: number;
};

type ServiceDemand = {
    serviceId: number;
    code: string;
    name: string;
    basePrice: number;
    soldQuantity: number;
    averageDailyDemand: number;
    forecastDemand: number;
};

type CombinedMaterialDemand = {
    productId: number;
    code: string;
    name: string;
    availableStock: number;
    minimumStock: number;
    productDemand: number;
    serviceMaterialDemand: number;
    totalRequired: number;
    suggestedPurchase: number;
};

type ForecastAlert = {
    type: string;
    title: string;
    message: string;
    priority: string;
    recommendedAction?: string;
    productId?: number;
    forecastStart?: string;
    forecastEnd?: string;
};

type SeasonalEvent = {
    id: number;
    title: string;
    description?: string;
    eventType: string;
    startDate: string;
    endDate: string;
    daysUntilStart: number;
    isOngoing: boolean;
    impactStatus: string;
};

type ForecastData = {
    generatedAt: string;
    forecastDays: number;

    salesForecast: {
        historicalSales: number;
        averageDailySales: number;
        forecastDays: number;
        forecastSales: number;
        confidence: string;
        points: SalesForecastPoint[];
    };

    productDemand: ProductDemand[];

    serviceDemand: ServiceDemand[];

    combinedMaterialDemand: CombinedMaterialDemand[];

    profitForecast: {
        forecastRevenue: number;
        forecastCost: number;
        forecastGrossProfit: number;
        forecastExpenses: number;
        forecastNetProfit: number;
        confidence: string;
    };

    seasonalEvents: SeasonalEvent[];

    alerts: ForecastAlert[];

    summary: {
        totalProducts: number;
        productsToPurchase: number;
        totalAlerts: number;
        urgentAlerts: number;
    };

    dataQuality: {
        baselineStartDate: string;
        baselineEndDate: string;
        historyDays: number;
        totalSales: number;
        totalProducts: number;
        totalSaleItems: number;
        itemsWithMissingCost: number;
        costCompleteness: number;
        profitForecastReliable: boolean;
        comparisonAvailable: boolean;
        notes: string[];
    };
};

type ForecastApiResponse = {
    success: boolean;
    data?: ForecastData;
    dataQuality?: ForecastData["dataQuality"];
    message?: string;
};

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value: number) {
    return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatNumber(value: number) {
    return Number(value || 0).toLocaleString("en-LK", {
        maximumFractionDigits: 2,
    });
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-LK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getPriorityClass(priority: string) {
    switch (priority.toUpperCase()) {
        case "URGENT":
            return "bg-destructive/10 text-destructive border-destructive/20";

        case "HIGH":
            return "bg-warning/15 text-warning-foreground border-warning/20";

        case "MEDIUM":
            return "bg-primary/10 text-primary border-primary/20";

        default:
            return "bg-muted text-muted-foreground border-border";
    }
}

function getConfidenceClass(confidence: string) {
    switch (confidence.toUpperCase()) {
        case "HIGH":
            return "bg-success/10 text-success";

        case "MEDIUM":
            return "bg-warning/15 text-warning-foreground";

        default:
            return "bg-muted text-muted-foreground";
    }
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

function StatCard({
    title,
    value,
    description,
    icon: Icon,
    color = "primary",
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
    color?: string;
}) {
    const colorClasses: Record<string, string> = {
        primary: "bg-primary/10 text-primary",
        success: "bg-success/10 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-destructive/10 text-destructive",
        blue: "bg-chart-4/10 text-chart-4",
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>

                    <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {value}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SmartForecastSection() {
    const [forecastDays, setForecastDays] =
        useState<ForecastPeriod>(30);

    const [data, setData] =
        useState<ForecastData | null>(null);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const loadForecast = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError(null);

            const response = await fetch(
                `/api/forecast?forecastDays=${forecastDays}`,
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            const result: ForecastApiResponse =
                await response.json();

            if (!response.ok || !result.success || !result.data) {
                throw new Error(
                    result.message || "Unable to load forecast data."
                );
            }

            setData({
                ...result.data,
                dataQuality: result.dataQuality ?? result.data.dataQuality,
            });
        } catch (err) {
            console.error("Smart Forecast Error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load forecast."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [forecastDays]);

    useEffect(() => {
        loadForecast();
    }, [loadForecast]);

    // ========================================================
    // LOADING
    // ========================================================

    if (loading && !data) {
        return (
            <section className="mt-8 rounded-2xl border border-border bg-card p-10">
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />

                    <p className="text-sm font-medium text-muted-foreground">
                        Loading Smart Forecast...
                    </p>
                </div>
            </section>
        );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (error && !data) {
        return (
            <section className="mt-8 rounded-2xl border border-destructive/20 bg-card p-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />

                    <div className="flex-1">
                        <h2 className="font-semibold text-foreground">
                            Forecast could not be loaded
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() => loadForecast()}
                            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    if (!data) return null;

    const sales = data.salesForecast;
    const profit = data.profitForecast;
    const summary = data.summary;

    const maxSales = Math.max(
        1,
        ...sales.points.map((point) =>
            Math.max(point.actual, point.forecast || 0)
        )
    );

    const purchaseItems = data.combinedMaterialDemand.filter(
        (item) => item.suggestedPurchase > 0
    );

    const productPurchaseItems = data.productDemand.filter(
        (item) => item.suggestedPurchase > 0
    );

    const servicePurchaseItems = data.combinedMaterialDemand.filter(
        (item) => item.serviceMaterialDemand > 0
    );

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="p-4 sm:p-6">
        <section className="mt-8 space-y-6">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Activity className="h-5 w-5" />
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            Smart Forecast
                        </h2>

                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                            API Connected
                        </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Business predictions, stock requirements and future planning.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={forecastDays}
                        onChange={(event) =>
                            setForecastDays(
                                Number(event.target.value) as ForecastPeriod
                            )
                        }
                        className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
                    >
                        <option value={7}>Next 7 Days</option>
                        <option value={30}>Next 30 Days</option>
                        <option value={90}>Next 90 Days</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => loadForecast(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />

                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    Refresh failed: {error}. Showing previously loaded data.
                </div>
            )}

            {/* ==================================================
                KPI CARDS
            ================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Forecast Sales"
                    value={formatCurrency(sales.forecastSales)}
                    description={`${forecastDays} days estimated revenue`}
                    icon={TrendingUp}
                    color="success"
                />

                <StatCard
                    title="Forecast Net Profit"
                    value={formatCurrency(profit.forecastNetProfit)}
                    description="After forecast expenses"
                    icon={profit.forecastNetProfit >= 0 ? TrendingUp : TrendingDown}
                    color={profit.forecastNetProfit >= 0 ? "success" : "danger"}
                />

                <StatCard
                    title="Products to Purchase"
                    value={String(summary.productsToPurchase)}
                    description="Based on product demand"
                    icon={Package}
                    color="warning"
                />

                <StatCard
                    title="Forecast Alerts"
                    value={String(summary.totalAlerts)}
                    description={`${summary.urgentAlerts} urgent alerts`}
                    icon={Bell}
                    color="danger"
                />
            </div>

            {/* ==================================================
                SALES FORECAST
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">
                            Sales Forecast
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Historical sales and estimated future sales
                        </p>
                    </div>

                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceClass(sales.confidence)}`}>
                        {sales.confidence} Confidence
                    </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground">
                            Historical Sales
                        </p>

                        <p className="mt-2 text-lg font-bold text-foreground">
                            {formatCurrency(sales.historicalSales)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground">
                            Average Daily Sales
                        </p>

                        <p className="mt-2 text-lg font-bold text-foreground">
                            {formatCurrency(sales.averageDailySales)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-primary/5 p-4">
                        <p className="text-xs text-muted-foreground">
                            Forecast Revenue
                        </p>

                        <p className="mt-2 text-lg font-bold text-primary">
                            {formatCurrency(sales.forecastSales)}
                        </p>
                    </div>
                </div>

                {/* Simple sales chart */}

                <div className="mt-7">
                    <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                        <span>Sales Trend</span>
                        <span>Daily values</span>
                    </div>

                    <div className="flex h-48 items-end gap-1 overflow-x-auto border-b border-border pb-2">
                        {sales.points.map((point, index) => {
                            const actualHeight =
                                point.actual > 0
                                    ? Math.max(
                                        3,
                                        (point.actual / maxSales) * 100
                                    )
                                    : 0;

                            const forecastHeight =
                                point.forecast !== null
                                    ? Math.max(
                                        3,
                                        (point.forecast / maxSales) * 100
                                    )
                                    : 0;

                            return (
                                <div
                                    key={`${point.date}-${index}`}
                                    className="group flex h-full min-w-[12px] flex-1 flex-col justify-end"
                                    title={`${formatDate(point.date)} | Actual: ${formatCurrency(point.actual)} | Forecast: ${point.forecast === null ? "N/A" : formatCurrency(point.forecast)}`}
                                >
                                    <div className="flex h-full items-end justify-center gap-[2px]">
                                        {point.actual > 0 && (
                                            <div
                                                className="w-full max-w-5 rounded-t bg-primary"
                                                style={{
                                                    height: `${actualHeight}%`,
                                                }}
                                            />
                                        )}

                                        {point.forecast !== null && (
                                            <div
                                                className="w-full max-w-5 rounded-t bg-chart-4"
                                                style={{
                                                    height: `${forecastHeight}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                            Actual Sales
                        </span>

                        <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm bg-chart-4" />
                            Forecast Sales
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================================================
                PROFIT FORECAST
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">
                            Profit Forecast
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Estimated financial performance
                        </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceClass(profit.confidence)}`}>
                        {profit.confidence}
                    </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        {
                            label: "Revenue",
                            value: profit.forecastRevenue,
                        },
                        {
                            label: "Cost",
                            value: profit.forecastCost,
                        },
                        {
                            label: "Gross Profit",
                            value: profit.forecastGrossProfit,
                        },
                        {
                            label: "Expenses",
                            value: profit.forecastExpenses,
                        },
                        {
                            label: "Net Profit",
                            value: profit.forecastNetProfit,
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-border p-4"
                        >
                            <p className="text-xs text-muted-foreground">
                                {item.label}
                            </p>

                            <p className={`mt-2 text-sm font-bold ${
                                item.label === "Net Profit"
                                    ? item.value >= 0
                                        ? "text-success"
                                        : "text-destructive"
                                    : "text-foreground"
                            }`}>
                                {formatCurrency(item.value)}
                            </p>
                        </div>
                    ))}
                </div>

                {!data.dataQuality.profitForecastReliable && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />

                        <p className="text-xs text-muted-foreground">
                            Profit forecast is not fully reliable because some historical sale items have missing cost information.
                            Current cost completeness: {data.dataQuality.costCompleteness}%.
                        </p>
                    </div>
                )}
            </div>

            {/* ==================================================
                PRODUCT DEMAND
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-5">
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />

                        <h3 className="text-base font-semibold text-foreground">
                            Product Demand Forecast
                        </h3>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Estimated product sales and stock requirements
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3 text-right">Available Stock</th>
                                <th className="px-5 py-3 text-right">Avg. Daily</th>
                                <th className="px-5 py-3 text-right">Forecast Demand</th>
                                <th className="px-5 py-3 text-right">Purchase</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.productDemand.map((item) => (
                                <tr key={item.productId} className="border-t border-border hover:bg-muted/20">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-foreground">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.code}
                                        </p>
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.availableStock)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.averageDailyDemand)}
                                    </td>

                                    <td className="px-5 py-3 text-right font-medium">
                                        {formatNumber(item.forecastDemand)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {item.suggestedPurchase > 0 ? (
                                            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                                                {formatNumber(item.suggestedPurchase)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-success">
                                                No purchase
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {data.productDemand.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                        No product demand data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ==================================================
                SERVICE DEMAND
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-5">
                    <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-5 w-5 text-primary" />

                        <h3 className="text-base font-semibold text-foreground">
                            Service Demand Forecast
                        </h3>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Expected demand for your services
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Service</th>
                                <th className="px-5 py-3 text-right">Base Price</th>
                                <th className="px-5 py-3 text-right">Sold Quantity</th>
                                <th className="px-5 py-3 text-right">Avg. Daily</th>
                                <th className="px-5 py-3 text-right">Forecast Demand</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.serviceDemand.map((item) => (
                                <tr key={item.serviceId} className="border-t border-border hover:bg-muted/20">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-foreground">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.code}
                                        </p>
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatCurrency(item.basePrice)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.soldQuantity)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.averageDailyDemand)}
                                    </td>

                                    <td className="px-5 py-3 text-right font-semibold">
                                        {formatNumber(item.forecastDemand)}
                                    </td>
                                </tr>
                            ))}

                            {data.serviceDemand.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                        No service demand data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ==================================================
                COMBINED MATERIAL DEMAND
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" />

                                <h3 className="text-base font-semibold text-foreground">
                                    Combined Material Demand
                                </h3>
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Direct product demand + service material consumption
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                            {purchaseItems.length} Items to Purchase
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Material</th>
                                <th className="px-5 py-3 text-right">Product Demand</th>
                                <th className="px-5 py-3 text-right">Service Usage</th>
                                <th className="px-5 py-3 text-right">Total Required</th>
                                <th className="px-5 py-3 text-right">Available</th>
                                <th className="px-5 py-3 text-right">Purchase</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.combinedMaterialDemand.map((item) => (
                                <tr key={item.productId} className="border-t border-border hover:bg-muted/20">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-foreground">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.code}
                                        </p>
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.productDemand)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.serviceMaterialDemand)}
                                    </td>

                                    <td className="px-5 py-3 text-right font-semibold">
                                        {formatNumber(item.totalRequired)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {formatNumber(item.availableStock)}
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        {item.suggestedPurchase > 0 ? (
                                            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning-foreground">
                                                {formatNumber(item.suggestedPurchase)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-success">
                                                0
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {data.combinedMaterialDemand.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                                        No combined material demand available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {purchaseItems.length > 0 && (
                    <div className="border-t border-border p-5">
                        <h4 className="mb-3 text-sm font-semibold text-foreground">
                            Suggested Purchase List
                        </h4>

                        <div className="space-y-3">
                            {purchaseItems.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.code} · Available: {formatNumber(item.availableStock)}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-bold text-warning-foreground">
                                            {formatNumber(item.suggestedPurchase)} units
                                        </p>

                                        <p className="text-[10px] text-muted-foreground">
                                            Suggested purchase
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ==================================================
                FORECAST ALERTS
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-5">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />

                        <h3 className="text-base font-semibold text-foreground">
                            Forecast Alerts
                        </h3>

                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                            {data.alerts.length}
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Important business and inventory notifications
                    </p>
                </div>

                <div className="space-y-3 p-5">
                    {data.alerts.map((alert, index) => (
                        <div
                            key={`${alert.type}-${alert.productId ?? 0}-${index}`}
                            className="rounded-xl border border-border p-4"
                        >
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">
                                            {alert.title}
                                        </h4>

                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {alert.message}
                                        </p>

                                        {alert.recommendedAction && (
                                            <p className="mt-2 text-xs font-medium text-primary">
                                                Action: {alert.recommendedAction}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityClass(alert.priority)}`}>
                                    {alert.priority}
                                </span>
                            </div>
                        </div>
                    ))}

                    {data.alerts.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-sm font-medium text-success">
                                No active forecast alerts.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================
                BUSINESS EVENTS
            ================================================== */}

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-5">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />

                        <h3 className="text-base font-semibold text-foreground">
                            Business Events
                        </h3>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Upcoming promotions and business activities
                    </p>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {data.seasonalEvents.map((event) => (
                        <div
                            key={event.id}
                            className="rounded-xl border border-border p-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                    {event.title}
                                </h4>

                                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                                    {event.eventType}
                                </span>
                            </div>

                            {event.description && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {event.description}
                                </p>
                            )}

                            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                <p className="flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5" />

                                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                                </p>

                                <p className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />

                                    {event.isOngoing
                                        ? "Currently ongoing"
                                        : `${event.daysUntilStart} days until start`}
                                </p>
                            </div>
                        </div>
                    ))}

                    {data.seasonalEvents.length === 0 && (
                        <div className="py-8 text-center text-sm text-muted-foreground sm:col-span-2">
                            No upcoming business events.
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================
                DATA QUALITY
            ================================================== */}

            <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />

                    <h3 className="text-sm font-semibold text-foreground">
                        Forecast Data Quality
                    </h3>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Historical Period
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {data.dataQuality.historyDays} Days
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">
                            Completed Sales
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {data.dataQuality.totalSales}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">
                            Cost Completeness
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {data.dataQuality.costCompleteness}%
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">
                            Missing Cost Items
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {data.dataQuality.itemsWithMissingCost}
                        </p>
                    </div>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                        Baseline: {formatDate(data.dataQuality.baselineStartDate)} - {formatDate(data.dataQuality.baselineEndDate)}
                    </p>

                    {data.dataQuality.notes.map((note, index) => (
                        <p key={index} className="mt-2 text-xs text-muted-foreground">
                            • {note}
                        </p>
                    ))}
                </div>
            </div>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
                <span>
                    Forecast period: Next {forecastDays} days
                </span>

                <span>
                    Last updated: {new Date(data.generatedAt).toLocaleString("en-LK")}
                </span>
            </div>
        </section>
        </div>
    );
}
