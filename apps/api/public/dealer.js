const apiKeyInput = document.getElementById("apiKey");
const markupInput = document.getElementById("markupPercent");
const loginButton = document.getElementById("login");
const loadProductsButton = document.getElementById("loadProducts");
const downloadXmlButton = document.getElementById("downloadXml");
const dealerInfo = document.getElementById("dealerInfo");
const dealerAccountInfo = document.getElementById("dealerAccountInfo");
const dealerStatus = document.getElementById("dealerStatus");
const dealerOrderItems = document.getElementById("dealerOrderItems");
const dealerAddItem = document.getElementById("dealerAddItem");
const dealerSubmitOrder = document.getElementById("dealerSubmitOrder");
const dealerLedger = document.getElementById("dealerLedger");
const toast = document.getElementById("toast");
const dealerNavButtons = Array.from(document.querySelectorAll(".dealer-nav-btn"));
const dealerSections = Array.from(document.querySelectorAll(".dealer-section"));

let catalog = [];

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function setDealerSection(target) {
  dealerSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.section === target);
  });
  dealerNavButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === target);
  });
}

async function api(path, options = {}) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) throw new Error("API key gerekli");
  const headers = { "x-api-key": apiKey, ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response.json();
}

function renderTable(tableId, headers, rows) {
  const table = document.getElementById(tableId);
  if (!table) return;

  table.innerHTML = "";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderCatalogTables() {
  renderTable(
    "dealerProductsTable",
    ["Urun", "Birim", "Fiyat", "Varyasyon"],
    catalog.map((item) => [
      item.name,
      item.unit,
      Number(item.price).toFixed(2),
      item.variants && item.variants.length ? `${item.variants.length} varyasyon` : "-"
    ])
  );

  renderTable(
    "dealerAssignedProductsTable",
    ["Urun", "Birim", "Fiyat", "SKU"],
    catalog.map((item) => [item.name, item.unit, Number(item.price).toFixed(2), item.sku ?? "-"])
  );
}

function buildOrderRow() {
  if (!dealerOrderItems) return;

  const row = document.createElement("div");
  row.className = "row";

  const productSelect = document.createElement("select");
  catalog.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    productSelect.appendChild(option);
  });

  const variantSelect = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon yok";

  function populateVariants() {
    variantSelect.innerHTML = "";
    variantSelect.appendChild(empty);
    const product = catalog.find((item) => item.id === productSelect.value);
    if (product && product.variants) {
      product.variants.forEach((variant) => {
        const option = document.createElement("option");
        option.value = variant.id;
        option.textContent = variant.name;
        variantSelect.appendChild(option);
      });
    }
  }

  productSelect.addEventListener("change", populateVariants);
  populateVariants();

  const qty = document.createElement("input");
  qty.type = "number";
  qty.step = "0.01";
  qty.placeholder = "Miktar";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn ghost";
  remove.textContent = "Sil";
  remove.addEventListener("click", () => row.remove());

  row.appendChild(productSelect);
  row.appendChild(variantSelect);
  row.appendChild(qty);
  row.appendChild(remove);
  dealerOrderItems.appendChild(row);
}

async function loadLedger() {
  const summary = await api("/dealer/ledger/summary");
  if (dealerLedger) {
    dealerLedger.textContent = `Guncel bakiye: ${summary.balance}`;
  }
}

async function loadOrderHistory() {
  const orders = await api("/dealer/orders");
  renderTable(
    "dealerOrderHistoryTable",
    ["Tarih", "Durum", "Kalemler", "Toplam"],
    orders.map((order) => [
      new Date(order.createdAt).toLocaleString(),
      order.status,
      order.itemsSummary,
      Number(order.totalPrice).toFixed(2)
    ])
  );
}

async function login() {
  const info = await api("/dealer/me");
  const text = `${info.dealer?.name ?? "-"} | Firma: ${info.dealer?.companyId ?? "-"}`;
  if (dealerInfo) dealerInfo.textContent = text;
  if (dealerAccountInfo) dealerAccountInfo.textContent = `${text} | API key aktif`;
  dealerStatus.textContent = "Giris basarili";
  await loadLedger();
  await loadOrderHistory();
}

async function loadProducts() {
  catalog = await api("/dealer/products");
  renderCatalogTables();
  if (dealerOrderItems) {
    dealerOrderItems.innerHTML = "";
    buildOrderRow();
  }
}

loginButton?.addEventListener("click", async () => {
  try {
    await login();
    showToast("Giris basarili.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

loadProductsButton?.addEventListener("click", async () => {
  try {
    await loadProducts();
    setDealerSection("dealer-catalog");
    showToast("Urunler yuklendi.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

downloadXmlButton?.addEventListener("click", () => {
  const apiKey = apiKeyInput?.value.trim();
  if (!apiKey) {
    showToast("API key gerekli", "error");
    return;
  }
  window.open(`/catalog.xml?api_key=${encodeURIComponent(apiKey)}`, "_blank");
});

dealerAddItem?.addEventListener("click", (event) => {
  event.preventDefault();
  buildOrderRow();
});

dealerSubmitOrder?.addEventListener("click", async () => {
  try {
    const rows = Array.from(dealerOrderItems.querySelectorAll(".row"));
    const items = rows
      .map((row) => {
        const selects = row.querySelectorAll("select");
        const productId = selects[0]?.value;
        const variantId = selects[1]?.value || undefined;
        const qtyInput = row.querySelector("input");
        const quantity = Number(qtyInput?.value ?? 0);
        if (!productId || !quantity) return null;
        return { productId, variantId, quantity };
      })
      .filter(Boolean);

    if (!items.length) {
      showToast("Siparis icin urun ekleyin.", "error");
      return;
    }

    await api("/dealer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    showToast("Siparis olusturuldu.");
    await loadLedger();
    await loadOrderHistory();
    setDealerSection("dealer-order-history");
  } catch (error) {
    showToast(error.message, "error");
  }
});

dealerNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDealerSection(button.dataset.target);
  });
});

setDealerSection("dealer-home");
