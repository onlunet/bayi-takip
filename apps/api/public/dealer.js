const dealerLoginEmailInput = document.getElementById("dealerLoginEmail");
const dealerLoginPasswordInput = document.getElementById("dealerLoginPassword");
const loginButton = document.getElementById("login");
const dealerLogoutButton = document.getElementById("dealerLogout");
const loadProductsButton = document.getElementById("loadProducts");
const downloadXmlButton = document.getElementById("downloadXml");
const dealerInfo = document.getElementById("dealerInfo");
const dealerAccountInfo = document.getElementById("dealerAccountInfo");
const dealerStatus = document.getElementById("dealerStatus");
const dealerOrderItems = document.getElementById("dealerOrderItems");
const dealerAddItem = document.getElementById("dealerAddItem");
const dealerSubmitOrder = document.getElementById("dealerSubmitOrder");
const dealerServiceRequestType = document.getElementById("dealerServiceRequestType");
const dealerServiceRequestOrderId = document.getElementById("dealerServiceRequestOrderId");
const dealerServiceRequestNote = document.getElementById("dealerServiceRequestNote");
const dealerSubmitServiceRequest = document.getElementById("dealerSubmitServiceRequest");
const dealerStorefrontUrl = document.getElementById("dealerStorefrontUrl");
const dealerLoadStorefrontLink = document.getElementById("dealerLoadStorefrontLink");
const dealerRotateStorefrontKey = document.getElementById("dealerRotateStorefrontKey");
const dealerOpenStorefront = document.getElementById("dealerOpenStorefront");
const dealerLedger = document.getElementById("dealerLedger");
const toast = document.getElementById("toast");

const dealerOrderCustomerSelect = document.getElementById("dealerOrderCustomerSelect");
const dealerOrderCustomerName = document.getElementById("dealerOrderCustomerName");
const dealerOrderCustomerPhone = document.getElementById("dealerOrderCustomerPhone");
const dealerOrderCustomerNote = document.getElementById("dealerOrderCustomerNote");

const dealerCustomerEditId = document.getElementById("dealerCustomerEditId");
const dealerCustomerName = document.getElementById("dealerCustomerName");
const dealerCustomerPhone = document.getElementById("dealerCustomerPhone");
const dealerCustomerEmail = document.getElementById("dealerCustomerEmail");
const dealerCustomerAddress = document.getElementById("dealerCustomerAddress");
const dealerCustomerNote = document.getElementById("dealerCustomerNote");
const dealerCustomerActive = document.getElementById("dealerCustomerActive");
const dealerCustomerSave = document.getElementById("dealerCustomerSave");
const dealerCustomerReset = document.getElementById("dealerCustomerReset");

const dealerOrderCustomerFilter = document.getElementById("dealerOrderCustomerFilter");
const dealerOrderHistoryRefresh = document.getElementById("dealerOrderHistoryRefresh");
const dealerOrderHistoryClearFilter = document.getElementById("dealerOrderHistoryClearFilter");

const dealerNavButtons = Array.from(document.querySelectorAll(".dealer-nav-btn"));
const dealerSections = Array.from(document.querySelectorAll(".dealer-section"));
const dealerMenuToggle = document.getElementById("dealerMenuToggle");
const dealerSidebar = document.getElementById("dealerSidebar");
const dealerMenuBackdrop = document.getElementById("dealerMenuBackdrop");

const MOBILE_DRAWER_BREAKPOINT = 900;
const DEALER_AUTH_TOKEN_STORAGE_KEY = "bayi_portal_dealer_token";

let catalog = [];
let orderHistory = [];
let dealerCustomers = [];
let isDealerMenuOpen = false;
let dealerAuthToken = localStorage.getItem(DEALER_AUTH_TOKEN_STORAGE_KEY) || "";

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function parseErrorMessage(error, fallback = "Bir hata olustu") {
  const message = error?.message || fallback;
  try {
    const parsed = JSON.parse(message);
    if (parsed?.message) return parsed.message;
  } catch {
    // Mesaj JSON degilse oldugu gibi don.
  }
  return message;
}

function isMobileDrawerViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_DRAWER_BREAKPOINT}px)`).matches;
}

function moveFocusOutOfDealerSidebar() {
  if (!dealerSidebar) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (!dealerSidebar.contains(active)) return;

  if (dealerMenuToggle instanceof HTMLElement) {
    dealerMenuToggle.focus({ preventScroll: true });
  } else {
    active.blur();
  }
}

function syncDealerMenuState() {
  dealerMenuToggle?.setAttribute("aria-expanded", String(isDealerMenuOpen));
  if (dealerSidebar) {
    const hideFromA11y = !isDealerMenuOpen && isMobileDrawerViewport();
    dealerSidebar.setAttribute("aria-hidden", String(hideFromA11y));
    if (hideFromA11y) {
      dealerSidebar.setAttribute("inert", "");
    } else {
      dealerSidebar.removeAttribute("inert");
    }
  }
  dealerMenuBackdrop?.setAttribute("aria-hidden", String(!isDealerMenuOpen));
}

function closeDealerMobileMenu() {
  if (!isDealerMenuOpen) {
    syncDealerMenuState();
    return;
  }
  moveFocusOutOfDealerSidebar();
  isDealerMenuOpen = false;
  document.body.classList.remove("menu-open");
  syncDealerMenuState();
}

function openDealerMobileMenu() {
  if (!isMobileDrawerViewport()) {
    syncDealerMenuState();
    return;
  }
  isDealerMenuOpen = true;
  document.body.classList.add("menu-open");
  syncDealerMenuState();
}

function toggleDealerMobileMenu() {
  if (isDealerMenuOpen) {
    closeDealerMobileMenu();
    return;
  }
  openDealerMobileMenu();
}

function initDealerMobileMenu() {
  syncDealerMenuState();

  dealerMenuToggle?.addEventListener("click", () => {
    toggleDealerMobileMenu();
  });

  dealerMenuBackdrop?.addEventListener("click", () => {
    closeDealerMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDealerMobileMenu();
    }
  });

  document.addEventListener(
    "touchmove",
    (event) => {
      if (!isDealerMenuOpen || !isMobileDrawerViewport()) return;
      if (dealerSidebar && event.target instanceof Node && dealerSidebar.contains(event.target)) return;
      event.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    if (!isMobileDrawerViewport()) {
      closeDealerMobileMenu();
    } else {
      syncDealerMenuState();
    }
  });
}

function setDealerSection(target) {
  dealerSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.section === target);
  });
  dealerNavButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === target);
  });
  closeDealerMobileMenu();
}

async function api(path, options = {}) {
  if (!dealerAuthToken) throw new Error("Lutfen once giris yapin");
  const headers = { "x-dealer-token": dealerAuthToken, ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  if ((response.status === 401 || response.status === 403) && dealerAuthToken) {
    clearDealerSession(false);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response.json();
}

async function publicApi(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response.json();
}

async function apiRaw(path, options = {}) {
  if (!dealerAuthToken) throw new Error("Lutfen once giris yapin");
  const headers = { "x-dealer-token": dealerAuthToken, ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  if ((response.status === 401 || response.status === 403) && dealerAuthToken) {
    clearDealerSession(false);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response;
}

function setDealerAuthToken(token) {
  dealerAuthToken = String(token || "").trim();
  if (dealerAuthToken) {
    localStorage.setItem(DEALER_AUTH_TOKEN_STORAGE_KEY, dealerAuthToken);
  } else {
    localStorage.removeItem(DEALER_AUTH_TOKEN_STORAGE_KEY);
  }
}

function clearDealerSession(showMessage = true) {
  setDealerAuthToken("");
  if (dealerStatus) dealerStatus.textContent = "Giris bekleniyor";
  if (dealerInfo) dealerInfo.textContent = "-";
  if (dealerAccountInfo) dealerAccountInfo.textContent = "-";
  if (showMessage) {
    showToast("Oturum kapatildi.");
  }
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
    row.forEach((cell, cellIndex) => {
      const td = document.createElement("td");
      td.setAttribute("data-label", headers[cellIndex] || "Islem");
      if (Array.isArray(cell)) {
        const actions = document.createElement("div");
        actions.className = "table-actions";
        cell.forEach((action) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = action.className ?? "btn ghost";
          button.textContent = action.label ?? "Islem";
          button.addEventListener("click", action.onClick);
          actions.appendChild(button);
        });
        td.appendChild(actions);
      } else if (cell && typeof cell === "object" && typeof cell.label === "string") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = cell.className ?? "btn ghost";
        button.textContent = cell.label;
        button.addEventListener("click", cell.onClick);
        td.appendChild(button);
      } else {
        td.textContent = cell ?? "-";
      }
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

function getDealerCustomerById(customerId) {
  return dealerCustomers.find((item) => item.id === customerId) || null;
}

function syncDealerCustomerSelectors() {
  const activeCustomers = dealerCustomers.filter((item) => item.active !== false);
  const allCustomers = [...dealerCustomers];

  if (dealerOrderCustomerSelect) {
    const previous = dealerOrderCustomerSelect.value || "";
    dealerOrderCustomerSelect.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Musteri secin (opsiyonel)";
    dealerOrderCustomerSelect.appendChild(empty);

    activeCustomers.forEach((customer) => {
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = `${customer.name}${customer.phone ? ` (${customer.phone})` : ""}`;
      dealerOrderCustomerSelect.appendChild(option);
    });

    const hasPrevious = Array.from(dealerOrderCustomerSelect.options).some(
      (option) => option.value === previous
    );
    dealerOrderCustomerSelect.value = hasPrevious ? previous : "";
  }

  if (dealerOrderCustomerFilter) {
    const previous = dealerOrderCustomerFilter.value || "";
    dealerOrderCustomerFilter.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Tum musteriler";
    dealerOrderCustomerFilter.appendChild(empty);

    allCustomers.forEach((customer) => {
      const option = document.createElement("option");
      option.value = customer.id;
      const statusText = customer.active === false ? " - pasif" : "";
      option.textContent = `${customer.name}${statusText}`;
      dealerOrderCustomerFilter.appendChild(option);
    });

    const hasPrevious = Array.from(dealerOrderCustomerFilter.options).some(
      (option) => option.value === previous
    );
    dealerOrderCustomerFilter.value = hasPrevious ? previous : "";
  }
}

function resetDealerCustomerForm() {
  if (dealerCustomerEditId) dealerCustomerEditId.value = "";
  if (dealerCustomerName) dealerCustomerName.value = "";
  if (dealerCustomerPhone) dealerCustomerPhone.value = "";
  if (dealerCustomerEmail) dealerCustomerEmail.value = "";
  if (dealerCustomerAddress) dealerCustomerAddress.value = "";
  if (dealerCustomerNote) dealerCustomerNote.value = "";
  if (dealerCustomerActive) dealerCustomerActive.checked = true;
  if (dealerCustomerSave) dealerCustomerSave.textContent = "Musteri Kaydet";
}

function fillDealerCustomerForm(customer) {
  if (!customer) return;
  if (dealerCustomerEditId) dealerCustomerEditId.value = customer.id;
  if (dealerCustomerName) dealerCustomerName.value = customer.name ?? "";
  if (dealerCustomerPhone) dealerCustomerPhone.value = customer.phone ?? "";
  if (dealerCustomerEmail) dealerCustomerEmail.value = customer.email ?? "";
  if (dealerCustomerAddress) dealerCustomerAddress.value = customer.address ?? "";
  if (dealerCustomerNote) dealerCustomerNote.value = customer.note ?? "";
  if (dealerCustomerActive) dealerCustomerActive.checked = customer.active !== false;
  if (dealerCustomerSave) dealerCustomerSave.textContent = "Musteriyi Guncelle";
}

function fillOrderCustomerInputsFromSelection() {
  const customerId = normalizeText(dealerOrderCustomerSelect?.value);
  if (!customerId) return;
  const customer = getDealerCustomerById(customerId);
  if (!customer) return;

  if (dealerOrderCustomerName && !normalizeText(dealerOrderCustomerName.value)) {
    dealerOrderCustomerName.value = customer.name ?? "";
  }
  if (dealerOrderCustomerPhone && !normalizeText(dealerOrderCustomerPhone.value)) {
    dealerOrderCustomerPhone.value = customer.phone ?? "";
  }
  if (dealerOrderCustomerNote && !normalizeText(dealerOrderCustomerNote.value)) {
    dealerOrderCustomerNote.value = customer.note ?? "";
  }
}

function renderDealerCustomersTable() {
  renderTable(
    "dealerCustomersTable",
    ["Musteri", "Telefon", "E-posta", "Durum", "Siparis", "Toplam", "Son Siparis", "Islem"],
    dealerCustomers.map((customer) => [
      customer.name,
      customer.phone ?? "-",
      customer.email ?? "-",
      customer.active === false ? "Pasif" : "Aktif",
      String(customer.orderCount ?? 0),
      Number(customer.totalSales ?? 0).toFixed(2),
      customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleString() : "-",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: () => {
            fillDealerCustomerForm(customer);
            setDealerSection("dealer-customers");
          }
        },
        {
          label: "Siparisleri Gor",
          className: "btn ghost",
          onClick: async () => {
            if (dealerOrderCustomerFilter) {
              dealerOrderCustomerFilter.value = customer.id;
            }
            await loadOrderHistory();
            setDealerSection("dealer-order-history");
          }
        },
        {
          label: customer.active === false ? "Aktif Et" : "Pasif Et",
          className: "btn ghost",
          onClick: async () => {
            try {
              await api(`/dealer/customers/${customer.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: customer.active === false })
              });
              await loadDealerCustomers();
              showToast("Musteri durumu guncellendi.");
            } catch (error) {
              showToast(parseErrorMessage(error), "error");
            }
          }
        },
        {
          label: "Sil",
          className: "btn ghost",
          onClick: async () => {
            const ok = confirm("Musteriyi silmek istediginize emin misiniz?");
            if (!ok) return;
            try {
              const result = await api(`/dealer/customers/${customer.id}`, {
                method: "DELETE"
              });
              if (result?.archived) {
                showToast(result.message || "Musteri pasife alindi.");
              } else {
                showToast("Musteri silindi.");
              }
              await loadDealerCustomers();
              await loadOrderHistory();
            } catch (error) {
              showToast(parseErrorMessage(error), "error");
            }
          }
        }
      ]
    ])
  );
}

async function loadDealerCustomers() {
  const rows = await api("/dealer/customers");
  dealerCustomers = Array.isArray(rows) ? rows : [];
  syncDealerCustomerSelectors();
  renderDealerCustomersTable();
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
  const customerId = normalizeText(dealerOrderCustomerFilter?.value);
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  const orders = await api(`/dealer/orders${query}`);
  orderHistory = Array.isArray(orders) ? orders : [];
  populateServiceRequestOrderOptions();

  renderTable(
    "dealerOrderHistoryTable",
    ["Tarih", "Durum", "Musteri", "Kalemler", "Toplam", "Islem"],
    orderHistory.map((order) => [
      new Date(order.createdAt).toLocaleString(),
      order.status,
      order.customerDisplay || [order.customerName, order.customerPhone].filter(Boolean).join(" / ") || "-",
      order.itemsSummary,
      Number(order.totalPrice).toFixed(2),
      [
        {
          label: "Tekrar Siparis",
          className: "btn ghost",
          onClick: async () => {
            try {
              await api(`/dealer/orders/${order.id}/reorder`, { method: "POST" });
              showToast("Tekrar siparis olusturuldu.");
              await loadLedger();
              await loadOrderHistory();
              await loadDealerCustomers();
              setDealerSection("dealer-order-history");
            } catch (error) {
              showToast(parseErrorMessage(error), "error");
            }
          }
        }
      ]
    ])
  );
}

function populateServiceRequestOrderOptions() {
  if (!dealerServiceRequestOrderId) return;
  const previous = dealerServiceRequestOrderId.value || "";
  dealerServiceRequestOrderId.innerHTML = "";

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Siparis secin (opsiyonel)";
  dealerServiceRequestOrderId.appendChild(empty);

  orderHistory.forEach((order) => {
    const option = document.createElement("option");
    option.value = order.id;
    option.textContent = `${new Date(order.createdAt).toLocaleDateString()} | ${order.status} | ${Number(order.totalPrice).toFixed(2)}`;
    dealerServiceRequestOrderId.appendChild(option);
  });

  if (
    previous &&
    Array.from(dealerServiceRequestOrderId.options).some((option) => option.value === previous)
  ) {
    dealerServiceRequestOrderId.value = previous;
  }
}

async function loadServiceRequests() {
  const rows = await api("/dealer/service-requests");
  renderTable(
    "dealerServiceRequestTable",
    ["Tarih", "Tur", "Durum", "Siparis", "Not"],
    (rows || []).map((item) => [
      new Date(item.createdAt).toLocaleString(),
      item.type,
      item.status,
      item.orderId ?? "-",
      item.note ?? "-"
    ])
  );
}

async function loadStorefrontLink() {
  const result = await api("/dealer/storefront-link");
  if (dealerStorefrontUrl) {
    dealerStorefrontUrl.value = result.storefrontUrl || "";
  }
  return result.storefrontUrl || "";
}

async function hydrateDealerSessionFromMe() {
  const info = await api("/dealer/me");
  const text = `${info.dealer?.name ?? "-"} | Firma: ${info.dealer?.companyId ?? "-"}`;
  if (dealerInfo) dealerInfo.textContent = text;
  if (dealerAccountInfo) dealerAccountInfo.textContent = `${text} | Uyelik oturumu aktif`;
  dealerStatus.textContent = "Giris basarili";
  await loadDealerCustomers();
  await loadLedger();
  await loadOrderHistory();
  await loadServiceRequests();
  await loadStorefrontLink();
}

async function login() {
  const email = dealerLoginEmailInput?.value?.trim();
  const password = dealerLoginPasswordInput?.value || "";

  if (!email || !password) {
    throw new Error("E-posta ve sifre gerekli");
  }

  const result = await publicApi("/dealer/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  setDealerAuthToken(result?.token || "");
  await hydrateDealerSessionFromMe();
}

async function loadProducts() {
  catalog = await api("/dealer/products");
  renderCatalogTables();
  if (dealerOrderItems) {
    dealerOrderItems.innerHTML = "";
    buildOrderRow();
  }
}

function collectOrderItems() {
  if (!dealerOrderItems) return [];
  return Array.from(dealerOrderItems.querySelectorAll(".row"))
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
}

async function submitDealerOrder() {
  const items = collectOrderItems();
  if (!items.length) {
    showToast("Siparis icin urun ekleyin.", "error");
    return;
  }

  const customerId = normalizeText(dealerOrderCustomerSelect?.value) || undefined;
  const customerName = normalizeText(dealerOrderCustomerName?.value) || undefined;
  const customerPhone = normalizeText(dealerOrderCustomerPhone?.value) || undefined;
  const customerNote = normalizeText(dealerOrderCustomerNote?.value) || undefined;

  const body = {
    items,
    ...(customerId ? { customerId } : {}),
    ...(customerName ? { customerName } : {}),
    ...(customerPhone ? { customerPhone } : {}),
    ...(customerNote ? { customerNote } : {})
  };

  await api("/dealer/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  showToast("Siparis olusturuldu.");
  await loadLedger();
  await loadOrderHistory();
  await loadServiceRequests();
  await loadDealerCustomers();
  setDealerSection("dealer-order-history");
}

async function saveDealerCustomer() {
  const editId = normalizeText(dealerCustomerEditId?.value);
  const name = normalizeText(dealerCustomerName?.value);
  const phone = normalizeText(dealerCustomerPhone?.value);
  const email = normalizeText(dealerCustomerEmail?.value);
  const address = normalizeText(dealerCustomerAddress?.value);
  const note = normalizeText(dealerCustomerNote?.value);
  const active = Boolean(dealerCustomerActive?.checked);

  if (!name) {
    showToast("Musteri adi zorunlu.", "error");
    return;
  }

  const payload = {
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
    ...(note ? { note } : {}),
    active
  };

  if (editId) {
    await api(`/dealer/customers/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showToast("Musteri guncellendi.");
  } else {
    await api("/dealer/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showToast("Musteri kaydedildi.");
  }

  resetDealerCustomerForm();
  await loadDealerCustomers();
}

loginButton?.addEventListener("click", async () => {
  try {
    await login();
    showToast("Giris basarili.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerLogoutButton?.addEventListener("click", () => {
  clearDealerSession();
});

loadProductsButton?.addEventListener("click", async () => {
  try {
    await loadProducts();
    setDealerSection("dealer-catalog");
    showToast("Urunler yuklendi.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

downloadXmlButton?.addEventListener("click", async () => {
  try {
    const response = await apiRaw("/catalog.xml");
    const xmlContent = await response.text();
    const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "katalog.xml";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast("XML indirildi.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerAddItem?.addEventListener("click", (event) => {
  event.preventDefault();
  buildOrderRow();
});

dealerSubmitOrder?.addEventListener("click", async () => {
  try {
    await submitDealerOrder();
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerSubmitServiceRequest?.addEventListener("click", async () => {
  try {
    const type = dealerServiceRequestType?.value || "OTHER";
    const orderId = dealerServiceRequestOrderId?.value || undefined;
    const note = dealerServiceRequestNote?.value?.trim() || undefined;

    const result = await api("/dealer/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        orderId,
        note
      })
    });

    if (dealerServiceRequestNote) dealerServiceRequestNote.value = "";
    if (dealerServiceRequestOrderId) dealerServiceRequestOrderId.value = "";

    if (result?.paymentLink) {
      showToast(`Talep olusturuldu. Odeme linki: ${result.paymentLink}`);
    } else {
      showToast("Talep olusturuldu.");
    }

    await loadServiceRequests();
    setDealerSection("dealer-service-requests");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerLoadStorefrontLink?.addEventListener("click", async () => {
  try {
    const url = await loadStorefrontLink();
    if (url) {
      await navigator.clipboard.writeText(url);
      showToast("Magaza linki hazirlandi ve panoya kopyalandi.");
    } else {
      showToast("Magaza linki bulunamadi.", "error");
    }
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerRotateStorefrontKey?.addEventListener("click", async () => {
  try {
    await api("/dealer/storefront-key/rotate", { method: "POST" });
    const url = await loadStorefrontLink();
    if (url) {
      await navigator.clipboard.writeText(url);
    }
    showToast("Magaza linki yenilendi.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerOpenStorefront?.addEventListener("click", () => {
  const url = dealerStorefrontUrl?.value?.trim();
  if (!url) {
    showToast("Once magaza linki olusturun.", "error");
    return;
  }
  window.open(url, "_blank");
});

dealerOrderCustomerSelect?.addEventListener("change", () => {
  fillOrderCustomerInputsFromSelection();
});

dealerOrderHistoryRefresh?.addEventListener("click", async () => {
  try {
    await loadOrderHistory();
    showToast("Siparis gecmisi guncellendi.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerOrderHistoryClearFilter?.addEventListener("click", async () => {
  if (dealerOrderCustomerFilter) dealerOrderCustomerFilter.value = "";
  try {
    await loadOrderHistory();
    showToast("Musteri filtresi temizlendi.");
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerOrderCustomerFilter?.addEventListener("change", async () => {
  try {
    await loadOrderHistory();
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerCustomerSave?.addEventListener("click", async () => {
  try {
    await saveDealerCustomer();
  } catch (error) {
    showToast(parseErrorMessage(error), "error");
  }
});

dealerCustomerReset?.addEventListener("click", () => {
  resetDealerCustomerForm();
});

dealerNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDealerSection(button.dataset.target);
  });
});

resetDealerCustomerForm();
initDealerMobileMenu();
setDealerSection("dealer-home");

if (dealerAuthToken) {
  hydrateDealerSessionFromMe().catch(() => {
    clearDealerSession(false);
  });
}
