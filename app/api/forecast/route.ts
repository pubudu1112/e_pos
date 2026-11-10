
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { runForecastEngine } from "@/lib/forecast/forecast-engine";
import { hasPermission } from "@/lib/auth/permissions";

function toNumber(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}

// Sri Lanka local date: YYYY-MM-DD
function getSriLankaDate(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1, day + days));

    return [
        result.getUTCFullYear(),
        String(result.getUTCMonth() + 1).padStart(2, "0"),
        String(result.getUTCDate()).padStart(2, "0"),
    ].join("-");
}

// Interpret date boundaries in Sri Lanka time.
function sriLankaDateStart(date: string): Date {
    return new Date(`${date}T00:00:00+05:30`);
}

// Normalize a daily record to noon so its calendar date
// remains stable when the forecast utility formats it.
function sriLankaDateNoon(date: string): Date {
    return new Date(`${date}T12:00:00+05:30`);
}

export async function GET(request: Request) {
    try {
        // --------------------------------------------------
        // AUTHENTICATION
        // --------------------------------------------------

        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                },
                { status: 401 }
            );
        }

        if (!(await hasPermission("SMART_FORECAST_VIEW"))) {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 }
            );
        }

        // --------------------------------------------------
        // QUERY PARAMETERS
        // --------------------------------------------------

        const { searchParams } = new URL(request.url);

        const forecastDays = Number(
            searchParams.get("forecastDays") || 30
        );

        if (![7, 30, 90].includes(forecastDays)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Forecast days must be 7, 30 or 90.",
                },
                { status: 400 }
            );
        }

        const defaultStartDate = "2026-11-01";

        const historyStartDate =
            searchParams.get("startDate") || defaultStartDate;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(historyStartDate)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid start date.",
                },
                { status: 400 }
            );
        }

        const today = getSriLankaDate(new Date());

        if (historyStartDate > today) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Start date cannot be in the future.",
                },
                { status: 400 }
            );
        }

        const historyStart = sriLankaDateStart(historyStartDate);

        const tomorrow = addDays(today, 1);
        const historyEnd = sriLankaDateStart(tomorrow);

        const historyDays =
            Math.floor(
                (
                    Date.parse(`${tomorrow}T00:00:00Z`) -
                    Date.parse(`${historyStartDate}T00:00:00Z`)
                ) / 86400000
            );

        // --------------------------------------------------
        // SALES
        // --------------------------------------------------

        const sales = await prisma.sale.findMany({
            where: {
                status: "COMPLETED",
                saleDate: {
                    gte: historyStart,
                    lt: historyEnd,
                },
            },
            select: {
                id: true,
                saleDate: true,
                subtotal: true,
                discount: true,
                tax: true,
                total: true,
                saleitem: {
                    select: {
                        productId: true,
                        serviceId: true,
                        quantity: true,
                        costPrice: true,
                        total: true,
                    },
                },
            },
            orderBy: {
                saleDate: "asc",
            },
        });

        // --------------------------------------------------
        // SERVICE SALES
        // --------------------------------------------------

        const serviceSales = await prisma.saleitem.findMany({
            where: {
                serviceId: {
                    not: null,
                },
                sale: {
                    status: "COMPLETED",
                    saleDate: {
                        gte: historyStart,
                        lt: historyEnd,
                    },
                },
            },
            select: {
                serviceId: true,
                quantity: true,
            },
        });

        const serviceDemandMap = new Map<number, number>();

        for (const item of serviceSales) {
            if (item.serviceId === null) continue;

            serviceDemandMap.set(
                item.serviceId,
                (serviceDemandMap.get(item.serviceId) || 0) +
                toNumber(item.quantity)
            );
        }

        // --------------------------------------------------
        // SERVICES
        // --------------------------------------------------

        const services = await prisma.service.findMany({
            where: {
                status: "ACTIVE",
            },
            select: {
                id: true,
                code: true,
                name: true,
                basePrice: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        const serviceForecastData = services.map((service) => {
            const soldQuantity =
                serviceDemandMap.get(service.id) || 0;

            const averageDailyDemand =
                soldQuantity / Math.max(1, historyDays);

            return {
                serviceId: service.id,
                code: service.code,
                name: service.name,
                basePrice: toNumber(service.basePrice),
                soldQuantity,
                averageDailyDemand,
                forecastDemand: Math.ceil(
                    averageDailyDemand * forecastDays
                ),
            };
        });

        // --------------------------------------------------
        // MATERIAL DEMAND FORECAST
        // --------------------------------------------------

        const serviceCostComponents =
            await prisma.serviceCostComponent.findMany({
                where: {
                    costType: "INVENTORY",
                    productId: {
                        not: null,
                    },
                    service: {
                        status: "ACTIVE",
                    },
                },
                select: {
                    serviceId: true,
                    productId: true,
                    quantity: true,
                    product: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            minimumStock: true,
                            stock: {
                                select: {
                                    quantity: true,
                                    reservedQuantity: true,
                                },
                            },
                        },
                    },
                },
            });

        const materialDemandMap = new Map<number, {
            productId: number;
            code: string;
            name: string;
            availableStock: number;
            minimumStock: number;
            requiredQuantity: number;
        }>();

        for (const component of serviceCostComponents) {
            if (!component.productId || !component.product) continue;

            const serviceForecast = serviceForecastData.find(
                (service) => service.serviceId === component.serviceId
            );

            if (!serviceForecast) continue;

            const requiredQuantity =
                serviceForecast.forecastDemand *
                toNumber(component.quantity);

            const product = component.product;

            const availableStock = Math.max(
                0,
                toNumber(product.stock?.quantity) -
                toNumber(product.stock?.reservedQuantity)
            );

            const existing = materialDemandMap.get(product.id);

            if (existing) {
                existing.requiredQuantity += requiredQuantity;
            } else {
                materialDemandMap.set(product.id, {
                    productId: product.id,
                    code: product.code,
                    name: product.name,
                    availableStock,
                    minimumStock: toNumber(product.minimumStock),
                    requiredQuantity,
                });
            }
        }

        const materialDemand = Array.from(
            materialDemandMap.values()
        ).map((material) => ({
            ...material,
            requiredQuantity: Number(
                material.requiredQuantity.toFixed(3)
            ),
            suggestedPurchase: Math.max(
                0,
                Math.ceil(
                    material.requiredQuantity +
                    material.minimumStock -
                    material.availableStock
                )
            ),
        }));

        // --------------------------------------------------
        // DAILY SALES + REVENUE + COST
        // --------------------------------------------------

        const dailySalesMap = new Map<string, number>();

        let historicalRevenue = 0;
        let historicalCost = 0;

        let itemsWithMissingCost = 0;
        let totalSaleItems = 0;

        const productSalesMap = new Map<number, number>();

        for (const sale of sales) {
            const dateKey = getSriLankaDate(sale.saleDate);

            // Revenue excludes tax and includes sale discount.
            const revenue = Math.max(
                0,
                toNumber(sale.subtotal) - toNumber(sale.discount)
            );

            historicalRevenue += revenue;

            dailySalesMap.set(
                dateKey,
                (dailySalesMap.get(dateKey) || 0) + revenue
            );

            for (const item of sale.saleitem) {
                totalSaleItems += 1;

                const quantity = toNumber(item.quantity);

                // Cost price is stored per unit in the sale item.
                if (item.costPrice === null) {
                    itemsWithMissingCost += 1;
                } else {
                    historicalCost +=
                        toNumber(item.costPrice) * quantity;
                }

                // Product demand: direct product sales only.
                if (item.productId !== null) {
                    productSalesMap.set(
                        item.productId,
                        (productSalesMap.get(item.productId) || 0) +
                        quantity
                    );
                }
            }
        }

        // Include dates with zero sales.
        const dailySales = Array.from(
            { length: historyDays },
            (_, index) => {
                const date = addDays(historyStartDate, index);

                return {
                    saleDate: sriLankaDateNoon(date),
                    total: dailySalesMap.get(date) || 0,
                };
            }
        );

        // --------------------------------------------------
        // OPERATING EXPENSES
        // --------------------------------------------------

        const expenses = await prisma.expense.findMany({
            where: {
                status: "ACTIVE",
                expenseDate: {
                    gte: historyStart,
                    lt: historyEnd,
                },
            },
            select: {
                amount: true,
            },
        });

        const historicalExpenses = expenses.reduce(
            (sum, expense) => sum + toNumber(expense.amount),
            0
        );

        // --------------------------------------------------
        // PRODUCTS + CURRENT STOCK
        // --------------------------------------------------

        const products = await prisma.product.findMany({
            where: {
                status: "ACTIVE",
            },
            select: {
                id: true,
                code: true,
                name: true,
                minimumStock: true,
                stock: {
                    select: {
                        quantity: true,
                        reservedQuantity: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        const forecastProducts = products.map((product) => {
            const physicalStock = product.stock
                ? toNumber(product.stock.quantity)
                : 0;

            const reservedStock = product.stock
                ? toNumber(product.stock.reservedQuantity)
                : 0;

            return {
                id: product.id,
                code: product.code,
                name: product.name,

                availableStock: Math.max(
                    0,
                    physicalStock - reservedStock
                ),

                minimumStock: toNumber(product.minimumStock),

                soldQuantity:
                    productSalesMap.get(product.id) || 0,

                historyDays: Math.max(1, historyDays),
            };
        });

        // --------------------------------------------------
        // BUSINESS EVENTS
        // --------------------------------------------------

        const events = await prisma.businessEvent.findMany({
            where: {
                isActive: true,
                endDate: {
                    gte: historyStart,
                },
            },
            select: {
                id: true,
                title: true,
                description: true,
                eventType: true,
                startDate: true,
                endDate: true,
                isActive: true,
            },
            orderBy: {
                startDate: "asc",
            },
        });

        // --------------------------------------------------
        // PREVIOUS PERIOD COMPARISON
        // --------------------------------------------------

        // Comparison is intentionally disabled for the initial
        // November 2026 baseline.
        const previousPeriodRevenue = 0;
        const previousPeriodNetProfit = 0;

        // --------------------------------------------------
        // RUN FORECAST ENGINE
        // --------------------------------------------------

        const forecast = runForecastEngine({
            historyStart,
            historyEnd,
            forecastDays,

            dailySales,

            products: forecastProducts,

            historicalRevenue,
            historicalCost,
            historicalExpenses,

            previousPeriodRevenue,
            previousPeriodNetProfit,

            events,
        });

        // --------------------------------------------------
        // COMBINED PRODUCT + SERVICE MATERIAL DEMAND
        // --------------------------------------------------

        const combinedDemandMap = new Map<
            number,
            {
                productId: number;
                code: string;
                name: string;
                availableStock: number;
                minimumStock: number;
                productDemand: number;
                serviceMaterialDemand: number;
            }
        >();

        // Add direct product demand.
        for (const product of forecast.productDemand) {
            combinedDemandMap.set(product.productId, {
                productId: product.productId,
                code: product.code,
                name: product.name,
                availableStock: product.availableStock,
                minimumStock: product.safetyStock,
                productDemand: product.forecastDemand,
                serviceMaterialDemand: 0,
            });
        }

        // Add service material demand.
        for (const material of materialDemand) {
            const existing = combinedDemandMap.get(material.productId);

            if (existing) {
                existing.serviceMaterialDemand +=
                    material.requiredQuantity;
            } else {
                combinedDemandMap.set(material.productId, {
                    productId: material.productId,
                    code: material.code,
                    name: material.name,
                    availableStock: material.availableStock,
                    minimumStock: material.minimumStock,
                    productDemand: 0,
                    serviceMaterialDemand: material.requiredQuantity,
                });
            }
        }

        // Calculate total demand and suggested purchase quantity.
        const combinedMaterialDemand = Array.from(
            combinedDemandMap.values()
        ).map((item) => {
            const totalRequired =
                item.productDemand + item.serviceMaterialDemand;

            return {
                ...item,

                totalRequired: Number(
                    totalRequired.toFixed(3)
                ),

                suggestedPurchase: Math.max(
                    0,
                    Math.ceil(
                        totalRequired +
                        item.minimumStock -
                        item.availableStock
                    )
                ),
            };
        });

        // --------------------------------------------------
        // SAVE GENERATED FORECAST ALERTS
        // --------------------------------------------------

        const generatedAlerts = forecast.alerts ?? [];

        for (const alert of generatedAlerts) {
            const titleKey = alert.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 80);

            const dedupeKey = [
                alert.type,
                `p${alert.productId ?? 0}`,
                `c${alert.categoryId ?? 0}`,
                alert.forecastStart
                    ? getSriLankaDate(alert.forecastStart)
                    : "na",
                alert.forecastEnd
                    ? getSriLankaDate(alert.forecastEnd)
                    : "na",
                titleKey,
            ].join(":").slice(0, 191);

            await prisma.forecastAlert.upsert({
                where: {
                    dedupeKey,
                },
                update: {
                    title: alert.title,
                    message: alert.message,
                    alertType: alert.type,
                    priority: alert.priority,
                    recommendedAction: alert.recommendedAction ?? null,
                    productId: alert.productId ?? null,
                    categoryId: alert.categoryId ?? null,
                    forecastStart: alert.forecastStart ?? null,
                    forecastEnd: alert.forecastEnd ?? null,
                    isActive: true,
                },
                create: {
                    dedupeKey,
                    title: alert.title,
                    message: alert.message,
                    alertType: alert.type,
                    priority: alert.priority,
                    recommendedAction: alert.recommendedAction ?? null,
                    productId: alert.productId ?? null,
                    categoryId: alert.categoryId ?? null,
                    forecastStart: alert.forecastStart ?? null,
                    forecastEnd: alert.forecastEnd ?? null,
                    isRead: false,
                    isActive: true,
                },
            });
        }

        // --------------------------------------------------
        // DATA QUALITY
        // --------------------------------------------------

        const costCompleteness =
            totalSaleItems === 0
                ? 100
                : (
                    (totalSaleItems - itemsWithMissingCost) /
                    totalSaleItems
                ) * 100;

        return NextResponse.json({
            success: true,

            data: {
                ...forecast,
                serviceDemand: serviceForecastData,
                materialDemand,
                combinedMaterialDemand,
            },

            dataQuality: {
                baselineStartDate: historyStartDate,
                baselineEndDate: today,
                historyDays,

                totalSales: sales.length,
                totalProducts: products.length,

                totalSaleItems,
                itemsWithMissingCost,

                costCompleteness: Number(
                    costCompleteness.toFixed(2)
                ),

                profitForecastReliable:
                    totalSaleItems > 0 &&
                    itemsWithMissingCost === 0,

                comparisonAvailable: false,

                notes: [
                    "Forecast baseline starts from November 2026.",
                    "Sales revenue excludes tax and includes discounts.",
                    "Product cost is calculated from saved sale item cost snapshots.",
                    "Combined material demand includes direct product demand and service material demand.",
                    "Historical sales comparison is not available in the initial baseline.",
                ],
            },
        });
    } catch (error) {
        console.error("FORECAST API ERROR:", error);

        const errorMessage =
            error instanceof Error
                ? error.message
                : String(error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to generate forecast.",
                error:
                    process.env.NODE_ENV === "development"
                        ? errorMessage
                        : undefined,
            },
            { status: 500 }
        );
    }
}
