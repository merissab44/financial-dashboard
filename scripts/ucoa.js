// ========= CONFIG =========
// Default CSV filename (must be in same folder as index.html on GitHub Pages)
const DEFAULT_CSV_PATH = "data/Rise_East_Budget_Cleaned.csv";
console.log('using csv path:', DEFAULT_CSV_PATH);

// Budget cover page labels (add variants if your CSV uses different wording)
const BUDGET_LABELS = {
  totalRevenue: ["Total Revenue"],
  totalExpenses: ["Total Expenses"],
  surplus: ["Surplus / (Deficit)", "Surplus/(Deficit)", "Net Income"],
};

// Strategic dimension lines found in the budget cover page
const DIMENSION_EXPENSE_LINES = {
  "FN-01": ["1. Backbone and Gen Ops", "1. Backbone & Gen Ops"],
  "FN-02": ["2. Live and Thrive", "2. Live & Thrive"],
  "FN-03": ["3. Data Trust and Fund", "3. Data Trust & Fund"],
  "FN-04": ["4. Power Building"],
  "FN-05": ["5. Learn and Grow", "5. Learn & Grow"],
  "FN-06": ["6. Safe and Connected", "6. Safe & Connected"],
};

// ========= DOM =========
const el = {
  importBtn: document.getElementById("importBtn"),
  exportBtn: document.getElementById("exportBtn"),
  csvFileInput: document.getElementById("csvFileInput"),

  // KPI values
  kpiRevenue: document.getElementById("kpiRevenue"),
  kpiExpenses: document.getElementById("kpiExpenses"),
  kpiSurplus: document.getElementById("kpiSurplus"),

  // UCOA table body (already exists in your HTML)
  ucoaBody: document.getElementById("ucoaBody"),
};

// ========= CSV PARSING =========
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
      if (row.some(x => String(x || "").trim() !== "")) rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }

  row.push(field);
  if (row.some(x => String(x || "").trim() !== "")) rows.push(row);
  return rows;
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function parseMoney(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const neg = s.includes("(") && s.includes(")");
  const cleaned = s.replace(/[\$,]/g, "").replace(/[()\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—%";
  return `${(n * 100).toFixed(1)}%`;
}

// Detect header row (best effort)
function findHeaderRow(rows) {
  for (let r = 0; r < rows.length; r++) {
    const joined = rows[r].join(" | ").toLowerCase();
    if (joined.includes("year") && (joined.includes("budget") || joined.includes("actual") || joined.includes("july"))) {
      return r;
    }
  }
  return 0;
}

function findLabelCol(rows, headerRow) {
  const maxCols = Math.max(...rows.map(r => r.length));
  let bestCol = 0, bestScore = -1;

  for (let c = 0; c < maxCols; c++) {
    let score = 0;
    for (let r = headerRow + 1; r < rows.length; r++) {
      const v = rows[r][c];
      if (v && String(v).trim().length > 1) score++;
    }
    if (score > bestScore) { bestScore = score; bestCol = c; }
  }
  return bestCol;
}

function getValueCols(rows, headerRow, labelCol) {
  const header = rows[headerRow] || [];
  const cols = [];
  for (let c = 0; c < header.length; c++) {
    if (c === labelCol) continue;
    const name = String(header[c] || "").trim();
    if (!name) continue;
    cols.push({ idx: c, name });
  }
  return cols;
}

// Build: label -> Map(colIdx -> number)
function buildLineItemMap(rows, headerRow, labelCol, valueCols) {
  const map = new Map();
  for (let r = headerRow + 1; r < rows.length; r++) {
    const label = String(rows[r][labelCol] || "").trim();
    if (!label) continue;

    const m = new Map();
    for (const vc of valueCols) {
      const n = parseMoney(rows[r][vc.idx]);
      if (n != null) m.set(vc.idx, n);
    }
    if (m.size > 0) map.set(norm(label), m);
  }
  return map;
}

function getVal(lineMap, candidates, colIdx) {
  for (const c of candidates) {
    const entry = lineMap.get(norm(c));
    if (entry && entry.has(colIdx)) return entry.get(colIdx);
  }
  return null;
}

// ========= DASHBOARD RENDERING =========
function updateBudgetKPIs(lineMap, colIdx) {
  const rev = getVal(lineMap, BUDGET_LABELS.totalRevenue, colIdx);
  const exp = getVal(lineMap, BUDGET_LABELS.totalExpenses, colIdx);
  const sur = getVal(lineMap, BUDGET_LABELS.surplus, colIdx);

  el.kpiRevenue.textContent = fmtMoney(rev);
  el.kpiExpenses.textContent = fmtMoney(exp);
  el.kpiSurplus.textContent = fmtMoney(sur);
}

function updateUCOATable(lineMap, colIdx) {
  // Prefer "Total Expenses" as denominator; otherwise sum known dimensions
  let totalExpenses = getVal(lineMap, BUDGET_LABELS.totalExpenses, colIdx);

  const dimAmounts = {};
  for (const [dimCode, labelVariants] of Object.entries(DIMENSION_EXPENSE_LINES)) {
    const v = getVal(lineMap, labelVariants, colIdx);
    if (Number.isFinite(v)) dimAmounts[dimCode] = v;
  }

  if (!Number.isFinite(totalExpenses)) {
    const sum = Object.values(dimAmounts).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    totalExpenses = sum > 0 ? sum : null;
  }

  // Fill your existing table rows (Amount + % columns)
  const rows = Array.from(el.ucoaBody.querySelectorAll("tr"));
  for (const tr of rows) {
    const firstCellText = tr.querySelector("td")?.innerText || "";
    const dimMatch = firstCellText.match(/\bFN-\d{2}\b/i);
    if (!dimMatch) continue;

    const dim = dimMatch[0].toUpperCase(); // e.g. "FN-01"
    const amount = dimAmounts[dim] ?? null;

    const tds = tr.querySelectorAll("td");
    const amountCell = tds[2];
    const pctCell = tds[3];

    if (amountCell) amountCell.textContent = fmtMoney(amount);

    if (pctCell) {
      const pct = (Number.isFinite(amount) && Number.isFinite(totalExpenses) && totalExpenses !== 0)
        ? (amount / totalExpenses)
        : null;
      pctCell.textContent = fmtPct(pct);
    }
  }

  // Save state for export
  window.__BUDGET_STATE__ = { dimAmounts, totalExpenses };
}

function renderFromCSVText(csvText) {
  const rows = parseCSV(csvText);
  const headerRow = findHeaderRow(rows);
  const labelCol = findLabelCol(rows, headerRow);
  const valueCols = getValueCols(rows, headerRow, labelCol);
  const lineMap = buildLineItemMap(rows, headerRow, labelCol, valueCols);

  // Use the latest value column (right-most) as “Latest”
  const latestColIdx = valueCols.length ? valueCols[valueCols.length - 1].idx : null;

  if (latestColIdx == null) return;

  updateBudgetKPIs(lineMap, latestColIdx);
  updateUCOATable(lineMap, latestColIdx);
}

// ========= IMPORT / EXPORT =========
async function loadDefaultCSV() {
  try {
    const res = await fetch(DEFAULT_CSV_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    const text = await res.text();
    renderFromCSVText(text);
  } catch (e) {
    console.warn("Default CSV did not load. Use Import consolidated file.", e);
  }
}

function wireButtons() {
  if (el.importBtn && el.csvFileInput) {
    el.importBtn.addEventListener("click", () => el.csvFileInput.click());
    el.csvFileInput.addEventListener("change", () => {
      const file = el.csvFileInput.files && el.csvFileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => renderFromCSVText(String(reader.result || ""));
      reader.readAsText(file);
    });
  }

  if (el.exportBtn) {
    el.exportBtn.addEventListener("click", () => {
      const state = window.__BUDGET_STATE__;
      if (!state) {
        alert("No data loaded yet. Import a CSV first.");
        return;
      }

      const lines = [];
      lines.push("Metric,Value");
      lines.push(`Total Revenue,${el.kpiRevenue.textContent}`);
      lines.push(`Total Expenses,${el.kpiExpenses.textContent}`);
      lines.push(`Surplus/(Deficit),${el.kpiSurplus.textContent}`);
      lines.push("");

      lines.push("Strategic Dimension,Amount,% of Total Expenses");
      const trs = Array.from(el.ucoaBody.querySelectorAll("tr"));
      for (const tr of trs) {
        const dimText = tr.querySelector("td")?.innerText?.replace(/\s+/g, " ").trim() || "";
        const amount = tr.querySelectorAll("td")[2]?.innerText?.trim() || "";
        const pct = tr.querySelectorAll("td")[3]?.innerText?.trim() || "";
        if (dimText) lines.push(`"${dimText}",${amount},${pct}`);
      }

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "budget_cover_summary.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
}

// ========= INIT =========
document.addEventListener("DOMContentLoaded", () => {
  wireButtons();
  loadDefaultCSV();
});
