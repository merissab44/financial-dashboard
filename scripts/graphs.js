// graphs.js (flexible selectors + chart type switching + year range + outlier handling)
// Requires Chart.js loaded BEFORE this file.

const DATA_PATH = "data/audited_ratios_input.csv";
let __chart = null;

// ---------------- Helpers ----------------
function pickEl(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

function parseNumber(v) {
  const x = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(x) ? x : null;
}

function safeDiv(a, b) {
  const A = parseNumber(a), B = parseNumber(b);
  if (A == null || B == null || B === 0) return null;
  return A / B;
}

// Hide liquidity ratios when current liabilities are too tiny (prevents 6000x skew)
const MIN_LIABILITY_FOR_LIQUIDITY_RATIOS = 1000;

function liquidityDiv(a, b) {
  const A = parseNumber(a), B = parseNumber(b);
  if (A == null || B == null) return null;
  if (B < MIN_LIABILITY_FOR_LIQUIDITY_RATIOS) return null;
  return A / B;
}

const METRICS = {
  "Quick Ratio": (r) => liquidityDiv(r.quick_assets, r.current_liabilities),
  "Current Ratio": (r) => liquidityDiv(r.current_assets, r.current_liabilities),
  "Debt Ratio": (r) => safeDiv(r.total_liabilities, r.total_unrestricted_net_assets),
};

function statusColor(metricName, v) {
  if (v == null || !Number.isFinite(v)) return "#6b7280"; // gray for missing

  if (metricName === "Current Ratio") {
    if (v < 1) return "#ef4444";          // red
    if (v < 1.5) return "#f59e0b";        // yellow
    return "#22c55e";                      // green (>= 1.5)
  }

  if (metricName === "Quick Ratio") {
    if (v >= 3) return "#ef4444";         // red
    if (v > 2 && v < 3) return "#f59e0b"; // yellow
    if (v >= 1 && v <= 2) return "#22c55e"; // green
    return "#f59e0b";                      // <1 treat as caution (yellow)
  }

  if (metricName === "Debt Ratio") {
    if (v > 1) return "#ef4444";          // red
    if (v > 0.5) return "#f59e0b";        // yellow
    return "#22c55e";                      // green (<= 0.5)
  }

  return "#3b82f6"; // fallback (blue)
}

function lastFinite(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v != null && Number.isFinite(v)) return v;
  }
  return null;
}

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      inQuotes = !inQuotes; i++; continue;
    }
    if (!inQuotes && c === ",") { row.push(field); field = ""; i++; continue; }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(x => String(x || "").trim() !== "")) rows.push(row.map(x => String(x || "").trim()));
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.some(x => String(x || "").trim() !== "")) rows.push(row.map(x => String(x || "").trim()));
  return rows;
}

function toObjects(rows) {
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    for (let i = 0; i < header.length; i++) o[header[i]] = r[i] ?? "";
    return o;
  });
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

async function loadData() {
  const res = await fetch(encodeURI(DATA_PATH), { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} (${DATA_PATH})`);
  const text = await res.text();
  const objs = toObjects(parseCSV(text));

  return objs.map(o => ({
    org: String(o.org || "").trim(),
    year: Number(o.year),
    current_assets: o.current_assets,
    quick_assets: o.quick_assets,
    current_liabilities: o.current_liabilities,
    total_liabilities: o.total_liabilities,
    total_unrestricted_net_assets: o.total_unrestricted_net_assets,
  })).filter(r => r.org && Number.isFinite(r.year));
}

function destroyChart() {
  if (__chart) __chart.destroy();
  __chart = null;
}

function renderLine(canvas, labels, datasets, title) {
  destroyChart();
  __chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: { title: { display: true, text: title } },
      scales: { y: { 
        max: 15,
        ticks: { callback: (v) => Number(v).toFixed(2) } 
      } 
    }
    }
  });
}

function renderGroupedBar(canvas, labels, datasets, title) {
  destroyChart();
  __chart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: title } },
      scales: { y: { ticks: { callback: (v) => Number(v).toFixed(2) } } }
    }
  });
}

function setSelectOptions(selectEl, values, includeAll = false) {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  if (includeAll) {
    const opt = document.createElement("option");
    opt.value = "All";
    opt.textContent = "All";
    selectEl.appendChild(opt);
  }

  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;                 // ✅ keep real value (lowercase key)
    opt.textContent = String(v).toUpperCase(); // ✅ display uppercase
    selectEl.appendChild(opt);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded. Make sure Chart.js script is included before graphs.js");
    return;
  }

  // Flexible hookups (works with your current layout)
  const orgSelect = pickEl(["#orgSelect", "#organizationSelect", "select[name='organization']"]);
  const chartTypeSelect = pickEl(["#chartTypeSelect", "#chartType", "select[name='chartType']"]);
  const ratioSelect = pickEl(["#ratioSelect", "#metricSelect", "select[name='ratio']"]);
  const startYearEl = document.getElementById("yearMin");
  const endYearEl   = document.getElementById("yearMax");  
  const applyBtn = pickEl(["#applyBtn", "button#apply", "button"]);

  // Canvas: try common ids, else first canvas on page
  const canvas = document.getElementById("ratioChart");
  if (!canvas) {
    console.error("No canvas found on page.");
    return;
  }

  let data;
  try {
    data = await loadData();
  } catch (e) {
    console.error(e);
    return;
  }

  const orgsAll = uniq(data.map(r => r.org)).sort();
  const yearsAll = uniq(data.map(r => r.year)).sort((a, b) => a - b);

  // Populate dropdowns if needed
  if (orgSelect && orgSelect.options.length <= 1) setSelectOptions(orgSelect, orgsAll, true);
  // If your org select uses uppercase labels, map back:
  function normalizeOrg(v) {
    if (!v || v === "All") return "All";
    const lower = v.toLowerCase();
    const found = orgsAll.find(o => o.toLowerCase() === lower);
    return found || v;
  }

  if (ratioSelect && ratioSelect.options.length <= 1) setSelectOptions(ratioSelect, Object.keys(METRICS), false);

  // Default years
  if (startYearEl && !startYearEl.value) startYearEl.value = String(yearsAll[0]);
  if (endYearEl && !endYearEl.value) endYearEl.value = String(yearsAll[yearsAll.length - 1]);

  function apply() {
    // ---- Read UI ----
    const orgValRaw = orgSelect ? orgSelect.value : "All";
    const chartType = chartTypeSelect ? chartTypeSelect.value : "Multi-Line (Trends Over Time)";
    const metricName = ratioSelect ? ratioSelect.value : "Quick Ratio";
    const metricFn = METRICS[metricName] || METRICS["Quick Ratio"];
  
    // Years (your IDs are yearMin/yearMax)
    const y0 = Number(startYearEl?.value);
    const y1 = Number(endYearEl?.value);
  
    const start = Number.isFinite(y0) ? y0 : yearsAll[0];
    const end   = Number.isFinite(y1) ? y1 : yearsAll[yearsAll.length - 1];
  
    const from = Math.min(start, end);
    const to   = Math.max(start, end);
  
    // ---- Normalize org (BCZ dropdown vs bcz in CSV) ----
    const orgVal =
      (orgValRaw && orgValRaw !== "All")
        ? (orgsAll.find(o => o.toLowerCase() === String(orgValRaw).toLowerCase()) || orgValRaw)
        : "All";
  
    const orgList = (orgVal && orgVal !== "All") ? [orgVal] : orgsAll;
  
    // ---- Filter data to year range ----
    const years = yearsAll.filter(y => y >= from && y <= to);
  
    // Build fast lookup map (org__year -> row)
    const idx = new Map();
    for (const r of data) {
      if (r.year >= from && r.year <= to) idx.set(`${r.org}__${r.year}`, r);
    }
  
    // ---- Branch: Grouped Bar vs Multi-Line ----
    const ct = String(chartType || "").toLowerCase();
    const isBar = ct.includes("bar");           // ✅ catches "bar", "grouped bar", etc.
    if (isBar) {
      // Grouped bar compares orgs for ONE year (use end of range)
      // Pick the latest year that actually exists in the filtered range
      let chosenYear = years.length ? years[years.length - 1] : null;

      // Fallback: if the selected range has no years, use the global latest year
      if (!chosenYear) chosenYear = yearsAll[yearsAll.length - 1];
  
      const labels = orgList.map(o => o.toUpperCase());
      const values = orgList.map(o => {
        // Try exact chosenYear first
        let row = idx.get(`${o}__${chosenYear}`);
      
        // If missing, fall back to the latest available year <= chosenYear within the selected range
        if (!row) {
          for (let i = years.length - 1; i >= 0; i--) {
            const y = years[i];
            row = idx.get(`${o}__${y}`);
            if (row) break;
          }
        }
      
        return row ? metricFn(row) : null;
      });      
  
      // If everything is null, warn in console (usually org mismatch or missing year)
      if (values.every(v => v == null)) {
        console.warn("No data found for grouped bar. Check org keys & selected year.", { orgList, chosenYear });
      }
  
      const colors = values.map(v => statusColor(metricName, v));

    renderGroupedBar(
      canvas,
      labels,
      [{
        label: `${metricName} • ${chosenYear}`,
        data: values,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1,
      }],
      `${metricName} • ${chosenYear}`
    );

  
      return;
    }
  
    // ---- Multi-Line: trend over years ----
    const datasets = orgList.map(org => {
      const series = years.map(y => {
        const row = idx.get(`${org}__${y}`);
        return row ? metricFn(row) : null;
      });
    
      const latest = lastFinite(series);
      const c = statusColor(metricName, latest);
    
      return {
        label: org.toUpperCase(),
        data: series,
        borderColor: c,
        backgroundColor: c,
        pointBackgroundColor: c,
        pointBorderColor: c,
        spanGaps: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
      };
    });
    
  
    // If all datasets are empty, warn in console
    const allEmpty = datasets.every(ds => ds.data.every(v => v == null));
    if (allEmpty) {
      console.warn("No data available for selected filters.", { orgList, from, to, metricName });
    }
  
    renderLine(canvas, years.map(String), datasets, metricName);
  }  

  applyBtn?.addEventListener("click", (e) => { e.preventDefault(); apply(); });

  orgSelect?.addEventListener("change", apply);
  ratioSelect?.addEventListener("change", apply);
  chartTypeSelect?.addEventListener("change", apply);
  startYearEl?.addEventListener("change", apply);
  endYearEl?.addEventListener("change", apply);

  apply();

});
