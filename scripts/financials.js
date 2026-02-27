import { calculateConsolidatedTotal } from '../utils/calculations.js';

let financialData = null;
let varianceData = null;
let currentView = 'soa'; // Tracks the active tab
let currentYear = '2024'; // Tracks the active year

document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Initialize Tab Buttons
  const buttons = document.querySelectorAll('.actions .btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn');
      if (!targetBtn) return;
      
      currentView = targetBtn.dataset.view;
      renderCurrentState();
    });
  });

  // 2. Initialize Year Filter Dropdown
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter) {
    yearFilter.addEventListener('change', (e) => {
      currentYear = e.target.value;
      renderCurrentState();
    });
  }

  // 3. Fetch the Multi-Year JSON Data
  fetch('./data/financial_statements.json?v=' + new Date().getTime())
    .then(response => {
      if (!response.ok) throw new Error("Failed to load financial JSON");
      return response.json();
    })
    .then(data => {
      financialData = data;
      renderCurrentState(); // Renders 2024 SOA by default
    })
    .catch(error => {
      console.error("Financials Error:", error);
      document.getElementById('financials-content').innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
    });
});
fetch('./data/budget_variances.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(data => {
      varianceData = data;
    })
    .catch(error => console.error("Error loading variance data:", error));

// --- Main Rendering Logic ---
function renderCurrentState() {
  const container = document.getElementById('financials-content');
  if (!container || !financialData) return;

  // Update button active/secondary classes visually
  const buttons = document.querySelectorAll('.actions .btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('secondary');
    if (btn.dataset.view === currentView) {
      btn.classList.add('active');
      btn.classList.remove('secondary');
    }
  });

  // Grab the specific year's data from the JSON
  const yearData = financialData[currentYear];

  if (!yearData) {
     container.innerHTML = `<p style="padding:20px;">Data for ${currentYear} is unavailable.</p>`;
     return;
  }

  // Inject the correct table based on the tab clicked
  if (currentView === 'soa') {
    container.innerHTML = renderStatementOfActivities(yearData.statement_of_activities, currentYear);
  } else if (currentView === 'sfp') {
    container.innerHTML = renderFinancialPosition(yearData.statement_of_financial_position, currentYear);
  } else if (currentView === 'sfe') {
    container.innerHTML = renderFunctionalExpenses(yearData.statement_of_functional_expenses, currentYear);
  } else if (currentView === 'variances') {
    if (currentYear === '2024') {
        container.innerHTML = renderVariancesTable(varianceData);
    } else {
        container.innerHTML = `<h3 style="margin-top:0;">Budget Variances (FY ${currentYear})</h3><p>Variance data is only available for the Year 1 (2024-2025) budget period.</p>`;
    }
  }
}

// --- Table Rendering Builders ---

function formatCurrency(value) {
  if (!Number.isFinite(value) || value === 0) return "—";
  return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getTableHeader() {
  return `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 2px solid #cbd5e1; background: #f8fafc;">
          <th style="padding: 12px; width: 35%;">Account Category</th>
          <th style="padding: 12px; text-align: right;">BCZ</th>
          <th style="padding: 12px; text-align: right;">Roots</th>
          <th style="padding: 12px; text-align: right;">EOYDC</th>
          <th style="padding: 12px; text-align: right;">BOEN</th>
          <th style="padding: 12px; text-align: right; background: #e2e8f0;">Consolidated Total</th>
        </tr>
      </thead>
      <tbody>
  `;
}

function renderTableSection(sectionTitle, rows) {
  let html = `<tr><td colspan="6" style="font-weight: 700; color: #334155; padding: 12px 10px 8px 10px; border-bottom: 1px solid #e2e8f0;">${sectionTitle}</td></tr>`;
  
  rows.forEach(row => {
    const total = calculateConsolidatedTotal(row);
    html += `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 10px 10px 20px; color: #475569;">${row.line_item}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.BCZ)}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.Roots)}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.EOYDC)}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.BOEN)}</td>
        <td style="padding: 10px; text-align: right; font-weight: 600; background: #f8fafc;">${formatCurrency(total)}</td>
      </tr>
    `;
  });
  return html;
}

function renderStatementOfActivities(soaData, year) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Activities (FY ${year})</h3>` + getTableHeader();
  html += renderTableSection("Revenue", soaData.revenue);
  html += renderTableSection("Expenses by Function", soaData.expenses_by_function);
  html += `</tbody></table>`;
  return html;
}

function renderFinancialPosition(sfpData, year) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Financial Position (FY ${year})</h3>` + getTableHeader();
  html += renderTableSection("Assets", sfpData.assets);
  html += renderTableSection("Liabilities", sfpData.liabilities);
  html += renderTableSection("Net Assets", sfpData.net_assets);
  html += `</tbody></table>`;
  return html;
}

function renderFunctionalExpenses(sfeData, year) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Functional Expenses (FY ${year})</h3>` + getTableHeader();
  html += renderTableSection("Functional Expenses", sfeData);
  html += `</tbody></table>`;
  return html;
}

function renderVariancesTable(data) {
  if (!data) return `<p>Loading variance data...</p>`;

  let html = `
    <h3 style="margin-top: 0; color: #0f172a;">Year 1 Budget vs Actuals (2024-2025)</h3>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 2px solid #cbd5e1; background: #f8fafc;">
          <th style="padding: 12px; width: 35%;">Investment Area</th>
          <th style="padding: 12px; text-align: right;">Y1 Budget</th>
          <th style="padding: 12px; text-align: right;">Y1 Actuals</th>
          <th style="padding: 12px; text-align: right;">Variance ($)</th>
          <th style="padding: 12px; text-align: right;">Variance (%)</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalBudget = 0;
  let totalActual = 0;

  data.forEach(row => {
    totalBudget += row.budget;
    totalActual += row.actual;
    
    // Variance Math: Actuals minus Budget
    const varianceDollar = row.budget - row.actual;
    const variancePercent = row.budget === 0 ? 0 : (varianceDollar / row.budget) * 100;
    
    const color = varianceDollar >= 0 ? '#059669' : '#dc2626'; // Green if >= 0, Red if < 0

    // Format currency so the negative sign is before the dollar sign (e.g. -$1,500)
    const formattedVarDollar = (varianceDollar < 0 ? "-$" : "$") + Math.abs(varianceDollar).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const formattedVarPct = variancePercent.toFixed(1) + "%";

    html += `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 10px 10px 20px; color: #475569; font-weight: 500;">${row.category}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.budget)}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(row.actual)}</td>
        <td style="padding: 10px; text-align: right; color: ${color}; font-weight: 600;">${formattedVarDollar}</td>
        <td style="padding: 10px; text-align: right; color: ${color}; font-weight: 600;">${formattedVarPct}</td>
      </tr>
    `;
  });

  // --- GRAND TOTAL ROW ---
  const totalVarDollar = totalBudget - totalActual;
  const totalVarPct = totalBudget === 0 ? 0 : (totalVarDollar / totalBudget) * 100;
  const totalColor = totalVarDollar >= 0 ? '#059669' : '#dc2626';

  const formattedTotalVarDollar = (totalVarDollar < 0 ? "-$" : "$") + Math.abs(totalVarDollar).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const formattedTotalVarPct = totalVarPct.toFixed(1) + "%";

  html += `
      <tr style="background: #e2e8f0; font-weight: 700; color: #0f172a;">
        <td style="padding: 12px 10px 12px 20px;">Grand Total</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(totalBudget)}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(totalActual)}</td>
        <td style="padding: 12px; text-align: right; color: ${totalColor};">${formattedTotalVarDollar}</td>
        <td style="padding: 12px; text-align: right; color: ${totalColor};">${formattedTotalVarPct}</td>
      </tr>
    </tbody></table>
  `;

  return html;
}