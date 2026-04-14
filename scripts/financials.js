document.addEventListener("DOMContentLoaded", () => {
    // 1. Listen for Fiscal Year filter changes to recalculate the table
    document.getElementById('fin-fy-filter')?.addEventListener('change', () => {
        const activeBtn = document.querySelector('.sub-nav-btn.active');
        if (activeBtn) {
            // Extract the view name from the onclick attribute and re-render
            const viewName = activeBtn.getAttribute('onclick').match(/'([^']+)'/)[2];
            switchFinancialView(viewName);
        }
    });

    // 2. Initialize the default view (Statement of Activities)
    switchFinancialView('activities');
});

function switchFinancialView(viewName) {
    // 1. Update the UI Sub-Navigation Pills
    const buttons = document.querySelectorAll('.sub-nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(viewName)) {
            btn.classList.add('active');
        }
    });

    // 2. Prep the Table Body
    const tbody = document.getElementById('financial-table-body');
    tbody.innerHTML = ''; 

    // 3. Fetch the Golden Record Data from Local Cache
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads'));
    if (!historyCache || historyCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" style="text-align: center; padding: 40px; color: #94a3b8;">
            <em>No financial data cached yet. Please upload source documents.</em></td></tr>`;
        return;
    }

    const selectedFY = document.getElementById('fin-fy-filter')?.value || "2024";
    
    // Filter uploads to match the selected Fiscal Year
    const fyData = historyCache.filter(upload => upload.period.includes(selectedFY));

    // Define the specific line items to render based on the active sub-tab
    let lineItems = [];
    if (viewName === 'activities') {
        lineItems = ['Total Support & Revenue', 'Total Expenses', 'Change in Net Assets'];
    } else if (viewName === 'position') {
        lineItems = ['Total Assets', 'Total Liabilities', 'Net Assets'];
    } else if (viewName === 'functional') {
        lineItems = ['Program Services', 'Management & General', 'Fundraising'];
    }

    // 4. Generate the 16-Column Rows
    lineItems.forEach(item => {
        // Extract data for each org
        const bczData = extractOrgData(fyData, 'BCZ', item);
        const rootsData = extractOrgData(fyData, 'Roots', item);
        const eoydcData = extractOrgData(fyData, 'EOYDC', item);
        const boenData = extractOrgData(fyData, 'BOEN', item);

        // Append the compiled row to the table
        tbody.innerHTML += buildFinancialRow(item, bczData, rootsData, eoydcData, boenData);
    });
}

// ==========================================
// ENGINE HELPER FUNCTIONS
// ==========================================

// Helper 1: Scans the cache for an org's specific financial bucket
function extractOrgData(fyData, orgName, category) {
    const orgUpload = fyData.find(u => u.org === orgName);
    let actualValue = 0;

    if (orgUpload) {
        orgUpload.data.forEach(row => {
            const cat = row.category.toLowerCase();
            const group = row.group.toLowerCase();
            const lookup = category.toLowerCase();
            
            // Basic semantic routing based on the requested line item
            if (lookup.includes('revenue') && cat.includes('revenue')) actualValue += row.amount;
            else if (lookup.includes('expenses') && cat.includes('expense')) actualValue += row.amount;
            else if (lookup.includes('assets') && !lookup.includes('net') && cat.includes('asset') && !cat.includes('net')) actualValue += row.amount;
            else if (lookup.includes('liabilities') && cat.includes('liability')) actualValue += row.amount;
            else if (lookup.includes('program') && group.includes('program')) actualValue += row.amount;
            else if (lookup.includes('management') && (group.includes('management') || group.includes('admin'))) actualValue += row.amount;
            else if (lookup.includes('fundraising') && group.includes('fundraising')) actualValue += row.amount;
        });
    }

    // NOTE: Because we do not have an approved budget CSV upload yet, 
    // we are simulating a standard 5% budget variance for the prototype.
    const budgetValue = actualValue > 0 ? actualValue * 0.95 : 0; 

    return {
        bgt: budgetValue,
        act: actualValue,
        var: actualValue - budgetValue // Variance = Actual - Budget
    };
}

// Helper 2: Constructs the complex 16-column HTML string with Variance Math
function buildFinancialRow(title, bcz, roots, eoydc, boen) {
    // Calculate Consolidated Totals
    const totalBgt = bcz.bgt + roots.bgt + eoydc.bgt + boen.bgt;
    const totalAct = bcz.act + roots.act + eoydc.act + boen.act;
    const totalVar = bcz.var + roots.var + eoydc.var + boen.var;

    // Formatting helper to handle zeros and currency
    const format = (val) => {
        if (val === 0 || isNaN(val)) return '--';
        return (val < 0 ? '-$' : '$') + Math.abs(Math.round(val)).toLocaleString();
    };

    return `
    <tr>
        <td style="text-align: left; font-weight: 600; color: #0f172a;">${title}</td>
        
        <td>${format(bcz.bgt)}</td><td>${format(bcz.act)}</td><td style="color: #64748b;">${format(bcz.var)}</td>
        <td>${format(roots.bgt)}</td><td>${format(roots.act)}</td><td style="color: #64748b;">${format(roots.var)}</td>
        <td>${format(eoydc.bgt)}</td><td>${format(eoydc.act)}</td><td style="color: #64748b;">${format(eoydc.var)}</td>
        <td>${format(boen.bgt)}</td><td>${format(boen.act)}</td><td style="color: #64748b;">${format(boen.var)}</td>
        
        <td class="highlight-col" style="font-weight: bold;">${format(totalBgt)}</td>
        <td class="highlight-col" style="font-weight: bold;">${format(totalAct)}</td>
        <td class="highlight-col" style="font-weight: bold; color: ${totalVar > 0 ? '#059669' : '#dc2626'};">${format(totalVar)}</td>
    </tr>
    `;
}
