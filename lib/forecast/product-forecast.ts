
import { toNumber } from "./date-utils";
import type { ProductDemandResult } from "./types";

type ProductDemandInput = {
  id: number;
  code: string;
  name: string;
  availableStock: number;
  minimumStock: number;
  soldQuantity: number;
  historyDays: number;
};

export function calculateProductDemand(
  products: ProductDemandInput[],
  forecastDays: number
): ProductDemandResult[] {
  return products.map((product) => {
    const historyDays = Math.max(product.historyDays, 1);

    const averageDailyDemand =
      toNumber(product.soldQuantity) / historyDays;

    const forecastDemand =
      Math.ceil(averageDailyDemand * forecastDays);

    const safetyStock = Math.max(
      Math.ceil(averageDailyDemand * 7),
      Math.ceil(toNumber(product.minimumStock))
    );

    const suggestedPurchase = Math.max(
      0,
      forecastDemand +
        safetyStock -
        toNumber(product.availableStock)
    );

    return {
      productId: product.id,
      code: product.code,
      name: product.name,
      availableStock: product.availableStock,
      averageDailyDemand,
      forecastDemand,
      safetyStock,
      suggestedPurchase,
    };
  });
}
