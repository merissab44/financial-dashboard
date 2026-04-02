document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial Load: Render any past uploads from the cache
    renderHistoryTable();

    // 2. Submit Button Listener
    const submitBtn = document.getElementById('submitUploadBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any default form submission

            const orgSelect = document.getElementById('org-select').value;
            const fySelect = document.getElementById('fy-select').value;
            const fileInput = document.getElementById('financialCsvUpload');

            // --- Form Validation ---
            if (!orgSelect) {
                showAlert('error', 'Please select an Organization from the dropdown.');
                return;
            }
            if (fileInput.files.length === 0) {
                showAlert('error', 'Please select a CSV financial export to upload.');
                return;
            }

            // Grab the specific file using the  index
            const file = fileInput.files[0];
            
            // 3. Read and Parse the CSV
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvData = event.target.result;
                processOrgFinancials(csvData, orgSelect, fySelect, file.name);
            };
            reader.readAsText(file);
        });
    }
});

// ==========================================
// CORE PARSING & VALIDATION LOGIC
// ==========================================
function processOrgFinancials(csv, org, fiscalPeriod, fileName) {
    const rows = csv.split('\n');
    let parsedData = [];
    
    // We expect the accountant's CSV to have: Category, Group, Line Item, Amount
    rows.forEach((row, index) => {
        if (index === 0 || !row.trim()) return; // Skip headers or empty rows
        
        // Use Array Destructuring to assign variables immediately (bypasses the bracket bug!)
        let splitCols = row.split(',');
        if (splitCols.length < 4) return;
        
        let cat = splitCols.shift();
        let grp = splitCols.shift();
        let line = splitCols.shift();
        let amt = splitCols.shift();

        parsedData.push({
            category: cat.trim(), 
            group: grp.trim(),    
            lineItem: line.trim(),
            amount: parseFloat(amt.trim().replace(/[^0-9.-]+/g,"")) || 0 
        });
    });

    // --- Validation: Ensure we have data for the 11 Ratios ---
    // A quick check to make sure the CSV wasn't empty or totally misformatted
    const hasAssets = parsedData.some(item => item.category.toLowerCase().includes('asset'));
    const hasExpenses = parsedData.some(item => item.category.toLowerCase().includes('expense'));

    if (!hasAssets || !hasExpenses) {
        showAlert('error', 'Upload Failed: We could not identify standard Asset or Expense categories in this CSV. Please check your column mapping.');
        return;
    }

    // --- Save to Cache (Step 3) ---
    saveToHistoryCache(parsedData, org, fiscalPeriod, fileName);
}

// ==========================================
// LOCAL STORAGE & CACHE MANAGEMENT
// ==========================================
function saveToHistoryCache(parsedData, org, fiscalPeriod, fileName) {
    // 1. Create the Payload Object
    const uploadRecord = {
        id: Date.now(), // Unique timestamp ID
        timestamp: new Date().toLocaleString(),
        org: org,
        period: fiscalPeriod,
        fileName: fileName,
        data: parsedData
    };

    // 2. Retrieve existing history, add the new record to the top, and save back to memory
    let history = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    history.unshift(uploadRecord); 
    localStorage.setItem('riseEastOrgUploads', JSON.stringify(history));

    // 3. Update the UI
    showAlert('success', `✓ Upload Successful! ${fileName} has been processed. The Performance Page ratios have been updated in real-time.`);
    renderHistoryTable();

    // 4. Force a manual 'storage' event dispatch 
    // (This ensures if the Performance Page is open in another tab, it instantly recalculates)
    window.dispatchEvent(new Event('storage'));
}

// ==========================================
// UI RENDER UTILITIES
// ==========================================
function renderHistoryTable() {
    const historyList = document.getElementById('upload-history-list');
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem('riseEastOrgUploads')) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = `<tr><td colspan="5" style="padding: 30px 0; color: #94a3b8; text-align: center; font-style: italic;">No uploads cached in this browser session yet.</td></tr>`;
        return;
    }

    // Generate the table rows dynamically
    historyList.innerHTML = history.map(log => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 8px;">${log.timestamp}</td>
            <td style="padding: 12px 8px; font-weight: bold;">${log.org}</td>
            <td style="padding: 12px 8px;">${log.period}</td>
            <td style="padding: 12px 8px; color: #2563eb;">${log.fileName}</td>
            <td style="padding: 12px 8px; color: #059669;">✓ Processed</td>
        </tr>
    `).join('');
}

function showAlert(type, message) {
    const alertBox = document.getElementById('alert-container');
    if (!alertBox) return;

    // Reset classes and apply the requested CSS class
    alertBox.className = 'alert-box'; 
    alertBox.classList.add(type === 'success' ? 'alert-success' : 'alert-error');
    alertBox.innerText = message;
}