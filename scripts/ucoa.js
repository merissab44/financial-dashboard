// ------------------------------------------------------------
// Path to CSV file:
const CSV_PATH = "data/Rise_East_Budget_Cleaned.csv"; // <-- update if needed

// Strategic dimensions shown in the homepage table
const DIMENSIONS = [
  { id: "1.", label: "Backbone & Gen Ops", dotClass: "dot-fn01", statement: "Admin, indirect, management fees", csvLabels: ["1. Backbone and Gen Ops", "Backbone and Gen Ops", "Backbone & Gen Ops"] },
  { id: "2.", label: "Live & Thrive", dotClass: "dot-fn02", statement: "Buildings, capital improvements", csvLabels: ["2. Live and Thrive", "Live and Thrive", "Live & Thrive"] },
  { id: "3.", label: "Data Trust & Fund", dotClass: "dot-fn03", statement: "Evaluation, research, data", csvLabels: ["3. Data Trust and Fund", "Data Trust and Fund", "Data Trust & Fund"] },
  { id: "4.", label: "Power Building", dotClass: "dot-fn04", statement: "Civic engagement, organizing", csvLabels: ["4. Power Building", "Power Building"] },
  { id: "5.", label: "Learn & Grow", dotClass: "dot-fn05", statement: "Youth programs, scholarships", csvLabels: ["5. Learn and Grow", "Learn and Grow", "Learn & Grow"] },
  { id: "6.", label: "Safe & Connected", dotClass: "dot-fn06", statement: "Safety, ambassadors, community response", csvLabels: ["6. Safe and Connected", "Safe and Connected", "Safe & Connected"] },
  { id: "7.", label: "Work and Wealth", dotClass: "dot-fn07", statement: "Economic development", csvLabels: ["7. Work and Wealth", "Work and Wealth"] },
  { id: "8.", label: "Family Health and Wellbeing", dotClass: "dot-fn08", statement: "Clinical services, supplies, labs", csvLabels: ["8. Family Health and Wellbeing", "Family Health and Wellbeing"] },
];

// KPI lines (first column labels in your CSV)
const KPI_LABELS = {
  revenue: ["Total Revenue", "Total Support and Revenue", "Total support and revenue", "Total Revenue (All)"],
  expenses: ["Total Expenses", "Total Expense", "Expenses Total", "Total expenses"],
};

// ---------- helpers ----------
function pickEl(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

function normalizeLabel(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumber(v) {
  // Handles "$1,234", "(1,234)", " - ", etc.
  const raw = String(v ?? "").trim();
  if (!raw || raw === "-" || raw === "—") return null;

  const neg = /^\(.*\)$/.test(raw);
  const cleaned = raw
    .replace(/^\(|\)$/g, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const x = Number(cleaned);
  if (!Number.isFinite(x)) return null;
  return neg ? -x : x;
}

function formatCurrency(v) {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return (v < 0 ? "-$" : "$") + s;
}

function formatPct(v) {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

//looks through CSV file
function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      inQuotes = !inQuotes; i++; continue;
    }
    if (!inQuotes && c === ",") { row.push(field); field = ""; i++; continue; }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(x => String(x || "").trim() !== "")) rows.push(row.map(x => String(x || "").trim()));
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.some(x => String(x || "").trim() !== "")) rows.push(row.map(x => String(x || "").trim()));
  return rows;
}


function buildLineMap(rows) {
  const map = new Map();
  for (let r = 1; r < rows.length; r++) {
    const label = rows[r][0];
    if (!label) continue;
    map.set(normalizeLabel(label), rows[r]);
  }
  return map;
}

function findFirstMatch(lineMap, possibleLabels) {
  for (const lab of possibleLabels) {
    const key = normalizeLabel(lab);
    if (lineMap.has(key)) return lineMap.get(key);
  }
  return null;
}

function getVal(lineMap, possibleLabels, colIdx) {
  const row = findFirstMatch(lineMap, possibleLabels);
  if (!row) return null;
  return parseNumber(row[colIdx]);
}

// ---------- main ----------
document.addEventListener("DOMContentLoaded", async () => {
  const yearSelect = pickEl(["#yearSelect", "#year-select", "select[name='year']"]);
  const revenueEl = pickEl(["#totalRevenue", "#kpiRevenue", "[data-kpi='revenue']"]);
  const expensesEl = pickEl(["#totalExpenses", "#kpiExpenses", "[data-kpi='expenses']"]);
  const surplusEl = pickEl(["#surplus", "#kpiSurplus", "[data-kpi='surplus']"]);

  const tbody = pickEl(["#ucoa-body", "#ucoaBody", "#ucoa-table-body"]);
  if (!tbody) {
    console.error("Could not find UCOA table body. Expected #ucoa-body (or similar).");
    return;
  }

  let rows;
  try {
    const res = await fetch(encodeURI(CSV_PATH), { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} (${CSV_PATH})`);
    const text = await res.text();
    rows = parseCSV(text);
  } catch (e) {
    console.error(e);
    return;
  }

  if (!rows || rows.length < 2) {
    console.error("CSV appears empty or invalid.");
    return;
  }

  const headers = rows[0];
  // first col is label; other cols are years/budget columns
  const colNames = headers.slice(1);
  const lineMap = buildLineMap(rows);

  // Populate year select
  if (yearSelect) {
    yearSelect.innerHTML = "";
    colNames.forEach((name, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx + 1); // actual column index in rows
      opt.textContent = name;
      yearSelect.appendChild(opt);
    });

    // default to last column
    yearSelect.value = String(headers.length - 1);
  }

  function renderForCol(colIdx) {
    // KPIs
    const rev = getVal(lineMap, KPI_LABELS.revenue, colIdx);
    const exp = getVal(lineMap, KPI_LABELS.expenses, colIdx);
    const surplus = (Number.isFinite(rev) && Number.isFinite(exp)) ? (rev - exp) : null;

    if (revenueEl) revenueEl.textContent = formatCurrency(rev);
    if (expensesEl) expensesEl.textContent = formatCurrency(exp);
    if (surplusEl) surplusEl.textContent = formatCurrency(surplus);

    // Collect amounts in the same order as DIMENSIONS
    const amounts = DIMENSIONS.map(d => {
      const v = getVal(lineMap, d.csvLabels, colIdx);
      return Number.isFinite(v) ? v : null;
    });

    // Use total expenses as denominator if present; otherwise sum of dimensions
    const totalExpenses = Number.isFinite(exp)
      ? exp
      : amounts.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

    const denom = Math.abs(totalExpenses) || 0;

    // Render table
    tbody.innerHTML = "";
    for (let i = 0; i < DIMENSIONS.length; i++) {
      const d = DIMENSIONS[i];
      const amount = amounts[i];
      const pct = (Number.isFinite(amount) && denom > 0) ? (amount / denom) : null;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="dot ${d.dotClass}"></span>
           ${escapeHtml(d.label)}
        </td>
        <td>${escapeHtml(d.statement)}</td>
        <td class="num">${formatCurrency(amount)}</td>
        <td class="num">${formatPct(pct)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Wire dropdown
  if (yearSelect) {
    yearSelect.addEventListener("change", () => {
      const colIdx = Number(yearSelect.value);
      renderForCol(colIdx);
    });
  }

  // Initial render (last column)
  const initialColIdx = yearSelect ? Number(yearSelect.value) : (headers.length - 1);
  renderForCol(initialColIdx);
});
