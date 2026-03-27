const adminKeyInput = document.getElementById("adminKeyInput");
const daysInput = document.getElementById("daysInput");
const dateInput = document.getElementById("dateInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const refreshBtn = document.getElementById("refreshBtn");
const statusBox = document.getElementById("statusBox");
const securityBadge = document.getElementById("securityBadge");
const trendSubtitle = document.getElementById("trendSubtitle");
const trendChart = document.getElementById("trendChart");
const topAppsBody = document.getElementById("topAppsBody");
const familiesBody = document.getElementById("familiesBody");

const metricFamilies = document.getElementById("metricFamilies");
const metricChildren = document.getElementById("metricChildren");
const metricActiveChildren = document.getElementById("metricActiveChildren");
const metricTodayMinutes = document.getElementById("metricTodayMinutes");
const metricTodayEvents = document.getElementById("metricTodayEvents");
const metricParentSessions = document.getElementById("metricParentSessions");

const STORAGE_KEY = "pc_parental_admin_key_v1";
const REFRESH_MS = 60_000;

let refreshTimer = null;

function setStatus(message, type = "normal") {
  statusBox.textContent = message;
  statusBox.className = `status${type === "normal" ? "" : ` ${type}`}`;
}

function setSecurityBadge(message, visible) {
  if (!visible) {
    securityBadge.textContent = "";
    securityBadge.classList.add("hidden");
    return;
  }
  securityBadge.textContent = message;
  securityBadge.classList.remove("hidden");
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("tr-TR") : "0";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("tr-TR");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setSummary(summary) {
  metricFamilies.textContent = formatNumber(summary.totalFamilies);
  metricChildren.textContent = formatNumber(summary.totalChildren);
  metricActiveChildren.textContent = formatNumber(summary.activeChildren24h);
  metricTodayMinutes.textContent = formatNumber(summary.todayMinutes);
  metricTodayEvents.textContent = formatNumber(summary.todayEvents);
  metricParentSessions.textContent = formatNumber(summary.parentSessionsActive);
  trendSubtitle.textContent = `Son ${formatNumber(summary.days)} gun`;
}

function renderTrend(trend) {
  trendChart.innerHTML = "";
  if (!Array.isArray(trend) || !trend.length) {
    trendChart.innerHTML = "<div class='status'>Trend verisi yok.</div>";
    return;
  }

  const maxMinutes = Math.max(1, ...trend.map((item) => Number(item.minutes || 0)));
  for (const item of trend) {
    const minutes = Number(item.minutes || 0);
    const events = Number(item.events || 0);
    const dateLabel = String(item.date || "").slice(5);
    const heightPercent = Math.max(6, Math.round((minutes / maxMinutes) * 100));

    const wrap = document.createElement("div");
    wrap.className = "bar";
    wrap.innerHTML = `
      <div class="bar-value">${formatNumber(minutes)} dk</div>
      <div class="bar-fill" style="height:${heightPercent}%;" title="${formatNumber(events)} olay"></div>
      <div class="bar-label">${escapeHtml(dateLabel)}</div>
    `;
    trendChart.appendChild(wrap);
  }
}

function renderTopApps(topApps) {
  topAppsBody.innerHTML = "";
  if (!Array.isArray(topApps) || !topApps.length) {
    topAppsBody.innerHTML = "<tr><td colspan='2'>Veri yok</td></tr>";
    return;
  }

  for (const app of topApps) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(app.appName)}</td>
      <td class="mono">${formatNumber(app.minutes)}</td>
    `;
    topAppsBody.appendChild(tr);
  }
}

function renderFamilies(families) {
  familiesBody.innerHTML = "";
  if (!Array.isArray(families) || !families.length) {
    familiesBody.innerHTML = "<tr><td colspan='7'>Aile verisi yok</td></tr>";
    return;
  }

  for (const family of families) {
    const children = Array.isArray(family.children) ? family.children : [];
    const childrenHtml = children
      .slice(0, 3)
      .map(
        (child) =>
          `<span>${escapeHtml(child.name)} <span class="mono">(${escapeHtml(child.deviceId)})</span> - ${escapeHtml(formatDateTime(child.lastSeenAt))}</span>`
      )
      .join("");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${escapeHtml(family.familyId)}</td>
      <td>
        <strong>${escapeHtml(family.parentName)}</strong><br />
        <span class="mono">${escapeHtml(family.parentEmail || "-")}</span>
      </td>
      <td>
        ${formatNumber(family.childCount)}
        <div class="family-children">${childrenHtml || "-"}</div>
      </td>
      <td>${formatNumber(family.activeChildren24h)}</td>
      <td>${formatNumber(family.minutesToday)}</td>
      <td>${formatNumber(family.minutesInRange)}</td>
      <td>${escapeHtml(formatDateTime(family.lastSeenAt))}</td>
    `;
    familiesBody.appendChild(tr);
  }
}

async function fetchOverview() {
  const days = Number(daysInput.value || 7);
  const date = dateInput.value || new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    days: String(days),
    date
  });

  const key = adminKeyInput.value.trim();
  const headers = {};
  if (key) {
    headers["x-parental-admin-key"] = key;
  }

  const response = await fetch(`/parental-control/admin/overview?${params.toString()}`, {
    headers
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw || "Bilinmeyen hata" };
  }

  if (!response.ok) {
    throw new Error(data.message || "Istek basarisiz");
  }
  return data;
}

async function refreshOverview() {
  try {
    const data = await fetchOverview();
    setSummary(data.summary || {});
    renderTrend(data.trend || []);
    renderTopApps(data.topApps || []);
    renderFamilies(data.families || []);

    if (data.insecureMode) {
      setSecurityBadge("Uyari: PARENTAL_ADMIN_KEY tanimli degil (gelistirme modu).", true);
    } else {
      setSecurityBadge("Guvenli mod: admin key dogrulandi.", true);
    }

    setStatus(`Guncellendi: ${new Date().toLocaleTimeString("tr-TR")}`, "ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yukleme hatasi";
    setStatus(message, "error");
  }
}

function saveKey() {
  const key = adminKeyInput.value.trim();
  if (!key) {
    localStorage.removeItem(STORAGE_KEY);
    setStatus("Kayitli admin key temizlendi.", "ok");
    return;
  }
  localStorage.setItem(STORAGE_KEY, key);
  setStatus("Admin key kaydedildi.", "ok");
}

function loadSavedKey() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    adminKeyInput.value = saved;
  }
}

function setDefaultDate() {
  dateInput.value = new Date().toISOString().slice(0, 10);
}

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    refreshOverview().catch(() => {
      // status already handled
    });
  }, REFRESH_MS);
}

saveKeyBtn.addEventListener("click", () => {
  saveKey();
});

refreshBtn.addEventListener("click", () => {
  refreshOverview().catch(() => {
    // status already handled
  });
});

daysInput.addEventListener("change", () => {
  refreshOverview().catch(() => {
    // status already handled
  });
});

dateInput.addEventListener("change", () => {
  refreshOverview().catch(() => {
    // status already handled
  });
});

function bootstrap() {
  loadSavedKey();
  setDefaultDate();
  startAutoRefresh();
  refreshOverview().catch(() => {
    // status already handled
  });
}

bootstrap();
