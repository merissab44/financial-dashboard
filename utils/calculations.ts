import { FinancialRow } from '../models/models';

/**
 * 1. Consolidate a Financial Row
 * Takes a row from your financial_statements.json and sums across all 4 orgs.
 * Useful for the "Rise East Consolidated Total" column on the statements page.
 */
export const calculateConsolidatedTotal = (row: FinancialRow): number => {
  return row.BCZ + row.Roots + row.EOYDC + row.BOEN;
};

/**
 * 2. Calculate Variances (Budget vs Actual)
 * Used on the Budget vs Actual Page. Returns the raw dollar variance and percentage.
 */
export const calculateVariance = (budget: number, actual: number) => {
  const varianceDollar = actual - budget;
  // Prevent divide-by-zero errors
  const variancePercent = budget === 0 ? 0 : (varianceDollar / budget) * 100;
  
  return {
    varianceDollar,
    variancePercent: variancePercent.toFixed(2) // Returns a formatted string e.g., "-23.50"
  };
};

/**
 * 3. Calculate Current Ratio (Liquidity)
 * Formula: Current Assets / Current Liabilities
 * Used on the Dashboard Financial Performance Page.
 */
export const calculateCurrentRatio = (assets: FinancialRow[], liabilities: FinancialRow[]): string => {
  // Filter for codes 1000-1499 (Standardized Current Assets)
  const currentAssets = assets.filter(row => 
    row.line_item.startsWith("10") || row.line_item.startsWith("11") || row.line_item.startsWith("12")
  );
  
  // Filter for codes 2000-2499 (Standardized Current Liabilities)
  const currentLiabilities = liabilities.filter(row => 
    row.line_item.startsWith("20") || row.line_item.startsWith("21") || row.line_item.startsWith("23")
  );

  const totalCurrentAssets = currentAssets.reduce((sum, row) => sum + calculateConsolidatedTotal(row), 0);
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, row) => sum + calculateConsolidatedTotal(row), 0);

  if (totalCurrentLiabilities === 0) return "N/A";
  
  const ratio = totalCurrentAssets / totalCurrentLiabilities;
  return ratio.toFixed(2); // e.g., "1.45"
};

/**
 * 4. Calculate Program Expense Ratio (Efficiency)
 * Formula: Total Program Services / Total Expenses
 * Used on the Dashboard Financial Performance Page.
 */
export const calculateProgramExpenseRatio = (expensesByFunction: FinancialRow[]): string => {
  const programRow = expensesByFunction.find(row => row.line_item.includes("Program Services"));
  
  if (!programRow) return "0%";

  const totalProgramExpenses = calculateConsolidatedTotal(programRow);
  const totalExpenses = expensesByFunction.reduce((sum, row) => sum + calculateConsolidatedTotal(row), 0);

  if (totalExpenses === 0) return "0%";

  const ratio = (totalProgramExpenses / totalExpenses) * 100;
  return `${ratio.toFixed(1)}%`; // e.g., "82.4%"
};