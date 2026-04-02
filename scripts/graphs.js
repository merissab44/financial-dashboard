document.addEventListener("DOMContentLoaded", () => {
    // 1. Listen for background sync events from the Resources Upload page
    window.addEventListener('storage', updatePerformanceDials);
    
    // 2. Run an initial check to populate data when the page loads
    updatePerformanceDials();
});

// Make sure the dropdown triggers the update when changed
document.getElementById('perf-org-filter')?.addEventListener('change', updatePerformanceDials);

function updatePerformanceDials() {
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads'));
    
    if (!historyCache || historyCache.length === 0) {
        console.log("No financial data cached yet.");
        return;
    }

    const filterElement = document.getElementById('perf-org-filter');
    const selectedOrg = filterElement ? filterElement.value : "ALL";
    let data = [];

    if (selectedOrg === "ALL") {
        // CONSOLIDATED VIEW: Merge every line item from all cached uploads together
        data = historyCache.flatMap(upload => upload.data);
    } else {
        // INDIVIDUAL VIEW: Find the most recent upload for the selected organization
        const orgUploads = historyCache.filter(upload => upload.org === selectedOrg);
        if (orgUploads.length === 0) {
            resetDialsToBlank();
            return;
        }
        // Grab the data from the most recent upload for this specific org
        let latestOrgUpload = orgUploads.shift(); 
        data = latestOrgUpload.data; 
    }

    // ==========================================
    // 1. EXTRACT AGGREGATED BUCKETS
    // ==========================================
    let cash = 0, ar = 0, otherCurrentAssets = 0, fixedAssets = 0;
    let ap = 0, accruedLiabilities = 0, longTermDebt = 0;
    let netAssets = 0;
    let revenueStreams = [];
    let totalRevenue = 0, totalContributions = 0;
    let programExp = 0, adminExp = 0, fundExp = 0;

    data.forEach(row => {
        const amt = row.amount;
        const group = row.group.toLowerCase();

        // Assets
        if (group.includes('cash')) cash += amt;
        else if (group.includes('receivable')) ar += amt;
        else if (group.includes('other current asset') || group.includes('prepaid')) otherCurrentAssets += amt;
        else if (group.includes('fixed') || group.includes('property')) fixedAssets += amt;
        
        // Liabilities
        else if (group.includes('payable')) ap += amt;
        else if (group.includes('accrued')) accruedLiabilities += amt;
        else if (group.includes('long term') || group.includes('loan')) longTermDebt += amt;

        // Equity
        else if (group.includes('net asset')) netAssets += amt;

        // Revenue
        else if (row.category.toLowerCase().includes('revenue')) {
            totalRevenue += amt;
            revenueStreams.push(amt);
            if (group.includes('contribution') || group.includes('grant')) {
                totalContributions += amt;
            }
        }

        // Expenses
        else if (group.includes('program')) programExp += amt;
        else if (group.includes('management') || group.includes('general') || group.includes('admin')) adminExp += amt;
        else if (group.includes('fundraising')) fundExp += amt;
    });

    const currentAssets = cash + ar + otherCurrentAssets;
    const currentLiabilities = ap + accruedLiabilities;
    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = currentLiabilities + longTermDebt;
    const totalExpenses = programExp + adminExp + fundExp;

    // ==========================================
    // 2. CALCULATE THE 11 RATIOS
    // ==========================================
    
    // Liquidity & Solvency Ratios
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0;
    const quickRatio = currentLiabilities > 0 ? ((cash + ar) / currentLiabilities) : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
    const operatingReserveMonths = totalExpenses > 0 ? (netAssets / (totalExpenses / 12)) : 0;

    // Efficiency Ratios
    const programExpRatio = totalExpenses > 0 ? (programExp / totalExpenses) : 0;
    const adminExpRatio = totalExpenses > 0 ? (adminExp / totalExpenses) : 0;
    const fundraisingEfficiency = totalContributions > 0 ? (fundExp / totalContributions) : 0;

    // Diversity Ratios (HHI & Revenue Diversity)
    let hhi = 0;
    if (totalRevenue > 0) {
        revenueStreams.forEach(stream => {
            const marketShare = (stream / totalRevenue) * 100;
            hhi += Math.pow(marketShare, 2);
        });
    }
    const revenueDiversityCount = revenueStreams.filter(s => s > 0).length;

    // ==========================================
    // 3. RENDER TO THE UI
    // ==========================================
    updateUIElement('ratio-current', currentRatio.toFixed(2) + "x");
    updateUIElement('ratio-quick', quickRatio.toFixed(2) + "x");
    updateUIElement('ratio-debt', (debtRatio * 100).toFixed(1) + "%");
    updateUIElement('ratio-reserve', operatingReserveMonths.toFixed(1) + " Months");
    
    updateUIElement('ratio-program', (programExpRatio * 100).toFixed(1) + "%");
    updateUIElement('ratio-admin', (adminExpRatio * 100).toFixed(1) + "%");
    updateUIElement('ratio-fundraising', (fundraisingEfficiency * 100).toFixed(1) + "%");
    
    updateUIElement('ratio-diversity', revenueDiversityCount + " Streams");
    updateUIElement('ratio-hhi', hhi.toFixed(0) + " pts");
    
    updateUIElement('ratio-ar-aging', "Requires Sub-ledger");
    updateUIElement('ratio-ap-aging', "Requires Sub-ledger");
}

// Helper: Safely injects the calculated values into the HTML cards
function updateUIElement(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = value;
        // Quick visual flash to show the data updated in real-time
        el.style.color = '#059669'; 
        setTimeout(() => el.style.color = '#0f172a', 1500); 
    }
}

// Helper: Clears the dials if an organization hasn't uploaded data yet
function resetDialsToBlank() { 
    document.querySelectorAll('.metric-value').forEach(el => el.innerText = '--'); 
}