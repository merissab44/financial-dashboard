const colors = [
    '#2563eb', // Blue
    '#059669', // Green
    '#d97706', // Orange
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#0891b2', // Teal
    '#db2777', // Pink
    '#4f46e5'  // Indigo
];

// Helper to format currency in chart tooltips
const currencyFormatter = (value) => {
    return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const renderAreaDonutChart = (canvasId, allocationsData) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: allocationsData.map(item => item.name),
            datasets: [{
                data: allocationsData.map(item => item.budget),
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    position: 'bottom', // Moves text under the chart
                    align: 'center',
                    labels: {
                        boxWidth: 12,   // Shrinks the colored square
                        textAlign: 'center',
                        font: {
                            size: 10    // Shrinks the text slightly to fit
                        },
                        padding: 10     // Tightens the space between items
                    }
                 },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${currencyFormatter(context.raw)}`
                    }
                }
            }
        }
    });
};

export const renderGranteeBarChart = (canvasId, granteeData) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: granteeData.map(item => item.name.split(' (')), // Shorten names
            datasets: [{
                label: 'Projected Budget ($)',
                data: granteeData.map(item => item.budget),
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${currencyFormatter(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => '$' + (value / 1000000) + 'M' } // Format Y axis as Millions
                }
            }
        }
    });
};

export const renderBudgetVsActualChart = (canvasId, metrics) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Revenue', 'Expenses'],
            datasets: [
                {
                    label: 'Year 1 Budget',
                    data: [metrics.y1_budget_revenue, metrics.y1_budget_expenses],
                    backgroundColor: '#94a3b8', // Gray
                    borderRadius: 4
                },
                {
                    label: 'Year 1 Actuals',
                    data: [metrics.y1_actuals_revenue, metrics.y1_actuals_expenses],
                    backgroundColor: '#059669', // Green
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${currencyFormatter(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => '$' + (value / 1000000) + 'M' }
                }
            }
        }
    });
};