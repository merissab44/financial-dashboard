document.addEventListener("DOMContentLoaded", () => {
    // Listen for the new Audited Financials CSV Upload
    const auditUploadBtn = document.getElementById('submitAuditBtn');
    if (auditUploadBtn) {
        auditUploadBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('auditedFinancialsCsv');
            if (fileInput.files.length === 0) {
                alert("Please select the Audited Financials CSV.");
                return;
            }
            const file = fileInput.files;
            const reader = new FileReader();
            reader.onload = (e) => processAuditedFinancials(e.target.result);
            reader.readAsText(file);
        });
    }

    // Master filter listener
    document.getElementById('org-filter')?.addEventListener('change', renderThreeViews);
});

// ==========================================
// 1. THE AUDITED FINANCIALS PARSER
// ==========================================
function processAuditedFinancials(csv) {
    const rows = csv.split('\n');
    const parsedData = [];

    rows.forEach((row, index) => {
        if (index === 0 || !row.trim()) return; // Skip headers
        
        let cols = row.split(','); 
        if (cols.length < 5) return;

        parsedData.push({
            org: cols.trim(),
            statementType: cols[3].trim(), // "Statement of Activities", "Financial Position", "Functional Expenses"
            category: cols[4].trim(),      // "Revenue", "Assets", "Program Services"
            lineItem: cols[5].trim(),
            amount: parseFloat(cols[6].trim()) || 0
        });
    });

    // Save to local storage for database-free retrieval
    localStorage.setItem('riseEastAuditedData', JSON.stringify(parsedData));
    alert("Audited Financials Successfully Processed!");
    renderThreeViews();
}

// ==========================================
// 2. THE 3-VIEW RENDERING ENGINE
// ==========================================
function renderThreeViews() {
    const rawData = localStorage.getItem('riseEastAuditedData');
    if (!rawData) return;

    const masterData = JSON.parse(rawData);
    const selectedOrg = document.getElementById('org-filter').value;
    
    // Filter by Organization
    const activeData = selectedOrg === "ALL" 
        ? masterData 
        : masterData.filter(row => row.org === selectedOrg);

    // Initialize Aggregation Buckets
    const financials = {
        activities: { revenue: 0, expenses: 0 },
        position: { assets: 0, liabilities: 0, netAssets: 0 },
        functional: { program: 0, admin: 0, fundraising: 0 }
    };

    // Aggregate Data into the 3 Views
    activeData.forEach(row => {
        // View 1: Statement of Activities
        if (row.statementType === "Statement of Activities") {
            if (row.category === "Revenue") financials.activities.revenue += row.amount;
            if (row.category === "Expenses") financials.activities.expenses += row.amount;
        }
        // View 2: Financial Position
        if (row.statementType === "Financial Position") {
            if (row.category === "Assets") financials.position.assets += row.amount;
            if (row.category === "Liabilities") financials.position.liabilities += row.amount;
            if (row.category === "Net Assets") financials.position.netAssets += row.amount;
        }
        // View 3: Functional Expenses
        if (row.statementType === "Functional Expenses") {
            if (row.category === "Program Services") financials.functional.program += row.amount;
            if (row.category === "Management & General") financials.functional.admin += row.amount;
            if (row.category === "Fundraising") financials.functional.fundraising += row.amount;
        }
    });

    // Rise East Master Budget Baselines (Consortium Level)
    // Based on the 2023-2029 Projected Budgets
    const budgets = {
        revenue: 100019000,
        expenses: 100000000,
        assets: 100000000, // Placeholder for target capitalization
        program: 75000000, // Target 75% program efficiency
        admin: 15000000,
        fundraising: 10000000
    };

    // Render the UI
    injectTableHTML('activities-body', [
        { label: "Total Revenue & Support", budget: budgets.revenue, actual: financials.activities.revenue },
        { label: "Total Expenses", budget: budgets.expenses, actual: financials.activities.expenses }
    ]);

    injectTableHTML('position-body', [
        { label: "Total Assets", budget: budgets.assets, actual: financials.position.assets },
        { label: "Total Liabilities", budget: null, actual: financials.position.liabilities },
        { label: "Total Net Assets", budget: null, actual: financials.position.netAssets }
    ]);

    injectTableHTML('functional-body', [
        { label: "Program Services", budget: budgets.program, actual: financials.functional.program },
        { label: "Management & General", budget: budgets.admin, actual: financials.functional.admin },
        { label: "Fundraising", budget: budgets.fundraising, actual: financials.functional.fundraising }
    ]);
}

// ==========================================
// 3. UI INJECTION & VARIANCE MATH
// ==========================================
function injectTableHTML(tableId, rowDataArray) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    let html = "";
    rowDataArray.forEach(row => {
        let varianceText = "—";
        let varianceColor = "#475569"; // Neutral

        // Calculate Variance if a budget exists
        if (row.budget !== null) {
            const variance = row.actual - row.budget;
            varianceText = formatCurrency(variance);
            // Red if negative variance (underperforming), Green if positive
            varianceColor = variance >= 0 ? '#059669' : '#dc2626'; 
        }

        html += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${row.label}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${row.budget ? formatCurrency(row.budget) : "N/A"}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(row.actual)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${varianceColor}; font-weight: bold;">
                    ${varianceText}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function formatCurrency(v) {
    if (!Number.isFinite(v)) return "—";
    return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
}