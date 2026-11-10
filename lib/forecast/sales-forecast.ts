
import {
  addLocalDays,
  formatLocalDate,
  startOfLocalDay,
  toNumber,
} from "./date-utils";

import type {
  DailySalesRecord,
  SalesForecastResult,
  ForecastConfidence,
} from "./types";

export function calculateSalesForecast(
  records: DailySalesRecord[],
  historyStart: Date,
  historyEnd: Date,
  forecastDays: number
): SalesForecastResult {
  const start = startOfLocalDay(historyStart);
  const end = startOfLocalDay(historyEnd);

  const dailySales = new Map<string, number>();

  for (const record of records) {
    const key = formatLocalDate(new Date(record.saleDate));

    dailySales.set(
      key,
      (dailySales.get(key) || 0) + toNumber(record.total)
    );
  }

  let historicalSales = 0;
  let historicalDays = 0;

  const points = [];

  for (
    let cursor = new Date(start);
    cursor < end;
    cursor = addLocalDays(cursor, 1)
  ) {
    const key = formatLocalDate(cursor);
    const actual = dailySales.get(key) || 0;

    historicalSales += actual;
    historicalDays++;

    points.push({
      date: key,
      actual,
      forecast: null as number | null,
    });
  }

  const averageDailySales =
    historicalDays > 0
      ? historicalSales / historicalDays
      : 0;

  const forecastSales =
    averageDailySales * forecastDays;

  let confidence: ForecastConfidence = "LOW";

  if (historicalDays >= 90) {
    confidence = "HIGH";
  } else if (historicalDays >= 30) {
    confidence = "MEDIUM";
  }

  for (let day = 1; day <= forecastDays; day++) {
    const forecastDate = addLocalDays(end, day - 1);

    points.push({
      date: formatLocalDate(forecastDate),
      actual: 0,
      forecast: averageDailySales,
    });
  }

  return {
    historicalSales,
    averageDailySales,
    forecastDays,
    forecastSales,
    confidence,
    points,
  };
}
