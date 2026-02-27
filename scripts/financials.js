// 1. Import your existing math logic
import { calculateConsolidatedTotal } from '../utils/calculations.js';

// Global variable to store the JSON data so we don't fetch it every time a tab is clicked
let financialData = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Tab Buttons
  const buttons = document.querySelectorAll('.actions .btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // FIX: Use closest() to ensure we get the button even if the user clicks inner text
      const targetBtn = e.target.closest('.btn');
      if (!targetBtn) return;
      
      const view = targetBtn.dataset.view;
      switchView(view);
    });
  });

  // 2. Fetch the JSON Data
  fetch('./data/financial_statements.json')
    .then(response => {
      if (!response.ok) throw new Error("Failed to load financial JSON");
      return response.json();
    })
    .then(data => {
      financialData = data;
      // Render the default view (Statement of Activities) once data loads
      switchView('soa'); 
    })
    .catch(error => {
      console.error("Financials Error:", error);
      document.getElementById('financials-content').innerHTML = `<p style="color:red; text-align:center;">Error loading financial data. Please ensure financial_statements.json is in the /data folder.</p>`;
    });
});

// --- Tab Switching Logic ---
function switchView(viewName) {
  const container = document.getElementById('financials-content');
  if (!container || !financialData) return;

  // Update button active/secondary classes
  const buttons = document.querySelectorAll('.actions .btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('secondary');
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
      btn.classList.remove('secondary');
    }
  });

  // Inject the correct table based on the tab clicked
  if (viewName === 'soa') {
    container.innerHTML = renderStatementOfActivities(financialData.statement_of_activities);
  } else if (viewName === 'sfp') {
    container.innerHTML = renderFinancialPosition(financialData.statement_of_financial_position);
  } else if (viewName === 'sfe') {
    container.innerHTML = renderFunctionalExpenses(financialData.statement_of_functional_expenses);
  } else if (viewName === 'variances') {
    container.innerHTML = `<h3 style="margin-top:0;">Budget Variances</h3><p>Variance matrix is currently under construction. Please refer to the Performance Dashboard for high-level variance charts.</p>`;
  }
}

// --- Table Rendering Functions ---

// Helper to format numbers into currency strings
function formatCurrency(value) {
  if (!Number.isFinite(value) || value === 0) return "—";
  return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Generates the table headers (The 4 Grantees + Consolidated)
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
          <th style="padding: 12px; text-align: right; background: #e2e8f0; color: #0f172a;">Consolidated Total</th>
        </tr>
      </thead>
      <tbody>
  `;
}

// Loops through an array of financial line items and builds table rows
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

// 1. Build Statement of Activities
function renderStatementOfActivities(soaData) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Activities</h3>` + getTableHeader();
  html += renderTableSection("Revenue", soaData.revenue);
  html += renderTableSection("Expenses by Function", soaData.expenses_by_function);
  html += `</tbody></table>`;
  return html;
}

// 2. Build Statement of Financial Position
function renderFinancialPosition(sfpData) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Financial Position</h3>` + getTableHeader();
  html += renderTableSection("Assets", sfpData.assets);
  html += renderTableSection("Liabilities", sfpData.liabilities);
  html += renderTableSection("Net Assets", sfpData.net_assets);
  html += `</tbody></table>`;
  return html;
}

// 3. Build Statement of Functional Expenses
function renderFunctionalExpenses(sfeData) {
  let html = `<h3 style="margin-top: 0; color: #0f172a;">Statement of Functional Expenses</h3>` + getTableHeader();
  html += renderTableSection("Functional Expenses", sfeData);
  html += `</tbody></table>`;
  return html;
}