const statusBox = document.getElementById("parentStatus");
const registerParentForm = document.getElementById("registerParentForm");
const loginParentForm = document.getElementById("loginParentForm");
const parentFamilyIdInput = document.getElementById("parentFamilyId");
const pairingMinutesInput = document.getElementById("pairingMinutes");
const createPairCodeBtn = document.getElementById("createPairCodeBtn");
const pairingCodeValue = document.getElementById("pairingCodeValue");
const pairingCodeExpiry = document.getElementById("pairingCodeExpiry");
const refreshChildrenBtn = document.getElementById("refreshChildrenBtn");
const activeChildSelect = document.getElementById("activeChildSelect");
const childPasswordInput = document.getElementById("childPasswordInput");
const saveChildPasswordBtn = document.getElementById("saveChildPasswordBtn");
const childrenList = document.getElementById("childrenList");
const createParentVerifyCodeBtn = document.getElementById("createParentVerifyCodeBtn");
const parentVerifyCodeValue = document.getElementById("parentVerifyCodeValue");
const parentVerifyCodeExpiry = document.getElementById("parentVerifyCodeExpiry");
const limitWeekday = document.getElementById("limitWeekday");
const limitWeekend = document.getElementById("limitWeekend");
const bedtimeWeekdayStart = document.getElementById("bedtimeWeekdayStart");
const bedtimeWeekdayEnd = document.getElementById("bedtimeWeekdayEnd");
const bedtimeWeekendStart = document.getElementById("bedtimeWeekendStart");
const bedtimeWeekendEnd = document.getElementById("bedtimeWeekendEnd");
const appLimitsInput = document.getElementById("appLimitsInput");
const blockedDomainsInput = document.getElementById("blockedDomainsInput");
const allowDomainsInput = document.getElementById("allowDomainsInput");
const safeSearchInput = document.getElementById("safeSearchInput");
const loadPolicyBtn = document.getElementById("loadPolicyBtn");
const savePolicyBtn = document.getElementById("savePolicyBtn");
const usageDateInput = document.getElementById("usageDateInput");
const refreshUsageSummaryBtn = document.getElementById("refreshUsageSummaryBtn");
const usageTotalMinutes = document.getElementById("usageTotalMinutes");
const usageByAppBody = document.getElementById("usageByAppBody");
const locationDateInput = document.getElementById("locationDateInput");
const refreshLocationBtn = document.getElementById("refreshLocationBtn");
const refreshLocationHistoryBtn = document.getElementById("refreshLocationHistoryBtn");
const locationLatestBox = document.getElementById("locationLatestBox");
const locationMapLink = document.getElementById("locationMapLink");
const locationHistoryBody = document.getElementById("locationHistoryBody");
const refreshDashboardBtn = document.getElementById("refreshDashboardBtn");
const dashboardCards = document.getElementById("dashboardCards");
const protectionModeSelect = document.getElementById("protectionModeSelect");
const saveProtectionModeBtn = document.getElementById("saveProtectionModeBtn");
const protectionModeHint = document.getElementById("protectionModeHint");
const refreshComplianceBtn = document.getElementById("refreshComplianceBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const complianceOutput = document.getElementById("complianceOutput");
const deleteAccountForm = document.getElementById("deleteAccountForm");

const STORAGE_KEY = "pc_parent_session_v1";
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND_KEYS = ["sat", "sun"];

const state = {
  familyId: "",
  parentToken: "",
  children: [],
  activeChildId: "",
  protectionMode: "STANDARD"
};

const MODE_STANDARD = "STANDARD";
const MODE_ENHANCED = "ENHANCED_FAMILY_LINK";

function setStatus(message, type = "normal") {
  statusBox.textContent = message;
  statusBox.className = `status${type === "normal" ? "" : ` ${type}`}`;
}

function setTodayDefault() {
  const today = new Date().toISOString().slice(0, 10);
  usageDateInput.value = today;
  if (locationDateInput) {
    locationDateInput.value = today;
  }
}

function persistSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      familyId: state.familyId,
      parentToken: state.parentToken,
      activeChildId: state.activeChildId
    })
  );
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.familyId = parsed.familyId ?? "";
    state.parentToken = parsed.parentToken ?? "";
    state.activeChildId = parsed.activeChildId ?? "";
    if (state.familyId) parentFamilyIdInput.value = state.familyId;
  } catch {
    // ignore invalid storage
  }
}

function requireAuth() {
  if (!state.parentToken) {
    throw new Error("Ebeveyn girisi gerekli.");
  }
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  if (state.parentToken) {
    headers["x-parent-token"] = state.parentToken;
  }

  if (!headers["Content-Type"] && options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    ...options,
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

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getActiveChildId() {
  const selected = activeChildSelect.value;
  if (!selected) {
    throw new Error("Once bir cocuk secin.");
  }
  return selected;
}

function setChildOptions(children) {
  activeChildSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Cocuk secin";
  activeChildSelect.appendChild(placeholder);

  children.forEach((child) => {
    const option = document.createElement("option");
    option.value = child.childId;
    option.textContent = `${child.name} (${child.deviceId})`;
    activeChildSelect.appendChild(option);
  });

  if (state.activeChildId && children.some((item) => item.childId === state.activeChildId)) {
    activeChildSelect.value = state.activeChildId;
  }
}

function renderChildrenList(children) {
  childrenList.innerHTML = "";
  if (!children.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Henuz cocuk cihaz baglanmadi.";
    childrenList.appendChild(empty);
    return;
  }

  children.forEach((child) => {
    const card = document.createElement("div");
    card.className = "child-card";
    const disclosureText = child.disclosureAckAt
      ? `Onaylandi: ${new Date(child.disclosureAckAt).toLocaleString()}`
      : "Bekliyor";
    const passwordText = child.childPasswordUpdatedAt
      ? `Belirlendi: ${new Date(child.childPasswordUpdatedAt).toLocaleString()}`
      : "Henuz belirlenmedi";
    const locationText = child.lastLocationAt
      ? new Date(child.lastLocationAt).toLocaleString()
      : "Henuz konum paylasilmadi";
    card.innerHTML = `
      <strong>${child.name}</strong>
      <div class="hint mono">cocukKimligi: ${child.childId}</div>
      <div class="hint mono">cihazKimligi: ${child.deviceId}</div>
      <div class="hint">Cocuk giris sifresi: ${passwordText}</div>
      <div class="hint">Cocuk bilgilendirme onayi: ${disclosureText}</div>
      <div class="hint">Son konum paylasimi: ${locationText}</div>
      <div class="hint">Son gorulme: ${new Date(child.lastSeenAt).toLocaleString()}</div>
    `;
    childrenList.appendChild(card);
  });
}

function parseAppLimits(text) {
  const result = {};
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [left, right] = line.split("=");
    const appName = String(left || "").trim();
    const minutes = Number(String(right || "").trim());
    if (!appName) continue;
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
      throw new Error(`Gecersiz uygulama limiti: ${line}`);
    }
    result[appName] = Math.floor(minutes);
  }
  return result;
}

function parseLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPolicyFromForm() {
  const weekdayLimit = Math.floor(Number(limitWeekday.value));
  const weekendLimit = Math.floor(Number(limitWeekend.value));
  if (!Number.isFinite(weekdayLimit) || weekdayLimit < 0 || weekdayLimit > 1440) {
    throw new Error("Hafta ici limit 0-1440 olmali.");
  }
  if (!Number.isFinite(weekendLimit) || weekendLimit < 0 || weekendLimit > 1440) {
    throw new Error("Hafta sonu limit 0-1440 olmali.");
  }

  const dailyLimitMinutes = {};
  for (const day of WEEKDAY_KEYS) dailyLimitMinutes[day] = weekdayLimit;
  for (const day of WEEKEND_KEYS) dailyLimitMinutes[day] = weekendLimit;

  const wkStart = bedtimeWeekdayStart.value || "21:30";
  const wkEnd = bedtimeWeekdayEnd.value || "07:00";
  const weStart = bedtimeWeekendStart.value || "22:30";
  const weEnd = bedtimeWeekendEnd.value || "08:00";

  const bedtime = {};
  for (const day of WEEKDAY_KEYS) bedtime[day] = { start: wkStart, end: wkEnd };
  for (const day of WEEKEND_KEYS) bedtime[day] = { start: weStart, end: weEnd };

  return {
    dailyLimitMinutes,
    bedtime,
    appLimitsMinutes: parseAppLimits(appLimitsInput.value),
    webFilter: {
      safeSearch: !!safeSearchInput.checked,
      blockedDomains: parseLines(blockedDomainsInput.value),
      allowDomains: parseLines(allowDomainsInput.value)
    }
  };
}

function applyPolicyToForm(policy) {
  const weekdayValues = WEEKDAY_KEYS.map((day) => policy.dailyLimitMinutes?.[day] ?? 0);
  const weekendValues = WEEKEND_KEYS.map((day) => policy.dailyLimitMinutes?.[day] ?? 0);
  limitWeekday.value = String(Math.max(...weekdayValues, 0));
  limitWeekend.value = String(Math.max(...weekendValues, 0));

  bedtimeWeekdayStart.value = policy.bedtime?.mon?.start ?? "21:30";
  bedtimeWeekdayEnd.value = policy.bedtime?.mon?.end ?? "07:00";
  bedtimeWeekendStart.value = policy.bedtime?.sat?.start ?? "22:30";
  bedtimeWeekendEnd.value = policy.bedtime?.sat?.end ?? "08:00";

  const appLines = Object.entries(policy.appLimitsMinutes || {})
    .map(([appName, minutes]) => `${appName}=${minutes}`)
    .join("\n");
  appLimitsInput.value = appLines;

  blockedDomainsInput.value = (policy.webFilter?.blockedDomains || []).join("\n");
  allowDomainsInput.value = (policy.webFilter?.allowDomains || []).join("\n");
  safeSearchInput.checked = !!policy.webFilter?.safeSearch;
}

function renderUsageSummary(data) {
  usageTotalMinutes.textContent = String(data.totalMinutes || 0);
  usageByAppBody.innerHTML = "";
  const rows = data.byApp || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='2' class='hint'>Bu tarihte kullanim yok.</td>";
    usageByAppBody.appendChild(tr);
    return;
  }

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.appName}</td><td class="mono">${item.minutes}</td>`;
    usageByAppBody.appendChild(tr);
  });
}

function formatCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "-";
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function renderLocationLatest(data) {
  if (!locationLatestBox) return;
  const latest = data?.latest;
  if (!latest) {
    locationLatestBox.textContent = "Henuz konum verisi yok.";
    locationLatestBox.className = "status";
    if (locationMapLink) {
      locationMapLink.style.display = "none";
      locationMapLink.removeAttribute("href");
    }
    return;
  }

  const coordText = formatCoordinates(Number(latest.latitude), Number(latest.longitude));
  const accuracyText =
    typeof latest.accuracyMeters === "number" ? `${Math.round(latest.accuracyMeters)} m` : "Bilinmiyor";
  const capturedAtText = latest.capturedAt ? new Date(latest.capturedAt).toLocaleString() : "-";
  locationLatestBox.textContent = `Son konum: ${coordText} | Hassasiyet: ${accuracyText} | Zaman: ${capturedAtText}`;
  locationLatestBox.className = "status ok";

  if (locationMapLink) {
    const mapHref = `https://maps.google.com/?q=${encodeURIComponent(`${latest.latitude},${latest.longitude}`)}`;
    locationMapLink.href = mapHref;
    locationMapLink.style.display = "inline-flex";
  }
}

function renderLocationHistory(data) {
  if (!locationHistoryBody) return;
  locationHistoryBody.innerHTML = "";
  const points = Array.isArray(data?.points) ? data.points : [];
  if (!points.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='3' class='hint'>Bu tarihte konum kaydi yok.</td>";
    locationHistoryBody.appendChild(tr);
    return;
  }

  points.forEach((point) => {
    const tr = document.createElement("tr");
    const timeText = point.capturedAt ? new Date(point.capturedAt).toLocaleString() : "-";
    const coordText = formatCoordinates(Number(point.latitude), Number(point.longitude));
    const accuracyText =
      typeof point.accuracyMeters === "number" ? `${Math.round(point.accuracyMeters)} m` : "Bilinmiyor";
    tr.innerHTML = `<td>${timeText}</td><td class="mono">${coordText}</td><td>${accuracyText}</td>`;
    locationHistoryBody.appendChild(tr);
  });
}

function renderDashboard(children) {
  dashboardCards.innerHTML = "";
  if (!children.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Genel gorunum verisi yok.";
    dashboardCards.appendChild(empty);
    return;
  }

  children.forEach((child) => {
    const topApps = (child.topApps || [])
      .slice(0, 3)
      .map((app) => `${app.appName}: ${app.minutes} dk`)
      .join(" | ");
    const card = document.createElement("div");
    card.className = "child-card";
    card.innerHTML = `
      <strong>${child.name}</strong>
      <div class="hint mono">Toplam: ${child.totalMinutes} dk</div>
      <div class="hint">${topApps || "En cok kullanilan uygulama yok"}</div>
    `;
    dashboardCards.appendChild(card);
  });
}

function renderProtectionMode(compliance) {
  const mode = compliance?.protectionMode === MODE_ENHANCED ? MODE_ENHANCED : MODE_STANDARD;
  state.protectionMode = mode;
  if (protectionModeSelect) {
    protectionModeSelect.value = mode;
  }

  if (!protectionModeHint) return;

  if (mode === MODE_ENHANCED) {
    protectionModeHint.textContent =
      "Gelismis mod aktif. Family Link denetimini acarak cihaz silme/devre disi birakma riskini azaltabilirsiniz.";
    protectionModeHint.className = "status ok";
    return;
  }

  protectionModeHint.textContent =
    "Standart mod aktif. Tek uygulama ile calisir; sistem seviyesinde kaldirma engeli garantisi yoktur.";
  protectionModeHint.className = "status";
}

async function refreshChildren() {
  requireAuth();
  const data = await api("/parental-control/parent/children");
  state.children = data.children || [];
  setChildOptions(state.children);
  renderChildrenList(state.children);
  if (!state.activeChildId && state.children.length) {
    state.activeChildId = state.children[0].childId;
    activeChildSelect.value = state.activeChildId;
  }
  persistSession();
}

async function saveChildPassword() {
  requireAuth();
  const childId = getActiveChildId();
  const childPassword = String(childPasswordInput?.value || "").trim();
  if (childPassword.length < 6) {
    throw new Error("Cocuk sifresi en az 6 karakter olmali.");
  }
  await api(`/parental-control/children/${encodeURIComponent(childId)}/password`, {
    method: "PUT",
    body: JSON.stringify({ childPassword })
  });
  if (childPasswordInput) {
    childPasswordInput.value = "";
  }
  await refreshChildren();
}

async function loadPolicy() {
  requireAuth();
  const childId = getActiveChildId();
  const data = await api(`/parental-control/children/${encodeURIComponent(childId)}/policy`);
  applyPolicyToForm(data.policy || {});
}

async function savePolicy() {
  requireAuth();
  const childId = getActiveChildId();
  const policy = buildPolicyFromForm();
  await api(`/parental-control/children/${encodeURIComponent(childId)}/policy`, {
    method: "PUT",
    body: JSON.stringify(policy)
  });
}

async function refreshUsageSummary() {
  requireAuth();
  const childId = getActiveChildId();
  const date = usageDateInput.value || new Date().toISOString().slice(0, 10);
  const data = await api(
    `/parental-control/children/${encodeURIComponent(childId)}/usage-summary?date=${encodeURIComponent(date)}`
  );
  renderUsageSummary(data);
}

async function refreshLocationLatest() {
  requireAuth();
  const childId = getActiveChildId();
  const data = await api(`/parental-control/children/${encodeURIComponent(childId)}/location/latest`);
  renderLocationLatest(data);
}

async function refreshLocationHistory() {
  requireAuth();
  const childId = getActiveChildId();
  const date = locationDateInput?.value || new Date().toISOString().slice(0, 10);
  const data = await api(
    `/parental-control/children/${encodeURIComponent(childId)}/location-history?date=${encodeURIComponent(date)}`
  );
  renderLocationHistory(data);
}

async function refreshDashboard() {
  requireAuth();
  const date = usageDateInput.value || new Date().toISOString().slice(0, 10);
  const data = await api(`/parental-control/parent/dashboard?date=${encodeURIComponent(date)}`);
  renderDashboard(data.children || []);
}

async function refreshComplianceStatus() {
  requireAuth();
  const data = await api("/parental-control/parent/compliance-status");
  renderProtectionMode(data.compliance || null);
  complianceOutput.textContent = JSON.stringify(data, null, 2);
}

async function saveProtectionMode() {
  requireAuth();
  const protectionMode = protectionModeSelect?.value === MODE_ENHANCED ? MODE_ENHANCED : MODE_STANDARD;
  const data = await api("/parental-control/parent/protection-mode", {
    method: "PUT",
    body: JSON.stringify({ protectionMode })
  });
  renderProtectionMode(data.compliance || { protectionMode });
  complianceOutput.textContent = JSON.stringify(data, null, 2);
}

async function exportParentData() {
  requireAuth();
  const data = await api("/parental-control/parent/data-export");
  downloadJson(`ebeveyn-veri-disa-aktarim-${new Date().toISOString().slice(0, 10)}.json`, data);
}

registerParentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(registerParentForm);
  try {
    const body = {
      parentName: String(form.get("parentName") || "").trim(),
      parentPin: String(form.get("parentPin") || "").trim(),
      parentEmail: String(form.get("parentEmail") || "").trim() || undefined,
      parentPhone: String(form.get("parentPhone") || "").trim() || undefined,
      countryCode: String(form.get("countryCode") || "").trim().toUpperCase() || undefined,
      consent: {
        privacyPolicyVersion: String(form.get("privacyPolicyVersion") || "").trim(),
        termsVersion: String(form.get("termsVersion") || "").trim(),
        prominentDisclosureAccepted: Boolean(form.get("prominentDisclosureAccepted")),
        childMonitoringDisclosureAccepted: Boolean(form.get("childMonitoringDisclosureAccepted"))
      }
    };
    const data = await api("/parental-control/parent/register", {
      method: "POST",
      body: JSON.stringify(body)
    });

    state.familyId = data.familyId;
    state.parentToken = data.parentToken;
    parentFamilyIdInput.value = data.familyId;
    persistSession();
    setStatus(`Kayit olustu. Aile Kimligi: ${data.familyId}`, "ok");
    await refreshChildren();
    await refreshDashboard();
    await refreshComplianceStatus();
  } catch (error) {
    setStatus(error.message || "Kayit hatasi", "error");
  }
});

loginParentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(loginParentForm);
  try {
    const familyId = String(form.get("familyId") || "").trim();
    const parentPin = String(form.get("parentPin") || "").trim();
    const data = await api("/parental-control/parent/login", {
      method: "POST",
      body: JSON.stringify({ familyId, parentPin })
    });
    state.familyId = familyId;
    state.parentToken = data.parentToken;
    persistSession();
    setStatus("Ebeveyn girisi basarili.", "ok");
    await refreshChildren();
    await refreshDashboard();
    await refreshComplianceStatus();
  } catch (error) {
    setStatus(error.message || "Giris hatasi", "error");
  }
});

createPairCodeBtn.addEventListener("click", async () => {
  try {
    requireAuth();
    const expiresInMinutes = Number(pairingMinutesInput.value || 10);
    const data = await api("/parental-control/parent/pairing-code", {
      method: "POST",
      body: JSON.stringify({ expiresInMinutes })
    });
    pairingCodeValue.textContent = data.pairingCode;
    pairingCodeExpiry.textContent = new Date(data.expiresAt).toLocaleString();
    setStatus("Eslestirme kodu uretildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Kod uretilemedi", "error");
  }
});

refreshChildrenBtn.addEventListener("click", async () => {
  try {
    await refreshChildren();
    setStatus("Cocuk listesi yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Liste alinamadi", "error");
  }
});

saveChildPasswordBtn?.addEventListener("click", async () => {
  try {
    await saveChildPassword();
    setStatus("Cocuk giris sifresi ebeveyn tarafindan kaydedildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Cocuk sifresi kaydedilemedi", "error");
  }
});

activeChildSelect.addEventListener("change", async () => {
  state.activeChildId = activeChildSelect.value || "";
  persistSession();
  if (!state.activeChildId) return;
  try {
    await loadPolicy();
    await refreshUsageSummary();
    await refreshLocationLatest();
    await refreshLocationHistory();
    setStatus("Cocuk secildi ve veriler yuklendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Cocuk verileri yuklenemedi", "error");
  }
});

createParentVerifyCodeBtn.addEventListener("click", async () => {
  try {
    requireAuth();
    const childId = getActiveChildId();
    const data = await api("/parental-control/parent/verification-code", {
      method: "POST",
      body: JSON.stringify({ childId })
    });
    parentVerifyCodeValue.textContent = data.code;
    parentVerifyCodeExpiry.textContent = new Date(data.expiresAt).toLocaleString();
    setStatus("Ebeveyn dogrulama kodu uretildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Dogrulama kodu uretilemedi", "error");
  }
});

loadPolicyBtn.addEventListener("click", async () => {
  try {
    await loadPolicy();
    setStatus("Kurallar yuklendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Kurallar yuklenemedi", "error");
  }
});

savePolicyBtn.addEventListener("click", async () => {
  try {
    await savePolicy();
    setStatus("Kurallar kaydedildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Kurallar kaydedilemedi", "error");
  }
});

refreshUsageSummaryBtn.addEventListener("click", async () => {
  try {
    await refreshUsageSummary();
    setStatus("Kullanim ozeti yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Ozet alinmadi", "error");
  }
});

refreshLocationBtn?.addEventListener("click", async () => {
  try {
    await refreshLocationLatest();
    setStatus("Son konum bilgisi yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Son konum alinamadi", "error");
  }
});

refreshLocationHistoryBtn?.addEventListener("click", async () => {
  try {
    await refreshLocationHistory();
    setStatus("Konum gecmisi yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Konum gecmisi alinamadi", "error");
  }
});

refreshDashboardBtn.addEventListener("click", async () => {
  try {
    await refreshDashboard();
    setStatus("Genel gorunum yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Genel gorunum alinamadi", "error");
  }
});

saveProtectionModeBtn?.addEventListener("click", async () => {
  try {
    await saveProtectionMode();
    setStatus("Koruma modu kaydedildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Koruma modu kaydedilemedi", "error");
  }
});

refreshComplianceBtn?.addEventListener("click", async () => {
  try {
    await refreshComplianceStatus();
    setStatus("Uyum durumu yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Uyum durumu alinamadi", "error");
  }
});

exportDataBtn?.addEventListener("click", async () => {
  try {
    await exportParentData();
    setStatus("Veri disa aktarildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Veri disa aktarilamadi", "error");
  }
});

deleteAccountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(deleteAccountForm);
  try {
    requireAuth();
    const parentPin = String(form.get("parentPin") || "").trim();
    const confirmation = String(form.get("confirmation") || "").trim();
    await api("/parental-control/parent/delete-account", {
      method: "POST",
      body: JSON.stringify({ parentPin, confirmation })
    });
    localStorage.removeItem(STORAGE_KEY);
    setStatus("Hesap kalici silindi. Oturum temizlendi.", "ok");
    state.familyId = "";
    state.parentToken = "";
    state.children = [];
    state.activeChildId = "";
    parentFamilyIdInput.value = "";
    activeChildSelect.innerHTML = "";
    childrenList.innerHTML = "";
    complianceOutput.textContent = "-";
  } catch (error) {
    setStatus(error.message || "Hesap silinemedi", "error");
  }
});

async function bootstrap() {
  setTodayDefault();
  loadSession();
  if (!state.parentToken) {
    setStatus("Ebeveyn kaydi veya girisi yapin.");
    return;
  }
  try {
    await refreshChildren();
    await refreshDashboard();
    await refreshComplianceStatus();
    if (state.activeChildId) {
      activeChildSelect.value = state.activeChildId;
      await loadPolicy();
      await refreshUsageSummary();
      await refreshLocationLatest();
      await refreshLocationHistory();
    }
    setStatus("Oturum geri yuklendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Oturum geri yuklenemedi", "error");
  }
}

bootstrap();
