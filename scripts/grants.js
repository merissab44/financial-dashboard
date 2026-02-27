let allGrants = []; // Store grants in memory for quick filtering

document.addEventListener("DOMContentLoaded", () => {
    
    // Fetch the Grants JSON
    fetch('./data/grants.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            allGrants = data.grants;
            
            // Populate the Total Committed KPI
            const totalEl = document.getElementById('total-committed');
            if(totalEl) {
                totalEl.innerText = formatCurrency(data.summary.total_committed);
            }

            // Initial render of the table
            renderGrantsTable("All");
        })
        .catch(error => {
            console.error("Error loading grants:", error);
            document.getElementById('grants-table-body').innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Failed to load grant data.</td></tr>`;
        });

    // Listen for Dropdown Changes
    const filterSelect = document.getElementById('grantee-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            renderGrantsTable(e.target.value);
        });
    }
});

// --- Table Builder Logic ---
function renderGrantsTable(filterValue) {
    const tbody = document.getElementById('grants-table-body');
    if (!tbody) return;

    let html = "";

    // Filter the array based on the dropdown selection
    const filteredGrants = allGrants.filter(grant => {
        if (filterValue === "All") return true;
        // Uses includes() to catch variations like "Roots" matching "Roots (UpTogether)"
        return grant.grantee.includes(filterValue);
    });

    if (filteredGrants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color:#64748b;">No grants found for this selection.</td></tr>`;
        return;
    }

    // Build the rows
    filteredGrants.forEach(g => {
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-weight: 600; color: #0f172a;">${g.funder}</td>
                <td style="padding: 12px; color: #475569;">${g.grantee}</td>
                <td style="padding: 12px; color: #475569;"><span style="background:#e2e8f0; padding:3px 8px; border-radius:12px; font-size:0.8rem;">${g.restriction}</span></td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(g.total)}</td>
                <td style="padding: 12px; text-align: right; color: #64748b;">${formatCurrency(g.y24_25)}</td>
                <td style="padding: 12px; text-align: right; color: #64748b;">${formatCurrency(g.y25_26)}</td>
                <td style="padding: 12px; text-align: right; color: #64748b;">${formatCurrency(g.y26_27)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// --- Utility: Currency Formatter ---
function formatCurrency(value) {
    if (!Number.isFinite(value) || value === 0) return "—";
    return "$" + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}