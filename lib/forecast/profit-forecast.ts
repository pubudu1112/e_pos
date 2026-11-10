
import { toNumber } from "./date-utils";
import type {
  ForecastConfidence,
  ProfitForecastResult,
} from "./types";

type ProfitForecastInput = {
  historicalRevenue: number;
  historicalCost: number;
  historicalExpenses: number;
  historyDays: number;
  forecastDays: number;
};

export function calculateProfitForecast(
  input: ProfitForecastInput
): ProfitForecastResult {
  const days = Math.max(input.historyDays, 1);

  const revenuePerDay =
    toNumber(input.historicalRevenue) / days;

  const costPerDay =
    toNumber(input.historicalCost) / days;

  const expensesPerDay =
    toNumber(input.historicalExpenses) / days;

  const forecastRevenue =
    revenuePerDay * input.forecastDays;

  const forecastCost =
    costPerDay * input.forecastDays;

  const forecastGrossProfit =
    forecastRevenue - forecastCost;

  const forecastExpenses =
    expensesPerDay * input.forecastDays;

  const forecastNetProfit =
    forecastGrossProfit - forecastExpenses;

  let confidence: ForecastConfidence = "LOW";

  if (input.historyDays >= 90) {
    confidence = "HIGH";
  } else if (input.historyDays >= 30) {
    confidence = "MEDIUM";
  }

  return {
    forecastRevenue,
    forecastCost,
    forecastGrossProfit,
    forecastExpenses,
    forecastNetProfit,
    confidence,
  };
}
