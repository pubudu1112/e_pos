
import { calculateSalesForecast } from "./sales-forecast";
import { calculateProductDemand } from "./product-forecast";
import { calculateProfitForecast } from "./profit-forecast";
import { calculateSeasonalEvents } from "./seasonal-forecast";
import { generateForecastAlerts } from "./alert-generator";

type EngineProductInput = {
    id: number;
    code: string;
    name: string;
    availableStock: number;
    minimumStock: number;
    soldQuantity: number;
    historyDays: number;
};

type EngineInput = {
    historyStart: Date;
    historyEnd: Date;
    forecastDays: number;

    dailySales: {
        saleDate: Date;
        total: number;
    }[];

    products: EngineProductInput[];

    historicalRevenue: number;
    historicalCost: number;
    historicalExpenses: number;
    previousPeriodRevenue: number;
    previousPeriodNetProfit: number;

    events: {
        id: number;
        title: string;
        description: string | null;
        eventType: string;
        startDate: Date;
        endDate: Date;
        isActive: boolean;
    }[];
};

export function runForecastEngine(input: EngineInput) {
    // 1. Sales Revenue Forecast
    const salesForecast = calculateSalesForecast(
        input.dailySales,
        input.historyStart,
        input.historyEnd,
        input.forecastDays
    );

    // 2. Product Demand Forecast
    const productDemand = calculateProductDemand(
        input.products,
        input.forecastDays
    );

    // 3. Profit Forecast
    const profitForecast = calculateProfitForecast({
        historicalRevenue: input.historicalRevenue,
        historicalCost: input.historicalCost,
        historicalExpenses: input.historicalExpenses,
        historyDays: Math.max(
            1,
            Math.ceil(
                (input.historyEnd.getTime() -
                    input.historyStart.getTime()) /
                (1000 * 60 * 60 * 24)
            )
        ),
        forecastDays: input.forecastDays,
    });

    // 4. Seasonal Events
    const seasonalEvents = calculateSeasonalEvents(
        input.events
    );

    // 5. Stock Alerts
    const stockAlerts = productDemand.map((demand) => {
        const sourceProduct = input.products.find(
            (product) => product.id === demand.productId
        );

        return {
            productId: demand.productId,
            productName: sourceProduct?.name ?? "Unknown Product",
            availableStock: sourceProduct?.availableStock ?? 0,
            minimumStock: sourceProduct?.minimumStock ?? 0,
            suggestedPurchase: demand.suggestedPurchase,
        };
    });

    // 6. Smart Alerts
    const alerts = generateForecastAlerts({
        stock: stockAlerts,

        sales: {
            currentRevenue: input.historicalRevenue,
            previousRevenue: input.previousPeriodRevenue,
        },

        profit: {
            forecastNetProfit: profitForecast.forecastNetProfit,
            historicalNetProfit: input.previousPeriodNetProfit,
        },

        seasonal: seasonalEvents.map((event) => ({
            title: event.title,
            eventType: event.eventType,
            daysUntilStart: event.daysUntilStart,
            startDate: event.startDate,
            endDate: event.endDate,
        })),
    });

    return {
        generatedAt: new Date().toISOString(),

        forecastDays: input.forecastDays,

        salesForecast,

        productDemand,

        profitForecast,

        seasonalEvents,

        alerts,

        summary: {
            totalProducts: productDemand.length,

            productsToPurchase:
                productDemand.filter(
                    (product) => product.suggestedPurchase > 0
                ).length,

            totalAlerts: alerts.length,

            urgentAlerts: alerts.filter(
                (alert) => alert.priority === "URGENT"
            ).length,
        },
    };
}
