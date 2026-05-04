let trajChartInstance = null;
let allocChartInstance = null;
let divChartInstance = null;
let dialLiqInstance = null;
let dialDebtInstance = null;
let dialResInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Listen for background sync events from the Resources Upload page
    window.addEventListener('storage', window.updatePerformanceDials);
    
    // 2. Run an initial check to populate data when the page loads
    window.updatePerformanceDials();
});

// Trigger the update when the dropdown is changed
document.getElementById('perf-org-filter')?.addEventListener('change', window.updatePerformanceDials);

window.updatePerformanceDials = function() {
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads'));
    
    console.log("updatePerformanceDials called, historyCache:", historyCache);
    
    if (!historyCache || historyCache.length === 0) {
        console.log("No financial data cached yet.");
        resetDialsToBlank();
        return;
    }

    const filterElement = document.getElementById('perf-org-filter');
    const selectedOrg = filterElement ? filterElement.value : "ALL";

    // --- DYNAMIC HEADER LOGIC ---
    const titleElement = document.getElementById('dashboard-title');
    if (titleElement) {
        if (selectedOrg === "ALL") {
            titleElement.innerText = "$1 Billion Consortium Dashboard";
            titleElement.style.color = "#0f172a";
        } else {
            const orgName = filterElement.options[filterElement.selectedIndex].text;
            titleElement.innerText = `${orgName} Dashboard`;
            titleElement.style.color = "#aa8b64";
        }
    }

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

    console.log("Processing data array:", data);
    
    data.forEach((row, index) => {
        const amt = row.amount;
        const group = row.group.toLowerCase();
        const category = row.category.toLowerCase();
        
        console.log(`Row ${index}: amount=${amt}, group="${group}", category="${category}"`);

        if (group.includes('cash')) cash += amt;
        else if (group.includes('receivable')) ar += amt;
        else if (group.includes('other current asset') || group.includes('prepaid')) otherCurrentAssets += amt;
        else if (group.includes('fixed') || group.includes('property')) fixedAssets += amt;
        
        else if (group.includes('payable')) ap += amt;
        else if (group.includes('accrued')) accruedLiabilities += amt;
        else if (group.includes('long term') || group.includes('loan')) longTermDebt += amt;

        else if (group.includes('net asset')) netAssets += amt;

        else if (row.category.toLowerCase().includes('revenue')) {
            totalRevenue += amt;
            revenueStreams.push(amt);
            if (group.includes('contribution') || group.includes('grant')) {
                totalContributions += amt;
            }
        }

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
    // 2. CALCULATE THE RATIOS
    // ==========================================
    console.log("Financial buckets:", {
        currentAssets, totalAssets, currentLiabilities, totalLiabilities,
        netAssets, totalRevenue, totalContributions,
        programExp, adminExp, fundExp, totalExpenses
    });

    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
    const operatingReserveMonths = totalExpenses > 0 ? (netAssets / (totalExpenses / 12)) : 0;

    const programExpRatio = totalExpenses > 0 ? (programExp / totalExpenses) : 0;
    const adminExpRatio = totalExpenses > 0 ? (adminExp / totalExpenses) : 0;
    const fundraisingEfficiency = totalContributions > 0 ? (fundExp / totalContributions) : 0;

    console.log("Calculated ratios:", {
        currentRatio, debtRatio, operatingReserveMonths,
        programExpRatio, adminExpRatio, fundraisingEfficiency
    });

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
    
    // Draw the Dials
    dialLiqInstance = createGaugeDial('dial-liquidity', dialLiqInstance, currentRatio, 3.0, currentRatio >= 1.0, currentRatio.toFixed(2) + "x");
    dialDebtInstance = createGaugeDial('dial-debt', dialDebtInstance, debtRatio * 100, 100, debtRatio <= 0.40, (debtRatio * 100).toFixed(1) + "%");
    dialResInstance = createGaugeDial('dial-reserve', dialResInstance, operatingReserveMonths, 12, operatingReserveMonths >= 3.0, operatingReserveMonths.toFixed(1) + " Mo");
    
    // Animate the Progress Bars
    const progPct = (programExpRatio * 100).toFixed(1);
    const adminPct = (adminExpRatio * 100).toFixed(1);
    const fundPct = (fundraisingEfficiency * 100).toFixed(1);

    if (document.getElementById('bar-prog')) document.getElementById('bar-prog').style.width = progPct + '%';
    if (document.getElementById('bar-admin')) document.getElementById('bar-admin').style.width = adminPct + '%';
    if (document.getElementById('bar-fund')) document.getElementById('bar-fund').style.width = fundPct + '%';

    if (document.getElementById('text-efficiency-prog')) document.getElementById('text-efficiency-prog').innerText = `${progPct}% Prog / ${adminPct}% Admin`;
    if (document.getElementById('text-efficiency-fund')) document.getElementById('text-efficiency-fund').innerText = `${fundPct}%`;

    // Diversity Ratios
    updateColoredUIElement('ratio-diversity', revenueDiversityCount + " Streams", revenueDiversityCount >= 3);
    updateNeutralUIElement('ratio-hhi', hhi.toFixed(0) + " pts");
    updateNeutralUIElement('ratio-ar-aging', "Requires Sub-ledger");
    updateNeutralUIElement('ratio-ap-aging', "Requires Sub-ledger");

    // Render the bottom visual analytics
    renderGraphs(historyCache, selectedOrg, programExp, adminExp, fundExp, revenueStreams);
}

// ==========================================
// UI HELPER FUNCTIONS & CHART ENGINES
// ==========================================

function createGaugeDial(canvasId, chartInstance, value, maxVal, isHealthy, valueText) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return chartInstance; 

    if (chartInstance) chartInstance.destroy();
    
    const visualValue = Math.min(value, maxVal); 
    const remainder = Math.max(maxVal - visualValue, 0);
    const color = isHealthy ? '#059669' : '#dc2626'; 

    const ctx = canvas.getContext('2d');
    const newChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [visualValue, remainder],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0,
                borderRadius: 5
            }]
        },
        options: {
            rotation: 270, 
            circumference: 180, 
            cutout: '75%', 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });

    const textEl = document.getElementById(canvasId.replace('dial-', 'text-'));
    if (textEl) {
        textEl.innerText = valueText;
        textEl.style.color = color;
    }
    return newChart;
}

function updateColoredUIElement(elementId, value, isHealthy) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = value;
        el.style.color = isHealthy ? '#059669' : '#dc2626'; 
    }
}

function updateNeutralUIElement(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = value;
        el.style.color = '#0f172a'; 
    }
}

function resetDialsToBlank() { 
    // Clear text elements
    document.querySelectorAll('.metric-value, [id^="text-"]').forEach(el => {
        el.innerText = '--';
        el.style.color = '#0f172a';
    }); 
    // Clear progress bars
    document.querySelectorAll('[id^="bar-"]').forEach(el => el.style.width = '0%');
    
    // Clear gauge dials
    if (dialLiqInstance) dialLiqInstance.destroy();
    if (dialDebtInstance) dialDebtInstance.destroy();
    if (dialResInstance) dialResInstance.destroy();
}

function renderGraphs(historyCache, selectedOrg, programExp, adminExp, fundExp, revenueStreams) {
    if (trajChartInstance) trajChartInstance.destroy();
    if (allocChartInstance) allocChartInstance.destroy();
    if (divChartInstance) divChartInstance.destroy();

    const trajCanvas = document.getElementById('trajectoryChart');
    const allocCanvas = document.getElementById('allocationChart');
    const divCanvas = document.getElementById('diversityChart');

    if (!trajCanvas || !allocCanvas || !divCanvas) return;

    const orgUploads = selectedOrg === "ALL" ? historyCache : historyCache.filter(u => u.org === selectedOrg);
    const periods = [...new Set(orgUploads.map(u => u.period))].sort(); 
    const revTrend = [];
    const expTrend = [];

    periods.forEach(p => {
        const uploadsInPeriod = orgUploads.filter(u => u.period === p);
        let pRev = 0, pExp = 0;
        uploadsInPeriod.forEach(upload => {
            upload.data.forEach(row => {
                const cat = row.category.toLowerCase();
                if (cat.includes('revenue')) pRev += row.amount;
                if (cat.includes('expense')) pExp += row.amount;
            });
        });
        revTrend.push(pRev);
        expTrend.push(pExp);
    });

    trajChartInstance = new Chart(trajCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: periods,
            datasets: [
                { label: 'Total Revenue', data: revTrend, borderColor: '#0284c7', backgroundColor: '#0284c7', tension: 0.4 },
                { label: 'Total Expenses', data: expTrend, borderColor: '#0f172a', backgroundColor: '#0f172a', tension: 0.4 }
            ]
        }
    });

    allocChartInstance = new Chart(allocCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Program Services', 'Management & General', 'Fundraising'],
            datasets: [{
                data: [programExp, adminExp, fundExp],
                backgroundColor: ['#0284c7', '#94a3b8', '#0d9488'] 
            }]
        }
    });

    const divLabels = revenueStreams.map((_, i) => `Stream ${i + 1}`);
    divChartInstance = new Chart(divCanvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: divLabels,
            datasets: [{
                data: revenueStreams,
                backgroundColor: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']
            }]
        }
    });
}