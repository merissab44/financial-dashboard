// 1. Import your KPI Math Logic (from our previous step)
import { 
  calculateCurrentRatio, 
  calculateDebtRatio, 
  calculateExpenseRatios, 
  calculateOperatingReserve 
} from '../utils/calculations.js'; 

// 2. Import your new Chart Logic
import { 
  renderAreaDonutChart, 
  renderGranteeBarChart, 
  renderBudgetVsActualChart 
} from '../utils/chart-utils.js';

// --- Safe DOM Updater ---
const updateEl = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
};

document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================
  // PART 1: POPULATE KPI CARDS (Financial Statements)
  // ==========================================
  fetch('./data/financial_statements.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      
      // NEW: Target the 2024 data specifically due to the multi-year JSON structure
      const currentYearData = data["2024"];

      if (!currentYearData) {
          console.error("2024 data not found in JSON.");
          return;
      }

      const assets = currentYearData.statement_of_financial_position.assets;
      const liabilities = currentYearData.statement_of_financial_position.liabilities;
      const netAssets = currentYearData.statement_of_financial_position.net_assets;
      const expenses = currentYearData.statement_of_activities.expenses_by_function;

      const currentRatio = calculateCurrentRatio(assets, liabilities);
      const debtRatio = calculateDebtRatio(assets, liabilities);
      const expenseRatios = calculateExpenseRatios(expenses);
      const operatingReserve = calculateOperatingReserve(netAssets, assets, expenseRatios.totalExp);

      updateEl('current-ratio', currentRatio);
      updateEl('debt-ratio', debtRatio);
      updateEl('program-ratio', expenseRatios.programRatio);
      updateEl('admin-ratio', expenseRatios.adminRatio);
      updateEl('fund-ratio', expenseRatios.fundRatio);
      updateEl('operating-reserve', operatingReserve);
    })
    .catch(error => console.error("Error loading financial statements:", error));
  // ==========================================
  // PART 2: POPULATE GRAPHS (Budget & Summaries)
  // ==========================================
  fetch('./data/summary_kpis.json')
    .then(response => response.json())
    .then(data => {
      
      // Render Donut Chart (Allocations by 8 Investment Areas)
      if (data.allocations_by_area) {
         renderAreaDonutChart('areaDonutChart', data.allocations_by_area);
      }

      // Render Bar Chart (Allocations by Grantee)
      if (data.allocations_by_grantee) {
         renderGranteeBarChart('granteeBarChart', data.allocations_by_grantee);
      }

      // Render Grouped Bar Chart (Y1 Budget vs Actuals)
      if (data.overall_metrics) {
         renderBudgetVsActualChart('budgetActualChart', data.overall_metrics);
      }

    })
    .catch(error => console.error("Error loading summary KPIs for charts:", error));
});