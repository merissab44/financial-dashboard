/**
 * graphs.js - Powers the Dashboard Financial Performance
 * Data Source: audited_ratios_input.csv
 */
const DATA_PATH = "data/audited_ratios_input.csv";
let __chart = null;

function parseNumber(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const x = Number(raw.replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
}

function safeDiv(a, b) {
  const A = parseNumber(a);
  const B = parseNumber(b);
  if (A == null || B == null || B === 0) return null;
  return A / B;
}

function liquidityDiv(a, b) {
  return safeDiv(a, b);
}

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (!inQuotes && c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
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
  const header = (rows[0] ?? []).map(h => String(h ?? "").trim());
  return rows.slice(1).map(r => {
    const o = {};
    for (let i = 0; i < header.length; i++) o[header[i]] = r[i] ?? "";
    return o;
  });
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

function destroyChart() {
  if (__chart) __chart.destroy();
  __chart = null;
}

function statusColor(metricName, v) {
  if (v == null || !Number.isFinite(v)) return "#6b7280";

  if (metricName === "Current Ratio") {
    if (v < 1) return "#ef4444";
    if (v < 1.5) return "#f59e0b";
    return "#22c55e";
  }

  if (metricName === "Quick Ratio") {
    if (v >= 3) return "#ef4444";
    if (v > 2 && v < 3) return "#f59e0b";
    if (v >= 1 && v <= 2) return "#22c55e";
    return "#f59e0b";
  }

  if (metricName === "Debt Ratio") {
    if (v > 1) return "#ef4444";
    if (v > 0.5) return "#f59e0b";
    return "#22c55e";
  }

  return "#3b82f6";
}

function metricToId(metricName) {
  return (
    "val-" +
    metricName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/\//g, "-")
      .replace(/[^a-z0-9\-]/g, "")
  );
}

const METRIC_DEFS = [
  {
    name: "Current Ratio",
    requires: ["current_assets", "current_liabilities"],
    calc: (r) => liquidityDiv(r.current_assets, r.current_liabilities),
  },
  {
    name: "Quick Ratio",
    requires: ["quick_assets", "current_liabilities"],
    calc: (r) => liquidityDiv(r.quick_assets, r.current_liabilities),
  },
  {
    name: "Debt Ratio",
    requires: ["total_liabilities", "total_unrestricted_net_assets"],
    calc: (r) => safeDiv(r.total_liabilities, r.total_unrestricted_net_assets),
  },
];

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
      scales: { y: { ticks: { callback: (v) => Number(v).toFixed(2) } } },
    },
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
      scales: {
        y: {
          max: 20,
          ticks: { callback: (v) => Number(v).toFixed(2) },
        },
      },
    },
  });
}

function updateRatioCards(row) {
  for (const def of METRIC_DEFS) {
    const id = metricToId(def.name);
    const el = document.getElementById(id);
    if (!el) continue;
    const val = row ? def.calc(row) : null;
    el.textContent = Number.isFinite(val) ? val.toFixed(2) : "—";
    el.style.color = statusColor(def.name, val);
  }
}

function setSelectOptions(selectEl, values, includeAll) {
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
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

async function loadDashboard() {
  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded. Make sure the Chart.js script is included before graphs.js");
    return;
  }

  const orgSelect = document.getElementById("orgSelect");
  const ratioSelect = document.getElementById("ratioSelect");
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const yearMinEl = document.getElementById("yearMin");
  const yearMaxEl = document.getElementById("yearMax");
  const applyBtn = document.getElementById("applyBtn");
  const canvas = document.getElementById("ratioChart");

  if (!canvas) {
    console.error("No canvas found (#ratioChart). ");
    return;
  }

  let data;
  try {
    const res = await fetch(encodeURI(DATA_PATH), { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} (${DATA_PATH})`);
    const text = await res.text();
    const rows = parseCSV(text);
    const objs = toObjects(rows);

    data = objs
      .map(o => ({
        org: String(o.org || "").trim(),
        year: Number(o.year),
        current_assets: o.current_assets,
        quick_assets: o.quick_assets,
        current_liabilities: o.current_liabilities,
        total_liabilities: o.total_liabilities,
        total_unrestricted_net_assets: o.total_unrestricted_net_assets,
      }))
      .filter(r => r.org && Number.isFinite(r.year));

    if (!data.length) {
      console.error("No rows loaded from audited_ratios_input.csv");
      return;
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const orgs = uniq(data.map(r => r.org)).sort();
  const yearsAll = uniq(data.map(r => r.year)).sort((a, b) => a - b);

  setSelectOptions(orgSelect, orgs, true);
  setSelectOptions(ratioSelect, METRIC_DEFS.map(d => d.name), false);

  if (yearMinEl && !yearMinEl.value) yearMinEl.value = String(yearsAll[0]);
  if (yearMaxEl && !yearMaxEl.value) yearMaxEl.value = String(yearsAll[yearsAll.length - 1]);

  function apply() {
    const orgVal = orgSelect ? orgSelect.value : "All";
    const metricName = ratioSelect ? ratioSelect.value : METRIC_DEFS[0].name;
    const def = METRIC_DEFS.find(d => d.name === metricName) || METRIC_DEFS[0];
    const chartType = String(chartTypeSelect?.value || "");

    const y0 = Number(yearMinEl?.value);
    const y1 = Number(yearMaxEl?.value);
    const from = Number.isFinite(y0) ? y0 : yearsAll[0];
    const to = Number.isFinite(y1) ? y1 : yearsAll[yearsAll.length - 1];
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const years = yearsAll.filter(y => y >= start && y <= end);

    const orgList = orgVal === "All" ? orgs : [orgVal];

    const idx = new Map();
    for (const r of data) {
      if (r.year < start || r.year > end) continue;
      idx.set(`${r.org}__${r.year}`, r);
    }

    const isBar = chartType.toLowerCase().includes("bar");
    if (isBar) {
      const chosenYear = years.length ? years[years.length - 1] : yearsAll[yearsAll.length - 1];
      const labels = orgList.map(o => o.toUpperCase());
      const values = orgList.map(o => {
        const row = idx.get(`${o}__${chosenYear}`);
        return row ? def.calc(row) : null;
      });
      const colors = values.map(v => statusColor(def.name, v));

      renderGroupedBar(
        canvas,
        labels,
        [
          {
            label: `${def.name} • ${chosenYear}`,
            data: values,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
          },
        ],
        `${def.name} • ${chosenYear}`
      );

      const rowForCards = orgVal !== "All" ? idx.get(`${orgVal}__${chosenYear}`) : null;
      updateRatioCards(rowForCards);
      return;
    }

    const datasets = orgList.map(org => {
      const series = years.map(y => {
        const row = idx.get(`${org}__${y}`);
        return row ? def.calc(row) : null;
      });
      const last = [...series].reverse().find(v => v != null && Number.isFinite(v)) ?? null;
      const c = statusColor(def.name, last);
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

    renderLine(canvas, years.map(String), datasets, def.name);

    const cardYear = years.length ? years[years.length - 1] : yearsAll[yearsAll.length - 1];
    const rowForCards = orgVal !== "All" ? idx.get(`${orgVal}__${cardYear}`) : null;
    updateRatioCards(rowForCards);
  }

  applyBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    apply();
  });

  orgSelect?.addEventListener("change", apply);
  ratioSelect?.addEventListener("change", apply);
  chartTypeSelect?.addEventListener("change", apply);
  yearMinEl?.addEventListener("change", apply);
  yearMaxEl?.addEventListener("change", apply);

  apply();
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});