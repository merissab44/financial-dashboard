let areaData = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch the Investment Areas JSON
    fetch('./data/investment_areas.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            areaData = data;
            
            // Render the default view (Area 1)
            renderAreaView("1");
        })
        .catch(error => {
            console.error("Error loading investment areas:", error);
            document.getElementById('area-table-body').innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Failed to load data.</td></tr>`;
        });

    // 2. Listen for Dropdown Changes
    const filterSelect = document.getElementById('area-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            renderAreaView(e.target.value);
        });
    }
});

// --- Main Rendering Logic ---
function renderAreaView(areaId) {
    if (!areaData || !areaData[areaId]) return;

    const data = areaData[areaId];

    // 1. Update KPI Cards
    document.getElementById('area-rev').innerText = formatCurrency(data.kpis.y2_revenue);
    document.getElementById('area-exp').innerText = formatCurrency(data.kpis.y2_expenses);
    
    // Format Gap/Surplus (Negative is a gap, Positive is surplus)
    const gapEl = document.getElementById('area-gap');
    gapEl.innerText = formatCurrency(data.kpis.y2_gap);
    gapEl.style.color = data.kpis.y2_gap >= 0 ? '#059669' : '#dc2626';

    // 2. Update Table Title
    document.getElementById('area-table-title').innerText = `${data.name} - Budget Breakdown`;

    // 3. Build the Table Rows
    const tbody = document.getElementById('area-table-body');
    let html = "";
    
    let totalY1Budget = 0;
    let totalY1Actual = 0;
    let totalY2Budget = 0;

    data.details.forEach(row => {
        totalY1Budget += row.y1_budget;
        totalY1Actual += row.y1_actual;
        totalY2Budget += row.y2_budget;

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; color: #475569; font-weight: 500;">${row.category}</td>
                <td style="padding: 12px; text-align: right; color: #64748b;">${formatCurrency(row.y1_budget)}</td>
                <td style="padding: 12px; text-align: right; color: #64748b;">${formatCurrency(row.y1_actual)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #0f172a; background: #f8fafc;">${formatCurrency(row.y2_budget)}</td>
            </tr>
        `;
    });

    // Add Grand Total Row at the bottom
    html += `
        <tr style="background: #e2e8f0; font-weight: 700; color: #0f172a;">
            <td style="padding: 12px;">Total Program Spend</td>
            <td style="padding: 12px; text-align: right;">${formatCurrency(totalY1Budget)}</td>
            <td style="padding: 12px; text-align: right;">${formatCurrency(totalY1Actual)}</td>
            <td style="padding: 12px; text-align: right; color: #2563eb;">${formatCurrency(totalY2Budget)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// --- Utility: Currency Formatter ---
function formatCurrency(value) {
    if (!Number.isFinite(value) || value === 0) return "$0";
    return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}