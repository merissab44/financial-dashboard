const DIMENSIONS = [
    { id: "1.", label: "Backbone & Gen Ops", dotClass: "dot-fn01", statement: "Admin, indirect, management fees", csvLabels: ["1. Backbone and Gen Ops", "Backbone and Gen Ops", "Backbone & Gen Ops"] },
    { id: "2.", label: "Live & Thrive", dotClass: "dot-fn02", statement: "Buildings, capital improvements", csvLabels: ["2. Live and Thrive", "Live and Thrive", "Live & Thrive"] },
    { id: "3.", label: "Data Trust & Fund", dotClass: "dot-fn03", statement: "Evaluation, research, data", csvLabels: ["3. Data Trust and Fund", "Data Trust and Fund", "Data Trust & Fund"] },
    { id: "4.", label: "Power Building", dotClass: "dot-fn04", statement: "Civic engagement, organizing", csvLabels: ["4. Power Building", "Power Building"] },
    { id: "5.", label: "Learn & Grow", dotClass: "dot-fn05", statement: "Youth programs, scholarships", csvLabels: ["5. Learn and Grow", "Learn and Grow", "Learn & Grow"] },
    { id: "6.", label: "Safe & Connected", dotClass: "dot-fn06", statement: "Safety, ambassadors, community response", csvLabels: ["6. Safe and Connected", "Safe and Connected", "Safe & Connected"] },
    { id: "7.", label: "Work and Wealth", dotClass: "dot-fn07", statement: "Economic development", csvLabels: ["7. Work and Wealth", "Work and Wealth"] },
    { id: "8.", label: "Family Health and Wellbeing", dotClass: "dot-fn08", statement: "Clinical services, supplies, labs", csvLabels: ["8. Family Health and Wellbeing", "Family Health and Wellbeing"] }
];

const KPI_LABELS = {
    revenue: ["Total Revenue", "Total Support and Revenue", "Total support and revenue", "Total Revenue (All)"],
    expenses: ["Total Expenses", "Total Expense", "Expenses Total", "Total expenses"]
};
//4. JavaScript Implementation Logic (js/expenses.js)
// This controller processes the budget CSV, implements financial fallbacks, and updates the UI state.
const CSV_PATH = "data/Rise_East_Budget_Cleaned.csv";

// --- Utility Functions ---

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function parseNumber(v) {
    const raw = String(v ?? "").trim();
    if (!raw || raw === "-" || raw === "—") return null;
    const neg = /^\(.*\)$/.test(raw);
    const cleaned = raw.replace(/^\(|\)$/g, "").replace(/\$/g, "").replace(/,/g, "").trim();
    const x = Number(cleaned);
    return Number.isFinite(x) ? (neg ? -x : x) : null;
}

function formatCurrency(v) {
    if (!Number.isFinite(v)) return "—";
    return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPct(v) {
    if (!Number.isFinite(v) || v === 0) return "—";
    return `${(v * 100).toFixed(1)}%`;
}

function normalizeLabel(s) {
    return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCSV(text) {
    const rows = [];
    let i = 0, field = "", row = [], inQuotes = false;
    while (i < text.length) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i+1] === '"') { field += '"'; i += 2; continue; }
            inQuotes = !inQuotes; i++; continue;
        }
        if (!inQuotes && (c === ",")) { row.push(field); field = ""; i++; continue; }
        if (!inQuotes && (c === "\n" || c === "\r")) {
            if (c === "\r" && text[i+1] === "\n") i++;
            row.push(field); field = "";
            if (row.some(x => x.trim() !== "")) rows.push(row.map(x => x.trim()));
            row = []; i++; continue;
        }
        field += c; i++;
    }
    row.push(field);
    if (row.some(x => x.trim() !== "")) rows.push(row.map(x => x.trim()));
    return rows;
}

function getVal(lineMap, possibleLabels, colIdx) {
    for (const lab of possibleLabels) {
        const key = normalizeLabel(lab);
        if (lineMap.has(key)) return parseNumber(lineMap.get(key)[colIdx]);
    }
    return null;
}

// --- Update UI State and Reflect Calculated Ratios ---

function renderExpenses(lineMap, colIdx) {
    // 1. Resolve Primary KPI Values
    const rawTotalExp = getVal(lineMap, KPI_LABELS.expenses, colIdx);
    
    // 2. Aggregate Dimension Spending
    // Note: Backbone is ID 1 (index 0); Programmatic Categories are IDs 2-8 (index 1-7)
    const backboneSpend = getVal(lineMap, DIMENSIONS[0].csvLabels, colIdx) || 0;
    const programmaticSpend = DIMENSIONS.slice(1).reduce((sum, d) => {
        const val = getVal(lineMap, d.csvLabels, colIdx);
        return sum + (val || 0);
    }, 0);

    // 3. Fallback Denominator Logic: Use explicit KPI if present, otherwise sum of all dimensions
    const fallbackDenom = backboneSpend + programmaticSpend;
    const finalDenom = (Number.isFinite(rawTotalExp) && rawTotalExp !== 0) ? rawTotalExp : fallbackDenom;

    // 4. Calculate Financial Intelligence Ratios
    const programEfficiency = finalDenom > 0 ? (programmaticSpend / finalDenom) : null;
    const backboneRatio = finalDenom > 0 ? (backboneSpend / finalDenom) : null;

    // 5. DOM Reflection
    const totalExpEl = document.getElementById("totalExpenses");
    const progEffEl = document.getElementById("programEfficiency");
    const backRatEl = document.getElementById("backboneRatio");

    if (totalExpEl) totalExpEl.textContent = formatCurrency(rawTotalExp || fallbackDenom);
    if (progEffEl) progEffEl.textContent = formatPct(programEfficiency);
    if (backRatEl) backRatEl.textContent = formatPct(backboneRatio);
}

// --- Initialization ---

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(encodeURI(CSV_PATH), { cache: "no-store" });
        if (!res.ok) throw new Error("Network response was not ok");
        const text = await res.text();
        const rows = parseCSV(text);
        
        const headers = rows[0];
        const lineMap = new Map();
        for (let r = 1; r < rows.length; r++) {
            if (rows[r][0]) lineMap.set(normalizeLabel(rows[r][0]), rows[r]);
        }

        const yearSelect = document.getElementById("yearSelect");
        if (yearSelect) {
            yearSelect.innerHTML = "";
            headers.slice(1).forEach((name, idx) => {
                const opt = document.createElement("option");
                opt.value = String(idx + 1);
                opt.textContent = name;
                yearSelect.appendChild(opt);
            });
            yearSelect.value = String(headers.length - 1);
            yearSelect.addEventListener("change", () => renderExpenses(lineMap, Number(yearSelect.value)));
        }

        renderExpenses(lineMap, headers.length - 1);
    } catch (e) {
        console.error("Architectural Error: Data loading or mapping failed.", e);
    }
});