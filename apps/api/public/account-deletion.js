const deleteStatus = document.getElementById("deleteStatus");
const publicDeleteForm = document.getElementById("publicDeleteForm");

function setStatus(message, type = "normal") {
  deleteStatus.textContent = message;
  deleteStatus.className = `status${type === "normal" ? "" : ` ${type}`}`;
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json"
  };

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

publicDeleteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(publicDeleteForm);
  try {
    const payload = {
      familyId: String(form.get("familyId") || "").trim(),
      parentPin: String(form.get("parentPin") || "").trim(),
      confirmation: String(form.get("confirmation") || "").trim()
    };
    await api("/parental-control/public/delete-account", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setStatus("Hesap ve bagli veriler kalici olarak silindi.", "ok");
    publicDeleteForm.reset();
  } catch (error) {
    setStatus(error.message || "Silme islemi basarisiz", "error");
  }
});
