import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Conversion factors to base units (G for weight, ML for volume)
const TO_G:  Record<string, number> = { G: 1, KG: 1000, LB: 453.592, OZ: 28.35 };
const TO_ML: Record<string, number> = { ML: 1, L: 1000, CUP: 236.588, TBSP: 14.787, TSP: 4.929 };

/** Convert a recipe quantity from `fromUnit` to the ingredient's stored `toUnit`. */
export function convertToIngredientUnit(qty: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return qty;
  if (fromUnit in TO_G  && toUnit in TO_G)  return (qty * TO_G[fromUnit])  / TO_G[toUnit];
  if (fromUnit in TO_ML && toUnit in TO_ML) return (qty * TO_ML[fromUnit]) / TO_ML[toUnit];
  return qty; // incompatible types (e.g. weight vs volume) or count units — assume same
}

export function calcFoodCostPct(costPerServing: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0;
  return Math.round((costPerServing / sellingPrice) * 100 * 10) / 10;
}

export function calcGrossProfitPct(costPerServing: number, sellingPrice: number): number {
  return Math.round((100 - calcFoodCostPct(costPerServing, sellingPrice)) * 10) / 10;
}
