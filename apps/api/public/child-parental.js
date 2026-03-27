const childStatus = document.getElementById("childStatus");
const linkChildForm = document.getElementById("linkChildForm");
const loginChildForm = document.getElementById("loginChildForm");
const linkFamilyId = document.getElementById("linkFamilyId");
const linkPairingCode = document.getElementById("linkPairingCode");
const childDeviceId = document.getElementById("childDeviceId");
const loginFamilyId = document.getElementById("loginFamilyId");
const loginChildId = document.getElementById("loginChildId");
const loginDeviceId = document.getElementById("loginDeviceId");
const refreshChildPolicyBtn = document.getElementById("refreshChildPolicyBtn");
const ackChildDisclosureBtn = document.getElementById("ackChildDisclosureBtn");
const childDisclosureState = document.getElementById("childDisclosureState");
const policyOutput = document.getElementById("policyOutput");
const usageForm = document.getElementById("usageForm");
const sendLocationBtn = document.getElementById("sendLocationBtn");
const locationSendState = document.getElementById("locationSendState");
const verifyCodeForm = document.getElementById("verifyCodeForm");
const unlockState = document.getElementById("unlockState");

const SESSION_KEY = "pc_child_session_v1";
const DEVICE_KEY = "pc_child_device_id_v1";

const state = {
  familyId: "",
  childId: "",
  childToken: "",
  deviceId: "",
  unlockedUntil: null,
  disclosureAckAt: null
};

function setStatus(message, type = "normal") {
  childStatus.textContent = message;
  childStatus.className = `status${type === "normal" ? "" : ` ${type}`}`;
}

function setUnlockStatus() {
  if (!state.unlockedUntil) {
    unlockState.textContent = "Kilitli durum: ebeveyn kodu bekleniyor.";
    unlockState.className = "status";
    return;
  }

  const now = Date.now();
  if (state.unlockedUntil <= now) {
    state.unlockedUntil = null;
    unlockState.textContent = "Kilitli durum: ebeveyn kodu bekleniyor.";
    unlockState.className = "status";
    return;
  }

  unlockState.textContent = `Gecici acik. Bitis: ${new Date(state.unlockedUntil).toLocaleTimeString()}`;
  unlockState.className = "status ok";
}

function setDisclosureState() {
  if (!childDisclosureState) return;
  if (!state.disclosureAckAt) {
    childDisclosureState.textContent = "Bilgilendirme onayi bekleniyor.";
    childDisclosureState.className = "status";
    return;
  }
  childDisclosureState.textContent = `Bilgilendirme onaylandi: ${new Date(state.disclosureAckAt).toLocaleString()}`;
  childDisclosureState.className = "status ok";
}

function setLocationState(message, type = "normal") {
  if (!locationSendState) return;
  locationSendState.textContent = message;
  locationSendState.className = `status${type === "normal" ? "" : ` ${type}`}`;
}

function ensureDeviceId() {
  let existing = localStorage.getItem(DEVICE_KEY) || "";
  if (!existing) {
    existing = `android-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-6)}`;
    localStorage.setItem(DEVICE_KEY, existing);
  }
  state.deviceId = existing;
  childDeviceId.value = existing;
  loginDeviceId.value = existing;
}

function persistSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      familyId: state.familyId,
      childId: state.childId,
      childToken: state.childToken,
      deviceId: state.deviceId,
      disclosureAckAt: state.disclosureAckAt
    })
  );
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.familyId = parsed.familyId ?? "";
    state.childId = parsed.childId ?? "";
    state.childToken = parsed.childToken ?? "";
    state.deviceId = parsed.deviceId ?? state.deviceId;
    state.disclosureAckAt = parsed.disclosureAckAt ?? null;
    if (state.familyId) {
      linkFamilyId.value = state.familyId;
      loginFamilyId.value = state.familyId;
    }
    if (state.childId) {
      loginChildId.value = state.childId;
    }
    if (state.deviceId) {
      childDeviceId.value = state.deviceId;
      loginDeviceId.value = state.deviceId;
    }
  } catch {
    // ignore invalid storage
  }
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (state.childToken) {
    headers["x-child-token"] = state.childToken;
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

function requireChildSession() {
  if (!state.childToken || !state.childId) {
    throw new Error("Once cocuk girisi yapin.");
  }
}

async function refreshPolicy() {
  requireChildSession();
  const data = await api(`/parental-control/children/${encodeURIComponent(state.childId)}/policy`);
  policyOutput.textContent = JSON.stringify(data.policy || {}, null, 2);
}

async function acknowledgeDisclosure() {
  requireChildSession();
  const data = await api(`/parental-control/children/${encodeURIComponent(state.childId)}/ack-disclosure`, {
    method: "POST",
    body: JSON.stringify({ acknowledged: true })
  });
  state.disclosureAckAt = data.disclosureAckAt ?? nowIsoForClient();
  persistSession();
  setDisclosureState();
}

function nowIsoForClient() {
  return new Date().toISOString();
}

function getCurrentPosition(options = {}) {
  if (!("geolocation" in navigator) || !navigator.geolocation) {
    return Promise.reject(new Error("Bu cihaz/tarayici konum bilgisini desteklemiyor."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options
    });
  });
}

async function sendCurrentLocation() {
  requireChildSession();
  setLocationState("Konum aliniyor...");
  let position;
  try {
    position = await getCurrentPosition();
  } catch (error) {
    const geoCode = typeof error?.code === "number" ? error.code : 0;
    if (geoCode === 1) {
      throw new Error("Konum izni reddedildi. Lutfen konum iznini acin.");
    }
    if (geoCode === 2) {
      throw new Error("Konum bilgisine su an ulasilamiyor.");
    }
    if (geoCode === 3) {
      throw new Error("Konum alma suresi doldu. Tekrar deneyin.");
    }
    throw error;
  }

  const timestampMs =
    typeof position?.timestamp === "number" && Number.isFinite(position.timestamp)
      ? position.timestamp
      : Date.now();
  const payload = {
    latitude: Number(position.coords.latitude),
    longitude: Number(position.coords.longitude),
    accuracyMeters:
      typeof position.coords.accuracy === "number" && Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : undefined,
    capturedAt: new Date(timestampMs).toISOString(),
    source: "CHILD_APP"
  };

  await api(`/parental-control/children/${encodeURIComponent(state.childId)}/location`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const coordText = `${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`;
  const accuracyText = typeof payload.accuracyMeters === "number" ? `${payload.accuracyMeters} m` : "Bilinmiyor";
  setLocationState(`Konum gonderildi: ${coordText} | Hassasiyet: ${accuracyText}`, "ok");
}

linkChildForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(linkChildForm);
  try {
    const body = {
      familyId: String(form.get("familyId") || "").trim(),
      pairingCode: String(form.get("pairingCode") || "").trim(),
      childName: String(form.get("childName") || "").trim(),
      deviceId: String(form.get("deviceId") || "").trim(),
      childDisclosureExplained: Boolean(form.get("childDisclosureExplained"))
    };
    const data = await api("/parental-control/children/link", {
      method: "POST",
      body: JSON.stringify(body)
    });
    state.familyId = body.familyId;
    state.childId = data.childId;
    state.deviceId = body.deviceId;
    state.disclosureAckAt = null;
    loginFamilyId.value = state.familyId;
    loginChildId.value = state.childId;
    loginDeviceId.value = state.deviceId;
    persistSession();
    setDisclosureState();
    setStatus(`Cihaz baglandi. Cocuk Kimligi: ${state.childId}. Giris sifresi ebeveyn panelinden belirlenmeli.`, "ok");
  } catch (error) {
    setStatus(error.message || "Baglanti hatasi", "error");
  }
});

loginChildForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(loginChildForm);
  try {
    const body = {
      familyId: String(form.get("familyId") || "").trim(),
      childId: String(form.get("childId") || "").trim(),
      childPassword: String(form.get("childPassword") || "").trim(),
      deviceId: String(form.get("deviceId") || "").trim()
    };
    const data = await api("/parental-control/children/login", {
      method: "POST",
      body: JSON.stringify(body)
    });
    state.familyId = body.familyId;
    state.childId = body.childId;
    state.deviceId = body.deviceId;
    state.childToken = data.childToken;
    state.disclosureAckAt = data.disclosureAckAt ?? null;
    persistSession();
    setDisclosureState();
    setStatus("Cocuk girisi basarili.", "ok");
    await refreshPolicy();
  } catch (error) {
    setStatus(error.message || "Giris hatasi", "error");
  }
});

refreshChildPolicyBtn.addEventListener("click", async () => {
  try {
    await refreshPolicy();
    setStatus("Kurallar yenilendi.", "ok");
  } catch (error) {
    setStatus(error.message || "Kurallar alinamadi", "error");
  }
});

ackChildDisclosureBtn?.addEventListener("click", async () => {
  try {
    await acknowledgeDisclosure();
    setStatus("Bilgilendirme onayi kaydedildi.", "ok");
  } catch (error) {
    setStatus(error.message || "Bilgilendirme onayi kaydedilemedi", "error");
  }
});

usageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(usageForm);
  try {
    requireChildSession();
    const appName = String(form.get("appName") || "").trim();
    const minutes = Number(form.get("minutes"));
    await api(`/parental-control/children/${encodeURIComponent(state.childId)}/usage`, {
      method: "POST",
      body: JSON.stringify({
        appName,
        minutes
      })
    });
    setStatus("Kullanim kaydi gonderildi.", "ok");
    usageForm.reset();
  } catch (error) {
    setStatus(error.message || "Kullanim kaydi gonderilemedi", "error");
  }
});

sendLocationBtn?.addEventListener("click", async () => {
  try {
    await sendCurrentLocation();
    setStatus("Konum ebeveyn paneline gonderildi.", "ok");
  } catch (error) {
    setLocationState(error.message || "Konum gonderilemedi", "error");
    setStatus(error.message || "Konum gonderilemedi", "error");
  }
});

verifyCodeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(verifyCodeForm);
  try {
    requireChildSession();
    const code = String(form.get("code") || "").trim();
    await api(`/parental-control/children/${encodeURIComponent(state.childId)}/verify-parent-code`, {
      method: "POST",
      body: JSON.stringify({ code })
    });
    state.unlockedUntil = Date.now() + 15 * 60 * 1000;
    setUnlockStatus();
    setStatus("Ebeveyn kodu dogrulandi. Gecici acik mod aktif.", "ok");
    verifyCodeForm.reset();
  } catch (error) {
    setStatus(error.message || "Kod dogrulanamadi", "error");
  }
});

function bootstrap() {
  ensureDeviceId();
  loadSession();
  setUnlockStatus();
  setDisclosureState();
  setLocationState("Konum gonderimi bekleniyor.");

  if (state.childToken && state.childId) {
    refreshPolicy()
      .then(() => setStatus("Cocuk oturumu geri yuklendi.", "ok"))
      .catch((error) => setStatus(error.message || "Oturum geri yuklenemedi", "error"));
    return;
  }

  setStatus("Eslestirme kodu ile baglanin. Giris sifresi ebeveyn panelinden belirlenir.");
}

setInterval(setUnlockStatus, 10000);
bootstrap();
