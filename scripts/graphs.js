/* graphs.js
   - Supports grouped bar + multi-line charts
   - Loads /data/consolidated.json (recommended schema below)
   - Fallback demo data included
*/

/* =========================
   Expected data schema
   =========================
   consolidated.json should be an array of rows like:

   [
     { "org":"Roots", "year":2020, "metric":"Quick Ratio", "value":1.4 },
     { "org":"Roots", "year":2021, "metric":"Quick Ratio", "value":3.7 },
     ...
   ]

   Keys supported:
   - org (string) [required]
   - year (number) [required]
   - metric (string) [required]   // ratio name
   - value (number) [required]
*/

(() => {
  // ---------- DOM ----------
  const canvas = document.getElementById("ratioChart");
  const orgSelect = document.getElementById("orgSelect");
  const ratioSelect = document.getElementById("ratioSelect");
  const yearMinEl = document.getElementById("yearMin");
  const yearMaxEl = document.getElementById("yearMax");
  const applyBtn = document.getElementById("applyBtn");
  const chartTypeSelect = document.getElementById("chartTypeSelect");

  // Optional (won’t crash if missing)
  const chartTitle = document.getElementById("chartTitle");
  const chartSubtitle = document.getElementById("chartSubtitle");

  if (!canvas) {
    console.error("Missing <canvas id='ratioChart'>");
    return;
  }

  // ---------- Utils ----------
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const uniqueSorted = (arr) => [...new Set(arr)].sort((a, b) => {
    // numeric if both numbers, else string
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
  });

  // ---------- Threshold rules (edit these as needed) ----------
  // direction: "higher" means higher is better; "lower" means lower is better
  const THRESHOLDS = {
    "Quick Ratio": { good: 2.0, warn: 1.0, direction: "higher" },
    "Current Ratio": { good: 2.0, warn: 1.0, direction: "higher" },
    // Example: if you decide Debt Ratio is liabilities / net assets and "lower is better"
    "Debt Ratio": { good: 1.0, warn: 2.0, direction: "lower" },
  };

  function getThresholdRule(metricName) {
    // Match by normalized name
    const key = Object.keys(THRESHOLDS).find(k => norm(k) === norm(metricName));
    return key ? THRESHOLDS[key] : null;
  }

  function statusFor(value, rule) {
    if (value === null || value === undefined || !Number.isFinite(value) || !rule) return "neutral";
    if (rule.direction === "higher") {
      if (value >= rule.good) return "good";
      if (value >= rule.warn) return "warn";
      return "bad";
    } else {
      if (value <= rule.good) return "good";
      if (value <= rule.warn) return "warn";
      return "bad";
    }
  }

  const ORG_COLORS = {
    EOYDC: "#38BDF8",
    Roots: "#22C55E",
    BCZ: "#A78BFA",
    BOEN: "#F59E0B"
  };


  function hexToRgba(hex, alpha = 0.15) {
    if (!hex || typeof hex !== "string") return `rgba(56, 189, 248, ${alpha})`;
    const h = hex.replace("#", "").trim();
    if (h.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }


  

  // Subtle colors that work on dark backgrounds
  const COLORS = {
    line: "rgba(56, 189, 248, 0.95)",          // bright cyan-ish
    good: "rgba(34, 197, 94, 0.85)",           // green
    warn: "rgba(245, 158, 11, 0.85)",          // amber
    bad: "rgba(239, 68, 68, 0.85)",            // red
    neutral: "rgba(148, 163, 184, 0.70)",      // slate
    grid: "rgba(255, 255, 255, 0.06)",
    ticks: "rgba(255, 255, 255, 0.45)",
    title: "rgba(255, 255, 255, 0.85)",
    threshold: "rgba(255, 255, 255, 0.22)",
    average: "rgba(255, 255, 255, 0.16)",
  };

  // ---------- Demo fallback data ----------
  const demoRows = [
    { org: "Roots", year: 2020, metric: "Quick Ratio", value: 1.4 },
    { org: "Roots", year: 2021, metric: "Quick Ratio", value: 3.7 },
    { org: "Roots", year: 2022, metric: "Quick Ratio", value: 5.4 },
    { org: "Roots", year: 2023, metric: "Quick Ratio", value: 3.3 },

    { org: "EOYDC", year: 2021, metric: "Quick Ratio", value: 2.2 },
    { org: "EOYDC", year: 2022, metric: "Quick Ratio", value: 2.9 },
    { org: "EOYDC", year: 2023, metric: "Quick Ratio", value: 2.5 },

    { org: "Roots", year: 2020, metric: "Current Ratio", value: 1.6 },
    { org: "Roots", year: 2021, metric: "Current Ratio", value: 3.9 },
    { org: "Roots", year: 2022, metric: "Current Ratio", value: 5.6 },

    { org: "EOYDC", year: 2021, metric: "Current Ratio", value: 1.8 },
    { org: "EOYDC", year: 2022, metric: "Current Ratio", value: 2.2 },
    { org: "EOYDC", year: 2023, metric: "Current Ratio", value: 2.0 },

    { org: "Roots", year: 2020, metric: "Debt Ratio", value: 1.7 },
    { org: "Roots", year: 2021, metric: "Debt Ratio", value: 1.1 },
    { org: "Roots", year: 2022, metric: "Debt Ratio", value: 0.9 },

    { org: "EOYDC", year: 2021, metric: "Debt Ratio", value: 1.8 },
    { org: "EOYDC", year: 2022, metric: "Debt Ratio", value: 2.1 },
    { org: "EOYDC", year: 2023, metric: "Debt Ratio", value: 1.6 },
  ];

  // ---------- Global state ----------
  let allRows = [];
  let chart = null;

  // ---------- Load data ----------
  async function loadData() {
    // Try to load real data first
    try {
      const res = await fetch("data/consolidated.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Validate basic schema
      const cleaned = (Array.isArray(json) ? json : []).map(r => ({
        org: r.org ?? r.organization ?? r.Org ?? r.Organization,
        year: toNum(r.year ?? r.Year),
        metric: r.metric ?? r.ratio ?? r.Metric ?? r.Ratio,
        value: toNum(r.value ?? r.Value),
      })).filter(r => r.org && r.metric && r.year !== null && r.value !== null);

      if (cleaned.length === 0) throw new Error("No valid rows in consolidated.json");
      allRows = cleaned;
      console.log("Loaded consolidated.json rows:", cleaned.length);
      return;
    } catch (e) {
      console.warn("Falling back to demo rows. Reason:", e.message);
      allRows = demoRows;
    }
  }

  // ---------- Populate filter dropdowns ----------
  function populateFilters() {
    const orgs = uniqueSorted(allRows.map(r => r.org));
    const metrics = uniqueSorted(allRows.map(r => r.metric));
    const years = uniqueSorted(allRows.map(r => r.year)).filter(y => typeof y === "number");

    // Orgs
    orgSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "All";
    allOpt.textContent = "All";
    orgSelect.appendChild(allOpt);
    for (const o of orgs) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      orgSelect.appendChild(opt);
    }

    // Metrics (ratios)
    ratioSelect.innerHTML = "";
    for (const m of metrics) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      ratioSelect.appendChild(opt);
    }

    // Year range inputs: set placeholders
    const minY = years.length ? years[0] : "";
    const maxY = years.length ? years[years.length - 1] : "";

    if (yearMinEl) yearMinEl.placeholder = minY ? String(minY) : "From";
    if (yearMaxEl) yearMaxEl.placeholder = maxY ? String(maxY) : "To";

    // Defaults
    // pick first metric if none selected
    if (!ratioSelect.value && metrics.length) ratioSelect.value = metrics[0];

    // chart type default: bar (if present)
    if (chartTypeSelect && !chartTypeSelect.value) chartTypeSelect.value = "bar";
  }

  // ---------- Filtering ----------
  function filterRows({ org, metric, yearMin, yearMax }) {
    const orgN = norm(org);
    const metricN = norm(metric);

    const minY = toNum(yearMin);
    const maxY = toNum(yearMax);

    let rows = allRows.filter(r => norm(r.metric) === metricN);

    if (org && org !== "All") {
      rows = rows.filter(r => norm(r.org) === orgN);
    }

    if (minY !== null) rows = rows.filter(r => r.year >= minY);
    if (maxY !== null) rows = rows.filter(r => r.year <= maxY);

    rows.sort((a, b) => a.year - b.year);
    return rows;
  }

  function getLatestYearForMetric(metric) {
    const metricN = norm(metric);
    const years = allRows
      .filter(r => norm(r.metric) === metricN)
      .map(r => r.year)
      .filter(y => typeof y === "number");
    return years.length ? Math.max(...years) : null;
  }

  // ---------- Chart builders ----------
  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function makeBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: COLORS.ticks }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y ?? ctx.parsed;
              if (typeof v === "number") return `${ctx.dataset.label}: ${v.toFixed(2)}`;
              return `${ctx.dataset.label}: ${v}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: COLORS.ticks },
          grid: { color: COLORS.grid }
        },
        y: {
          ticks: { color: COLORS.ticks },
          grid: { color: COLORS.grid }
        }
      }
    };
  }

  // Grouped bar: compare orgs for a single year
  function renderGroupedBar(metric, yearOverride) {
    destroyChart();

    const chosenYear = yearOverride ?? getLatestYearForMetric(metric);
    const metricN = norm(metric);

    // All orgs for that metric + year
    let rows = allRows.filter(r => norm(r.metric) === metricN && r.year === chosenYear);

    // If empty (maybe chosenYear filtered away), fallback to latest available year with data
    if (rows.length === 0) {
      const years = uniqueSorted(allRows.filter(r => norm(r.metric) === metricN).map(r => r.year));
      const fallbackYear = years.length ? years[years.length - 1] : chosenYear;
      rows = allRows.filter(r => norm(r.metric) === metricN && r.year === fallbackYear);
    }

    rows.sort((a, b) => a.org.localeCompare(b.org));

    const labels = rows.map(r => r.org);
    const values = rows.map(r => r.value);

    const rule = getThresholdRule(metric);
    const barColors = values.map(v => {
      const st = statusFor(v, rule);
      return COLORS[st] ?? COLORS.neutral;
    });

    // Optional: build an "average" line dataset
    const avg = values.length ? (values.reduce((s, v) => s + v, 0) / values.length) : null;

    const ctx = canvas.getContext("2d");
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: metric,
            data: values,
            backgroundColor: barColors,
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderRadius: 10
          }
        ]
      },
      options: {
        ...makeBaseOptions(),
        plugins: {
          ...makeBaseOptions().plugins,
          legend: { display: false }
        },
        scales: {
          x: { ...makeBaseOptions().scales.x },
          y: { ...makeBaseOptions().scales.y, beginAtZero: true }
        }
      },
      plugins: [
        // Average + threshold lines
        {
          id: "barLines",
          afterDraw(chartInstance) {
            const { ctx, chartArea, scales } = chartInstance;
            const yScale = scales.y;
            if (!chartArea) return;

            // Average line
            if (avg !== null) {
              const y = yScale.getPixelForValue(avg);
              ctx.save();
              ctx.strokeStyle = COLORS.average;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(chartArea.left, y);
              ctx.lineTo(chartArea.right, y);
              ctx.stroke();
              ctx.restore();
            }

            // Threshold "good" line (if exists)
            if (rule && typeof rule.good === "number") {
              const y = yScale.getPixelForValue(rule.good);
              ctx.save();
              ctx.strokeStyle = COLORS.threshold;
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.moveTo(chartArea.left, y);
              ctx.lineTo(chartArea.right, y);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      ]
    });

    // Header text
    if (chartTitle) chartTitle.textContent = metric;
    if (chartSubtitle) chartSubtitle.textContent = `Organization: All • Year: ${chosenYear ?? "—"}`;
  }

  // Multi-line: trend over time, one line per org (or single org if selected)
  function renderMultiLine(metric, org, yearMin, yearMax) {
    destroyChart();

    const metricN = norm(metric);
    let rows = filterRows({ org, metric, yearMin, yearMax });

    // If org = All, we want lines per org; else single line
    const orgs = org && org !== "All"
      ? [org]
      : uniqueSorted(allRows.filter(r => norm(r.metric) === metricN).map(r => r.org));

    // Determine year domain based on filtered rows (or all metric rows if none)
    const years = uniqueSorted((rows.length ? rows : allRows.filter(r => norm(r.metric) === metricN)).map(r => r.year))
      .filter(y => typeof y === "number");
    const labels = years;

    // Build datasets
    const datasets = orgs.map((orgName, idx) => {
      const orgN = norm(orgName);
      const orgRows = allRows
        .filter(r => norm(r.metric) === metricN && norm(r.org) === orgN)
        .filter(r => {
          const minY = toNum(yearMin);
          const maxY = toNum(yearMax);
          if (minY !== null && r.year < minY) return false;
          if (maxY !== null && r.year > maxY) return false;
          return true;
        });

      // Map year -> value
      const map = new Map(orgRows.map(r => [r.year, r.value]));
      const data = labels.map(y => (map.has(y) ? map.get(y) : null));

      // Highlight last non-null point by threshold status (optional)
      const rule = getThresholdRule(metric);
      const lastVal = [...data].reverse().find(v => typeof v === "number");
      const st = statusFor(lastVal, rule);
      const pointColor = COLORS[st] ?? "#38BDF8";
      const orgColor = ORG_COLORS[orgName] || COLORS.line;

      return {
        label: orgName,
        data,
        spanGaps: true,
        borderWidth: 3,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        // Keep line color consistent; use point color to show “status”
        borderColor: orgColor,
        backgroundColor: hexToRgba(orgColor, 0.15),
        pointBackgroundColor: orgColor,
        pointBorderColor: orgColor,
        // Force segment color (prevents global overrides from muting lines)
        segment: { borderColor: orgColor }
      };
    });

    // Average line (across orgs) for each year
    const avgData = labels.map(y => {
      const vals = allRows
        .filter(r => norm(r.metric) === metricN && r.year === y)
        .map(r => r.value)
        .filter(v => typeof v === "number");
      if (!vals.length) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    });

    datasets.push({
      label: "Average",
      data: avgData,
      borderColor: COLORS.average,
      borderWidth: 2,
      borderDash: [6, 6],
      pointRadius: 0,
      tension: 0.25
    });

    const rule = getThresholdRule(metric);

    const ctx = canvas.getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        ...makeBaseOptions(),
        plugins: {
          ...makeBaseOptions().plugins,
          legend: {
            position: "top",
            labels: { color: COLORS.ticks }
          }
        }
      },
      plugins: [
        // Threshold line
        {
          id: "thresholdLine",
          afterDraw(chartInstance) {
            if (!rule || typeof rule.good !== "number") return;
            const { ctx, chartArea, scales } = chartInstance;
            const yScale = scales.y;
            if (!chartArea) return;

            const y = yScale.getPixelForValue(rule.good);
            ctx.save();
            ctx.strokeStyle = COLORS.threshold;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            ctx.restore();
          }
        }
      ]
    });

    if (chartTitle) chartTitle.textContent = metric;
    if (chartSubtitle) {
      const orgLabel = org && org !== "All" ? org : "All";
      const yrLabel = (yearMin || yearMax) ? `${yearMin || "…"}–${yearMax || "…"}`
        : "All years";
      chartSubtitle.textContent = `Organization: ${orgLabel} • Years: ${yrLabel}`;
    }
  }

  // ---------- Apply logic ----------
  function applyFilters() {
    const metric = ratioSelect?.value;
    const org = orgSelect?.value ?? "All";
    const chartType = chartTypeSelect?.value ?? "bar";

    const yearMin = yearMinEl?.value ?? "";
    const yearMax = yearMaxEl?.value ?? "";

    if (!metric) return;

    if (chartType === "bar") {
      // For bar chart: use yearMin as "selected year" if present; else latest year
      const yearOverride = toNum(yearMin);
      renderGroupedBar(metric, yearOverride);
    } else {
      renderMultiLine(metric, org, yearMin, yearMax);
    }
  }

  // ---------- Init ----------
  async function init() {
    await loadData();

    // If your HTML already has fixed ratio options, this will overwrite them with what’s in data.
    // If you prefer keeping the HTML options, comment this out and only populate org + year hints.
    populateFilters();

    // Wire up events
    if (applyBtn) applyBtn.addEventListener("click", applyFilters);
    if (chartTypeSelect) chartTypeSelect.addEventListener("change", applyFilters);
    if (ratioSelect) ratioSelect.addEventListener("change", applyFilters);
    if (orgSelect) orgSelect.addEventListener("change", () => {
      // For bar chart, org selection isn’t used (bar compares all orgs)
      // but we still re-render to keep subtitle consistent if needed.
      applyFilters();
    });

    // First render
    applyFilters();
  }

  init();
})();
