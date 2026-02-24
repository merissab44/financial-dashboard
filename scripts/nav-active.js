/**
 * nav.js - Modular Navigation for Rise East Dashboard
 * Consolidates to 7 core pages identified in the Architecture [Source 1]
 */
document.addEventListener("DOMContentLoaded", () => {
    const navContainer = document.getElementById("global-nav");
    if (!navContainer) return;

    // The 7-Page Architecture [Source 1]
    const pages = [
        { name: "Home", url: "index.html" },
        { name: "Performance", url: "graphs.html" },
        { name: "Financials", url: "financials.html" },
        { name: "Investment Areas", url: "investments.html" },
        { name: "Grant Summary", url: "grants.html" },
        { name: "Source Docs", url: "docs.html" },
        { name: "Crosswalk", url: "crosswalk.html" }
    ];

    // Detect current page for "active" state logic [Source 25]
    const currentPath = window.location.pathname.split("/").pop() || "index.html";

    const navHTML = `
        <nav class="dashboard-nav">
            <div class="nav-brand">Rise East</div>
            <ul class="nav-tabs">
                ${pages.map(page => `
                    <li>
                        <a href="${page.url}" 
                           class="nav-link ${currentPath === page.url ? 'active' : ''}">
                           ${page.name}
                        </a>
                    </li>
                `).join('')}
            </ul>
            <button class="logout-btn" style="background:#000; color:#fff; border:none; padding:8px 20px; border-radius:20px; cursor:pointer;">Logout</button>
        </nav>
    `;

    navContainer.innerHTML = navHTML;
});
