// 1. DATA SOURCE
// Extracted from "Rise East Year 2 Investment Recommendation Budget" [1, 2]
// ==========================================
const dashboardData = {
  "Projected": { // 5-Year Projected Budget (2023-2029)
    "revenue": 100019000,
    "expenses": 100000000,
    "dimensions": [
      { "label": "1. Backbone and Gen Ops", "value": 22000000 },
      { "label": "2. Live and Thrive", "value": 26000000 },
      { "label": "3. Data Trust and Fund", "value": 14500000 },
      { "label": "4. Power Building", "value": 10000000 },
      { "label": "5. Learn and Grow", "value": 9500000 },
      { "label": "6. Safe and Connected", "value": 8000000 },
      { "label": "7. Work and Wealth", "value": 3000000 },
      { "label": "8. Family Health and Wellbeing", "value": 7000000 }
    ]
  },
  "2026 Year 2 budget": { // Year 2 Budget (July 2025 - June 2026)
    "revenue": 22588076,
    "expenses": 22538376,
    "dimensions": [
      { "label": "1. Backbone and Gen Ops", "value": 6495750 },
      { "label": "2. Live and Thrive", "value": 2500000 },
      { "label": "3. Data Trust and Fund", "value": 2273166 },
      { "label": "4. Power Building", "value": 3135200 },
      { "label": "5. Learn and Grow", "value": 3500000 },
      { "label": "6. Safe and Connected", "value": 1444825 },
      { "label": "7. Work and Wealth", "value": 1871207 },
      { "label": "8. Family Health and Wellbeing", "value": 1318228 }
    ]
  },
  "2025 Year 1 actuals": { // Year 1 Actuals (July 2024 - June 2025)
    "revenue": 35532579,
    "expenses": 26143922,
    "dimensions": [
      { "label": "1. Backbone and Gen Ops", "value": 5098421 },
      { "label": "2. Live and Thrive", "value": 12807688 },
      { "label": "3. Data Trust and Fund", "value": 3050241 },
      { "label": "4. Power Building", "value": 1104818 },
      { "label": "5. Learn and Grow", "value": 954292 },
      { "label": "6. Safe and Connected", "value": 872761 },
      { "label": "7. Work and Wealth", "value": 1057081 },
      { "label": "8. Family Health and Wellbeing", "value": 1198620 }
    ]
  }
};

let dimensionsChartInstance = null;

const DIMENSION_META = [
  { key: '1', label: '1. Backbone and Gen Ops', statement: 'Admin, indirect, management fees', dotClass: 'b1' },
  { key: '2', label: '2. Live and Thrive', statement: 'Buildings, capital improvements', dotClass: 'b2' },
  { key: '3', label: '3. Data Trust and Fund', statement: 'Evaluation, research, data', dotClass: 'b3' },
  { key: '4', label: '4. Power Building', statement: 'Civic engagement, organizing', dotClass: 'b4' },
  { key: '5', label: '5. Learn and Grow', statement: 'Youth programs, scholarships', dotClass: 'b5' },
  { key: '6', label: '6. Safe and Connected', statement: 'Safety, ambassadors, community response', dotClass: 'b6' },
  { key: '7', label: '7. Work and Wealth', statement: 'Economic development', dotClass: 'b7' },
  { key: '8', label: '8. Family Health and Wellbeing', statement: 'Clinical services, supplies, labs', dotClass: 'b8' }
];

function populateYearDropdown() {
  const yearFilter = document.getElementById('year-filter');
  if (!yearFilter) return;

  const keys = Object.keys(dashboardData);

  yearFilter.innerHTML = '';
  keys.forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key === 'Projected' ? '5-Year Projected' : key;
    yearFilter.appendChild(opt);
  });

  yearFilter.value = keys.includes('Projected') ? 'Projected' : keys[0];
}

function renderUcoaTable(dimensionsData, totalExpenses) {
  const tbody = document.getElementById('ucoaBody');
  if (!tbody) return;

  const denom = Number.isFinite(totalExpenses) && totalExpenses !== 0
    ? Math.abs(totalExpenses)
    : dimensionsData.reduce((sum, d) => sum + (Number.isFinite(d.value) ? d.value : 0), 0);

  const pct = (value) => {
    if (!Number.isFinite(value) || !Number.isFinite(denom) || denom === 0) return '—%';
    return `${((value / denom) * 100).toFixed(1)}%`;
  };

  const dataMap = new Map(dimensionsData.map(d => [d.label, d.value]));

  tbody.innerHTML = DIMENSION_META.map((m) => {
    const value = dataMap.get(m.label);
    return `
      <tr>
        <td><span class="dim"><span class="dot ${m.dotClass}"></span>${m.label}</span></td>
        <td>${m.statement}</td>
        <td class="num">${formatCurrency(value)}</td>
        <td class="num">${pct(value)}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    populateYearDropdown();

    // Initial Render on Page Load (Defaults to the 5-Year Projected Budget)
    const yearFilter = document.getElementById('year-filter');
    const initialKey = yearFilter?.value || 'Projected';
    renderHomeDashboard(initialKey);

    // Listen for Dropdown Changes (Uses the newly styled dropdown)
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            renderHomeDashboard(e.target.value);
        });
    }
});

// ==========================================
// 3. MAIN RENDERING LOGIC
// ==========================================
function renderHomeDashboard(yearKey) {
    const data = dashboardData[yearKey];
    if (!data) return;

    // A. Calculate Values
    const totalRevenue = data.revenue;
    const totalExpenses = data.expenses;
    const surplusAmount = totalRevenue - totalExpenses;

    // B. Target DOM Elements (Make sure your HTML has these IDs!)
    const revEl = document.getElementById('total-revenue');
    const expEl = document.getElementById('total-expenses');
    const surplusEl = document.getElementById('surplus-value');

    // C. Update KPI Text
    if (revEl) revEl.innerText = formatCurrency(totalRevenue);
    if (expEl) expEl.innerText = formatCurrency(totalExpenses);

    if (surplusEl) {
        surplusEl.innerText = formatCurrency(surplusAmount);
        
        // --- THE DYNAMIC COLOR LOGIC ---
        // Green if Surplus (0 or greater), Red if Deficit (less than 0)
        if (surplusAmount >= 0) {
            surplusEl.style.color = '#059669'; 
        } else {
            surplusEl.style.color = '#dc2626'; 
        }
    }

    // D. Render the Chart
    renderUcoaTable(data.dimensions, totalExpenses);
    renderDimensionsChart(data.dimensions, yearKey);
}

// ==========================================
// 4. CHART BUILDER
// ==========================================
function renderDimensionsChart(dimensionsData, yearKey) {
    // Make sure your canvas has id="dimensionsChart"
    const canvas = document.getElementById('dimensionsChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart to prevent overlap/glitching when changing the dropdown filter
    if (dimensionsChartInstance) {
        dimensionsChartInstance.destroy();
    }

    // Map labels and data from our JSON object
    const labels = dimensionsData.map(item => item.label);
    const dataValues = dimensionsData.map(item => item.value);

    // Standard modern color palette for the 8 Dimensions
    const backgroundColors = [
        '#2563eb', // Blue
        '#059669', // Emerald Green
        '#d97706', // Amber/Orange
        '#dc2626', // Red
        '#7c3aed', // Purple
        '#0891b2', // Teal/Cyan
        '#475569', // Slate
        '#db2777'  // Pink
    ];

    // Build the Chart
    dimensionsChartInstance = new Chart(ctx, {
        type: 'bar', // Easily changeable to 'doughnut' or 'pie' if you prefer
        data: {
            labels: labels,
            datasets: [{
                label: `Total Funding Allocation`,
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Hides the top legend since the x-axis has the labels
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            // Formats the y-axis numbers as currency
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45, // Angles the 8 dimension titles so they don't overlap
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// ==========================================
// 5. UTILITY FORMATTER
// ==========================================
function formatCurrency(value) {
    if (!Number.isFinite(value) || value === 0) return "$0";
    
    // Places the minus sign before the dollar sign for negative numbers (e.g., -$1,500)
    return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}