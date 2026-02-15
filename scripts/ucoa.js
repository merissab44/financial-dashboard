async function loadExcelAndRender() {
    const status = document.getElementById("status");
    const tbody = document.getElementById("ucoa-body");
  
    try {
      // IMPORTANT: you must serve files via a local server (not file://)
      const res = await fetch("./UCOA_V4.xlsx");
      if (!res.ok) throw new Error(`Failed to fetch Excel: ${res.status}`);
  
      const arrayBuffer = await res.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
  
      // Convert sheet to array of objects using first row as headers
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  
      // Clear old rows
      tbody.innerHTML = "";
  
      for (const r of rows) {
        const org = r.org || r["Source Org"] || "";
        const account = r.account_name || r["Account Name"] || "";
        const dim = r["strategic dimensions"] || r["Strategic Dimension"] || "";
        const cat = r.financial_category || r["Financial Category"] || "";
        const grant = r.grant_report || r["grant_report"] || "";
  
        const tr = document.createElement("tr");
  
        // Add a dim class like dim-fn02 if it contains FN-02
        const dimMatch = String(dim).match(/\bFN-(\d{1,2})\b/i);
        const dimClass = dimMatch ? `dim-fn${String(dimMatch[1]).padStart(2, "0")}` : "";
  
        tr.innerHTML = `
          <td><strong>${escapeHtml(org)}</strong></td>
          <td>${escapeHtml(account)}</td>
          <td class="${dimClass}">${escapeHtml(dim)}</td>
          <td>${escapeHtml(cat)}</td>
          <td>${/^https?:\/\//i.test(grant) ? `<a href="${escapeHtml(grant)}" target="_blank">Link</a>` : escapeHtml(grant)}</td>
        `;
        tbody.appendChild(tr);
      }
  
      status.textContent = `Loaded ${rows.length} rows from ${sheetName}.`;
    } catch (err) {
      console.error(err);
      status.textContent =
        "Could not load the Excel file. Make sure you're running a local server and the file name/path is correct.";
    }
  }
  
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  loadExcelAndRender();
  