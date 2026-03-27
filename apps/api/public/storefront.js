const storefrontSubtitle = document.getElementById("storefrontSubtitle");
const storefrontStatus = document.getElementById("storefrontStatus");
const storefrontSearch = document.getElementById("storefrontSearch");
const storefrontRefresh = document.getElementById("storefrontRefresh");
const storefrontProducts = document.getElementById("storefrontProducts");
const storefrontCartTable = document.getElementById("storefrontCartTable");
const storefrontCartSummary = document.getElementById("storefrontCartSummary");
const storefrontCustomerName = document.getElementById("storefrontCustomerName");
const storefrontCustomerPhone = document.getElementById("storefrontCustomerPhone");
const storefrontCustomerNote = document.getElementById("storefrontCustomerNote");
const storefrontSubmitOrder = document.getElementById("storefrontSubmitOrder");
const storefrontClearCart = document.getElementById("storefrontClearCart");
const toast = document.getElementById("toast");

const params = new URLSearchParams(window.location.search);
const storefrontKey = params.get("key") || "";

let dealerInfo = null;
let catalog = [];
let cartItems = [];

function showToast(message, type = "info") {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response.json();
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

function getProductPrice(product, variantId) {
  if (!variantId) return Number(product.price || 0);
  const variant = (product.variants || []).find((item) => item.id === variantId);
  if (!variant) return Number(product.price || 0);
  return Number(variant.price || 0);
}

function getProductVariantName(product, variantId) {
  if (!variantId) return null;
  const variant = (product.variants || []).find((item) => item.id === variantId);
  return variant?.name || null;
}

function renderCart() {
  if (!storefrontCartTable) return;

  storefrontCartTable.innerHTML = "";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Urun", "Birim Fiyat", "Miktar", "Tutar", "Not", "Islem"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  storefrontCartTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  cartItems.forEach((item) => {
    const tr = document.createElement("tr");
    const total = Number(item.price || 0) * Number(item.quantity || 0);

    const cells = [
      item.variantName ? `${item.productName} / ${item.variantName}` : item.productName,
      formatPrice(item.price),
      Number(item.quantity).toFixed(2),
      formatPrice(total),
      item.note || "-",
      ""
    ];

    cells.forEach((cell, index) => {
      const td = document.createElement("td");
      td.setAttribute("data-label", ["Urun", "Birim Fiyat", "Miktar", "Tutar", "Not", "Islem"][index]);
      if (index === 5) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn danger";
        button.textContent = "Sil";
        button.addEventListener("click", () => {
          cartItems = cartItems.filter((row) => row.key !== item.key);
          renderCart();
        });
        td.appendChild(button);
      } else {
        td.textContent = cell;
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  if (!cartItems.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Sepet bos.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  storefrontCartTable.appendChild(tbody);

  const totalQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );
  if (storefrontCartSummary) {
    storefrontCartSummary.textContent = `Kalem: ${cartItems.length} | Toplam Miktar: ${totalQuantity.toFixed(
      2
    )} | Toplam: ${totalAmount.toFixed(2)}`;
  }
}

function addToCart(product, variantId, quantity, note) {
  const key = `${product.id}:${variantId || ""}`;
  const existing = cartItems.find((item) => item.key === key);
  const nextQuantity = Number(quantity || 0);
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    showToast("Miktar 0'dan buyuk olmali.", "error");
    return;
  }

  if (existing) {
    existing.quantity += nextQuantity;
    if (note) {
      existing.note = note;
    }
  } else {
    cartItems.push({
      key,
      productId: product.id,
      variantId: variantId || undefined,
      productName: product.name,
      variantName: getProductVariantName(product, variantId),
      quantity: nextQuantity,
      price: getProductPrice(product, variantId),
      note: note || ""
    });
  }

  renderCart();
  showToast("Urun sepete eklendi.");
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "storefront-card";

  const image = document.createElement("img");
  image.className = "storefront-card-image";
  image.src = product.imageUrl || "https://via.placeholder.com/720x480?text=Urun";
  image.alt = product.name;
  card.appendChild(image);

  const body = document.createElement("div");
  body.className = "storefront-card-body";

  const title = document.createElement("h3");
  title.textContent = product.name;
  body.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "hint";
  meta.textContent = `${product.unit}${product.sku ? ` | SKU: ${product.sku}` : ""}`;
  body.appendChild(meta);

  const price = document.createElement("div");
  price.className = "storefront-price";
  price.textContent = `${formatPrice(product.price)} TL`;
  body.appendChild(price);

  const variantSelect = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon secin (opsiyonel)";
  variantSelect.appendChild(empty);
  (product.variants || []).forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = `${variant.name} - ${formatPrice(variant.price)} TL`;
    variantSelect.appendChild(option);
  });
  body.appendChild(variantSelect);

  variantSelect.addEventListener("change", () => {
    const selectedPrice = getProductPrice(product, variantSelect.value || "");
    price.textContent = `${formatPrice(selectedPrice)} TL`;
  });

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.step = "0.01";
  qtyInput.min = "0.01";
  qtyInput.value = "1";
  qtyInput.placeholder = "Miktar";
  body.appendChild(qtyInput);

  const noteInput = document.createElement("textarea");
  noteInput.rows = 2;
  noteInput.placeholder = "Bu urun icin not (opsiyonel)";
  body.appendChild(noteInput);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "btn";
  addButton.textContent = "Sepete Ekle";
  addButton.addEventListener("click", () => {
    addToCart(product, variantSelect.value || "", Number(qtyInput.value || 0), noteInput.value.trim());
    noteInput.value = "";
  });
  body.appendChild(addButton);

  card.appendChild(body);
  return card;
}

function renderProducts() {
  if (!storefrontProducts) return;
  const query = (storefrontSearch?.value || "").toLocaleLowerCase("tr").trim();
  const filtered = catalog.filter((product) => {
    if (!query) return true;
    const haystack = `${product.name || ""} ${product.sku || ""}`.toLocaleLowerCase("tr");
    return haystack.includes(query);
  });

  storefrontProducts.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Urun bulunamadi.";
    storefrontProducts.appendChild(empty);
    return;
  }

  filtered.forEach((product) => storefrontProducts.appendChild(createProductCard(product)));
}

async function loadCatalog() {
  if (!storefrontKey) {
    throw new Error("Magaza anahtari bulunamadi.");
  }
  const result = await api(`/storefront/${encodeURIComponent(storefrontKey)}/catalog`);
  dealerInfo = result;
  catalog = result.catalog || [];

  if (storefrontSubtitle) {
    storefrontSubtitle.textContent = `${result.company?.name || "-"} / ${result.dealer?.name || "-"}`;
  }
  if (storefrontStatus) {
    storefrontStatus.textContent = "Magaza aktif";
    storefrontStatus.classList.add("ok");
  }

  renderProducts();
  renderCart();
}

async function submitOrder() {
  const customerName = storefrontCustomerName?.value?.trim();
  const customerPhone = storefrontCustomerPhone?.value?.trim();
  const customerNote = storefrontCustomerNote?.value?.trim();

  if (!customerName) {
    showToast("Musteri adi zorunlu.", "error");
    return;
  }

  if (!cartItems.length) {
    showToast("Once sepete urun ekleyin.", "error");
    return;
  }

  const items = cartItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    note: item.note || undefined
  }));

  const result = await api(`/storefront/${encodeURIComponent(storefrontKey)}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName,
      customerPhone: customerPhone || undefined,
      customerNote: customerNote || undefined,
      items
    })
  });

  cartItems = [];
  if (storefrontCustomerNote) storefrontCustomerNote.value = "";
  renderCart();
  showToast(`Siparis alindi. Takip no: ${result.orderId}`);
}

storefrontSearch?.addEventListener("input", renderProducts);
storefrontRefresh?.addEventListener("click", async () => {
  try {
    await loadCatalog();
    showToast("Katalog yenilendi.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

storefrontClearCart?.addEventListener("click", () => {
  cartItems = [];
  renderCart();
});

storefrontSubmitOrder?.addEventListener("click", async () => {
  try {
    await submitOrder();
  } catch (error) {
    showToast(error.message, "error");
  }
});

(async () => {
  try {
    await loadCatalog();
  } catch (error) {
    if (storefrontStatus) {
      storefrontStatus.textContent = "Magaza acilamadi";
    }
    showToast(error.message, "error");
  }
})();
