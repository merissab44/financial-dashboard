const CSV_PATH = "data/Rise_East_Budget_Cleaned.csv";

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
    revenue: ["Total Revenue", "Total Support and Revenue", "Total support and revenue"],
    expenses: ["Total Expenses", "Total Expense", "Expenses Total"]
};

// Robust Parser from Source Context
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
    if (!Number.isFinite(v)) return "—";
    return `${(v * 100).toFixed(1)}%`;
}

function switchView(viewName) {
    const container = document.getElementById('dashboard-content');
    const buttons = document.querySelectorAll('.actions .btn');
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('secondary');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
            btn.classList.remove('secondary');
        }
    });

    renderView(viewName);
}

function renderView(viewName) {
    const container = document.getElementById('dashboard-content');
    
    if (viewName === 'functional') {
        let html = `<div class="table-wrap"><table><thead><tr><th>Dimension</th><th>Statement</th><th class="num">Amount</th><th class="num">% of Total</th></tr></thead><tbody>`;
        
        DIMENSIONS.forEach(d => {
            // In a real implementation, 'val' would be fetched from the lineMap using d.csvLabels
            const val = 125000; // Placeholder for logic
            html += `<tr>
                <td><span class="dot ${d.dotClass}"></span>${d.label}</td>
                <td>${d.statement}</td>
                <td class="num">${formatCurrency(val)}</td>
                <td class="num">${formatPct(0.12)}</td>
            </tr>`;
        });
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } else if (viewName === 'variances') {
        const budget = 500000;
        const actual = 485000;
        const variance = actual - budget;
        const varPct = variance / budget;
        
        container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Account</th><th class="num">Budget</th><th class="num">Actual</th><th class="num">Var ($)</th><th class="num">Var (%)</th></tr></thead>
        <tbody><tr>
            <td>Total Operations</td>
            <td class="num">${formatCurrency(budget)}</td>
            <td class="num">${formatCurrency(actual)}</td>
            <td class="num" style="color:${variance < 0 ? 'var(--deficit-red)' : 'var(--success-green)'}">${formatCurrency(variance)}</td>
            <td class="num">${formatPct(varPct)}</td>
        </tr></tbody></table></div>`;
    }
    // Additional view logic for SoA and SoFP follows same pattern...
}

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll('.actions .btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    // Default View
    switchView('soa');
});
