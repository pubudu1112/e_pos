
export type ForecastAlertInput = {
  type: "SEASONAL" | "STOCK" | "SALES" | "PROFIT";
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  recommendedAction?: string;
  productId?: number;
  categoryId?: number;
  forecastStart?: Date;
  forecastEnd?: Date;
};

export type StockAlertInput = {
  productId: number;
  productName: string;
  availableStock: number;
  minimumStock: number;
  suggestedPurchase: number;
};

export type SalesAlertInput = {
  currentRevenue: number;
  previousRevenue: number;
};

export type ProfitAlertInput = {
  forecastNetProfit: number;
  historicalNetProfit: number;
};

export type SeasonalAlertInput = {
  title: string;
  eventType: string;
  daysUntilStart: number;
  startDate: string;
  endDate: string;
};

export function generateStockAlerts(
  products: StockAlertInput[]
): ForecastAlertInput[] {
  return products
    .filter(
      (product) =>
        product.availableStock <= product.minimumStock
    )
    .map((product) => ({
      type: "STOCK",
      title: `Low Stock: ${product.productName}`,
      message:
        `${product.productName} stock is ${product.availableStock}. ` +
        `Minimum stock is ${product.minimumStock}.`,
      priority:
        product.availableStock <= 0
          ? "URGENT"
          : "HIGH",
      recommendedAction:
        product.suggestedPurchase > 0
          ? `Consider purchasing ${product.suggestedPurchase} units.`
          : "Review stock availability.",
      productId: product.productId,
    }));
}

export function generateSalesAlerts(
  input: SalesAlertInput
): ForecastAlertInput[] {
  if (input.previousRevenue <= 0) {
    return [];
  }

  const change =
    ((input.currentRevenue - input.previousRevenue) /
      input.previousRevenue) *
    100;

  if (change > -10) {
    return [];
  }

  return [
    {
      type: "SALES",
      title: "Sales Revenue Decreased",
      message:
        `Sales revenue decreased by ${Math.abs(change).toFixed(1)}% ` +
        "compared with the previous period.",
      priority: change <= -30 ? "HIGH" : "MEDIUM",
      recommendedAction:
        "Review recent sales, popular products and marketing activities.",
    },
  ];
}

export function generateProfitAlerts(
  input: ProfitAlertInput
): ForecastAlertInput[] {
  if (input.historicalNetProfit <= 0) {
    return [];
  }

  const change =
    ((input.forecastNetProfit - input.historicalNetProfit) /
      Math.abs(input.historicalNetProfit)) *
    100;

  if (change > -10) {
    return [];
  }

  return [
    {
      type: "PROFIT",
      title: "Profit Forecast Warning",
      message:
        `Forecast net profit is expected to decrease by ` +
        `${Math.abs(change).toFixed(1)}%.`,
      priority: change <= -30 ? "HIGH" : "MEDIUM",
      recommendedAction:
        "Review service costs, product costs, discounts and operating expenses.",
    },
  ];
}

export function generateSeasonalAlerts(
  events: SeasonalAlertInput[]
): ForecastAlertInput[] {
  return events
    .filter(
      (event) =>
        event.daysUntilStart >= 0 &&
        event.daysUntilStart <= 14
    )
    .map((event) => ({
      type: "SEASONAL",
      title: `Upcoming Event: ${event.title}`,
      message:
        `${event.title} starts in ${event.daysUntilStart} days. ` +
        "Review stock and prepare for possible demand changes.",
      priority:
        event.daysUntilStart <= 3
          ? "HIGH"
          : "MEDIUM",
      recommendedAction:
        "Review related products, current stock and purchasing requirements.",
      forecastStart: new Date(event.startDate),
      forecastEnd: new Date(event.endDate),
    }));
}

export function generateForecastAlerts(input: {
  stock?: StockAlertInput[];
  sales?: SalesAlertInput;
  profit?: ProfitAlertInput;
  seasonal?: SeasonalAlertInput[];
}): ForecastAlertInput[] {
  return [
    ...generateStockAlerts(input.stock ?? []),
    ...(input.sales
      ? generateSalesAlerts(input.sales)
      : []),
    ...(input.profit
      ? generateProfitAlerts(input.profit)
      : []),
    ...generateSeasonalAlerts(input.seasonal ?? []),
  ];
}
