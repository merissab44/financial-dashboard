// ====== CONFIG ======
const DEFAULT_CSV_PATH = "data/Rise_East_Budget_Cleaned.csv";

const LABELS = {
  totalRevenue: ["Total Revenue"],
  totalExpenses: ["Total Expenses"],
  surplus: ["Surplus / (Deficit)", "Surplus/(Deficit)", "Net Income"],
};

// remove the code 
const DIMENSIONS = [
  { name: "Backbone & Gen Ops", rollup: "Admin, indirect, management fees",
    csvLabels: ["1. Backbone and Gen Ops", "1. Backbone & Gen Ops", "FN-01 Backbone & Gen Ops"] },

  { name: "Live & Thrive", rollup: "Buildings, capital improvements",
    csvLabels: ["2. Live and Thrive", "2. Live & Thrive", "FN-02 Live & Thrive"] },

  { name: "Data Trust & Fund", rollup: "Evaluation, research, data",
    csvLabels: ["3. Data Trust and Fund", "3. Data Trust & Fund", "FN-03 Data Trust & Fund"] },

  { name: "Power Building", rollup: "Civic engagement, organizing",
    csvLabels: ["4. Power Building", "FN-04 Power Building"] },

  { name: "Learn & Grow", rollup: "Youth programs, scholarships",
    csvLabels: ["5. Learn and Grow", "5. Learn & Grow", "FN-05 Learn & Grow"] },

  { name: "Safe & Connected", rollup: "Safety, ambassadors, community response",
    csvLabels: ["6. Safe and Connected", "6. Safe & Connected", "FN-06 Safe & Connected"] },

  // These two are placeholders until we confirm the exact names used in your CSV
  { name: "Work and Wealth", rollup: "Akoma Market Vendors, Akoma Consignment Fee, Economic Development",
    csvLabels: ["7. Work and Wealth", "FN-07 Work and Wealth", "7."] },

  { name: "Family Health and Wellbeing", rollup: "Healing Generations Institute, Medical Supplies, Clinical Services, Laboratory Fees, Medical Vaccines",
    csvLabels: ["8. Family Health and Wellbeing", "FN-08 Family Health and Wellbeing", "8."] },
];


// ====== DOM ======
const dom = {
  yearSelect: document.getElementById("yearSelect"),
  kpiRevenue: document.getElementById("kpiRevenue"),
  kpiExpenses: document.getElementById("kpiExpenses"),
  kpiSurplus: document.getElementById("kpiSurplus"),
  ucoaBody: document.getElementById("ucoaBody"),
};

// ====== CSV parsing ======
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

function norm(s) { return String(s ?? "").trim().toLowerCase(); }

function parseMoney(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "$ -" || s.toLowerCase() === "n/a") return null;

  const neg = s.includes("(") && s.includes(")");
  const cleaned = s.replace(/[\$,]/g, "").replace(/[()\s]/g, "");
  if (!cleaned || cleaned === "-") return null;

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

// ====== Structure detection for your cleaned CSV ======
function findHeaderRow(rows) {
  // cleaned file should have "Rise East Budgets" + "Year 0" on header row
  for (let r = 0; r < rows.length; r++) {
    const joined = rows[r].map(x => String(x || "").trim().toLowerCase()).join(" | ");
    if (joined.includes("rise east budgets") && joined.includes("year 0")) return r;
    if (joined.includes("year 0")) return r;
  }
  return 0;
}

function findLabelCol(rows, headerRow) {
  const header = rows[headerRow] || [];
  for (let c = 0; c < header.length; c++) {
    if (String(header[c] || "").trim().toLowerCase().includes("rise east budgets")) return c;
  }
  return 0;
}

function getYearCols(rows, headerRow, labelCol) {
  const header = rows[headerRow] || [];
  const cols = [];
  for (let c = 0; c < header.length; c++) {
    if (c === labelCol) continue;
    const name = String(header[c] || "").trim();
    if (!name) continue;
    if (name.toLowerCase().includes("year")) cols.push({ idx: c, name });
  }
  return cols;
}

function buildLineMap(rows, headerRow, labelCol, yearCols) {
  const map = new Map(); // label -> Map(colIdx->number)
  for (let r = headerRow + 1; r < rows.length; r++) {
    const label = String(rows[r][labelCol] || "").trim();
    if (!label) continue;

    const m = new Map();
    for (const yc of yearCols) {
      const n = parseMoney(rows[r][yc.idx]);
      if (n != null) m.set(yc.idx, n);
    }
    if (m.size > 0) map.set(norm(label), m);
  }
  return map;
}

function getVal(map, candidates, colIdx) {
  for (const c of candidates) {
    const entry = map.get(norm(c));
    if (entry && entry.has(colIdx)) return entry.get(colIdx);
  }
  return null;
}

// ====== Rendering ======
function renderForCol(lineMap, colIdx) {
  // KPIs
  const rev = getVal(lineMap, LABELS.totalRevenue, colIdx);
  const exp = getVal(lineMap, LABELS.totalExpenses, colIdx);
  const sur = getVal(lineMap, LABELS.surplus, colIdx);

  if (dom.kpiRevenue) dom.kpiRevenue.textContent = fmtMoney(rev);
  if (dom.kpiExpenses) dom.kpiExpenses.textContent = fmtMoney(exp);
  if (dom.kpiSurplus) dom.kpiSurplus.textContent = fmtMoney(sur);

  // Build FN-01..FN-08 table dynamically
  if (!dom.ucoaBody) return;
  dom.ucoaBody.innerHTML = "";

  // Collect amounts for each dimension
  const amounts = {};
  for (const d of DIMENSIONS) {
    const v = getVal(lineMap, d.csvLabels, colIdx);
    amounts[d.code] = Number.isFinite(v) ? v : null;
  }

  // Denominator for % of total
  const totalExpenses = Number.isFinite(exp)
    ? exp
    : Object.values(amounts).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const d = DIMENSIONS[i];
    const amount = amounts[d.code];

    const pct = (Number.isFinite(amount) && Number.isFinite(totalExpenses) && totalExpenses !== 0)
      ? amount / totalExpenses
      : null;

    // dot class: b1..b8 (if your CSS only has some, dots will still show)
    const dotClass = `b${i + 1}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="dim"><span class="dot ${dotClass}"></span>${d.name}</span></td>
      <td>${d.rollup}</td>
      <td class="num">${fmtMoney(amount)}</td>
      <td class="num">${fmtPct(pct)}</td>
    `;
    dom.ucoaBody.appendChild(tr);
  }
}


function wireDropdown(yearCols, lineMap) {
  if (!dom.yearSelect) return;

  dom.yearSelect.innerHTML = "";
  yearCols.forEach(yc => {
    const opt = document.createElement("option");
    opt.value = String(yc.idx);
    opt.textContent = yc.name;
    dom.yearSelect.appendChild(opt);
  });

  // default: latest (right-most)
  const latest = yearCols[yearCols.length - 1];
  dom.yearSelect.value = String(latest.idx);
  renderForCol(lineMap, latest.idx);

  dom.yearSelect.addEventListener("change", () => {
    renderForCol(lineMap, Number(dom.yearSelect.value));
  });
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(encodeURI(DEFAULT_CSV_PATH), { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);

    const headerRow = findHeaderRow(rows);
    const labelCol = findLabelCol(rows, headerRow);
    const yearCols = getYearCols(rows, headerRow, labelCol);
    const lineMap = buildLineMap(rows, headerRow, labelCol, yearCols);

    if (!yearCols.length) throw new Error("No year columns detected (expected headers like 'Year 0').");
    wireDropdown(yearCols, lineMap);
  } catch (e) {
    console.error("Budget CSV load failed:", e);
    // keep Loading... visible so you know it didn't populate
  }
});
