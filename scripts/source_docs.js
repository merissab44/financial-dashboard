// js/resources-upload.js

document.addEventListener("DOMContentLoaded", () => {
    // Listen for the button click on the upload portal
    const submitBtn = document.getElementById('submitUploadBtn'); 
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleFileUpload);
    }
});

function handleFileUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('financialCsvUpload');
    const orgSelect = document.getElementById('org-select');
    const fySelect = document.getElementById('fy-select'); // This is your HTML5 <input type="date">

    if (!fileInput || !fileInput.files.length) {
        alert("Please select a financial CSV file to upload.");
        return;
    }

    const orgName = orgSelect ? orgSelect.value : "Unknown";
    
    // Grab the date and slice to YYYY-MM to ensure the Chart.js timeline sorts chronologically
    const periodRaw = fySelect ? fySelect.value : "2024-01";
    const period = periodRaw.substring(0, 7);

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        processOrgFinancials(e.target.result, orgName, period);
    };

    reader.readAsText(file);
}

// ==========================================
// 1. THE TACTICAL ENGINE
// ==========================================
function autoCategorizeAccount(description) {
    if (!description) return null;
    const desc = description.toLowerCase();

    // Rule 1: Personnel
    if (desc.includes('salary') || desc.includes('wages') || desc.includes('stipend')) {
        return { ucoa: '6010', category: 'Expense', group: 'Personnel' };
    }
    
    // Rule 2: Travel
    if (['airline', 'flight', 'hotel', 'mileage', 'travel', 'uber'].some(keyword => desc.includes(keyword))) {
        return { ucoa: '6391', category: 'Expense', group: 'Travel' };
    }
    
    // Rule 3: Facilities
    if (['rent', 'lease', 'occupancy'].some(keyword => desc.includes(keyword))) {
        return { ucoa: '6250', category: 'Expense', group: 'Facilities' };
    }
    if (['repair', 'maintenance', 'cleaning', 'pest'].some(keyword => desc.includes(keyword))) {
        return { ucoa: '6210', category: 'Expense', group: 'Facilities' };
    }
    
    // Rule 4: Professional Services
    if (desc.includes('legal')) {
        return { ucoa: '6150', category: 'Expense', group: 'Professional Services' };
    }
    if (desc.includes('account') || desc.includes('bookkeep')) {
        return { ucoa: '6130', category: 'Expense', group: 'Professional Services' };
    }
    
    // Rule 5: Program Supplies
    if (['food', 'meal', 'catering'].some(keyword => desc.includes(keyword))) {
        return { ucoa: '6270', category: 'Expense', group: 'Program Supplies' };
    }

    return null; // Return null if no keywords match, requiring manual mapping
}

// ==========================================
// 2. ROBUST NUMBER PARSER (Handles -, $, (), and commas)
// ==========================================
function parseNumber(v) {
    const raw = String(v ?? "").trim();
    if (!raw || raw === "-" || raw === "—") return 0;
    const neg = /^\(.*\)$/.test(raw) || raw.startsWith('-');
    const cleaned = raw.replace(/^\(|\)$/g, "").replace(/\$|,/g, "").trim();
    const x = parseFloat(cleaned);
    return Number.isFinite(x) ? (neg ? -Math.abs(x) : x) : 0;
}

// ==========================================
// 3. MASTER PROCESSING PIPELINE
// ==========================================
function processOrgFinancials(csvText, orgName, period) {
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    
    // FIX: Grab ONLY the very first row (index 0) to dynamically parse the headers
    const headerRow = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const headers = headerRow.map(h => h.trim().replace(/"/g, '').toLowerCase());

    // DYNAMIC INDEXING: The script scans the headers to find the data we need.
    // It completely ignores extra columns and doesn't care about column order!
    const descIdx = headers.findIndex(h => h.includes('description') || h.includes('native account name') || h.includes('account'));
    const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('number'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('balance') || h.includes('total'));
    const catIdx = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('crosswalk'));
    const groupIdx = headers.findIndex(h => h.includes('group') || h.includes('class'));

    let parsedData = [];

    // Start loop at index 1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
        // Robust split to handle commas inside quotation marks
        const rowArr = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(item => item.replace(/"/g, '').trim());

        let accountDesc = descIdx >= 0 ? rowArr[descIdx] : '';
        let accountCode = codeIdx >= 0 ? rowArr[codeIdx] : '';
        let amount = amtIdx >= 0 ? parseNumber(rowArr[amtIdx]) : 0;
        let category = catIdx >= 0 ? rowArr[catIdx] : '';
        let group = groupIdx >= 0 ? rowArr[groupIdx] : '';

        // Skip purely empty lines
        if (!accountDesc && amount === 0) continue;

        let isRemediated = false;

        // --- HARDCODED REMEDIATIONS (Phase 2 Exceptions) ---
        if (orgName === 'Roots') {
            if (['64250', '64275', '64300'].includes(accountCode) || accountDesc.toLowerCase().includes('participant stipend')) {
                category = 'Expense'; group = 'Program'; isRemediated = true; // Isolate Youth Stipends
            } else if (accountDesc.toLowerCase().includes('medical supplies')) {
                category = 'Expense'; group = 'Family Health'; isRemediated = true; // Fix Medical Supplies
            } else if (accountDesc.toLowerCase().includes('employee salaries')) {
                category = 'Expense'; group = 'Personnel'; isRemediated = true; // Fix Salaries
            } else if (accountDesc.toLowerCase().includes('insurance')) {
                category = 'Expense'; group = 'Core Infrastructure'; isRemediated = true; // Fix Insurance
            }
        }

        if (orgName === 'BCZ') {
            if (accountDesc.toLowerCase().includes('safety ambassador') || accountDesc.toLowerCase().includes('neighborhood messenger')) {
                category = 'Expense'; group = 'Part-Time Personnel'; isRemediated = true; // Reclassify Personnel
            } else if (accountCode === '1430' || accountDesc.toLowerCase() === 'land') {
                category = 'Asset'; group = 'Land (Non-Depreciable)'; isRemediated = true; // Separate Land
            } else if (['1999', '2999'].includes(accountCode)) {
                category = 'Elimination'; amount = 0; isRemediated = true; // Roll Up Intercompany Entries
            } else if (accountDesc.toLowerCase().includes('ics')) {
                category = 'Asset'; group = 'Restricted Cash'; isRemediated = true; // Track ICS Cash
            }
        }
        // --------------------------------------------------

        // --- THE ERROR TRAP & TACTICAL ROUTING ---
        if (!isRemediated && (!category || category.toLowerCase() === "uncategorized")) {
            const autoMatch = autoCategorizeAccount(accountDesc);

            if (autoMatch) {
                category = autoMatch.category;
                group = autoMatch.group;
            } else {
                // THE HITL ERROR TRAP
                category = "Uncategorized";
                console.warn(`[COLLISION AUDIT FLAG] Uncategorized Expense Flagged: ${accountDesc} - $${amount}`);
            }
        }
        // -----------------------------------------

        parsedData.push({
            description: accountDesc,
            code: accountCode,
            category: category,
            group: group,
            amount: amount
        });
    }

    // ==========================================
    // 4. SAVE TO THE GOLDEN RECORD CACHE
    // ==========================================
    let historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];

    const newUpload = {
        org: orgName,
        period: period,
        data: parsedData,
        timestamp: new Date().toISOString()
    };

    historyCache.push(newUpload);
    localStorage.setItem('riseEastOrgUploads', JSON.stringify(historyCache));

    alert(`✓ Successfully processed ${parsedData.length} records for ${orgName} (${period})!`);
    
    // Update the upload history displays
    updateUploadHistory();
    renderUploadHistory();
    
    // Trigger the Dashboard to update automatically
    window.dispatchEvent(new Event('storage')); 
}

// ==========================================
// 5. UPLOAD HISTORY DISPLAY
// ==========================================
function updateUploadHistory() {
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    const historyList = document.getElementById('upload-history-list');
    
    if (!historyList) return;
    
    if (historyCache.length === 0) {
        historyList.innerHTML = `
            <tr>
                <td id="history-card" colspan="5">
                    No uploads cached in this browser session yet.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by timestamp (newest first)
    const sortedHistory = historyCache.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    historyList.innerHTML = sortedHistory.map(upload => {
        const date = new Date(upload.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${upload.org}</td>
                <td>${upload.period}</td>
                <td>${upload.data.length} records</td>
                <td style="color: #059669;">✓ Success</td>
            </tr>
        `;
    }).join('');
}

function renderUploadHistory() {
    const historyBody = document.getElementById('upload-history-body');
    if (!historyBody) return;
    
    const historyCache = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    historyBody.innerHTML = '';
    
    if (historyCache.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No uploads found.</td></tr>`;
        return;
    }
    
    historyCache.reverse().forEach(upload => {
        historyBody.innerHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${new Date(upload.timestamp).toLocaleDateString()}</td>
                <td style="padding: 12px; font-weight: bold;">${upload.org}</td>
                <td style="padding: 12px;">${upload.period}</td>
                <td style="padding: 12px;">${upload.data.length} rows</td>
                <td style="padding: 12px; color: #059669;">Mapped</td>
            </tr>
        `;
    });
}

// Initialize history display on page load
document.addEventListener("DOMContentLoaded", () => {
    // Update history displays when page loads
    updateUploadHistory();
    renderUploadHistory();
});