
export type ForecastPeriod = "7days" | "30days" | "90days";

export type ForecastConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ForecastAlertType =
  | "SEASONAL"
  | "STOCK"
  | "SALES"
  | "PROFIT";

export type ForecastPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type DailySalesRecord = {
  saleDate: Date;
  total: number;
};

export type DailySalesPoint = {
  date: string;
  actual: number;
  forecast: number | null;
};

export type SalesForecastResult = {
  historicalSales: number;
  averageDailySales: number;
  forecastDays: number;
  forecastSales: number;
  confidence: ForecastConfidence;
  points: DailySalesPoint[];
};

export type ProductDemandResult = {
  productId: number;
  code: string;
  name: string;
  availableStock: number;
  averageDailyDemand: number;
  forecastDemand: number;
  safetyStock: number;
  suggestedPurchase: number;
};

export type ProfitForecastResult = {
  forecastRevenue: number;
  forecastCost: number;
  forecastGrossProfit: number;
  forecastExpenses: number;
  forecastNetProfit: number;
  confidence: ForecastConfidence;
};
