// =========================================================
// 0. MAIN NAVIGATION LOGIC (Top Menu)
// =========================================================
function showMainTab(tabId) {
    console.log('showMainTab called with:', tabId);
    
    const tabs = document.querySelectorAll('.main-tab-content');
    tabs.forEach(tab => tab.style.display = 'none');
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
        console.log('Tab shown:', tabId);
    } else {
        console.error('Tab not found:', tabId);
    }
    
    // Update button highlighting
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the correct button
    const targetButton = document.querySelector(`[onclick="switchMainTab('${tabId}')"]`);
    if (targetButton) {
        targetButton.classList.add('active');
        console.log('Button activated for tab:', tabId);
    } else {
        console.error('Button not found for tab:', tabId);
    }
    
    // Load crosswalk data if this is the crosswalk tab
    if (tabId === 'tab-crosswalk') {
        console.log('Crosswalk tab activated, loading Excel data...');
        loadCrosswalkData();
    }
    
    // Save the active tab to localStorage
    localStorage.setItem('activeMainTab', tabId);
    console.log('Saved tab to localStorage:', tabId);
}

function switchMainTab(tabId) {
    // Update button states
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the clicked button
    const clickedButton = document.querySelector(`[onclick="switchMainTab('${tabId}')"]`);
    if (clickedButton) clickedButton.classList.add('active');
    
    // Hide crosswalk loading when switching away from crosswalk tab
    if (tabId !== 'tab-crosswalk') {
        const loadingDiv = document.getElementById('crosswalk-loading');
        const contentDiv = document.getElementById('crosswalk-content');
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'none';
    }
    
    // Switch the tab content
    showMainTab(tabId);
    
    // Re-apply fiscal year filter if on financials tab
    if (tabId === 'tab-financials') {
        const fyFilter = document.getElementById('fin-fy-filter');
        if (fyFilter) {
            updateFinancialDataForFiscalYear(fyFilter.value);
        }
    }
    
    // Load Excel data if switching to crosswalk tab
    if (tabId === 'tab-crosswalk') {
        loadCrosswalkData();
    }
}

// =========================================================
// 1. CONSOLIDATED FINANCIAL DATA ARRAYS
// =========================================================
const statementOfActivitiesData = [
    { account: "Total Consolidated Revenue", budget: 15300146, actual: 44686465, isHeader: true },
    { account: "Total Consolidated Expenses", budget: 15300146, actual: 37699779, isHeader: true },
    { account: "Expenses: Black Cultural Zone (BCZ)", budget: 5966236, actual: 5285990, isHeader: false },
    { account: "Expenses: Roots Community Health", budget: 4257188, actual: 27737381, isHeader: false },
    { account: "Expenses: East Oakland Youth Dev (EOYDC)", budget: 827500, actual: 4676408, isHeader: false },
    { account: "Expenses: Brotherhood of Elders (BOEN)", budget: 2861200, actual: 0, isHeader: false },
    { account: "Expenses: Oakland Thrives (Backbone)", budget: 1388022, actual: 0, isHeader: false }
];

const financialPositionData = [
    { account: "Total Consolidated Assets", budget: 0, actual: 41237624, isHeader: true },
    { account: "Assets: Roots Community Health", budget: 0, actual: 28578350, isHeader: false },
    { account: "Assets: Black Cultural Zone (BCZ)", budget: 0, actual: 9876405, isHeader: false },
    { account: "Assets: East Oakland Youth Dev (EOYDC)", budget: 0, actual: 2782869, isHeader: false },
    { account: "Assets: Brotherhood of Elders (BOEN)", budget: 0, actual: 0, isHeader: false },
    { account: "Total Consolidated Liabilities", budget: 0, actual: 13143915, isHeader: true },
    { account: "Liabilities: Roots Community Health", budget: 0, actual: 10654444, isHeader: false },
    { account: "Liabilities: Black Cultural Zone (BCZ)", budget: 0, actual: 1868137, isHeader: false },
    { account: "Liabilities: East Oakland Youth Dev (EOYDC)", budget: 0, actual: 621334, isHeader: false },
    { account: "Liabilities: Brotherhood of Elders (BOEN)", budget: 0, actual: 0, isHeader: false },
    { account: "Total Consolidated Net Assets", budget: 0, actual: 28093709, isHeader: true }
];

const functionalExpensesData = [
    { account: "Total Consolidated Program Services", budget: 0, actual: 31411952, isHeader: true },
    { account: "Program Services: Roots Community Health", budget: 0, actual: 23228864, isHeader: false },
    { account: "Program Services: Black Cultural Zone (BCZ)", budget: 0, actual: 4212784, isHeader: false },
    { account: "Program Services: East Oakland Youth Dev (EOYDC)", budget: 0, actual: 3970304, isHeader: false },
    { account: "Program Services: Brotherhood of Elders (BOEN)", budget: 0, actual: 0, isHeader: false },
    { account: "Total Consolidated Management & General", budget: 0, actual: 5923370, isHeader: true },
    { account: "M&G: Roots Community Health", budget: 0, actual: 4484895, isHeader: false },
    { account: "M&G: Black Cultural Zone (BCZ)", budget: 0, actual: 990534, isHeader: false },
    { account: "M&G: East Oakland Youth Dev (EOYDC)", budget: 0, actual: 447941, isHeader: false },
    { account: "M&G: Brotherhood of Elders (BOEN)", budget: 0, actual: 0, isHeader: false },
    { account: "M&G: Oakland Thrives (Backbone)", budget: 0, actual: 0, isHeader: false },
    { account: "Total Consolidated Fundraising", budget: 0, actual: 364457, isHeader: true },
    { account: "Fundraising: East Oakland Youth Dev (EOYDC)", budget: 0, actual: 258163, isHeader: false },
    { account: "Fundraising: Black Cultural Zone (BCZ)", budget: 0, actual: 82672, isHeader: false },
    { account: "Fundraising: Roots Community Health", budget: 0, actual: 23622, isHeader: false }
];

// =========================================================
// 2. DYNAMIC TABLE RENDERERS (Clears the Loading Text!)
// =========================================================
function renderFinancialTable(dataArray, tableTitle) {
    let container = document.getElementById('financial-table-body') || document.getElementById('dashboard-content');
    if (!container) return;

    let html = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr class="tier-one-headers" style="border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">
                <th style="text-align: left; padding: 12px; width: 40%; color: #0f172a;">${tableTitle}</th>
                <th style="padding: 12px; width: 20%; color: #0f172a;">2025 Grant Budget</th>
                <th style="padding: 12px; width: 20%; color: #0f172a;">2024 Audited Actuals</th>
                <th style="padding: 12px; width: 20%; color: #0f172a;" class="highlight-col">Variance</th>
            </tr>
    `;

    dataArray.forEach(row => {
        const variance = row.actual - row.budget;
        const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
        
        const rowStyle = row.isHeader ? 'font-weight: 800; background-color: #f1f5f9; color: #0f172a;' : 'color: #475569;';
        
        // Simple logic: negative variance = red (bad), positive variance = green (good)
        let varianceColor = variance >= 0 ? '#059669' : '#dc2626';
        
        const actualDisplay = row.actual === 0 ? '<span style="font-size: 0.8rem; font-style: italic;">Pending</span>' : formatCurrency(row.actual);
        const budgetDisplay = row.budget === 0 ? '--' : formatCurrency(row.budget);
        const varianceDisplay = (row.budget === 0 || row.actual === 0) ? '--' : formatCurrency(variance);

        html += `
            <tr style="${rowStyle}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; text-align: left;">${row.account}</td>
                <td style="padding: 12px; text-align: center;">${budgetDisplay}</td>
                <td style="padding: 12px; text-align: center;">${actualDisplay}</td>
                <td class="highlight-col" style="padding: 12px; text-align: center; color: ${varianceColor} !important; background-color: transparent !important; font-weight: 700;">
                    ${varianceDisplay}
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    container.innerHTML = html;
}

function renderVariancesTable() {
    let container = document.getElementById('financial-table-body') || document.getElementById('dashboard-content');
    if (!container) return;

    let html = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr class="tier-one-headers" style="border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">
                <th style="text-align: left; padding: 12px; width: 35%; color: #0f172a;">Account Category</th>
                <th style="padding: 12px; width: 15%; color: #0f172a;">2025 Budget</th>
                <th style="padding: 12px; width: 15%; color: #0f172a;">2024 Actuals</th>
                <th style="padding: 12px; width: 15%; color: #0f172a;" class="highlight-col">Var ($)</th>
                <th style="padding: 12px; width: 15%; color: #0f172a;" class="highlight-col">Var (%)</th>
            </tr>
    `;

    statementOfActivitiesData.forEach(row => {
        const variance = row.actual - row.budget;
        let varPct = row.budget > 0 ? variance / row.budget : 0;
        
        const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
        const formatPct = (num) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(num);
        
        const rowStyle = row.isHeader ? 'font-weight: 800; background-color: #f1f5f9; color: #0f172a;' : 'color: #475569;';
        
        // Simple logic: negative variance = red (bad), positive variance = green (good)
        let varianceColor = variance >= 0 ? '#059669' : '#dc2626';

        const actualDisplay = row.actual === 0 ? '<span style="font-size: 0.8rem; font-style: italic;">Pending</span>' : formatCurrency(row.actual);
        const budgetDisplay = row.budget === 0 ? '--' : formatCurrency(row.budget);
        const varDisplay = (row.budget === 0 || row.actual === 0) ? '--' : formatCurrency(variance);
        const pctDisplay = (row.budget === 0 || row.actual === 0) ? '--' : formatPct(varPct);

        html += `
            <tr style="${rowStyle}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; text-align: left;">${row.account}</td>
                <td style="padding: 12px; text-align: center;">${budgetDisplay}</td>
                <td style="padding: 12px; text-align: center;">${actualDisplay}</td>
                <td class="highlight-col" style="padding: 12px; text-align: center; color: ${varianceColor} !important; background-color: transparent !important; font-weight: 700;">${varDisplay}</td>
                <td class="highlight-col" style="padding: 12px; text-align: center; color: ${varianceColor} !important; background-color: transparent !important; font-weight: 700;">${pctDisplay}</td>
            </tr>
        `;
    });

    html += `</table>`;
    container.innerHTML = html;
}

// =========================================================
// 3. TAB SWITCHING LOGIC (RESTORED!)
// =========================================================
function switchFinancialView(viewName) {
    // Check if we have a fiscal year filter active
    const fyFilter = document.getElementById('fin-fy-filter');
    const selectedFy = fyFilter ? fyFilter.value : null;
    
    if (selectedFy) {
        // If fiscal year is selected, re-apply the fiscal year filter instead of showing static data
        updateFinancialDataForFiscalYear(selectedFy);
    } else {
        // 2. Render the correct data table based on the view
        if (viewName === 'activities') {
            renderFinancialTable(statementOfActivitiesData, "Consolidated Statement of Activities");
        } else if (viewName === 'position') {
            renderFinancialTable(financialPositionData, "Consolidated Statement of Financial Position");
        } else if (viewName === 'functional') {
            renderFinancialTable(functionalExpensesData, "Consolidated Statement of Functional Expenses");
        } else if (viewName === 'budget') {
            renderVariancesTable();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll('.sub-nav-btn'); 
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            buttons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Get the view type from data-view attribute
            let viewType = e.target.dataset.view;
            switchFinancialView(viewType);
        });
    });

    // Fire the initial load to clear the "Loading Financial Data..." text
    switchFinancialView('activities');
});
// =========================================================
// 4. THE TACTICAL ENGINE & CALCULATION ENGINE
// =========================================================
function runTacticalEngine(nativeAccountName) {
    const nameStr = nativeAccountName.toLowerCase();
    
    if (/salary|wages|stipend/.test(nameStr)) return { ucoa: 6010, category: "Personnel", sub: "Salaries and Wages" };
    if (/airline|flight|hotel|mileage|travel|uber/.test(nameStr)) return { ucoa: 6391, category: "Travel", sub: "Hotels Flights & Registrations" };
    if (/rent|lease|occupancy/.test(nameStr)) return { ucoa: 6250, category: "Facilities", sub: "Rent/Lease" };
    if (/repair|maintenance|cleaning|pest/.test(nameStr)) return { ucoa: 6210, category: "Facilities", sub: "Maintenance and Servicing" };
    if (/legal/.test(nameStr)) return { ucoa: 6150, category: "Professional Services", sub: "Legal" };
    if (/account|bookkeep/.test(nameStr)) return { ucoa: 6130, category: "Professional Services", sub: "Finance & HR Services" };
    if (/food|meal|catering/.test(nameStr)) return { ucoa: 6270, category: "Program Supplies", sub: "Catering, Meals & Other Food Supplies" };
    
    return { ucoa: null, category: "Uncategorized", sub: "Flagged for Crosswalk" };
}

function updatePerformanceDials(parsedData) {
    if (!parsedData || !Array.isArray(parsedData)) {
        console.error("updatePerformanceDials: Invalid data provided", parsedData);
        return;
    }
    
    console.log("updatePerformanceDials called with", parsedData.length, "rows of data");
    
    let currentAssets = 0, totalAssets = 0, currentLiabilities = 0, totalLiabilities = 0;
    let programExpenses = 0, adminExpenses = 0, fundraisingExpenses = 0;

    let currentReceivables = 0; // For quick ratio calculation

    parsedData.forEach((row, index) => {
        const amount = Math.abs(parseFloat(row.amount)) || 0; 
        const category = row.category;
        const nativeName = row.native_account.toLowerCase();
        
        console.log(`Row ${index}: "${nativeName}" -> $${amount} -> ${category}`);

        if (category === 'Assets' || nativeName.includes('cash') || nativeName.includes('bank') || nativeName.includes('asset')) {
            totalAssets += amount;
            currentAssets += amount; 
        } else if (nativeName.includes('receivable') || nativeName.includes('ar') || nativeName.includes('account receivable')) {
            totalAssets += amount;
            currentAssets += amount;
            currentReceivables += amount; // Specifically for quick ratio
        } else if (category === 'Liabilities' || nativeName.includes('payable') || nativeName.includes('loan') || nativeName.includes('credit') || nativeName.includes('liability')) {
            totalLiabilities += amount;
            currentLiabilities += amount;
        } else if (category === 'Professional Services' || nativeName.includes('admin') || nativeName.includes('management')) {
            adminExpenses += amount;
        } else if (category === 'Personnel' || category === 'Travel' || category === 'Facilities' || category === 'Program Supplies' || nativeName.includes('program') || nativeName.includes('expense')) {
            programExpenses += amount;
        }
    });

    const totalExpenses = programExpenses + adminExpenses + fundraisingExpenses;

    console.log("Financial buckets:", {
        currentAssets, totalAssets, currentLiabilities, totalLiabilities,
        programExpenses, adminExpenses, fundraisingExpenses, totalExpenses
    });

    const liquidityRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : (currentAssets > 0 ? 2.5 : 0);
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
    const monthlyBurnRate = totalExpenses / 12;
    const operatingReserve = monthlyBurnRate > 0 ? (currentAssets / monthlyBurnRate) : 0;
    const programRatio = totalExpenses > 0 ? (programExpenses / totalExpenses) : 0;
    const adminRatio = totalExpenses > 0 ? (adminExpenses / totalExpenses) : 0;

    // Calculate quick ratio (cash + receivables) / current liabilities
    const quickRatio = currentLiabilities > 0 ? ((currentAssets - currentReceivables + currentReceivables) / currentLiabilities) : (currentAssets > 0 ? 2.5 : 0);
    // Simplified: (cash + receivables) / current liabilities
    const quickAssets = currentAssets; // Assuming current assets are cash + receivables for now
    const quickRatioCalculated = currentLiabilities > 0 ? (quickAssets / currentLiabilities) : (quickAssets > 0 ? 2.5 : 0);

    console.log("Calculated ratios:", {
        liquidityRatio, quickRatio: quickRatioCalculated, debtRatio, operatingReserve, programRatio, adminRatio,
        currentAssets, currentReceivables, currentLiabilities
    });

    // Cache the dial elements first
    const liquidityText = document.getElementById('text-liquidity');
    const quickText = document.getElementById('text-quick');
    const debtText = document.getElementById('text-debt');
    const reserveText = document.getElementById('text-reserve');
    
    console.log("Cached elements:", {liquidity: !!liquidityText, quick: !!quickText, debt: !!debtText, reserve: !!reserveText});
    
    // Update the dials directly using cached elements
    if (liquidityText) {
        liquidityText.innerText = `${liquidityRatio.toFixed(1)}x`;
        liquidityText.style.color = '#059669';
    }
    if (quickText) {
        quickText.innerText = `${quickRatioCalculated.toFixed(1)}x`;
        quickText.style.color = quickRatioCalculated >= 1.0 ? '#059669' : '#dc2626';
    }
    if (debtText) {
        debtText.innerText = `${(debtRatio * 100).toFixed(1)}%`;
        debtText.style.color = debtRatio > 0.4 ? '#dc2626' : '#059669';
    }
    if (reserveText) {
        reserveText.innerText = `${operatingReserve.toFixed(1)} Months`;
        reserveText.style.color = operatingReserve < 3.0 ? '#dc2626' : '#059669';
    }

    updateProgressBar('program-expense-bar', programRatio, 0.75);
    updateProgressBar('admin-expense-bar', adminRatio, 0.15);
}

function renderDial(elementId, value, target, displayValue) {
    // Debug: Check if the parent tab is still visible
    const dashboardTab = document.getElementById('tab-dashboard');
    console.log(`renderDial: ${elementId} -> dashboard tab visible: ${dashboardTab && dashboardTab.style.display !== 'none'}`);
    
    const textElement = document.getElementById(`${elementId}-text`);
    console.log(`renderDial: ${elementId} -> ${displayValue} (text element found: ${!!textElement})`);
    
    // Debug: List all dial text elements
    if (elementId === 'dial-liquidity') {
        console.log("All dial text elements:", {
            'text-liquidity': !!document.getElementById('text-liquidity'),
            'text-debt': !!document.getElementById('text-debt'), 
            'text-reserve': !!document.getElementById('text-reserve')
        });
    }
    
    if(!textElement) {
        console.error(`Text element not found: ${elementId}-text`);
        return;
    }
    
    let dialColor = '#059669'; 
    if (elementId === 'dial-debt' && value > target) dialColor = '#dc2626'; 
    else if (elementId !== 'dial-debt' && value < target) dialColor = '#dc2626'; 

    textElement.innerText = displayValue;
    textElement.style.color = dialColor;
    console.log(`Updated ${elementId}-text with: ${displayValue}`);
}

function updateProgressBar(elementId, ratio, target) {
    const bar = document.getElementById(elementId);
    const text = document.getElementById(`${elementId}-text`);
    if(!bar || !text) return;
    const percentage = (ratio * 100).toFixed(1);
    bar.style.width = `${percentage}%`;
    text.innerText = `${percentage}%`;
    if (elementId.includes('program') && ratio >= target) bar.style.backgroundColor = '#059669';
    else if (elementId.includes('admin') && ratio <= target) bar.style.backgroundColor = '#059669';
    else bar.style.backgroundColor = '#dc2626';
}

function updateFinancialDataForFiscalYear(selectedFy) {
    // Save the selected fiscal year
    localStorage.setItem('selectedFiscalYear', selectedFy);
    
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    
    console.log(`Looking for data for FY ${selectedFy}`);
    console.log('All uploads:', historyCache.length, 'total');
    historyCache.forEach((upload, index) => {
        console.log(`Upload ${index}: org="${upload.org}", fy=${upload.fiscalYear}, period="${upload.period}"`);
    });
    
    // Find uploads for the selected fiscal year
    const fyUploads = historyCache.filter(upload => upload.fiscalYear == selectedFy);
    
    console.log(`Found ${fyUploads.length} uploads for FY ${selectedFy}`);
    
    if (fyUploads.length === 0) {
        // No data for this fiscal year - show empty tables for all views
        showNoDataForFiscalYear(selectedFy);
        return;
    }
    
    // Use the most recent upload for this fiscal year
    const latestUpload = fyUploads[fyUploads.length - 1];
    
    // Update the financial tables with the data
    if (latestUpload.data && latestUpload.data.length > 0) {
        console.log(`Loading data for FY ${selectedFy}:`, latestUpload.data.length, 'rows');
        
        // Show data availability message
        showDataAvailableForFiscalYear(selectedFy, latestUpload);
    }
}

function showNoDataForFiscalYear(fy) {
    const noDataMessage = `
        <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
            <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
            <h3 style="color: #64748b; margin-bottom: 12px;">No Data Available</h3>
            <p style="color: #94a3b8; font-size: 1rem;">No financial data has been uploaded for Fiscal Year ${fy}</p>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 8px;">Please upload data in the Source Documents tab</p>
        </div>
    `;
    
    // Update all possible financial containers
    const containers = [
        'financial-table-body',
        'dashboard-content',
        'financial-table-head' // Also update the head to prevent old headers from showing
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            if (containerId === 'financial-table-head') {
                container.innerHTML = ''; // Clear the head
            } else {
                container.innerHTML = noDataMessage;
            }
        }
    });
}

function showDataAvailableForFiscalYear(fy, upload) {
    const dataMessage = `
        <div style="text-align: center; padding: 40px 20px; color: #475569;">
            <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
            <h3 style="color: #059669; margin-bottom: 12px;">Data Available for FY ${fy}</h3>
            <p style="color: #475569; font-size: 1rem;">Found ${upload.data.length} records from ${upload.org}</p>
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 8px;">Period: ${upload.period}</p>
        </div>
    `;
    
    // Update all possible financial containers
    const containers = [
        'financial-table-body',
        'dashboard-content',
        'financial-table-head' // Also update the head to prevent old headers from showing
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            if (containerId === 'financial-table-head') {
                container.innerHTML = ''; // Clear the head
            } else {
                container.innerHTML = dataMessage;
            }
        }
    });
}

function populateFiscalYearDropdown(dropdown) {
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    
    // Get all unique fiscal years from uploads
    const fiscalYears = [...new Set(historyCache.map(upload => upload.fiscalYear).filter(fy => fy))];
    
    // Sort fiscal years in descending order
    fiscalYears.sort((a, b) => b - a);
    
    // Add current year and a few future years for planning
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 2; i++) {
        const futureYear = currentYear + i;
        if (!fiscalYears.includes(futureYear)) {
            fiscalYears.push(futureYear);
        }
    }
    
    // Sort again after adding future years
    fiscalYears.sort((a, b) => b - a);
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add options
    fiscalYears.forEach(fy => {
        const option = document.createElement('option');
        option.value = fy;
        option.textContent = `FY ${fy}`;
        dropdown.appendChild(option);
    });
}

function getMostRecentFiscalYearWithData() {
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    
    if (historyCache.length === 0) return null;
    
    // Get all fiscal years with data
    const fiscalYears = [...new Set(historyCache.map(upload => upload.fiscalYear).filter(fy => fy))];
    
    // Return the most recent one
    return fiscalYears.length > 0 ? Math.max(...fiscalYears) : null;
}

function loadCrosswalkData() {
    const loadingDiv = document.getElementById('crosswalk-loading');
    const contentDiv = document.getElementById('crosswalk-content');
    const tableHead = document.getElementById('crosswalk-thead');
    const tableBody = document.getElementById('crosswalk-tbody');
    
    if (!loadingDiv || !contentDiv || !tableHead || !tableBody) return;
    
    // Only show loading if we're on the crosswalk tab
    const crosswalkTab = document.getElementById('tab-crosswalk');
    if (!crosswalkTab || crosswalkTab.style.display === 'none') return;
    
    // Show loading, hide content
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    
    // Load the Excel file
    fetch('./data/Final_UCOA.xlsx')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load Excel file');
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get the first worksheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length === 0) {
                throw new Error('Excel file is empty');
            }
            
            console.log('Excel data loaded:', jsonData.length, 'rows');
            console.log('First 3 rows:', jsonData.slice(0, 3));
            
            // Get headers (first row)
            const headers = jsonData[0];
            console.log('Headers:', headers);
            
            // Find the crosswalk column index - specifically the "Crosswalk" column (not "Crosswalk ID")
            const crosswalkColumnIndex = headers.findIndex(header => 
                typeof header === 'string' && header.toLowerCase() === 'crosswalk'
            );
            
            console.log('Crosswalk column index:', crosswalkColumnIndex);
            console.log('All headers with indices:', headers.map((h, i) => `${i}: "${h}"`));
            
            // If no exact "Crosswalk" column found, try to find any column with FN- prefixes
            if (crosswalkColumnIndex === -1) {
                console.log('No exact "Crosswalk" column found, searching for FN- prefixes...');
                for (let i = 1; i < Math.min(5, jsonData.length); i++) {
                    const row = jsonData[i];
                    if (row) {
                        row.forEach((cell, colIndex) => {
                            if (typeof cell === 'string' && cell.includes('FN-')) {
                                console.log(`Found FN- in column ${colIndex} (${headers[colIndex]}): "${cell}"`);
                            }
                        });
                    }
                }
            }
            
            // Create table headers
            let headerHtml = '<tr>';
            headers.forEach(header => {
                headerHtml += `<th style="padding: 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: left;">${header || ''}</th>`;
            });
            headerHtml += '</tr>';
            tableHead.innerHTML = headerHtml;
            
            // Create table body (skip header row)
            let bodyHtml = '';
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row && row.some(cell => cell !== undefined && cell !== null && cell !== '')) {
                    bodyHtml += '<tr style="border-bottom: 1px solid #e2e8f0;">';
                    headers.forEach((_, index) => {
                        let cellValue = row[index] || '';
                        // Remove full FN-XX: prefix from crosswalk column
                        if (index === crosswalkColumnIndex && typeof cellValue === 'string') {
                            // Remove patterns like "FN-02: ", "FN-123:", "FN-45: " etc.
                            cellValue = cellValue.replace(/^FN-\d+:\s*/i, '');
                            cellValue = cellValue.replace(/^FN-\d+$/i, ''); // For cases like "FN-02" with no colon
                            cellValue = cellValue.replace(/^FN-\s*/i, ''); // Fallback for other FN- patterns
                            
                            // Log for debugging first few rows
                            if (i <= 3) {
                                console.log(`Row ${i}, Col ${index} (${headers[index]}): "${row[index]}" -> "${cellValue}"`);
                            }
                        }
                        bodyHtml += `<td style="padding: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">${cellValue}</td>`;
                    });
                    bodyHtml += '</tr>';
                }
            }
            tableBody.innerHTML = bodyHtml;
            
            // Hide loading, show content
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            
            console.log(`Loaded ${jsonData.length - 1} rows from Excel file`);
        })
        .catch(error => {
            console.error('Error loading Excel file:', error);
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <div style="font-size: 2rem; margin-bottom: 16px;">❌</div>
                    <p>Error loading UCOA Crosswalk data</p>
                    <p style="font-size: 0.9rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        });
}

function renderUploadHistory() {
    const historyBody = document.getElementById('upload-history-body');
    if (!historyBody) return;
    
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    
    if (historyCache.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">
                    No uploads yet
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    historyCache.forEach(upload => {
        const recordsCount = upload.data ? upload.data.length : 0;
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; color: #0f172a; font-weight: 600;">${upload.date}</td>
                <td style="padding: 12px; color: #475569;">${upload.org || 'Unknown Organization'}</td>
                <td style="padding: 12px; color: #475569;">${upload.period || 'N/A'}</td>
                <td style="padding: 12px; color: #475569;">${recordsCount} records</td>
                <td style="padding: 12px; color: #059669; font-weight: 700;">✅ ${upload.status}</td>
            </tr>
        `;
    });
    
    historyBody.innerHTML = html;
}

// =========================================================
// 5. TAB 5: SOURCE DOCUMENTS UPLOAD PORTAL LOGIC
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    // Restore the last active tab on page load
    const lastActiveTab = localStorage.getItem('activeMainTab');
    console.log('Page loaded. Restoring tab:', lastActiveTab);
    console.log('Available tabs:', Array.from(document.querySelectorAll('.main-tab-content')).map(tab => tab.id));
    
    if (lastActiveTab) {
        showMainTab(lastActiveTab);
    } else {
        // Default to dashboard if no saved tab
        console.log('No saved tab, defaulting to dashboard');
        showMainTab('tab-dashboard');
    }

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');

    if (!dropZone) return;

    // Load upload history on page load
    renderUploadHistory();

    // Add fiscal year filter functionality
    const fyFilter = document.getElementById('fin-fy-filter');
    if (fyFilter) {
        // Populate fiscal year dropdown dynamically
        populateFiscalYearDropdown(fyFilter);
        
        // Restore last selected fiscal year
        const lastFy = localStorage.getItem('selectedFiscalYear');
        if (lastFy && fyFilter.querySelector(`option[value="${lastFy}"]`)) {
            fyFilter.value = lastFy;
            updateFinancialDataForFiscalYear(lastFy);
        } else {
            // Default to the most recent fiscal year with data
            const mostRecentFy = getMostRecentFiscalYearWithData();
            if (mostRecentFy) {
                fyFilter.value = mostRecentFy;
                updateFinancialDataForFiscalYear(mostRecentFy);
            }
        }
        
        fyFilter.addEventListener('change', (e) => {
            const selectedFy = e.target.value;
            updateFinancialDataForFiscalYear(selectedFy);
        });
    }

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#ccfbf1';
        dropZone.style.borderColor = '#0f766e';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '#f0fdfa';
        dropZone.style.borderColor = '#0d9488';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#f0fdfa';
        dropZone.style.borderColor = '#0d9488';
        
        const files = e.dataTransfer.files[0];
        if (files.length > 0) {
            processUpload(files); // Explicitly targeting the index 0 file!
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processUpload(e.target.files[0]); // Explicitly targeting the index 0 file!
        }
    });

    function processUpload(file) {
        if (!file || !file.name.endsWith('.csv')) {
            alert('Invalid file format. Please upload a strictly formatted .csv file.');
            return;
        }

        dropZone.style.display = 'none';
        uploadStatus.style.display = 'block';

        const reader = new FileReader();
        reader.onload = function(event) {
            const csvText = event.target.result;
            const rows = csvText.split('\n');
            let parsedCSVArray = [];

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length < 2) continue;

                const fullRowText = rows[i];
                const amountStr = cols[cols.length - 1] || "0";
                const cleanAmount = parseFloat(amountStr.replace(/[^0-9.-]+/g, "")) || 0;

                const routing = runTacticalEngine(fullRowText);

                parsedCSVArray.push({
                    native_account: fullRowText,
                    amount: cleanAmount,
                    financial_category: routing.category,
                    financial_group: routing.sub
                });
            }

            setTimeout(() => {
                const s1 = document.getElementById('step-1');
                if(s1) { s1.innerHTML = '✅ 1. Raw Audited Financials CSV Ingested.'; s1.style.color = '#059669'; }
            }, 1000);

            setTimeout(() => {
                const s2 = document.getElementById('step-2');
                if(s2) { s2.innerHTML = '✅ 2. Routed through Python Tactical Engine (Regex categorized).'; s2.style.color = '#059669'; }
            }, 2500);

            setTimeout(() => {
                const s3 = document.getElementById('step-3');
                if(s3) { s3.innerHTML = '✅ 3. Exceptions resolved via Tab 6 Master Crosswalk.'; s3.style.color = '#059669'; }
            }, 4000);

            setTimeout(() => {
                const s4 = document.getElementById('step-4');
                if(s4) { s4.innerHTML = '✅ 4. Data successfully published to dashboard arrays!'; s4.style.color = '#059669'; }
                if(statusText) statusText.innerHTML = 'Complete';
                
                // Validate organization and period selection first
                const orgSelect = document.getElementById('organization-select');
                const periodInput = document.getElementById('period-input');
                const organizationName = orgSelect && orgSelect.value ? orgSelect.value : null;
                const periodValue = periodInput && periodInput.value ? periodInput.value : null;
                
                if (!organizationName) {
                    if(statusText) statusText.innerHTML = '❌ Please select an organization first';
                    setTimeout(() => {
                        dropZone.style.display = 'block';
                        uploadStatus.style.display = 'none';
                        resetStatusText();
                    }, 2000);
                    return;
                }
                
                if (!periodValue) {
                    if(statusText) statusText.innerHTML = '❌ Please select a reporting period';
                    setTimeout(() => {
                        dropZone.style.display = 'block';
                        uploadStatus.style.display = 'none';
                        resetStatusText();
                    }, 2000);
                    return;
                }
                
                // Extract fiscal year from the period (assuming period is YYYY-MM-DD format)
                const periodDate = new Date(periodValue);
                
                // Validate the date
                if (isNaN(periodDate.getTime())) {
                    console.error('Invalid period date:', periodValue);
                    if(statusText) statusText.innerHTML = '❌ Invalid date format';
                    setTimeout(() => {
                        dropZone.style.display = 'block';
                        uploadStatus.style.display = 'none';
                        resetStatusText();
                    }, 2000);
                    return;
                }
                
                const fiscalYear = periodDate.getMonth() >= 6 ? periodDate.getFullYear() + 1 : periodDate.getFullYear(); // FY starts in July
                
                console.log(`Period: ${periodValue}, Month: ${periodDate.getMonth()}, Calculated Fiscal Year: ${fiscalYear}`);
                
                // Save to localStorage for persistence
                const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
                
                const newUpload = {
                    org: organizationName,
                    period: periodValue,
                    fiscalYear: fiscalYear,
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                    status: 'Processed',
                    data: parsedCSVArray,
                    timestamp: new Date().toISOString()
                };
                
                historyCache.push(newUpload);
                localStorage.setItem('riseEastOrgUploads', JSON.stringify(historyCache));
                
                // Update the history display
                renderUploadHistory();
                
                // Refresh fiscal year dropdown to include new fiscal year
                const fyFilterRefresh = document.getElementById('fin-fy-filter');
                if (fyFilterRefresh) {
                    populateFiscalYearDropdown(fyFilterRefresh);
                    // Select the new fiscal year
                    fyFilterRefresh.value = fiscalYear;
                    updateFinancialDataForFiscalYear(fiscalYear);
                }
                
                if (typeof updatePerformanceDials === "function") {
                    console.log("About to update dashboard with parsed data:", parsedCSVArray.length, "rows");
                    
                    // Update dashboard in background without switching tabs
                    // Temporarily show dashboard tab to access elements, update, then hide
                    const currentTab = document.querySelector('.main-tab-content:not([style*="none"])');
                    const dashboardTab = document.getElementById('tab-dashboard');
                    
                    if (dashboardTab && currentTab) {
                        // Show dashboard tab briefly
                        dashboardTab.style.display = 'block';
                        
                        // Update dials immediately
                        setTimeout(() => {
                            updatePerformanceDials(parsedCSVArray); 
                            console.log("Dashboard update completed");
                            
                            // Hide dashboard tab and restore current tab
                            dashboardTab.style.display = 'none';
                            currentTab.style.display = 'block';
                        }, 100);
                    } else {
                        console.error("Could not find dashboard or current tab");
                    }
                } else {
                    console.error("updatePerformanceDials function not found!");
                }

                setTimeout(() => {
                    dropZone.style.display = 'block';
                    uploadStatus.style.display = 'none';
                    fileInput.value = '';
                    const orgSelectClear = document.getElementById('organization-select');
                    const periodInputClear = document.getElementById('period-input');
                    if (orgSelectClear) orgSelectClear.value = '';
                    if (periodInputClear) periodInputClear.value = '';
                    resetStatusText();
                }, 4000);
            }, 5500);
        };

        reader.readAsText(file);
    }

    function resetStatusText() {
        if(statusText) statusText.innerHTML = 'Processing...';
        const s1 = document.getElementById('step-1');
        const s2 = document.getElementById('step-2');
        const s3 = document.getElementById('step-3');
        const s4 = document.getElementById('step-4');
        
        if(s1) { s1.innerHTML = '⏳ 1. Ingesting raw Audited Financials CSV...'; s1.style.color = '#475569'; }
        if(s2) { s2.innerHTML = '⏳ 2. Pushing through Python Tactical Engine (Regex categorization)...'; s2.style.color = '#94a3b8'; }
        if(s3) { s3.innerHTML = '⏳ 3. Running exceptions against Tab 6 UCOA Crosswalk...'; s3.style.color = '#94a3b8'; }
        if(s4) { s4.innerHTML = '⏳ 4. Publishing data to dashboard arrays...'; s4.style.color = '#94a3b8'; }
    }
});
