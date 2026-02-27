//1. Consolidate a Financial Row
export const calculateConsolidatedTotal = (row) => {
  return (row.BCZ || 0) + (row.Roots || 0) + (row.EOYDC || 0) + (row.BOEN || 0);
};

// 2. Current Ratio
export const calculateCurrentRatio = (assets, liabilities) => {
  const currentAssets = assets.filter(r => /^(10|11|12)/.test(r.line_item))
                              .reduce((sum, r) => sum + calculateConsolidatedTotal(r), 0);
  const currentLiabs = liabilities.filter(r => /^(20|21|23)/.test(r.line_item))
                                  .reduce((sum, r) => sum + calculateConsolidatedTotal(r), 0);
  
  return currentLiabs === 0 ? "N/A" : (currentAssets / currentLiabs).toFixed(2);
};

// 3. Debt Ratio
export const calculateDebtRatio = (assets, liabilities) => {
  const totalAssets = assets.reduce((sum, r) => sum + calculateConsolidatedTotal(r), 0);
  const totalLiabs = liabilities.reduce((sum, r) => sum + calculateConsolidatedTotal(r), 0);
  return totalAssets === 0 ? "0.0%" : ((totalLiabs / totalAssets) * 100).toFixed(1) + "%";
};

// 4. Functional Expense Ratios
export const calculateExpenseRatios = (expenses) => {
  const programExp = calculateConsolidatedTotal(expenses.find(r => r.line_item.includes("Program Services")) || {});
  const adminExp = calculateConsolidatedTotal(expenses.find(r => r.line_item.includes("Management & General")) || {});
  const fundExp = calculateConsolidatedTotal(expenses.find(r => r.line_item.includes("Fundraising")) || {});
  
  const totalExp = programExp + adminExp + fundExp;

  return {
    programRatio: totalExp === 0 ? "0.0%" : ((programExp / totalExp) * 100).toFixed(1) + "%",
    adminRatio: totalExp === 0 ? "0.0%" : ((adminExp / totalExp) * 100).toFixed(1) + "%",
    fundRatio: totalExp === 0 ? "0.0%" : ((fundExp / totalExp) * 100).toFixed(1) + "%",
    totalExp: totalExp
  };
};

// 5. Operating Reserve (Months)
export const calculateOperatingReserve = (netAssets, assets, totalExp) => {
  const unrestrictedNetAssets = calculateConsolidatedTotal(netAssets.find(r => r.line_item.includes("Without Donor Restrictions")) || {});
  const fixedAssets = calculateConsolidatedTotal(assets.find(r => r.line_item.includes("1700")) || {});
  
  const liquidReserves = unrestrictedNetAssets - fixedAssets;
  const averageMonthlyExpenses = totalExp / 12;
  
  return averageMonthlyExpenses === 0 ? "N/A" : (liquidReserves / averageMonthlyExpenses).toFixed(1) + " Months";
};
