const toast = document.getElementById("toast");
const health = document.getElementById("health");
const adminApiKeyInput = document.getElementById("adminApiKey");
const saveAdminApiKeyButton = document.getElementById("saveAdminApiKey");
const companySelect = document.getElementById("companySelect");
const dealerSelect = document.getElementById("dealerSelect");
const warehouseSelect = document.getElementById("warehouseSelect");
const stockProductSelect = document.getElementById("stockProductSelect");
const stockVariantSelect = document.getElementById("stockVariantSelect");
const orderItemsContainer = document.getElementById("orderItems");
const variantProductSelect = document.getElementById("variantProductSelect");
const overviewSummary = document.getElementById("overviewSummary");
const companySettingsForm = document.getElementById("companySettingsForm");
const deleteCompanyBtn = document.getElementById("deleteCompanyBtn");
const dealerSettingsForm = document.getElementById("dealerSettingsForm");
const reportFromInput = document.getElementById("reportFrom");
const reportToInput = document.getElementById("reportTo");
const applyReportFiltersButton = document.getElementById("applyReportFilters");
const priceListForm = document.getElementById("priceListForm");
const priceForm = document.getElementById("priceForm");
const priceProductSelect = document.getElementById("priceProductSelect");
const priceVariantSelect = document.getElementById("priceVariantSelect");
const priceListManageSelect = document.getElementById("priceListManageSelect");
const priceListSelect = document.getElementById("priceListSelect");
const importProductsToPriceListButton = document.getElementById("importProductsToPriceList");
const priceImportOverwrite = document.getElementById("priceImportOverwrite");
const priceCatalogSummary = document.getElementById("priceCatalogSummary");
const copyPriceListLinesButton = document.getElementById("copyPriceListLines");
const exportPriceListPdfButton = document.getElementById("exportPriceListPdf");
const dealerPriceListForm = document.getElementById("dealerPriceListForm");
const userForm = document.getElementById("userForm");
const wooSiteForm = document.getElementById("wooSiteForm");
const genericIntegrationForm = document.getElementById("genericIntegrationForm");
const wooSyncFrom = document.getElementById("wooSyncFrom");
const wooSyncTo = document.getElementById("wooSyncTo");
const dealerForm = document.getElementById("dealerForm");
const warehouseForm = document.getElementById("warehouseForm");
const integrationStatusFilter = document.getElementById("integrationStatusFilter");
const integrationSearch = document.getElementById("integrationSearch");
const integrationFrom = document.getElementById("integrationFrom");
const integrationTo = document.getElementById("integrationTo");
const warehouseReportSelect = document.getElementById("warehouseReportSelect");
const mappingImportForm = document.getElementById("mappingImportForm");
const mappingCsv = document.getElementById("mappingCsv");
const downloadMappingTemplate = document.getElementById("downloadMappingTemplate");
const mappingImportResult = document.getElementById("mappingImportResult");
const warehouseMovementTable = document.getElementById("warehouseMovementTable");
const mappingPlatform = document.getElementById("mappingPlatform");
const mappingProductSelect = document.getElementById("mappingProductSelect");
const mappingVariantSelect = document.getElementById("mappingVariantSelect");
const unmatchedCreateForm = document.getElementById("unmappedCreateForm");
const unmatchedSelectedInfo = document.getElementById("unmappedSelectedInfo");
const unmatchedExternalInfo = document.getElementById("unmappedExternalInfo");
const unmatchedCreateType = document.getElementById("unmappedCreateType");
const unmatchedParentWrap = document.getElementById("unmappedParentWrap");
const unmatchedParentProductId = document.getElementById("unmappedParentProductId");
const unmatchedName = document.getElementById("unmappedName");
const unmatchedSku = document.getElementById("unmappedSku");
const unmatchedUnit = document.getElementById("unmappedUnit");
const unmatchedMultiplierWrap = document.getElementById("unmappedMultiplierWrap");
const unmatchedMultiplier = document.getElementById("unmappedMultiplier");
const unmappedSummaryFrom = document.getElementById("unmappedSummaryFrom");
const unmappedSummaryTo = document.getElementById("unmappedSummaryTo");
const refreshUnmappedSummaryButton = document.getElementById("refreshUnmappedSummary");
const unmappedSummaryStats = document.getElementById("unmappedSummaryStats");
const productCategorySelect = document.getElementById("productCategorySelect");
const productForm = document.getElementById("productForm");
const productEditIdInput = document.getElementById("productEditId");
const productFormMode = document.getElementById("productFormMode");
const productFormSubmit = document.getElementById("productFormSubmit");
const productFormCancel = document.getElementById("productFormCancel");
const categoryForm = document.getElementById("categoryForm");
const productImageForm = document.getElementById("productImageForm");
const imageProductSelect = document.getElementById("imageProductSelect");
const dispatchForm = document.getElementById("dispatchForm");
const dispatchEditIdInput = document.getElementById("dispatchEditId");
const dispatchFormMode = document.getElementById("dispatchFormMode");
const dispatchFormSubmit = document.getElementById("dispatchFormSubmit");
const dispatchFormCancel = document.getElementById("dispatchFormCancel");
const dispatchWarehouseSelect = document.getElementById("dispatchWarehouseSelect");
const dispatchDealerSelect = document.getElementById("dispatchDealerSelect");
const dispatchItemsContainer = document.getElementById("dispatchItems");
const addDispatchItemButton = document.getElementById("addDispatchItem");
const productionBatchForm = document.getElementById("productionBatchForm");
const productionProductSelect = document.getElementById("productionProductSelect");
const productionWarehouseSelect = document.getElementById("productionWarehouseSelect");
const productionPlanForm = document.getElementById("productionPlanForm");
const productionPlanSummary = document.getElementById("productionPlanSummary");
const exportProductionPlanCsvButton = document.getElementById("exportProductionPlanCsv");
const exportSystemJsonButton = document.getElementById("exportSystemJson");
const settingsSummary = document.getElementById("settingsSummary");
const exportSalesCsvButton = document.getElementById("exportSalesCsv");
const exportWooCsvButton = document.getElementById("exportWooCsv");
const exportProductSummaryCsvButton = document.getElementById("exportProductSummaryCsv");
const refreshSaasButton = document.getElementById("refreshSaas");
const saasSummary = document.getElementById("saasSummary");
const industryProfileForm = document.getElementById("industryProfileForm");
const seedIndustryProfilesButton = document.getElementById("seedIndustryProfiles");
const refreshIndustrySectionButton = document.getElementById("refreshIndustrySection");
const industrySummary = document.getElementById("industrySummary");
const attributeDefinitionForm = document.getElementById("attributeDefinitionForm");
const pricingRuleForm = document.getElementById("pricingRuleForm");
const workflowTemplateForm = document.getElementById("workflowTemplateForm");
const reportPresetForm = document.getElementById("reportPresetForm");
const attributeIndustryProfileSelect = document.getElementById("attributeIndustryProfileSelect");
const pricingIndustryProfileSelect = document.getElementById("pricingIndustryProfileSelect");
const workflowIndustryProfileSelect = document.getElementById("workflowIndustryProfileSelect");
const presetIndustryProfileSelect = document.getElementById("presetIndustryProfileSelect");

let companies = [];
let dealers = [];
let products = [];
let variants = [];
let stockSummary = [];
let orders = [];
let priceLists = [];
let priceListItems = [];
let dealerPriceLists = [];
let warehouses = [];
let locations = [];
let mappings = [];
let tableSortState = {};
let defaultPriceListId = null;
let warehouseLocationId = null;
let selectedUnmappedLog = null;
let categories = [];
let dispatches = [];
let productionBatches = [];
let auditLogs = [];
let integrationLogsCache = [];
let integrationLogsCompanyId = null;
let productionPlanLastResult = null;
let industryProfiles = [];
let attributeDefinitions = [];
let pricingRules = [];
let workflowTemplates = [];
let reportPresets = [];
let selectedIndustryProfileId = null;
let mappingSuggestionsByExternalKey = new Map();
let authContext = {
  role: "OWNER",
  companyId: null,
  dealerId: null,
  authRequired: false
};
let activeMenuContext = {
  target: "overview",
  label: "Dashboard"
};

const PLATFORM_LABELS = {
  WOO: "WooCommerce",
  SHOPIFY: "Shopify",
  MARKETPLACE: "Pazaryeri",
  OTHER: "Diger"
};

const ROLE_ALLOWED_TARGETS = {
  OWNER: null,
  ADMIN: null,
  WAREHOUSE: new Set([
    "overview",
    "products",
    "categories",
    "variants",
    "gallery",
    "dealers",
    "stock",
    "dispatch",
    "orders",
    "production",
    "reports",
    "woo",
    "mapping",
    "integrations",
    "unmapped",
    "unmapped-summary",
    "prices"
  ]),
  ACCOUNTING: new Set([
    "overview",
    "dealers",
    "orders",
    "dispatch",
    "ledger",
    "reports",
    "prices",
    "woo",
    "mapping",
    "integrations",
    "unmapped",
    "unmapped-summary",
    "system",
    "industry"
  ])
};

const ROLE_DISABLED_FORM_IDS = {
  OWNER: [],
  ADMIN: [],
  WAREHOUSE: [
    "companyForm",
    "companySettingsForm",
    "dealerForm",
    "dealerSettingsForm",
    "userForm",
    "ledgerForm",
    "priceListForm",
    "priceForm",
    "dealerPriceListForm",
    "genericIntegrationForm",
    "industryProfileForm",
    "attributeDefinitionForm",
    "pricingRuleForm",
    "workflowTemplateForm",
    "reportPresetForm"
  ],
  ACCOUNTING: [
    "companyForm",
    "companySettingsForm",
    "dealerForm",
    "dealerSettingsForm",
    "warehouseForm",
    "categoryForm",
    "productForm",
    "variantForm",
    "productImageForm",
    "dispatchForm",
    "productionBatchForm",
    "priceListForm",
    "priceForm",
    "dealerPriceListForm",
    "wooSiteForm",
    "genericIntegrationForm",
    "mappingForm",
    "unmappedCreateForm",
    "userForm",
    "industryProfileForm",
    "attributeDefinitionForm",
    "pricingRuleForm",
    "workflowTemplateForm",
    "reportPresetForm"
  ]
};

const ADMIN_API_KEY_STORAGE_KEY = "bayi_portal_admin_api_key";

function getAdminApiKey() {
  try {
    return (localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function setAdminApiKey(value) {
  const normalized = (value || "").trim();
  try {
    if (normalized) {
      localStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
    }
  } catch {
    // localStorage erisimi yoksa sessizce gec.
  }
}
function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

async function api(path, options = {}) {
  const key = getAdminApiKey();
  const headers = {
    ...(options.headers || {}),
    ...(key ? { "x-api-key": key, "x-admin-key": key } : {})
  };

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Bir hata olustu");
  }
  return response.json();
}

function getCurrentRole() {
  return String(authContext?.role || "OWNER").toUpperCase();
}

function canOverrideRiskLimit() {
  const role = getCurrentRole();
  return role === "OWNER" || role === "ADMIN";
}

async function refreshAuthContext() {
  try {
    const result = await api("/auth/me");
    authContext = {
      role: String(result?.user?.role ?? "OWNER").toUpperCase(),
      companyId: result?.user?.companyId ?? null,
      dealerId: result?.user?.dealerId ?? null,
      authRequired: Boolean(result?.authRequired)
    };
  } catch {
    authContext = {
      role: "OWNER",
      companyId: null,
      dealerId: null,
      authRequired: false
    };
  }
}

function setFormDisabledById(formId, disabled) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll("input, select, textarea, button").forEach((element) => {
    element.disabled = disabled;
  });
}

function applyRoleNavigationVisibility() {
  const role = getCurrentRole();
  const allowedTargets = ROLE_ALLOWED_TARGETS[role] ?? null;

  document.querySelectorAll(".nav-btn, .quick-nav").forEach((button) => {
    if (!allowedTargets) {
      button.style.display = "";
      return;
    }

    const target = button.dataset.target;
    if (!target) return;
    button.style.display = allowedTargets.has(target) ? "" : "none";
  });

  if (allowedTargets) {
    const activeSection = document.querySelector(".section.active")?.dataset.section;
    if (activeSection && !allowedTargets.has(activeSection)) {
      const firstAllowedButton = Array.from(document.querySelectorAll(".nav-btn")).find(
        (button) => button.style.display !== "none"
      );
      const firstAllowedTarget = firstAllowedButton?.dataset.target ?? "overview";
      setSection(firstAllowedTarget, firstAllowedButton?.textContent ?? "", firstAllowedButton ?? null);
    }
  }
}

function applyRoleFormRestrictions() {
  const role = getCurrentRole();
  const disabledFormIds = ROLE_DISABLED_FORM_IDS[role] ?? [];

  Object.values(ROLE_DISABLED_FORM_IDS)
    .flat()
    .forEach((formId) => setFormDisabledById(formId, false));

  disabledFormIds.forEach((formId) => setFormDisabledById(formId, true));

  if (deleteCompanyBtn) {
    const shouldDisable = role === "WAREHOUSE" || role === "ACCOUNTING";
    deleteCompanyBtn.disabled = shouldDisable;
  }
}

function applyRoleButtonRestrictions() {
  const role = getCurrentRole();
  document.querySelectorAll("button.btn").forEach((button) => {
    if (button.classList.contains("nav-btn") || button.classList.contains("quick-nav")) return;
    button.disabled = false;
  });

  if (role === "WAREHOUSE") {
    const blockedSections = new Set(["dealers", "ledger", "users", "settings", "system", "saas", "prices", "industry"]);
    document.querySelectorAll("button.btn").forEach((button) => {
      if (button.classList.contains("nav-btn") || button.classList.contains("quick-nav")) return;
      const section = button.closest(".section");
      if (!section) return;
      const sectionId = section.dataset.section || "";
      if (blockedSections.has(sectionId)) {
        button.disabled = true;
      }
    });
    return;
  }

  if (role !== "ACCOUNTING") return;

  const allowedButtonIds = new Set([
    "refreshAll",
    "saveAdminApiKey",
    "applyReportFilters",
    "refreshUnmappedSummary",
    "exportSalesCsv",
    "exportWooCsv",
    "exportProductSummaryCsv",
    "exportProductionPlanCsv",
    "downloadMappingTemplate"
  ]);

  document.querySelectorAll("button.btn, button.nav-btn, button.quick-nav").forEach((button) => {
    if (button.classList.contains("nav-btn") || button.classList.contains("quick-nav")) return;
    if (allowedButtonIds.has(button.id)) return;
    if (button.closest('[data-section="ledger"]')) return;
    if (button.closest("#ledgerForm")) return;
    button.disabled = true;
  });
}

function updateRoleBadge() {
  const role = getCurrentRole();
  const baseText = health?.textContent || "API";
  const cleanText = baseText.split("|")[0].trim();
  if (health) {
    health.textContent = `${cleanText} | Rol: ${role}`;
  }
}

function applyRoleVisibility() {
  applyRoleNavigationVisibility();
  applyRoleFormRestrictions();
  applyRoleButtonRestrictions();
  updateRoleBadge();
}

function parseErrorMessage(error, fallbackMessage) {
  let message = error?.message || fallbackMessage;
  try {
    const parsed = JSON.parse(message);
    if (parsed?.message) {
      message = parsed.message;
    }
  } catch {
    // JSON degilse dogrudan mesaji kullan
  }
  return message;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function getSelectedCompanyId() {
  return companySelect.value;
}

function getSelectedDealerId() {
  return dealerSelect.value;
}

function setActiveMenuContext(target, label = "") {
  activeMenuContext = {
    target: target || "overview",
    label: String(label || "").trim()
  };
}

function getActiveMenuLabelFor(target) {
  if (!activeMenuContext || activeMenuContext.target !== target) return "";
  return normalizeMenuText(activeMenuContext.label || "");
}

function getPlatformLabel(platform) {
  return PLATFORM_LABELS[String(platform || "").toUpperCase()] || String(platform || "-");
}

function getSelectedCompany() {
  return companies.find((company) => company.id === getSelectedCompanyId());
}

function getIndustryProfileSelectors() {
  return [
    attributeIndustryProfileSelect,
    pricingIndustryProfileSelect,
    workflowIndustryProfileSelect,
    presetIndustryProfileSelect
  ].filter(Boolean);
}

function parseOptionalJsonInput(rawValue, label) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} JSON formati gecersiz.`);
  }
}

function formatJsonPreview(value, maxLength = 80) {
  if (value === null || value === undefined) return "-";
  const textValue = typeof value === "string" ? value : JSON.stringify(value);
  if (textValue.length <= maxLength) return textValue;
  return `${textValue.slice(0, maxLength - 3)}...`;
}

function updateIndustryProfileSelectOptions() {
  const selectors = getIndustryProfileSelectors();
  const activeProfiles = industryProfiles.filter((profile) => profile.active);
  const fallbackProfiles = activeProfiles.length ? activeProfiles : industryProfiles;

  selectors.forEach((select) => {
    const previous = select.value || selectedIndustryProfileId || "";
    select.innerHTML = "";

    if (!fallbackProfiles.length) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Profil yok";
      select.appendChild(empty);
      select.value = "";
      return;
    }

    fallbackProfiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.name} (${profile.code})${profile.active ? "" : " - pasif"}`;
      select.appendChild(option);
    });

    const hasPrevious = fallbackProfiles.some((profile) => profile.id === previous);
    select.value = hasPrevious ? previous : fallbackProfiles[0].id;
  });

  const selectedFromAny = selectors.find((select) => select.value)?.value || "";
  selectedIndustryProfileId = selectedFromAny || null;
}

function getSelectedIndustryProfileId() {
  if (selectedIndustryProfileId) return selectedIndustryProfileId;
  const selectors = getIndustryProfileSelectors();
  const first = selectors.find((select) => select.value);
  selectedIndustryProfileId = first?.value || null;
  return selectedIndustryProfileId;
}

function getProductById(productId) {
  return products.find((product) => product.id === productId);
}

function getVariantsByProduct(productId) {
  return variants.filter((variant) => variant.productId === productId);
}

function buildExternalKey(externalProductId, externalVariantId) {
  return `${externalProductId || ""}:${externalVariantId || ""}`;
}

function getExternalIdsFromLog(log) {
  const payload = log?.payload ?? {};
  const externalProductId = payload.product_id ? String(payload.product_id) : "";
  const externalVariantId =
    payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
  return { externalProductId, externalVariantId };
}

async function refreshMappingSuggestions() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId || !dealerId) {
    mappingSuggestionsByExternalKey = new Map();
    return;
  }

  const rows = await api(
    `/mappings/suggestions${buildQuery({
      companyId,
      dealerId,
      platform: "WOO",
      limit: 300
    })}`
  );

  const map = new Map();
  (rows ?? []).forEach((row) => {
    const top = row?.suggestions?.[0];
    if (!top) return;
    const key = buildExternalKey(row.externalProductId, row.externalVariantId || "");
    map.set(key, top);
  });
  mappingSuggestionsByExternalKey = map;
}

async function applyMappingSuggestion(log, suggestion) {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId || !dealerId) {
    showToast("Lutfen firma ve bayi secin.", "error");
    return;
  }

  const { externalProductId, externalVariantId } = getExternalIdsFromLog(log);
  if (!externalProductId) {
    showToast("Harici urun bilgisi bulunamadi.", "error");
    return;
  }

  await api("/mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId,
      dealerId,
      platform: "WOO",
      externalProductId,
      externalVariantId: externalVariantId || undefined,
      localProductId: suggestion.localProductId,
      localVariantId: suggestion.localVariantId || undefined
    })
  });

  showToast(`Oneri ile esleme kaydedildi: ${suggestion.label}`);
  await refreshMappings();
  await refreshIntegrationLogs();
  await refreshUnmappedSummary();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Dosya okunamadi"));
    reader.readAsDataURL(file);
  });
}

function setProductFormCreateMode() {
  if (!productForm) return;
  productForm.dataset.mode = "create";
  productForm.dataset.editId = "";
  if (productEditIdInput) productEditIdInput.value = "";
  if (productFormMode) productFormMode.textContent = "Yeni urun modu";
  if (productFormSubmit) productFormSubmit.textContent = "Kaydet";
  if (productFormCancel) productFormCancel.classList.add("hidden");
}

function setProductFormEditMode(product) {
  if (!productForm) return;
  productForm.dataset.mode = "edit";
  productForm.dataset.editId = product.id;
  if (productEditIdInput) productEditIdInput.value = product.id;
  if (productFormMode) productFormMode.textContent = `Duzenleme modu: ${product.name}`;
  if (productFormSubmit) productFormSubmit.textContent = "Guncelle";
  if (productFormCancel) productFormCancel.classList.remove("hidden");

  productForm.categoryId.value = product.categoryId ?? "";
  productForm.name.value = product.name ?? "";
  productForm.sku.value = product.sku ?? "";
  productForm.weight.value = product.weight ?? "";
  productForm.basePrice.value = product.basePrice ?? "";
  productForm.imageUrl.value = product.imageUrl ?? "";
  if (productForm.imageFile) productForm.imageFile.value = "";
  productForm.unit.value = product.unit ?? "PIECE";

  setSection("products", "Yeni Urun Ekle");
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function promptRequired(label, currentValue) {
  const raw = window.prompt(label, currentValue ?? "");
  if (raw === null) return null;
  const value = raw.trim();
  if (!value) {
    showToast("Bu alan bos birakilamaz.", "error");
    return null;
  }
  return value;
}

function promptOptional(label, currentValue) {
  const raw = window.prompt(label, currentValue ?? "");
  if (raw === null) return null;
  const value = raw.trim();
  return value || undefined;
}

function promptYesNo(label, currentValue) {
  const raw = window.prompt(label, currentValue ? "E" : "H");
  if (raw === null) return null;
  const value = raw.trim().toLowerCase();
  if (["e", "evet", "1", "true", "aktif"].includes(value)) return true;
  if (["h", "hayir", "0", "false", "pasif"].includes(value)) return false;
  showToast("Lutfen E veya H girin.", "error");
  return null;
}

function renderCompanyOptions() {
  companySelect.innerHTML = "";
  for (const company of companies) {
    const option = document.createElement("option");
    option.value = company.id;
    option.textContent = company.name;
    companySelect.appendChild(option);
  }
}

function renderDealerOptions() {
  dealerSelect.innerHTML = "";
  for (const dealer of dealers) {
    const option = document.createElement("option");
    option.value = dealer.id;
    option.textContent = dealer.name;
    dealerSelect.appendChild(option);
  }
}

function renderWarehouseOptions() {
  const targets = [warehouseSelect, warehouseReportSelect, productionWarehouseSelect].filter(Boolean);

  targets.forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = "";

    for (const warehouse of warehouses) {
      const option = document.createElement("option");
      option.value = warehouse.id;
      option.textContent = warehouse.name;
      select.appendChild(option);
    }

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  });
}

function renderPriceListOptions() {
  const targets = [priceListSelect, priceListManageSelect].filter(Boolean);
  targets.forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = "";

    priceLists.forEach((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = `${list.name} (${list.currency})`;
      select.appendChild(option);
    });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  });

  if (!defaultPriceListId && priceLists.length) {
    defaultPriceListId = priceLists[0].id;
  }
  if (defaultPriceListId && priceListManageSelect) {
    priceListManageSelect.value = defaultPriceListId;
  }
}

function renderPriceListsTable() {
  renderTable(
    "priceListTable",
    ["Liste", "Para", "Durum", "Islem"],
    priceLists.map((list) => [
      list.name,
      list.currency ?? "TRY",
      list.id === defaultPriceListId ? "Secili" : "-",
      [
        {
          label: "Sec",
          className: "btn ghost",
          onClick: async () => {
            defaultPriceListId = list.id;
            if (priceListManageSelect) priceListManageSelect.value = list.id;
            showToast(`${list.name} secildi.`);
            await refreshPriceItems();
            renderPriceListsTable();
          },
          sortValue: ""
        },
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Liste adi", list.name);
            if (name === null) return;
            const currency = promptRequired("Para birimi", list.currency ?? "TRY");
            if (currency === null) return;

            await api(`/price-lists/${list.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, currency: currency.toUpperCase() })
            });
            showToast("Fiyat listesi guncellendi.");
            await refreshPriceLists();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm(`${list.name} listesi silinsin mi?`)) return;
            await api(`/price-lists/${list.id}`, { method: "DELETE" });
            if (defaultPriceListId === list.id) {
              defaultPriceListId = null;
            }
            showToast("Fiyat listesi silindi.");
            await refreshPriceLists();
            await refreshDealerPriceLists();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

function renderPriceCatalogTable() {
  const selectedList = priceLists.find((list) => list.id === defaultPriceListId);
  const productPriceMap = new Map();
  priceListItems
    .filter((item) => !item.variantId)
    .forEach((item) => {
      productPriceMap.set(item.productId, Number(item.price ?? 0));
    });

  const totalProducts = products.length;
  const listedProducts = products.filter((product) => productPriceMap.has(product.id)).length;
  const totalListAmount = products.reduce((sum, product) => {
    const price = Number(productPriceMap.get(product.id) ?? 0);
    return sum + price;
  }, 0);

  if (priceCatalogSummary) {
    if (!defaultPriceListId || !selectedList) {
      priceCatalogSummary.textContent = "Once bir fiyat listesi secin.";
    } else {
      priceCatalogSummary.textContent =
        `Liste: ${selectedList.name} (${selectedList.currency ?? "TRY"}) | ` +
        `Urun: ${listedProducts}/${totalProducts} | Toplam Liste Fiyati: ${totalListAmount.toFixed(2)}`;
    }
  }

  if (!defaultPriceListId || !selectedList) {
    renderTable(
      "priceCatalogTable",
      ["Urun", "Birim", "Agirlik", "Baz Fiyat", "Liste Fiyati", "Islem"],
      [["Liste secin", "-", "-", "-", "-", "-"]]
    );
    return;
  }

  renderTable(
    "priceCatalogTable",
    ["Urun", "Birim", "Agirlik (gr)", "Baz Fiyat", "Liste Fiyati", "Islem"],
    products.map((product) => {
      const listPrice = Number(productPriceMap.get(product.id) ?? 0);
      const basePrice = Number(product.basePrice ?? 0);
      const weight = Number(product.weight ?? 0);

      return [
        product.name,
        product.unit,
        weight.toFixed(2),
        basePrice.toFixed(2),
        listPrice.toFixed(2),
        [
          {
            label: "Aktar",
            className: "btn ghost",
            onClick: async () => {
              await api(`/price-lists/${defaultPriceListId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: product.id,
                  price: basePrice
                })
              });
              showToast(`${product.name} listeye aktarildi.`);
              await refreshPriceItems();
            },
            sortValue: ""
          },
          {
            label: "Gram/Fiyat",
            className: "btn ghost",
            onClick: async () => {
              const weightInput = promptRequired(
                `${product.name} agirlik (gr)`,
                weight.toFixed(2)
              );
              if (weightInput === null) return;
              const listPriceInput = promptRequired(
                `${product.name} liste fiyati (${selectedList.currency ?? "TRY"})`,
                listPrice.toFixed(2)
              );
              if (listPriceInput === null) return;

              const nextWeight = Number(weightInput.replace(",", "."));
              const nextListPrice = Number(listPriceInput.replace(",", "."));

              if (!Number.isFinite(nextWeight) || nextWeight < 0) {
                showToast("Agirlik gecersiz.", "error");
                return;
              }
              if (!Number.isFinite(nextListPrice) || nextListPrice < 0) {
                showToast("Fiyat gecersiz.", "error");
                return;
              }

              await api(`/products/${product.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ weight: nextWeight })
              });

              await api(`/price-lists/${defaultPriceListId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: product.id,
                  price: nextListPrice
                })
              });

              showToast(`${product.name} gram ve liste fiyati guncellendi.`);
              await refreshProducts();
              await refreshPriceItems();
            },
            sortValue: ""
          }
        ]
      ];
    })
  );
}

function renderMappingProductOptions() {
  mappingProductSelect.innerHTML = "";
  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    mappingProductSelect.appendChild(option);
  });
  renderMappingVariantOptions();
}

function renderMappingVariantOptions() {
  const productId = mappingProductSelect.value;
  mappingVariantSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon yok";
  mappingVariantSelect.appendChild(empty);
  getVariantsByProduct(productId).forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = variant.name;
    mappingVariantSelect.appendChild(option);
  });
}

function renderUnmappedParentProducts() {
  if (!unmatchedParentProductId) return;
  unmatchedParentProductId.innerHTML = "";
  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (${product.unit})`;
    unmatchedParentProductId.appendChild(option);
  });
}

function updateUnmappedCreateTypeUI() {
  if (!unmatchedCreateType) return;
  const isVariant = unmatchedCreateType.value === "VARIANT";
  unmatchedParentWrap?.classList.toggle("hidden", !isVariant);
  unmatchedMultiplierWrap?.classList.toggle("hidden", !isVariant);
}

function guessUnitFromUnmappedPayload(payload) {
  const bag = `${payload?.name ?? ""} ${payload?.parent_name ?? ""} ${JSON.stringify(payload?.meta_data ?? [])}`.toLowerCase();
  if (bag.includes("kg") || bag.includes("kilo")) return "KG";
  if (bag.includes("lt") || bag.includes("litr")) return "LT";
  return "PIECE";
}

function setSelectedUnmappedLog(log) {
  const payload = log?.payload ?? {};
  const externalProductId = payload.product_id ? String(payload.product_id) : "-";
  const externalVariantId = payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "-";

  selectedUnmappedLog = {
    logId: log.id,
    externalProductId: payload.product_id ? String(payload.product_id) : null,
    externalVariantId: payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : undefined,
    name: payload.name ?? "",
    sku: payload.sku ?? "",
    unit: guessUnitFromUnmappedPayload(payload)
  };

  if (unmatchedSelectedInfo) {
    unmatchedSelectedInfo.value = `Siparis: ${log.externalId ?? "-"} | Urun: ${payload.name ?? "-"}`;
  }
  if (unmatchedExternalInfo) {
    unmatchedExternalInfo.value = `Harici UrunID: ${externalProductId} | Harici VaryasyonID: ${externalVariantId}`;
  }
  if (unmatchedName) unmatchedName.value = payload.name ?? "";
  if (unmatchedSku) unmatchedSku.value = payload.sku ?? "";
  if (unmatchedUnit) unmatchedUnit.value = guessUnitFromUnmappedPayload(payload);

  showToast("Eslesmeyen satir secildi. Simdi urun tipini secip olusturabilirsiniz.");
}

function renderProductOptions() {
  stockProductSelect.innerHTML = "";
  variantProductSelect.innerHTML = "";
  priceProductSelect.innerHTML = "";
  if (imageProductSelect) imageProductSelect.innerHTML = "";
  if (productionProductSelect) productionProductSelect.innerHTML = "";

  for (const product of products) {
    const label = `${product.name} (${product.unit})`;
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = label;
    stockProductSelect.appendChild(option);

    const option2 = document.createElement("option");
    option2.value = product.id;
    option2.textContent = label;
    variantProductSelect.appendChild(option2);

    const option3 = document.createElement("option");
    option3.value = product.id;
    option3.textContent = label;
    priceProductSelect.appendChild(option3);

    if (imageProductSelect) {
      const imageOption = document.createElement("option");
      imageOption.value = product.id;
      imageOption.textContent = label;
      imageProductSelect.appendChild(imageOption);
    }

    if (productionProductSelect) {
      const productionOption = document.createElement("option");
      productionOption.value = product.id;
      productionOption.textContent = label;
      productionProductSelect.appendChild(productionOption);
    }
  }

  renderStockVariants();
  renderPriceVariants();
  renderMappingProductOptions();
  renderUnmappedParentProducts();
}

function renderStockVariants() {
  const productId = stockProductSelect.value;
  const list = getVariantsByProduct(productId);
  stockVariantSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon yok";
  stockVariantSelect.appendChild(empty);
  list.forEach((variant) => {
    const opt = document.createElement("option");
    opt.value = variant.id;
    opt.textContent = `${variant.name} (x${variant.multiplier})`;
    stockVariantSelect.appendChild(opt);
  });
}

function renderPriceVariants() {
  const selectedProductId = priceProductSelect.value || "";
  const previousVariantId = priceVariantSelect.value || "";

  priceVariantSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon yok";
  priceVariantSelect.appendChild(empty);

  const list = selectedProductId ? getVariantsByProduct(selectedProductId) : [];
  list.forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    const label = variant.product ? `${variant.product.name} / ${variant.name}` : variant.name;
    option.textContent = `${label} (x${Number(variant.multiplier).toFixed(2)})`;
    priceVariantSelect.appendChild(option);
  });

  if (previousVariantId) {
    const exists = Array.from(priceVariantSelect.options).some(
      (option) => option.value === previousVariantId
    );
    if (exists) {
      priceVariantSelect.value = previousVariantId;
    }
  }
}

function compareCells(a, b) {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);
  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b), "tr");
}

function getCellValue(cell) {
  if (Array.isArray(cell)) return "";
  if (cell && typeof cell === "object") {
    if (cell.type === "image") return cell.alt ?? "";
    return cell.sortValue ?? cell.label ?? "";
  }
  return cell ?? "";
}

function renderTable(tableId, headers, rows) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const state = tableSortState[tableId] ?? { columnIndex: 0, asc: true };
  tableSortState[tableId] = state;

  const sortedRows = [...rows].sort((a, b) => {
    const result = compareCells(
      getCellValue(a[state.columnIndex]),
      getCellValue(b[state.columnIndex])
    );
    return state.asc ? result : -result;
  });

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      if (state.columnIndex === index) {
        state.asc = !state.asc;
      } else {
        state.columnIndex = index;
        state.asc = true;
      }
      renderTable(tableId, headers, rows);
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sortedRows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      if (Array.isArray(cell)) {
        cell.forEach((action) => {
          const button = document.createElement("button");
          button.textContent = action.label ?? "Islem";
          button.className = action.className ?? "btn ghost";
          button.addEventListener("click", action.onClick);
          td.appendChild(button);
        });
      } else if (cell && typeof cell === "object") {
        if (cell.type === "image") {
          if (cell.src) {
            const img = document.createElement("img");
            img.src = cell.src;
            img.alt = cell.alt ?? "";
            img.loading = "lazy";
            td.appendChild(img);
          } else {
            td.textContent = "-";
          }
        } else {
          const button = document.createElement("button");
          button.textContent = cell.label ?? "Islem";
          button.className = cell.className ?? "btn ghost";
          button.addEventListener("click", cell.onClick);
          td.appendChild(button);
        }
      } else {
        td.textContent = cell;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function getReportFilters() {
  return {
    from: reportFromInput?.value || undefined,
    to: reportToInput?.value || undefined
  };
}

function getActiveReportPreset() {
  const label = getActiveMenuLabelFor("reports");
  if (label.includes("bayi performansi")) return "DEALER_PERFORMANCE";
  if (label.includes("cari raporu")) return "FINANCE_SUMMARY";
  if (label.includes("donemsel karsilastirmalar")) return "PERIOD_COMPARISON";
  if (label.includes("stok raporu")) return "STOCK_FOCUS";
  if (label.includes("sevkiyat raporu")) return "DISPATCH_FOCUS";
  if (label.includes("urun performansi")) return "PRODUCT_PERFORMANCE";
  return "SALES_SUMMARY";
}

function parseDateRange(fromValue, toValue) {
  const now = new Date();
  const from = fromValue ? new Date(fromValue) : null;
  const to = toValue ? new Date(toValue) : null;

  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  if (!from && !to) {
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 29);
    defaultFrom.setHours(0, 0, 0, 0);
    const defaultTo = new Date(now);
    defaultTo.setHours(23, 59, 59, 999);
    return { from: defaultFrom, to: defaultTo };
  }

  if (from && !to) {
    const onlyTo = new Date(now);
    onlyTo.setHours(23, 59, 59, 999);
    return { from, to: onlyTo };
  }

  if (!from && to) {
    const onlyFrom = new Date(to);
    onlyFrom.setDate(onlyFrom.getDate() - 29);
    onlyFrom.setHours(0, 0, 0, 0);
    return { from: onlyFrom, to };
  }

  if (from && to && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

function isDateInRange(value, range) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  return date >= range.from && date <= range.to;
}

function formatPercentChange(current, previous) {
  const prev = Number(previous ?? 0);
  const curr = Number(current ?? 0);
  if (prev === 0 && curr === 0) return "0.00%";
  if (prev === 0) return "+100.00%";
  const change = ((curr - prev) / Math.abs(prev)) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

function buildComparisonRanges(fromValue, toValue) {
  const current = parseDateRange(fromValue, toValue);
  const msInDay = 24 * 60 * 60 * 1000;
  const daySpan = Math.max(1, Math.round((current.to.getTime() - current.from.getTime()) / msInDay) + 1);

  const previousTo = new Date(current.from.getTime() - 1);
  previousTo.setHours(23, 59, 59, 999);
  const previousFrom = new Date(previousTo.getTime() - (daySpan - 1) * msInDay);
  previousFrom.setHours(0, 0, 0, 0);

  return {
    current,
    previous: { from: previousFrom, to: previousTo },
    daySpan
  };
}

function getWooSyncFilters() {
  return {
    from: wooSyncFrom?.value || undefined,
    to: wooSyncTo?.value || undefined
  };
}

async function refreshCompanies() {
  const previousId = companySelect.value;
  companies = await api("/companies");
  renderCompanyOptions();
  renderCompanyDirectory();

  if (previousId && companies.some((company) => company.id === previousId)) {
    companySelect.value = previousId;
  } else if (companies[0]) {
    companySelect.value = companies[0].id;
  } else {
    companySelect.value = "";
  }

  const selected = getSelectedCompany();
  if (selected) {
    companySettingsForm.name.value = selected.name ?? "";
    companySettingsForm.email.value = selected.email ?? "";
    companySettingsForm.phone.value = selected.phone ?? "";
  } else {
    companySettingsForm.name.value = "";
    companySettingsForm.email.value = "";
    companySettingsForm.phone.value = "";
  }
}

function renderCompanyDirectory() {
  renderTable(
    "companyTable",
    ["Firma", "E-posta", "Telefon", "Islem"],
    companies.map((company) => [
      company.name,
      company.email ?? "-",
      company.phone ?? "-",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Firma adi", company.name);
            if (name === null) return;
            const email = promptOptional("E-posta (opsiyonel)", company.email ?? "");
            if (email === null) return;
            const phone = promptOptional("Telefon (opsiyonel)", company.phone ?? "");
            if (phone === null) return;

            await api(`/companies/${company.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email: email || undefined,
                phone: phone || undefined
              })
            });

            showToast("Firma guncellendi.");
            await refreshAll();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = window.confirm(`${company.name} firmasini silmek istediginize emin misiniz?`);
            if (!ok) return;

            try {
              await api(`/companies/${company.id}`, { method: "DELETE" });
            } catch (error) {
              const message = parseErrorMessage(error, "Firma silinemedi.");
              const force = window.confirm(
                `${message}\n\nBagli tum kayitlarla birlikte silinsin mi?`
              );
              if (!force) {
                showToast("Silme iptal edildi.", "error");
                return;
              }
              await api(`/companies/${company.id}?force=true`, { method: "DELETE" });
            }

            showToast("Firma silindi.");
            setProductFormCreateMode();
            await refreshAll();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshDealers() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  const [dealerRows, riskRows] = await Promise.all([
    api(`/dealers${buildQuery({ companyId })}`),
    api(`/dealers/risk-summary${buildQuery({ companyId })}`)
  ]);

  const riskMap = new Map((riskRows ?? []).map((row) => [row.dealerId, row]));
  dealers = (dealerRows ?? []).map((dealer) => ({
    ...dealer,
    risk: riskMap.get(dealer.id) ?? null
  }));

  renderDealerOptions();
  renderDealerDirectory();
  renderDispatchSelectors();
  if (!dealerSelect.value && dealers[0]) {
    dealerSelect.value = dealers[0].id;
  }
}

function renderDealerDirectory() {
  renderTable(
    "dealerDirectoryTable",
    ["Bayi", "E-posta", "Telefon", "Vergi No", "Adres", "Bakiye", "Risk", "Islem"],
    dealers.map((dealer) => [
      dealer.name,
      dealer.email ?? "-",
      dealer.phone ?? "-",
      dealer.taxNumber ?? "-",
      dealer.address ?? "-",
      Number(dealer.risk?.currentBalance ?? 0).toFixed(2),
      dealer.risk?.riskLevel ?? "OK",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Bayi adi", dealer.name);
            if (name === null) return;

            const email = promptOptional("E-posta (opsiyonel)", dealer.email ?? "");
            if (email === null) return;
            const phone = promptOptional("Telefon (opsiyonel)", dealer.phone ?? "");
            if (phone === null) return;
            const taxNumber = promptOptional("Vergi no (opsiyonel)", dealer.taxNumber ?? "");
            if (taxNumber === null) return;
            const address = promptOptional("Adres (opsiyonel)", dealer.address ?? "");
            if (address === null) return;

            await api(`/dealers/${dealer.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, phone, taxNumber, address })
            });

            showToast("Bayi guncellendi.");
            await refreshAll();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = window.confirm(`${dealer.name} bayisi silinsin mi?`);
            if (!ok) return;

            try {
              await api(`/dealers/${dealer.id}`, { method: "DELETE" });
            } catch (error) {
              const message = parseErrorMessage(error, "Bayi silinemedi.");
              const force = window.confirm(
                `${message}\n\nBagli tum kayitlarla birlikte silinsin mi?`
              );
              if (!force) {
                showToast("Silme iptal edildi.", "error");
                return;
              }
              await api(`/dealers/${dealer.id}?force=true`, { method: "DELETE" });
            }

            showToast("Bayi silindi.");
            await refreshAll();
          },
          sortValue: ""
        }
      ]
    ])
  );
  applyRoleVisibility();
}

async function refreshDealerSettings() {
  const dealerId = getSelectedDealerId();
  if (!dealerId) return;
  const settings = await api(`/dealers/${dealerId}/settings`);
  dealerSettingsForm.marginPercent.value = settings?.marginPercent ?? "";
  dealerSettingsForm.roundingType.value = settings?.roundingType ?? "NONE";
  dealerSettingsForm.apiKey.value = settings?.apiKey ?? "";
}

async function refreshWarehouses() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  warehouses = await api(`/warehouses${buildQuery({ companyId })}`);
  if (!warehouses.length) {
    const created = await api("/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, name: "Ana Depo" })
    });
    warehouses = [created];
  }

  renderWarehouseOptions();
  renderTable(
    "warehouseTable",
    ["Depo", "Adres", "Islem"],
    warehouses.map((warehouse) => [
      warehouse.name,
      warehouse.address ?? "-",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Depo adi", warehouse.name);
            if (name === null) return;
            const address = promptOptional("Adres (opsiyonel)", warehouse.address ?? "");
            if (address === null) return;

            await api(`/warehouses/${warehouse.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, address })
            });

            showToast("Depo guncellendi.");
            await refreshWarehouses();
            await refreshLocations();
            updateWarehouseLocation();
            await refreshWarehouseReport();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm("Depo silinsin mi?")) return;
            await api(`/warehouses/${warehouse.id}`, { method: "DELETE" });
            showToast("Depo silindi.");
            await refreshWarehouses();
            await refreshLocations();
            updateWarehouseLocation();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshLocations() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  locations = await api(`/locations${buildQuery({ companyId })}`);
}

function updateWarehouseLocation() {
  const selectedWarehouseId = warehouseSelect.value;
  const location = locations.find(
    (loc) => loc.type === "WAREHOUSE" && loc.referenceId === selectedWarehouseId
  );
  warehouseLocationId = location?.id ?? null;
}

async function refreshProducts() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  products = await api(`/products${buildQuery({ companyId })}`);
  renderProductOptions();
  renderOrderItems();
  renderProductTable();
  updateOverview();
}

async function refreshVariants() {
  const companyId = getSelectedCompanyId();
  if (!companyId) {
    variants = [];
    renderStockVariants();
    renderPriceVariants();
    renderVariantsTable();
    renderMappingVariantOptions();
    return;
  }

  variants = await api(`/variants${buildQuery({ companyId })}`);
  const productMap = new Map(products.map((product) => [product.id, product]));
  variants.forEach((variant) => {
    variant.product = productMap.get(variant.productId);
  });

  renderStockVariants();
  renderPriceVariants();
  renderVariantsTable();
  renderMappingVariantOptions();
}

async function refreshStockSummary() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const filters = getReportFilters();
  const [summaryRows, productSummaryRows] = await Promise.all([
    api("/reports/stock-summary" + buildQuery({ companyId })),
    api("/reports/product-summary" + buildQuery({ companyId, ...filters }))
  ]);

  stockSummary = summaryRows;

  renderTable(
    "stockTable",
    ["Urun", "Birim", "Kalan"],
    stockSummary
      .filter((item) => !item.variantId)
      .map((item) => [item.name, item.unit, Number(item.balance).toFixed(2)])
  );

  const preset = getActiveReportPreset();
  const isReportSection = activeMenuContext?.target === "reports";

  let headers = ["Urun", "Birim", "Toplam Stok Girisi", "Toplam Satis", "API Satis", "Sevk", "Kalan"];
  let rows = (productSummaryRows ?? []).map((row) => [
    row.name,
    row.unit,
    Number(row.totalStockEntry ?? 0).toFixed(2),
    Number(row.totalSales ?? 0).toFixed(2),
    Number(row.apiSales ?? 0).toFixed(2),
    Number(row.dispatch ?? 0).toFixed(2),
    Number(row.balance ?? 0).toFixed(2)
  ]);

  if (isReportSection && preset === "PRODUCT_PERFORMANCE") {
    const totalSales = (productSummaryRows ?? []).reduce((sum, row) => sum + Number(row.totalSales ?? 0), 0);
    headers = ["Urun", "Birim", "Toplam Satis", "API Satis", "Sevk", "Satis Payi", "Kalan"];
    rows = (productSummaryRows ?? []).map((row) => {
      const sales = Number(row.totalSales ?? 0);
      const share = totalSales > 0 ? (sales / totalSales) * 100 : 0;
      return [
        row.name,
        row.unit,
        sales.toFixed(2),
        Number(row.apiSales ?? 0).toFixed(2),
        Number(row.dispatch ?? 0).toFixed(2),
        `${share.toFixed(2)}%`,
        Number(row.balance ?? 0).toFixed(2)
      ];
    });
  }

  if (isReportSection && preset === "STOCK_FOCUS") {
    headers = ["Urun", "Birim", "Toplam Stok Girisi", "Toplam Satis", "Kalan", "Devir Hizi"];
    rows = (productSummaryRows ?? []).map((row) => {
      const stockEntry = Number(row.totalStockEntry ?? 0);
      const sales = Number(row.totalSales ?? 0);
      const turnover = stockEntry > 0 ? sales / stockEntry : 0;
      return [
        row.name,
        row.unit,
        stockEntry.toFixed(2),
        sales.toFixed(2),
        Number(row.balance ?? 0).toFixed(2),
        turnover.toFixed(2)
      ];
    });
  }

  if (isReportSection && preset === "DISPATCH_FOCUS") {
    headers = ["Urun", "Birim", "Sevk", "API Satis", "Karsilanan Satis", "Kalan"];
    rows = (productSummaryRows ?? []).map((row) => {
      const dispatch = Number(row.dispatch ?? 0);
      const apiSales = Number(row.apiSales ?? 0);
      const coverage = dispatch > 0 ? (apiSales / dispatch) * 100 : 0;
      return [
        row.name,
        row.unit,
        dispatch.toFixed(2),
        apiSales.toFixed(2),
        `${coverage.toFixed(2)}%`,
        Number(row.balance ?? 0).toFixed(2)
      ];
    });
  }

  if (isReportSection && preset === "PERIOD_COMPARISON") {
    const ranges = buildComparisonRanges(filters.from, filters.to);
    const previousRows = await api(
      "/reports/product-summary" +
        buildQuery({
          companyId,
          from: ranges.previous.from.toISOString().slice(0, 10),
          to: ranges.previous.to.toISOString().slice(0, 10)
        })
    );

    const previousMap = new Map(
      (previousRows ?? []).map((row) => [`${row.name}||${row.unit}`, row])
    );

    headers = ["Urun", "Birim", "Bu Donem Satis", "Onceki Donem Satis", "Degisim", "Bu Donem Sevk", "Onceki Donem Sevk"];
    rows = (productSummaryRows ?? []).map((row) => {
      const key = `${row.name}||${row.unit}`;
      const previous = previousMap.get(key);
      const currentSales = Number(row.totalSales ?? 0);
      const previousSales = Number(previous?.totalSales ?? 0);
      const currentDispatch = Number(row.dispatch ?? 0);
      const previousDispatch = Number(previous?.dispatch ?? 0);
      return [
        row.name,
        row.unit,
        currentSales.toFixed(2),
        previousSales.toFixed(2),
        formatPercentChange(currentSales, previousSales),
        currentDispatch.toFixed(2),
        previousDispatch.toFixed(2)
      ];
    });
  }

  renderTable(
    "productSummaryTable",
    headers,
    rows.length
      ? rows
      : [Array.from({ length: headers.length }, (_, index) => (index === 0 ? "Veri bulunamadi" : "-"))]
  );
}

async function refreshStockMovements() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  const movements = await api(`/stock-movements${buildQuery({ companyId })}`);
  renderTable(
    "stockMovementsTable",
    ["Tarih", "Urun", "Tip", "Miktar", "Islem"],
    movements.map((movement) => {
      const product = getProductById(movement.productId);
      const variant = variants.find((v) => v.id === movement.variantId);
      const name = variant ? `${product?.name ?? ""} / ${variant.name}` : product?.name ?? "-";
      return [
        new Date(movement.createdAt).toLocaleString(),
        name,
        movement.type,
        Number(movement.quantity).toFixed(2),
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm("Stok hareketi silinsin mi?")) return;
            try {
              await api(`/stock-movements/${movement.id}`, { method: "DELETE" });
            } catch (error) {
              const message = parseErrorMessage(error, "Stok hareketi silinemedi.");
              const force = window.confirm(`${message}\n\nZorla silmek ister misiniz?`);
              if (!force) return;
              await api(`/stock-movements/${movement.id}?force=true`, { method: "DELETE" });
            }

            showToast("Stok hareketi silindi.");
            await refreshStockMovements();
            await refreshStockSummary();
            await refreshWarehouseReport();
          },
          sortValue: ""
        }
      ];
    })
  );
}

async function refreshOrders() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  const dealerId = getSelectedDealerId();
  orders = await api(`/orders${buildQuery({ companyId, dealerId })}`);

  const focusLabel = getActiveMenuLabelFor("orders");
  let filteredOrders = orders;

  if (focusLabel.includes("manuel")) {
    filteredOrders = orders.filter((order) => String(order.channel || "").toUpperCase() === "MANUAL");
  }

  const rows = filteredOrders.length
    ? filteredOrders.map((order) => {
        const dealer = dealers.find((item) => item.id === order.dealerId);
        const items = order.items
          .map((item) => {
            const product = getProductById(item.productId);
            const variant = variants.find((v) => v.id === item.variantId);
            const name = variant ? `${product?.name ?? ""} / ${variant.name}` : product?.name ?? "-";
            return `${name} x${Number(item.quantity).toFixed(2)}`;
          })
          .join(", ");

        return [
          new Date(order.createdAt).toLocaleString(),
          dealer?.name ?? "-",
          String(order.channel || "-"),
          order.status,
          items || "-",
          Number(order.totalPrice).toFixed(2)
        ];
      })
    : [["-", "-", "-", "-", "Kayit bulunamadi", "0.00"]];

  renderTable(
    "ordersTable",
    ["Tarih", "Bayi", "Kanal", "Durum", "Kalemler", "Toplam"],
    rows
  );
}

async function refreshSalesSummary() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const filters = getReportFilters();
  const preset = getActiveReportPreset();

  if (preset === "DEALER_PERFORMANCE") {
    const range = parseDateRange(filters.from, filters.to);
    const dealerNameMap = new Map(dealers.map((dealer) => [dealer.id, dealer.name]));
    const allOrders = await api("/orders" + buildQuery({ companyId }));
    const filteredOrders = allOrders.filter((order) => isDateInRange(order.createdAt, range));

    const grouped = new Map();
    filteredOrders.forEach((order) => {
      const key = order.dealerId || "-";
      const current = grouped.get(key) ?? {
        dealerName: dealerNameMap.get(key) ?? "-",
        totalOrders: 0,
        totalPrice: 0,
        wooOrders: 0,
        manualOrders: 0
      };
      current.totalOrders += 1;
      current.totalPrice += Number(order.totalPrice ?? 0);
      const channel = String(order.channel || "").toUpperCase();
      if (channel === "WOO") current.wooOrders += 1;
      if (channel === "MANUAL") current.manualOrders += 1;
      grouped.set(key, current);
    });

    const rows = Array.from(grouped.values())
      .sort((a, b) => b.totalPrice - a.totalPrice)
      .map((row) => [
        row.dealerName,
        row.totalOrders,
        row.totalPrice.toFixed(2),
        (row.totalOrders ? row.totalPrice / row.totalOrders : 0).toFixed(2),
        row.wooOrders,
        row.manualOrders
      ]);

    renderTable(
      "salesTable",
      ["Bayi", "Toplam Siparis", "Toplam Tutar", "Ortalama Siparis", "Woo", "Manuel"],
      rows.length ? rows : [["-", "0", "0.00", "0.00", "0", "0"]]
    );
    return;
  }

  if (preset === "FINANCE_SUMMARY") {
    const range = parseDateRange(filters.from, filters.to);
    const dealerNameMap = new Map(dealers.map((dealer) => [dealer.id, dealer.name]));
    const entries = await api("/ledger" + buildQuery({ companyId }));
    const filteredEntries = entries.filter((entry) => isDateInRange(entry.date, range));

    const grouped = new Map();
    filteredEntries.forEach((entry) => {
      const key = entry.dealerId || "-";
      const current = grouped.get(key) ?? {
        dealerName: dealerNameMap.get(key) ?? "-",
        debit: 0,
        credit: 0
      };

      const amount = Number(entry.amount ?? 0);
      if (String(entry.type || "").toUpperCase() === "PAYMENT") {
        current.credit += amount;
      } else {
        current.debit += amount;
      }
      grouped.set(key, current);
    });

    const rows = Array.from(grouped.values())
      .map((row) => ({
        ...row,
        balance: row.debit - row.credit
      }))
      .sort((a, b) => b.balance - a.balance)
      .map((row) => [
        row.dealerName,
        row.debit.toFixed(2),
        row.credit.toFixed(2),
        row.balance.toFixed(2)
      ]);

    renderTable(
      "salesTable",
      ["Bayi", "Toplam Borc", "Toplam Tahsilat", "Net Bakiye"],
      rows.length ? rows : [["-", "0.00", "0.00", "0.00"]]
    );
    return;
  }

  if (preset === "PERIOD_COMPARISON") {
    const ranges = buildComparisonRanges(filters.from, filters.to);
    const allOrders = await api("/orders" + buildQuery({ companyId }));

    const currentOrders = allOrders.filter((order) => isDateInRange(order.createdAt, ranges.current));
    const previousOrders = allOrders.filter((order) => isDateInRange(order.createdAt, ranges.previous));

    const sumTotal = (items) => items.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);
    const countByChannel = (items, channel) => items.filter((item) => String(item.channel || "").toUpperCase() === channel).length;

    const currentTotal = sumTotal(currentOrders);
    const previousTotal = sumTotal(previousOrders);

    const rows = [
      [
        "Toplam Siparis",
        String(currentOrders.length),
        String(previousOrders.length),
        formatPercentChange(currentOrders.length, previousOrders.length)
      ],
      [
        "Toplam Tutar",
        currentTotal.toFixed(2),
        previousTotal.toFixed(2),
        formatPercentChange(currentTotal, previousTotal)
      ],
      [
        "Woo Siparis",
        String(countByChannel(currentOrders, "WOO")),
        String(countByChannel(previousOrders, "WOO")),
        formatPercentChange(countByChannel(currentOrders, "WOO"), countByChannel(previousOrders, "WOO"))
      ],
      [
        "Manuel Siparis",
        String(countByChannel(currentOrders, "MANUAL")),
        String(countByChannel(previousOrders, "MANUAL")),
        formatPercentChange(countByChannel(currentOrders, "MANUAL"), countByChannel(previousOrders, "MANUAL"))
      ]
    ];

    renderTable(
      "salesTable",
      ["Metrik", "Bu Donem", "Onceki Donem", "Degisim"],
      rows
    );
    return;
  }

  const rows = await api("/reports/sales-summary" + buildQuery({ companyId, ...filters }));
  renderTable(
    "salesTable",
    ["Kanal", "Toplam Siparis", "Toplam Tutar"],
    rows.map((row) => [row.channel, row.totalOrders, Number(row.totalPrice).toFixed(2)])
  );
}

async function refreshWooProductSalesSummary() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const filters = getReportFilters();
  const preset = getActiveReportPreset();
  const rows = await api("/reports/woo-product-sales" + buildQuery({ companyId, ...filters }));

  if (preset === "PERIOD_COMPARISON") {
    const ranges = buildComparisonRanges(filters.from, filters.to);
    const previousRows = await api(
      "/reports/woo-product-sales" +
        buildQuery({
          companyId,
          from: ranges.previous.from.toISOString().slice(0, 10),
          to: ranges.previous.to.toISOString().slice(0, 10)
        })
    );

    const previousMap = new Map(
      previousRows.map((row) => [`${row.name}||${row.unit}`, row])
    );

    const tableRows = rows.length
      ? rows.map((row) => {
          const key = `${row.name}||${row.unit}`;
          const prev = previousMap.get(key);
          const currentQty = Number(row.totalQuantity ?? 0);
          const previousQty = Number(prev?.totalQuantity ?? 0);
          return [
            row.name,
            row.unit,
            currentQty.toFixed(2),
            previousQty.toFixed(2),
            formatPercentChange(currentQty, previousQty),
            row.source ?? "-"
          ];
        })
      : [["Veri bulunamadi", "-", "0.00", "0.00", "0.00%", "-"]];

    renderTable(
      "wooProductSalesTable",
      ["Urun", "Birim", "Bu Donem Miktar", "Onceki Donem Miktar", "Degisim", "Kaynak"],
      tableRows
    );
    return;
  }

  if (preset === "PRODUCT_PERFORMANCE") {
    const totalQty = rows.reduce((sum, row) => sum + Number(row.totalQuantity ?? 0), 0);
    const tableRows = rows.length
      ? rows.map((row) => {
          const qty = Number(row.totalQuantity ?? 0);
          const amount = Number(row.totalAmount ?? 0);
          const share = totalQty > 0 ? (qty / totalQty) * 100 : 0;
          return [
            row.name,
            row.unit,
            qty.toFixed(2),
            amount.toFixed(2),
            (qty > 0 ? amount / qty : 0).toFixed(2),
            `${share.toFixed(2)}%`,
            row.source ?? "-"
          ];
        })
      : [["Veri bulunamadi", "-", "0.00", "0.00", "0.00", "0.00%", "-"]];

    renderTable(
      "wooProductSalesTable",
      ["Urun", "Birim", "Toplam Miktar", "Toplam Tutar", "Ort. Fiyat", "Pay", "Kaynak"],
      tableRows
    );
    return;
  }

  const tableRows = rows.length
    ? rows.map((row) => [
        row.name,
        row.unit,
        Number(row.totalQuantity).toFixed(2),
        Number(row.totalAmount).toFixed(2),
        row.totalOrders,
        row.source ?? "-"
      ])
    : [["Veri bulunamadi", "-", "0.00", "0.00", "0", "-"]];

  renderTable(
    "wooProductSalesTable",
    ["Urun", "Birim", "Toplam Miktar", "Toplam Tutar", "Siparis", "Kaynak"],
    tableRows
  );
}

async function refreshReportViews() {
  await refreshSalesSummary();
  await refreshWooProductSalesSummary();
  await refreshStockSummary();
}

async function refreshPriceLists() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;
  priceLists = await api(`/price-lists${buildQuery({ companyId })}`);
  if (defaultPriceListId && !priceLists.some((list) => list.id === defaultPriceListId)) {
    defaultPriceListId = null;
  }
  if (!defaultPriceListId) {
    defaultPriceListId = priceLists[0]?.id ?? null;
  }
  renderPriceListOptions();
  renderPriceListsTable();
  await refreshPriceItems();
}

async function refreshPriceItems() {
  if (!defaultPriceListId) {
    priceListItems = [];
    renderTable("priceTable", ["Urun", "Varyasyon", "Fiyat"], [["Liste secin", "-", "-"]]);
    renderPriceCatalogTable();
    return;
  }
  priceListItems = await api(`/price-lists/${defaultPriceListId}/items`);
  const selectedList = priceLists.find((list) => list.id === defaultPriceListId);
  renderTable(
    "priceTable",
    [
      `Urun${selectedList ? ` (${selectedList.name})` : ""}`,
      "Varyasyon",
      `Fiyat${selectedList ? ` (${selectedList.currency ?? "TRY"})` : ""}`
    ],
    priceListItems.map((item) => [
      item.product?.name ?? "-",
      item.variant?.name ?? "-",
      Number(item.price).toFixed(2)
    ])
  );
  renderPriceCatalogTable();
}

async function refreshDealerPriceLists() {
  const dealerId = getSelectedDealerId();
  if (!dealerId) return;
  dealerPriceLists = await api(`/dealers/${dealerId}/price-lists`);
  const activeListId = dealerPriceLists[0]?.priceListId;
  if (activeListId && priceListSelect) {
    priceListSelect.value = activeListId;
  }
  renderTable(
    "dealerPriceListTable",
    ["Liste", "Para", "Durum", "Islem"],
    dealerPriceLists.map((item) => [
      item.priceList?.name ?? "-",
      item.priceList?.currency ?? "-",
      "Aktif",
      {
        label: "Kaldir",
        className: "btn danger",
        onClick: async () => {
          if (!confirm("Liste kaldirilsin mi?")) return;
          await api(`/dealers/${dealerId}/price-lists/${item.priceListId}`, { method: "DELETE" });
          showToast("Liste kaldirildi.");
          await refreshDealerPriceLists();
        },
        sortValue: ""
      }
    ])
  );
}

async function refreshIntegrationLogs() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId) return;

  if (dealerId) {
    try {
      await refreshMappingSuggestions();
    } catch {
      mappingSuggestionsByExternalKey = new Map();
    }
  } else {
    mappingSuggestionsByExternalKey = new Map();
  }

  const logs = await api(
    `/integrations/logs${buildQuery({ companyId, dealerId: dealerId || undefined })}`
  );
  integrationLogsCache = logs;
  integrationLogsCompanyId = companyId;
  const statusFilter = integrationStatusFilter?.value || "";
  const searchValue = integrationSearch?.value?.trim().toLowerCase() || "";
  const from = integrationFrom?.value ? new Date(integrationFrom.value) : null;
  const to = integrationTo?.value ? new Date(integrationTo.value) : null;

  const filtered = logs.filter((log) => {
    if (statusFilter && log.status !== statusFilter) return false;
    if (from && new Date(log.createdAt) < from) return false;
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(log.createdAt) > endDate) return false;
    }
    if (!searchValue) return true;

    const payload = log.payload ?? {};
    const haystack = `${log.externalId ?? ""} ${log.errorMessage ?? ""} ${payload.name ?? ""} ${payload.product_id ?? ""} ${payload.variation_id ?? ""}`.toLowerCase();
    return haystack.includes(searchValue);
  });

  renderTable(
    "integrationLogTable",
    ["Platform", "Durum", "Siparis No", "Urun", "Miktar", "Fiyat", "Detay", "Tarih", "Islem"],
    filtered.map((log) => {
      const payload = log.payload ?? {};
      const orderNo = log.externalId ?? "-";
      const productName = payload.name ?? "-";
      const externalProductId = payload.product_id ? String(payload.product_id) : "";
      const externalVariantId =
        payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
      const suggestion = mappingSuggestionsByExternalKey.get(
        buildExternalKey(externalProductId, externalVariantId)
      );
      const quantity = payload.quantity !== undefined ? Number(payload.quantity).toFixed(2) : "-";
      const price = payload.price !== undefined
        ? Number(payload.price).toFixed(2)
        : payload.total !== undefined
          ? Number(payload.total).toFixed(2)
          : "-";

      let detail = "-";
      if (log.status === "UNMAPPED") {
        detail = `UrunID:${payload.product_id ?? "-"} / VarID:${payload.variation_id ?? "-"}`;
      } else if (log.status === "SYNCED") {
        detail = `Aktarilan:${payload.imported ?? 0} / Atlanan:${payload.skipped ?? 0}`;
      } else if (log.errorMessage) {
        detail = log.errorMessage;
      }

      if (log.status === "UNMAPPED" && suggestion) {
        detail = `${detail} | Oneri: ${suggestion.label} (%${(Number(suggestion.score || 0) * 100).toFixed(0)})`;
      }

      const action =
        log.status === "UNMAPPED" && payload.product_id
          ? [
              {
                label: "Urun Ekle",
                className: "btn",
                onClick: () => setSelectedUnmappedLog(log),
                sortValue: ""
              },
              ...(suggestion
                ? [
                    {
                      label: "Oneriyi Esle",
                      className: "btn ghost",
                      onClick: async () => {
                        await applyMappingSuggestion(log, suggestion);
                      },
                      sortValue: ""
                    }
                  ]
                : [])
            ]
          : "-";

      return [
        log.platform,
        log.status,
        orderNo,
        productName,
        quantity,
        price,
        detail,
        new Date(log.createdAt).toLocaleString(),
        action
      ];
    })
  );
  applyRoleVisibility();
}

async function refreshUnmappedSummary() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const from = unmappedSummaryFrom?.value || undefined;
  const to = unmappedSummaryTo?.value || undefined;
  const result = await api(
    `/reports/unmapped-product-summary${buildQuery({ companyId, from, to })}`
  );

  const summary = result?.summary ?? {};
  const rows = Array.isArray(result?.rows) ? result.rows : [];

  if (unmappedSummaryStats) {
    unmappedSummaryStats.textContent =
      `Urun: ${summary.totalProducts ?? 0} | Toplam Miktar: ${Number(summary.totalQuantity ?? 0).toFixed(2)} | ` +
      `Toplam Tutar: ${Number(summary.totalAmount ?? 0).toFixed(2)} | Uretime Deger: ${summary.productionCandidateCount ?? 0}`;
  }

  const mappedRows = rows.length
    ? rows.map((row) => [
        row.externalProductId ?? "-",
        row.name ?? "-",
        row.unit ?? "-",
        Number(row.totalQuantity ?? 0).toFixed(2),
        Number(row.totalAmount ?? 0).toFixed(2),
        Number(row.totalOrders ?? 0),
        `${Number(row.sharePercent ?? 0).toFixed(2)}%`,
        Number(row.variationCount ?? 0),
        row.productionOpportunity ?? "-",
        row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString() : "-",
        {
          label: "Loga Git",
          className: "btn ghost",
          onClick: async () => {
            if (integrationSearch) {
              integrationSearch.value = String(row.externalProductId ?? "");
            }
            await refreshIntegrationLogs();
            setSection("unmapped", "Eslesmeyen Urunler");
          },
          sortValue: ""
        }
      ])
    : [["-", "Veri bulunamadi", "-", "0.00", "0.00", "0", "0.00%", "0", "-", "-", "-"]];

  renderTable(
    "unmappedSummaryTable",
    [
      "Harici ID",
      "Urun",
      "Birim",
      "Toplam Miktar",
      "Toplam Tutar",
      "Siparis",
      "Pay",
      "Varyasyon",
      "Uretim Firsati",
      "Son Gorulme",
      "Islem"
    ],
    mappedRows
  );

  const topRows = rows.slice(0, 15);
  renderTable(
    "unmappedTopTable",
    ["Sira", "Urun", "Toplam Miktar", "Pay", "Uretim Firsati"],
    topRows.length
      ? topRows.map((row, index) => [
          String(index + 1),
          row.name ?? "-",
          Number(row.totalQuantity ?? 0).toFixed(2),
          `${Number(row.sharePercent ?? 0).toFixed(2)}%`,
          row.productionOpportunity ?? "-"
        ])
      : [["-", "Veri bulunamadi", "0.00", "0.00%", "-"]]
  );
}

async function refreshWooIntegrations() {
  const dealerId = getSelectedDealerId();
  const headers = ["Platform", "Base URL", "Aktif", "Son Sync", "Islem"];

  if (!dealerId) {
    renderTable("wooSitesTable", headers, [["-", "Bayi secin", "-", "-", "-"]]);
    return;
  }

  const integrations = await api("/dealers/" + dealerId + "/integrations");
  const wooIntegrations = integrations.filter((integration) => String(integration.platform || "") === "WOO");

  const rows = wooIntegrations.length
    ? wooIntegrations.map((integration) => [
        getPlatformLabel(integration.platform),
        integration.baseUrl ?? "-",
        integration.active ? "Evet" : "Hayir",
        integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "-",
        [
          {
            label: "Sync",
            className: "btn ghost",
            onClick: async () => {
              const payload = getWooSyncFilters();
              const result = await api("/integrations/" + integration.id + "/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              showToast("Sync tamamlandi. Aktarilan: " + result.imported + " | Atlanan: " + result.skipped);
              await refreshWooIntegrations();
              await refreshIntegrationLogs();
              await refreshOrders();
              await refreshStockSummary();
            },
            sortValue: ""
          },
          {
            label: "Tum Gecmis",
            className: "btn ghost",
            onClick: async () => {
              const ok = window.confirm("Tum gecmis siparisler taransin mi? Bu islem daha uzun surebilir.");
              if (!ok) return;
              const payload = { ...getWooSyncFilters(), fullSync: true };
              const result = await api("/integrations/" + integration.id + "/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              showToast("Gecmis sync bitti. Aktarilan: " + result.imported + " | Atlanan: " + result.skipped);
              await refreshWooIntegrations();
              await refreshIntegrationLogs();
              await refreshOrders();
              await refreshStockSummary();
            },
            sortValue: ""
          },
          {
            label: "Sil",
            className: "btn danger",
            onClick: async () => {
              const ok = window.confirm("Bu entegrasyon baglantisini silmek istediginize emin misiniz?");
              if (!ok) return;
              await api("/dealers/" + dealerId + "/integrations/" + integration.id, { method: "DELETE" });
              showToast("Entegrasyon silindi.");
              await refreshWooIntegrations();
            },
            sortValue: ""
          }
        ]
      ])
    : [["-", "Kayit bulunamadi", "-", "-", "-"]];

  renderTable("wooSitesTable", headers, rows);
}

async function refreshGenericIntegrations() {
  const dealerId = getSelectedDealerId();
  const headers = ["Platform", "Base URL", "Aktif", "Son Sync", "Islem"];

  if (!dealerId) {
    renderTable("genericIntegrationTable", headers, [["-", "Bayi secin", "-", "-", "-"]]);
    return;
  }

  const integrations = await api("/dealers/" + dealerId + "/integrations");
  const nonWoo = integrations.filter((integration) => String(integration.platform || "") !== "WOO");

  const rows = nonWoo.length
    ? nonWoo.map((integration) => {
        const actions = [
          {
            label: integration.active ? "Pasif Yap" : "Aktif Yap",
            className: "btn ghost",
            onClick: async () => {
              await api("/dealers/" + dealerId + "/integrations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  platform: integration.platform,
                  baseUrl: integration.baseUrl || undefined,
                  consumerKey: integration.consumerKey || undefined,
                  consumerSecret: integration.consumerSecret || undefined,
                  active: !integration.active
                })
              });
              showToast(getPlatformLabel(integration.platform) + " baglantisi guncellendi.");
              await refreshGenericIntegrations();
            },
            sortValue: ""
          },
          {
            label: "Sil",
            className: "btn danger",
            onClick: async () => {
              const ok = window.confirm("Bu kanal baglantisini silmek istediginize emin misiniz?");
              if (!ok) return;
              await api("/dealers/" + dealerId + "/integrations/" + integration.id, { method: "DELETE" });
              showToast(getPlatformLabel(integration.platform) + " baglantisi silindi.");
              await refreshGenericIntegrations();
            },
            sortValue: ""
          }
        ];

        return [
          getPlatformLabel(integration.platform),
          integration.baseUrl ?? "-",
          integration.active ? "Evet" : "Hayir",
          integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "-",
          actions
        ];
      })
    : [["-", "Kayit bulunamadi", "-", "-", "-"]];

  renderTable("genericIntegrationTable", headers, rows);
  applyRoleVisibility();
}

async function refreshWarehouseReport() {
  const companyId = getSelectedCompanyId();
  const warehouseId = warehouseReportSelect.value;
  if (!companyId || !warehouseId) return;
  const rows = await api(`/reports/warehouse-stock${buildQuery({ companyId, warehouseId })}`);
  renderTable(
    "warehouseReportTable",
    ["Urun", "Birim", "Kalan"],
    rows.map((row) => [row.name, row.unit, Number(row.balance).toFixed(2)])
  );
  const location = locations.find((loc) => loc.type === "WAREHOUSE" && loc.referenceId === warehouseId);
  if (!location) {
    renderTable("warehouseMovementTable", ["Tarih", "Urun", "Tip", "Miktar"], []);
    return;
  }
  const movements = await api(`/stock-movements${buildQuery({ companyId, locationId: location.id })}`);
  renderTable(
    "warehouseMovementTable",
    ["Tarih", "Urun", "Tip", "Miktar"],
    movements.map((movement) => {
      const product = getProductById(movement.productId);
      const variant = variants.find((v) => v.id === movement.variantId);
      const name = variant ? `${product?.name ?? ""} / ${variant.name}` : product?.name ?? "-";
      return [new Date(movement.createdAt).toLocaleString(), name, movement.type, Number(movement.quantity).toFixed(2)];
    })
  );
}

async function refreshMappings() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId || !dealerId) return;
  const platform = mappingPlatform.value;
  mappings = await api(`/mappings${buildQuery({ companyId, dealerId, platform })}`);
  renderTable(
    "mappingTable",
    ["Platform", "Harici ID", "Urun", "Varyasyon", "Islem"],
    mappings.map((mapping) => {
      const product = getProductById(mapping.localProductId);
      const variant = variants.find((v) => v.id === mapping.localVariantId);
      return [
        mapping.platform,
        `${mapping.externalProductId}${mapping.externalVariantId ? `/${mapping.externalVariantId}` : ""}`,
        product?.name ?? "-",
        variant?.name ?? "-",
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm("Esleme silinsin mi?")) return;
            await api(`/mappings/${mapping.id}`, { method: "DELETE" });
            showToast("Esleme silindi.");
            await refreshMappings();
          },
          sortValue: ""
        }
      ];
    })
  );
  applyRoleVisibility();
}

async function refreshLedger() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId || !dealerId) return;

  const entries = await api(`/ledger${buildQuery({ companyId, dealerId })}`);
  const focusLabel = getActiveMenuLabelFor("ledger");

  let filteredEntries = entries;
  if (focusLabel.includes("tahsilat")) {
    filteredEntries = entries.filter((entry) => String(entry.type || "").toUpperCase() === "PAYMENT");
  }

  let balance = 0;
  entries.forEach((entry) => {
    if (entry.type === "PAYMENT") balance -= Number(entry.amount);
    else balance += Number(entry.amount);
  });

  const visibleTotal = filteredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const summaryText = focusLabel.includes("tahsilat")
    ? "Toplam tahsilat: " + visibleTotal.toFixed(2) + " | Guncel bakiye: " + balance.toFixed(2)
    : "Guncel bakiye: " + balance.toFixed(2);

  document.getElementById("ledgerSummary").textContent = summaryText;

  const rows = filteredEntries.length
    ? filteredEntries.map((entry) => [
        entry.type,
        Number(entry.amount).toFixed(2),
        new Date(entry.date).toLocaleString(),
        entry.referenceType ?? "-"
      ])
    : [["-", "0.00", "-", "Kayit bulunamadi"]];

  renderTable("ledgerTable", ["Tip", "Tutar", "Tarih", "Not"], rows);
}

async function refreshUsers() {
  const companyId = getSelectedCompanyId();
  const users = await api(`/users${buildQuery({ companyId })}`);
  const roleList = ["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING", "DEALER"];

  renderTable(
    "userTable",
    ["Ad", "E-posta", "Rol", "Durum", "API Key", "Islem"],
    users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.active ? "Aktif" : "Pasif",
      user.apiKey,
      {
        label: "Duzenle",
        className: "btn ghost",
        onClick: async () => {
          const name = promptRequired("Kullanici adi", user.name);
          if (name === null) return;

          const roleInput = promptRequired(
            "Rol (OWNER, ADMIN, WAREHOUSE, ACCOUNTING, DEALER)",
            user.role
          );
          if (roleInput === null) return;

          const role = roleInput.toUpperCase();
          if (!roleList.includes(role)) {
            showToast("Gecersiz rol girdiniz.", "error");
            return;
          }

          const active = promptYesNo("Kullanici aktif mi? (E/H)", user.active);
          if (active === null) return;

          await api(`/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, role, active })
          });

          showToast("Kullanici guncellendi.");
          await refreshUsers();
        },
        sortValue: ""
      }
    ])
  );
  applyRoleVisibility();
}

function renderVariantsTable() {
  const selectedProductId = variantProductSelect?.value || "";
  const filteredVariants = selectedProductId
    ? variants.filter((variant) => variant.productId === selectedProductId)
    : variants;

  renderTable(
    "variantsTable",
    ["Urun", "Varyasyon", "SKU", "Carpan", "Birim", "Islem"],
    filteredVariants.map((variant) => [
      variant.product?.name ?? "-",
      variant.name,
      variant.sku ?? "-",
      Number(variant.multiplier).toFixed(2),
      variant.unit,
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Varyasyon adi", variant.name);
            if (name === null) return;

            const sku = promptOptional("SKU (opsiyonel)", variant.sku ?? "");
            if (sku === null) return;

            const multiplierInput = promptRequired("Carpan", String(variant.multiplier ?? 1));
            if (multiplierInput === null) return;
            const multiplier = Number(multiplierInput.replace(",", "."));
            if (!Number.isFinite(multiplier) || multiplier <= 0) {
              showToast("Carpan pozitif sayi olmali.", "error");
              return;
            }

            const unitInput = promptRequired("Birim (PIECE, KG, LT)", variant.unit);
            if (unitInput === null) return;
            const unit = unitInput.toUpperCase();
            if (!["PIECE", "KG", "LT"].includes(unit)) {
              showToast("Gecersiz birim girdiniz.", "error");
              return;
            }

            await api(`/variants/${variant.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, sku, multiplier, unit })
            });

            showToast("Varyasyon guncellendi.");
            await refreshVariants();
            await refreshStockSummary();
            await refreshWarehouseReport();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm(`${variant.name} varyasyonu silinsin mi?`)) return;
            await api(`/variants/${variant.id}`, { method: "DELETE" });
            showToast("Varyasyon silindi.");
            await refreshVariants();
            await refreshStockSummary();
            await refreshWarehouseReport();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

function renderProductTable() {
  const summaryMap = new Map(stockSummary.map((item) => [item.productId, item]));
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  renderTable(
    "productTable",
    ["Gorsel", "Urun", "Kategori", "SKU", "Birim", "Gramaj (gr)", "Baz Fiyat", "Kalan", "Islem"],
    products.map((product) => {
      const summary = summaryMap.get(product.id);
      return [
        { type: "image", src: product.imageUrl, alt: product.name },
        product.name,
        product.categoryId ? categoryMap.get(product.categoryId) ?? "-" : "-",
        product.sku ?? "-",
        product.unit,
        Number(product.weight ?? 0).toFixed(2),
        Number(product.basePrice ?? 0).toFixed(2),
        summary ? Number(summary.balance).toFixed(2) : "0.00",
        [
          {
            label: "Duzenle",
            className: "btn ghost",
            onClick: () => setProductFormEditMode(product),
            sortValue: ""
          },
          {
            label: "Sil",
            className: "btn danger",
            onClick: async () => {
              if (!confirm(`${product.name} urunu silinsin mi?`)) return;
              await api(`/products/${product.id}`, { method: "DELETE" });
              showToast("Urun silindi.");
              await refreshProducts();
              await refreshVariants();
              await refreshStockSummary();
              await refreshStockMovements();
              await refreshWarehouseReport();
              await refreshSalesSummary();
              await refreshWooProductSalesSummary();
              setProductFormCreateMode();
            },
            sortValue: ""
          }
        ]
      ];
    })
  );
}

function updateOverview() {
  if (!overviewSummary) return;
  const totalStock = stockSummary.reduce((sum, item) => sum + Number(item.balance), 0);
  overviewSummary.textContent =
    `Urun: ${products.length} | Varyasyon: ${variants.length} | Kalan stok: ${totalStock.toFixed(2)} | ` +
    `Siparis: ${orders.length}`;
}

function renderOrderItems() {
  orderItemsContainer.innerHTML = "";
  if (!products.length) return;
  addOrderItemRow();
}

function buildVariantSelect(productId) {
  const select = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Varyasyon yok";
  select.appendChild(empty);
  getVariantsByProduct(productId).forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = `${variant.name} (x${variant.multiplier})`;
    select.appendChild(option);
  });
  return select;
}

function addOrderItemRow() {
  const row = document.createElement("div");
  row.className = "row";

  const productSelect = document.createElement("select");
  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (${product.unit})`;
    productSelect.appendChild(option);
  });

  let variantSelect = buildVariantSelect(productSelect.value);
  productSelect.addEventListener("change", () => {
    const newSelect = buildVariantSelect(productSelect.value);
    row.replaceChild(newSelect, variantSelect);
    variantSelect = newSelect;
  });

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
  orderItemsContainer.appendChild(row);
}

function getOrderItemPrice(productId, variantId) {
  const keyVariant = variantId || null;
  const exact = priceListItems.find(
    (item) => item.productId === productId && (item.variantId || null) === keyVariant
  );
  if (exact) return Number(exact.price ?? 0);

  const base = priceListItems.find(
    (item) => item.productId === productId && !item.variantId
  );
  return Number(base?.price ?? 0);
}

async function submitManualOrder() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId || !dealerId) {
    showToast("Lutfen firma ve bayi secin.", "error");
    return;
  }

  const rows = Array.from(orderItemsContainer.querySelectorAll(".row"));
  const items = rows
    .map((row) => {
      const selects = row.querySelectorAll("select");
      const quantityInput = row.querySelector('input[type="number"]');
      const productId = selects[0]?.value;
      const variantId = selects[1]?.value || undefined;
      const quantity = Number(quantityInput?.value ?? 0);
      const product = getProductById(productId);
      const variant = variantId ? variants.find((item) => item.id === variantId) : null;
      const unit = variant?.unit ?? product?.unit;
      const price = getOrderItemPrice(productId, variantId);

      if (!productId || !unit || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { productId, variantId, quantity, unit, price };
    })
    .filter(Boolean);

  if (!items.length) {
    showToast("En az bir satirda urun ve miktar girin.", "error");
    return;
  }

  try {
    await api("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId,
        channel: "MANUAL",
        items,
        allowOverLimit: false
      })
    });
  } catch (error) {
    const message = parseErrorMessage(error, "Siparis olusturulamadi.");
    if (canOverrideRiskLimit() && /risk|vade/i.test(message)) {
      const force = window.confirm(
        `${message}\n\nYonetici olarak risk limitini asarak siparisi kaydetmek ister misiniz?`
      );
      if (force) {
        await api("/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            dealerId,
            channel: "MANUAL",
            items,
            allowOverLimit: true
          })
        });
      } else {
        showToast(message, "error");
        return;
      }
    } else {
      showToast(message, "error");
      return;
    }
  }

  showToast("Siparis olusturuldu.");
  renderOrderItems();
  await refreshOrders();
  await refreshStockSummary();
  await refreshStockMovements();
  await refreshWarehouseReport();
  await refreshLedger();
  updateOverview();
}
function renderCategoryOptions() {
  if (!productCategorySelect) return;

  productCategorySelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Kategori yok";
  productCategorySelect.appendChild(empty);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    productCategorySelect.appendChild(option);
  });
}

async function refreshCategories() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  categories = await api(`/categories${buildQuery({ companyId })}`);
  renderCategoryOptions();

  renderTable(
    "categoryTable",
    ["Kategori", "Islem"],
    categories.map((category) => [
      category.name,
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Kategori adi", category.name);
            if (name === null) return;

            await api(`/categories/${category.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name })
            });

            showToast("Kategori guncellendi.");
            await refreshCategories();
            await refreshProducts();
          },
          sortValue: ""
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            if (!confirm(`${category.name} kategorisi silinsin mi?`)) return;
            await api(`/categories/${category.id}`, { method: "DELETE" });
            showToast("Kategori silindi.");
            await refreshCategories();
            await refreshProducts();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshProductImages() {
  if (!imageProductSelect || !imageProductSelect.value) {
    renderTable("productImagesTable", ["URL"], []);
    return;
  }

  const images = await api(`/products/${imageProductSelect.value}/images`);
  renderTable(
    "productImagesTable",
    ["URL"],
    images.map((image) => [image.url])
  );
}

function renderDispatchSelectors() {
  if (dispatchWarehouseSelect) {
    dispatchWarehouseSelect.innerHTML = "";
    warehouses.forEach((warehouse) => {
      const option = document.createElement("option");
      option.value = warehouse.id;
      option.textContent = warehouse.name;
      dispatchWarehouseSelect.appendChild(option);
    });
  }

  if (dispatchDealerSelect) {
    dispatchDealerSelect.innerHTML = "";
    dealers.forEach((dealer) => {
      const option = document.createElement("option");
      option.value = dealer.id;
      option.textContent = dealer.name;
      dispatchDealerSelect.appendChild(option);
    });
  }
}

function buildDispatchItemRow(item = null) {
  if (!dispatchItemsContainer) return;

  const row = document.createElement("div");
  row.className = "row";

  const productSelect = document.createElement("select");
  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (${product.unit})`;
    productSelect.appendChild(option);
  });

  if (item?.productId && products.some((product) => product.id === item.productId)) {
    productSelect.value = item.productId;
  }

  let variantSelect = buildVariantSelect(productSelect.value);
  if (item?.variantId) {
    const hasVariant = Array.from(variantSelect.options).some((option) => option.value === item.variantId);
    if (hasVariant) {
      variantSelect.value = item.variantId;
    }
  }

  productSelect.addEventListener("change", () => {
    const next = buildVariantSelect(productSelect.value);
    row.replaceChild(next, variantSelect);
    variantSelect = next;
  });

  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.step = "0.01";
  quantityInput.placeholder = "Miktar";
  quantityInput.value =
    item?.quantity !== undefined && item?.quantity !== null ? String(Number(item.quantity)) : "";

  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.step = "0.01";
  priceInput.placeholder = "Birim fiyat";
  priceInput.value =
    item?.price !== undefined && item?.price !== null ? String(Number(item.price)) : "";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn ghost";
  removeButton.textContent = "Sil";
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(productSelect);
  row.appendChild(variantSelect);
  row.appendChild(quantityInput);
  row.appendChild(priceInput);
  row.appendChild(removeButton);
  dispatchItemsContainer.appendChild(row);
}

function resetDispatchFormItems(items = []) {
  if (!dispatchItemsContainer) return;
  dispatchItemsContainer.innerHTML = "";

  if (items.length) {
    items.forEach((item) => buildDispatchItemRow(item));
    return;
  }

  if (products.length) {
    buildDispatchItemRow();
  }
}

function setDispatchFormCreateMode() {
  if (!dispatchForm) return;
  dispatchForm.dataset.mode = "create";
  dispatchForm.dataset.editId = "";
  if (dispatchEditIdInput) dispatchEditIdInput.value = "";
  if (dispatchFormMode) dispatchFormMode.textContent = "Yeni sevkiyat modu";
  if (dispatchFormSubmit) dispatchFormSubmit.textContent = "Sevkiyati Kaydet";
  if (dispatchFormCancel) dispatchFormCancel.classList.add("hidden");
  if (!dispatchForm.dispatchNumber.value) {
    dispatchForm.dispatchNumber.value = `SVK-${Date.now()}`;
  }
}

function setDispatchFormEditMode(dispatch) {
  if (!dispatchForm) return;
  dispatchForm.dataset.mode = "edit";
  dispatchForm.dataset.editId = dispatch.id;
  if (dispatchEditIdInput) dispatchEditIdInput.value = dispatch.id;
  if (dispatchFormMode) {
    dispatchFormMode.textContent = `Duzenleme modu: ${dispatch.dispatchNumber}`;
  }
  if (dispatchFormSubmit) dispatchFormSubmit.textContent = "Sevkiyati Guncelle";
  if (dispatchFormCancel) dispatchFormCancel.classList.remove("hidden");

  dispatchForm.dispatchNumber.value = dispatch.dispatchNumber ?? "";
  dispatchForm.warehouseId.value = dispatch.warehouseId ?? "";
  dispatchForm.dealerId.value = dispatch.dealerId ?? "";
  dispatchForm.date.value = dispatch.date ? new Date(dispatch.date).toISOString().slice(0, 10) : "";
  dispatchForm.status.value = dispatch.status ?? "DRAFT";
  resetDispatchFormItems(dispatch.items ?? []);
}

function getDispatchItemName(item) {
  const product = getProductById(item.productId);
  const variant = variants.find((entry) => entry.id === item.variantId);
  return variant ? `${product?.name ?? "-"} / ${variant.name}` : product?.name ?? "-";
}

function calculateDispatchTotal(dispatch) {
  return (dispatch.items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );
}

async function getDealerBalanceById(companyId, dealerId) {
  const entries = await api(`/ledger${buildQuery({ companyId, dealerId })}`);
  let balance = 0;
  entries.forEach((entry) => {
    if (entry.type === "PAYMENT") balance -= Number(entry.amount);
    else balance += Number(entry.amount);
  });
  return balance;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildDispatchViewText(dispatch) {
  const dealer = dealers.find((item) => item.id === dispatch.dealerId);
  const lines = [
    `Sevkiyat No: ${dispatch.dispatchNumber}`,
    `Bayi: ${dealer?.name ?? "-"}`,
    `Tarih: ${new Date(dispatch.date).toLocaleDateString()}`,
    `Durum: ${dispatch.status}`,
    "",
    "Kalemler:"
  ];

  (dispatch.items ?? []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const lineTotal = quantity * price;
    lines.push(
      `- ${getDispatchItemName(item)}: ${quantity.toFixed(2)} x ${price.toFixed(2)} = ${lineTotal.toFixed(2)}`
    );
  });

  lines.push("");
  lines.push(`Toplam: ${calculateDispatchTotal(dispatch).toFixed(2)}`);
  return lines.join("\n");
}

async function copyDispatchBalanceSummary(dispatch) {
  const companyId = dispatch.companyId ?? getSelectedCompanyId();
  const total = calculateDispatchTotal(dispatch);
  const currentBalance = await getDealerBalanceById(companyId, dispatch.dealerId);
  const oldBalance = dispatch.status === "APPROVED" ? currentBalance - total : currentBalance;
  const updatedBalance = dispatch.status === "APPROVED" ? currentBalance : currentBalance + total;

  const lines = [`Bakiye: ${oldBalance.toFixed(2)}`];
  (dispatch.items ?? []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const lineTotal = quantity * price;
    lines.push(
      `${getDispatchItemName(item)}: ${quantity.toFixed(2)} x ${price.toFixed(2)} = ${lineTotal.toFixed(2)}`
    );
  });
  lines.push(`toplam: ${total.toFixed(2)}`);
  lines.push(`Guncel Bakiye: ${updatedBalance.toFixed(2)}`);

  await copyTextToClipboard(lines.join("\n"));
}

async function refreshDispatches() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  dispatches = await api("/dispatches" + buildQuery({ companyId }));

  const focusLabel = getActiveMenuLabelFor("dispatch");
  let statusFilter = "";
  if (focusLabel.includes("taslak")) {
    statusFilter = "DRAFT";
  } else if (focusLabel.includes("iptal")) {
    statusFilter = "CANCELLED";
  } else if (focusLabel.includes("irsaliye") || focusLabel.includes("son sevkiyat")) {
    statusFilter = "APPROVED";
  }

  const filteredDispatches = statusFilter
    ? dispatches.filter((dispatch) => String(dispatch.status || "").toUpperCase() === statusFilter)
    : dispatches;

  let rows = filteredDispatches.map((dispatch) => {
    const dealer = dealers.find((item) => item.id === dispatch.dealerId);
    const itemSummary = dispatch.items
      .map((item) => {
        const name = getDispatchItemName(item);
        return name + " x" + Number(item.quantity).toFixed(2);
      })
      .join(", ");

    const total = calculateDispatchTotal(dispatch);
    const actions = [];

    if (dispatch.status === "DRAFT") {
      actions.push({
        label: "Onayla",
        className: "btn",
        onClick: async () => {
          try {
            await api("/dispatches/" + dispatch.id + "/approve", { method: "POST" });
            showToast("Sevkiyat onaylandi.");
          } catch (error) {
            const message = parseErrorMessage(error, "Sevkiyat onaylanamadi.");
            if (canOverrideRiskLimit() && /risk|vade/i.test(message)) {
              const force = window.confirm(
                message + "\n\nYonetici olarak risk limitini asarak onaylamak ister misiniz?"
              );
              if (!force) {
                showToast(message, "error");
                return;
              }

              await api("/dispatches/" + dispatch.id + "/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allowOverLimit: true })
              });
              showToast("Sevkiyat (limit asimi onayi ile) onaylandi.");
            } else {
              showToast(message, "error");
              return;
            }
          }

          await refreshDispatches();
          await refreshStockSummary();
          await refreshStockMovements();
          await refreshLedger();
        },
        sortValue: ""
      });
    }

    actions.push({
      label: "Goruntule",
      className: "btn ghost",
      onClick: () => {
        window.alert(buildDispatchViewText(dispatch));
      },
      sortValue: ""
    });

    actions.push({
      label: "Duzenle",
      className: "btn ghost",
      onClick: () => {
        setDispatchFormEditMode(dispatch);
        showToast("Sevkiyat duzenleme moduna alindi.");
      },
      sortValue: ""
    });

    actions.push({
      label: "Kopyala",
      className: "btn ghost",
      onClick: async () => {
        try {
          await copyDispatchBalanceSummary(dispatch);
          showToast("Bakiye ozeti panoya kopyalandi.");
        } catch {
          showToast("Kopyalama basarisiz oldu.", "error");
        }
      },
      sortValue: ""
    });

    return [
      dispatch.dispatchNumber,
      dealer?.name ?? "-",
      new Date(dispatch.date).toLocaleDateString(),
      dispatch.status,
      itemSummary || "-",
      total.toFixed(2),
      actions
    ];
  });

  if (!rows.length) {
    rows = [["-", "-", "-", statusFilter || "-", "Kayit bulunamadi", "0.00", "-"]];
  }

  renderTable(
    "dispatchTable",
    ["Sevkiyat No", "Bayi", "Tarih", "Durum", "Kalemler", "Toplam", "Islem"],
    rows
  );
  applyRoleVisibility();
}

async function refreshProductionBatches() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  productionBatches = await api(`/production/batches${buildQuery({ companyId })}`);

  renderTable(
    "productionBatchTable",
    ["Parti No", "Urun", "Miktar", "Uretim Tarihi", "SKT"],
    productionBatches.map((batch) => {
      const product = getProductById(batch.productId);
      return [
        batch.batchNumber,
        product?.name ?? "-",
        Number(batch.quantity).toFixed(2),
        new Date(batch.productionDate).toLocaleDateString(),
        batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "-"
      ];
    })
  );
}

function getProductionPlanFilters() {
  const parse = (value, fallback, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  };

  return {
    lookbackDays: parse(productionPlanForm?.lookbackDays?.value, 30, 7, 180),
    targetCoverageDays: parse(productionPlanForm?.targetCoverageDays?.value, 30, 7, 90),
    safetyDays: parse(productionPlanForm?.safetyDays?.value, 14, 3, 60),
    minBatchQuantity: parse(productionPlanForm?.minBatchQuantity?.value, 0, 0, 1000000)
  };
}

function formatProductionUrgency(urgency) {
  if (urgency === "CRITICAL") return "KRITIK";
  if (urgency === "WARNING") return "UYARI";
  if (urgency === "PLAN") return "PLAN";
  if (urgency === "OK") return "NORMAL";
  return "TALEP YOK";
}

function buildPlannedBatchNumber(productName) {
  const slug = (productName ?? "URUN")
    .toString()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8) || "URUN";
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.floor(10 + Math.random() * 90);
  return `PLAN-${slug}-${datePart}-${suffix}`;
}

function applyProductionPlanSuggestion(row) {
  if (!productionBatchForm) return;

  productionBatchForm.productId.value = row.productId;
  productionBatchForm.batchNumber.value = buildPlannedBatchNumber(row.productName);
  productionBatchForm.quantity.value = Number(row.recommendedQuantity ?? 0).toFixed(2);
  productionBatchForm.productionDate.value = new Date().toISOString().slice(0, 10);

  if (productionWarehouseSelect && productionWarehouseSelect.options.length && !productionWarehouseSelect.value) {
    productionWarehouseSelect.value = productionWarehouseSelect.options[0].value;
  }

  setSection("production");
  showToast("Plan onerisi parti formuna aktarildi.");
}

async function refreshProductionPlan() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const filters = getProductionPlanFilters();
  const result = await api(`/reports/production-plan${buildQuery({ companyId, ...filters })}`);
  productionPlanLastResult = result;

  const rows = result?.rows ?? [];
  const summary = result?.summary ?? {};

  if (productionPlanSummary) {
    productionPlanSummary.textContent =
      `Urun: ${summary.totalProducts ?? rows.length} | Kritik: ${summary.critical ?? 0} | Uyari: ${summary.warning ?? 0} | ` +
      `Planlanacak: ${summary.plan ?? 0} | Onerilen Toplam Uretim: ${Number(summary.totalRecommendedQuantity ?? 0).toFixed(2)}`;
  }

  const tableRows = rows.length
    ? rows.map((row) => {
        const channelSummary = `${Number(row.salesByChannel?.woo ?? 0).toFixed(2)} WOO / ${Number(row.salesByChannel?.manual ?? 0).toFixed(2)} Manuel`;
        const action = Number(row.recommendedQuantity ?? 0) > 0
          ? {
              label: "Partiye Aktar",
              className: "btn",
              onClick: () => applyProductionPlanSuggestion(row),
              sortValue: ""
            }
          : "-";

        return [
          formatProductionUrgency(row.urgency),
          row.productName,
          row.unit,
          Number(row.warehouseStock ?? 0).toFixed(2),
          Number(row.networkStock ?? 0).toFixed(2),
          Number(row.dailyAverage ?? 0).toFixed(2),
          Number(row.salesLast7 ?? 0).toFixed(2),
          Number(row.salesLast30 ?? 0).toFixed(2),
          `${Number(row.trendPercent ?? 0).toFixed(2)}%`,
          row.coverageDays === null ? "-" : Number(row.coverageDays).toFixed(1),
          channelSummary,
          Number(row.safetyStockQuantity ?? 0).toFixed(2),
          Number(row.targetStockQuantity ?? 0).toFixed(2),
          Number(row.recommendedQuantity ?? 0).toFixed(2),
          action
        ];
      })
    : [["-", "Veri bulunamadi", "-", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00%", "-", "-", "0.00", "0.00", "0.00", "-"]];

  renderTable(
    "productionPlanTable",
    [
      "Oncelik",
      "Urun",
      "Birim",
      "Depo Stok",
      "Ag Stok",
      "Gunluk Ort",
      "7 Gun",
      "30 Gun",
      "Trend",
      "Stokta Gun",
      "Kanal Dagilimi",
      "Guvenli Stok",
      "Hedef Stok",
      "Onerilen Uretim",
      "Aksiyon"
    ],
    tableRows
  );
}

async function refreshAuditLogs() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  auditLogs = await api(`/audit${buildQuery({ companyId })}`);
  renderTable(
    "auditTable",
    ["Tarih", "Aksiyon", "Varlik", "Kayit"],
    auditLogs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.action,
      log.entity,
      log.entityId ?? "-"
    ])
  );
}

function downloadText(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function tableToCsv(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return null;

  const csvRows = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("th,td"));
    return cells
      .map((cell) => {
        const text = (cell.textContent ?? "").replace(/\s+/g, " ").trim();
        return `"${text.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return csvRows.join("\n");
}

function exportTableCsv(tableId, filename) {
  const csv = tableToCsv(tableId);
  if (!csv) {
    showToast("Disa aktarim icin tabloda veri bulunamadi.", "error");
    return;
  }
  downloadText(filename, "text/csv;charset=utf-8;", csv);
}

function formatCompactNumber(value, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function unitToLabel(unit) {
  if (unit === "KG") return "kg";
  if (unit === "LT") return "lt";
  return "adet";
}

function getPriceListItemName(item) {
  const productName = item.product?.name ?? "-";
  return item.variant?.name ? `${productName} / ${item.variant.name}` : productName;
}

function getPriceListItemWeightText(item) {
  const weightGr = Number(item.product?.weight ?? 0);
  if (Number.isFinite(weightGr) && weightGr > 0) {
    if (weightGr >= 1000) {
      return `${formatCompactNumber(weightGr / 1000, 3)} kg`;
    }
    return `${formatCompactNumber(weightGr, 2)} gr`;
  }

  const unit = item.variant?.unit ?? item.product?.unit ?? "PIECE";
  return unitToLabel(unit);
}

function buildPriceListTextLines() {
  const selectedList = priceLists.find((list) => list.id === defaultPriceListId);
  const currency = selectedList?.currency ?? "TRY";
  return priceListItems.map((item) => {
    const name = getPriceListItemName(item);
    const weightOrUnit = getPriceListItemWeightText(item);
    const price = Number(item.price ?? 0).toFixed(2);
    return `${name} - ${weightOrUnit} - ${price} ${currency}`;
  });
}

async function copyPriceListAsLines() {
  if (!defaultPriceListId) {
    showToast("Once fiyat listesi secin.", "error");
    return;
  }
  if (!priceListItems.length) {
    showToast("Kopyalamak icin listede urun bulunamadi.", "error");
    return;
  }

  const lines = buildPriceListTextLines();
  await copyTextToClipboard(lines.join("\n"));
  showToast("Fiyat listesi alt alta panoya kopyalandi.");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportPriceListPdfTable() {
  if (!defaultPriceListId) {
    showToast("Once fiyat listesi secin.", "error");
    return;
  }
  if (!priceListItems.length) {
    showToast("PDF icin listede urun bulunamadi.", "error");
    return;
  }

  const selectedList = priceLists.find((list) => list.id === defaultPriceListId);
  const title = selectedList ? `Fiyat Listesi - ${selectedList.name}` : "Fiyat Listesi";
  const currency = selectedList?.currency ?? "TRY";

  const rowsHtml = priceListItems
    .map((item) => {
      const name = escapeHtml(getPriceListItemName(item));
      const weightOrUnit = escapeHtml(getPriceListItemWeightText(item));
      const price = `${Number(item.price ?? 0).toFixed(2)} ${currency}`;
      return `<tr><td>${name}</td><td>${weightOrUnit}</td><td>${escapeHtml(price)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 6px; }
    p { margin: 0 0 16px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Olusturma: ${new Date().toLocaleString("tr-TR")}</p>
  <table>
    <thead>
      <tr>
        <th>Urun</th>
        <th>Gramaj / Birim</th>
        <th>Fiyat</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  const popup = window.open("", "_blank");
  if (!popup) {
    showToast("PDF icin acilan pencere engellendi. Popup izni verin.", "error");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
function calculateLedgerBalance(entries) {
  let balance = 0;
  entries.forEach((entry) => {
    const amount = Number(entry.amount ?? 0);
    if (entry.type === "PAYMENT") balance -= amount;
    else balance += amount;
  });
  return balance;
}

async function refreshSettingsSection() {
  const companyId = getSelectedCompanyId();
  if (!companyId) return;

  const [companyDealers, companyProducts, companyUsers, companyOrders, companyLedger, companyDispatches, companyWarehouses] = await Promise.all([
    api(`/dealers${buildQuery({ companyId })}`),
    api(`/products${buildQuery({ companyId })}`),
    api(`/users${buildQuery({ companyId })}`),
    api(`/orders${buildQuery({ companyId })}`),
    api(`/ledger${buildQuery({ companyId })}`),
    api(`/dispatches${buildQuery({ companyId })}`),
    api(`/warehouses${buildQuery({ companyId })}`)
  ]);

  if (integrationLogsCompanyId !== companyId) {
    integrationLogsCache = await api(`/integrations/logs${buildQuery({ companyId })}`);
    integrationLogsCompanyId = companyId;
  }

  const ledgerBalance = calculateLedgerBalance(companyLedger);
  const wooOrders = companyOrders.filter((order) => order.channel === "WOO").length;
  const approvedDispatches = companyDispatches.filter((dispatch) => dispatch.status === "APPROVED").length;
  const unmappedLogs = integrationLogsCache.filter((log) => log.status === "UNMAPPED").length;
  const errorLogs = integrationLogsCache.filter((log) => log.status === "ERROR").length;

  if (settingsSummary) {
    settingsSummary.textContent =
      `Bayi: ${companyDealers.length} | Depo: ${companyWarehouses.length} | Urun: ${companyProducts.length} | ` +
      `Siparis: ${companyOrders.length} (Woo: ${wooOrders}) | Onayli Sevkiyat: ${approvedDispatches} | ` +
      `Cari Bakiye: ${ledgerBalance.toFixed(2)} | Eslesmeyen Log: ${unmappedLogs} | Hata Logu: ${errorLogs}`;
  }

  renderTable(
    "settingsCompanyHealthTable",
    ["Metrik", "Deger"],
    [
      ["Toplam Bayi", companyDealers.length],
      ["Toplam Depo", companyWarehouses.length],
      ["Toplam Urun", companyProducts.length],
      ["Toplam Kullanici", companyUsers.length],
      ["Toplam Siparis", companyOrders.length],
      ["Woo Siparis", wooOrders],
      ["Onayli Sevkiyat", approvedDispatches],
      ["Cari Bakiye", ledgerBalance.toFixed(2)],
      ["UNMAPPED Log", unmappedLogs],
      ["ERROR Log", errorLogs]
    ]
  );

  const integrationSummaryRows = await api(
    `/integrations/dealer-summary${buildQuery({ companyId })}`
  );
  const integrationSummaryMap = new Map(
    (integrationSummaryRows ?? []).map((row) => [row.dealerId, row])
  );

  const dealerIntegrationRows = companyDealers.map((dealer) => {
    const row = integrationSummaryMap.get(dealer.id);
    const lastSyncAt = row?.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : "-";

    return [
      dealer.name,
      Number(row?.totalIntegrations ?? 0),
      Number(row?.activeIntegrations ?? 0),
      Number(row?.unmappedCount ?? 0),
      Number(row?.errorCount ?? 0),
      lastSyncAt,
      {
        label: "Woo Ayarlari",
        className: "btn ghost",
        onClick: () => {
          dealerSelect.value = dealer.id;
          setSection("woo");
          refreshWooIntegrations();
        },
        sortValue: ""
      }
    ];
  });

  renderTable(
    "settingsIntegrationHealthTable",
    ["Bayi", "Toplam Baglanti", "Aktif", "UNMAPPED", "ERROR", "Son Sync", "Islem"],
    dealerIntegrationRows
  );
}

async function refreshSaasSummary() {
  const companyList = await api("/companies");
  if (!companyList.length) {
    if (saasSummary) saasSummary.textContent = "Firma bulunamadi.";
    renderTable("saasTenantTable", ["Firma", "Bayi", "Depo", "Urun", "Siparis", "Woo", "Cari Bakiye", "Aksiyon"], []);
    return;
  }

  const tenantRows = await Promise.all(
    companyList.map(async (company) => {
      const [companyDealers, companyWarehouses, companyProducts, companyOrders, companyLedger] = await Promise.all([
        api(`/dealers${buildQuery({ companyId: company.id })}`),
        api(`/warehouses${buildQuery({ companyId: company.id })}`),
        api(`/products${buildQuery({ companyId: company.id })}`),
        api(`/orders${buildQuery({ companyId: company.id })}`),
        api(`/ledger${buildQuery({ companyId: company.id })}`)
      ]);

      const wooOrders = companyOrders.filter((order) => order.channel === "WOO").length;
      const balance = calculateLedgerBalance(companyLedger);

      return {
        id: company.id,
        name: company.name,
        dealers: companyDealers.length,
        warehouses: companyWarehouses.length,
        products: companyProducts.length,
        orders: companyOrders.length,
        wooOrders,
        balance
      };
    })
  );

  const totals = tenantRows.reduce(
    (acc, row) => {
      acc.dealers += row.dealers;
      acc.warehouses += row.warehouses;
      acc.products += row.products;
      acc.orders += row.orders;
      acc.wooOrders += row.wooOrders;
      acc.balance += row.balance;
      return acc;
    },
    { dealers: 0, warehouses: 0, products: 0, orders: 0, wooOrders: 0, balance: 0 }
  );

  if (saasSummary) {
    saasSummary.textContent =
      `Tenant: ${tenantRows.length} | Bayi: ${totals.dealers} | Depo: ${totals.warehouses} | ` +
      `Urun: ${totals.products} | Siparis: ${totals.orders} (Woo: ${totals.wooOrders}) | ` +
      `Toplam Cari Bakiye: ${totals.balance.toFixed(2)}`;
  }

  renderTable(
    "saasTenantTable",
    ["Firma", "Bayi", "Depo", "Urun", "Siparis", "Woo", "Cari Bakiye", "Aksiyon"],
    tenantRows.map((row) => [
      row.name,
      row.dealers,
      row.warehouses,
      row.products,
      row.orders,
      row.wooOrders,
      row.balance.toFixed(2),
      {
        label: "Panele Gec",
        className: "btn ghost",
        onClick: async () => {
          companySelect.value = row.id;
          companySelect.dispatchEvent(new Event("change"));
          setSection("overview");
          showToast(`${row.name} firmasina gecildi.`);
        },
        sortValue: ""
      }
    ])
  );
}

function syncIndustryProfileSelection(profileId) {
  const nextValue = profileId || "";
  selectedIndustryProfileId = nextValue || null;
  getIndustryProfileSelectors().forEach((select) => {
    const hasOption = Array.from(select.options || []).some((option) => option.value === nextValue);
    if (hasOption) {
      select.value = nextValue;
    }
  });
}

function resetIndustryDetailTables() {
  attributeDefinitions = [];
  pricingRules = [];
  workflowTemplates = [];
  reportPresets = [];
  renderTable("attributeDefinitionTable", ["Alan", "Varlik", "Tip", "Zorunlu", "Durum", "Islem"], []);
  renderTable("pricingRuleTable", ["Kural", "Tip", "Hedef", "Oncelik", "Durum", "Islem"], []);
  renderTable("workflowTemplateTable", ["Sablon", "Modul", "Adim", "Durum", "Islem"], []);
  renderTable("reportPresetTable", ["Anahtar", "Ad", "Durum", "Config", "Islem"], []);
}

function renderIndustrySummary() {
  if (!industrySummary) return;
  const profile = industryProfiles.find((item) => item.id === getSelectedIndustryProfileId()) || null;
  if (!profile) {
    industrySummary.textContent = "Sektor profili secili degil.";
    return;
  }

  industrySummary.textContent =
    `Profil: ${profile.name} (${profile.code}) | Alan: ${attributeDefinitions.length} | Fiyat Kurali: ${pricingRules.length} | ` +
    `Workflow: ${workflowTemplates.length} | Rapor Preset: ${reportPresets.length}`;
}

async function refreshIndustryProfiles() {
  const companyId = getSelectedCompanyId();
  if (!companyId) {
    industryProfiles = [];
    selectedIndustryProfileId = null;
    updateIndustryProfileSelectOptions();
    renderTable("industryProfileTable", ["Profil", "Kod", "Durum", "Varsayilan", "Aciklama", "Islem"], []);
    renderIndustrySummary();
    return;
  }

  industryProfiles = await api(`/industry-profiles${buildQuery({ companyId })}`);

  const previous = getSelectedIndustryProfileId();
  const defaultProfile =
    industryProfiles.find((profile) => profile.isDefault) ||
    industryProfiles.find((profile) => profile.active) ||
    industryProfiles[0] ||
    null;
  const resolvedId =
    previous && industryProfiles.some((profile) => profile.id === previous)
      ? previous
      : defaultProfile?.id || null;

  selectedIndustryProfileId = resolvedId;
  updateIndustryProfileSelectOptions();
  syncIndustryProfileSelection(selectedIndustryProfileId);

  renderTable(
    "industryProfileTable",
    ["Profil", "Kod", "Durum", "Varsayilan", "Aciklama", "Islem"],
    industryProfiles.map((profile) => [
      profile.name,
      profile.code,
      profile.active ? "Aktif" : "Pasif",
      profile.isDefault ? "Evet" : "Hayir",
      profile.description ?? "-",
      [
        {
          label: "Sec",
          className: "btn ghost",
          onClick: async () => {
            syncIndustryProfileSelection(profile.id);
            await refreshIndustrySection();
          },
          sortValue: ""
        },
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Profil adi", profile.name);
            if (name === null) return;
            const description = promptOptional("Aciklama (opsiyonel)", profile.description ?? "");
            if (description === null) return;
            const codeRaw = promptRequired(
              "Kod (GENERIC, JEWELRY, APPAREL, LEATHER, CUSTOM)",
              profile.code
            );
            if (codeRaw === null) return;
            const code = String(codeRaw).trim().toUpperCase();
            const allowedCodes = new Set(["GENERIC", "JEWELRY", "APPAREL", "LEATHER", "CUSTOM"]);
            if (!allowedCodes.has(code)) {
              showToast("Kod gecersiz. Sadece GENERIC, JEWELRY, APPAREL, LEATHER, CUSTOM kullanin.", "error");
              return;
            }

            await api(`/industry-profiles/${profile.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                name,
                description: description || undefined
              })
            });

            showToast("Sektor profili guncellendi.");
            await refreshIndustrySection();
          },
          sortValue: ""
        },
        {
          label: profile.isDefault ? "Varsayilan" : "Varsayilan Yap",
          className: "btn ghost",
          onClick: async () => {
            if (profile.isDefault) return;
            await api(`/industry-profiles/${profile.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isDefault: true })
            });
            showToast("Varsayilan sektor profili guncellendi.");
            await refreshIndustrySection();
          },
          sortValue: profile.isDefault ? "1" : "0"
        },
        {
          label: profile.active ? "Pasife Al" : "Aktif Et",
          className: profile.active ? "btn ghost" : "btn",
          onClick: async () => {
            await api(`/industry-profiles/${profile.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: !profile.active })
            });
            showToast("Profil durumu guncellendi.");
            await refreshIndustrySection();
          },
          sortValue: profile.active ? "1" : "0"
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = confirm(`${profile.name} profilini silmek istediginize emin misiniz?`);
            if (!ok) return;
            await api(`/industry-profiles/${profile.id}`, { method: "DELETE" });
            showToast("Sektor profili silindi.");
            await refreshIndustrySection();
          },
          sortValue: ""
        }
      ]
    ])
  );

  renderIndustrySummary();
}

async function refreshAttributeDefinitions() {
  const companyId = getSelectedCompanyId();
  const industryProfileId = getSelectedIndustryProfileId();

  if (!companyId || !industryProfileId) {
    attributeDefinitions = [];
    renderTable("attributeDefinitionTable", ["Alan", "Varlik", "Tip", "Zorunlu", "Durum", "Islem"], []);
    return;
  }

  attributeDefinitions = await api(
    `/attribute-definitions${buildQuery({ companyId, industryProfileId })}`
  );

  renderTable(
    "attributeDefinitionTable",
    ["Alan", "Varlik", "Tip", "Zorunlu", "Durum", "Islem"],
    attributeDefinitions.map((definition) => [
      `${definition.label} (${definition.key})`,
      definition.entity,
      definition.dataType,
      definition.required ? "Evet" : "Hayir",
      definition.active ? "Aktif" : "Pasif",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const label = promptRequired("Alan etiketi", definition.label);
            if (label === null) return;
            const helpText = promptOptional("Yardim metni (opsiyonel)", definition.helpText ?? "");
            if (helpText === null) return;
            await api(`/attribute-definitions/${definition.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label, helpText: helpText || undefined })
            });
            showToast("Alan tanimi guncellendi.");
            await refreshAttributeDefinitions();
            renderIndustrySummary();
          },
          sortValue: ""
        },
        {
          label: definition.active ? "Pasife Al" : "Aktif Et",
          className: "btn ghost",
          onClick: async () => {
            await api(`/attribute-definitions/${definition.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: !definition.active })
            });
            showToast("Alan durumu guncellendi.");
            await refreshAttributeDefinitions();
            renderIndustrySummary();
          },
          sortValue: definition.active ? "1" : "0"
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = confirm(`${definition.label} alanini silmek istediginize emin misiniz?`);
            if (!ok) return;
            await api(`/attribute-definitions/${definition.id}`, { method: "DELETE" });
            showToast("Alan tanimi silindi.");
            await refreshAttributeDefinitions();
            renderIndustrySummary();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshPricingRules() {
  const companyId = getSelectedCompanyId();
  const industryProfileId = getSelectedIndustryProfileId();

  if (!companyId || !industryProfileId) {
    pricingRules = [];
    renderTable("pricingRuleTable", ["Kural", "Tip", "Hedef", "Oncelik", "Durum", "Islem"], []);
    return;
  }

  pricingRules = await api(`/pricing-rules${buildQuery({ companyId, industryProfileId })}`);

  renderTable(
    "pricingRuleTable",
    ["Kural", "Tip", "Hedef", "Oncelik", "Durum", "Islem"],
    pricingRules.map((rule) => [
      rule.name,
      rule.ruleType,
      `${rule.targetType}${rule.targetRef ? `:${rule.targetRef}` : ""}`,
      Number(rule.priority ?? 0),
      rule.active ? "Aktif" : "Pasif",
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Kural adi", rule.name);
            if (name === null) return;
            const targetType = promptRequired("Hedef tipi", rule.targetType);
            if (targetType === null) return;
            const targetRef = promptOptional("Hedef referansi (opsiyonel)", rule.targetRef ?? "");
            if (targetRef === null) return;
            const priorityRaw = promptOptional("Oncelik", String(rule.priority ?? 100));
            if (priorityRaw === null) return;
            const priority = Number(priorityRaw || 100);
            if (!Number.isFinite(priority)) {
              showToast("Oncelik sayisal olmali.", "error");
              return;
            }

            await api(`/pricing-rules/${rule.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                targetType,
                targetRef: targetRef || undefined,
                priority
              })
            });
            showToast("Fiyat kurali guncellendi.");
            await refreshPricingRules();
            renderIndustrySummary();
          },
          sortValue: ""
        },
        {
          label: rule.active ? "Pasife Al" : "Aktif Et",
          className: "btn ghost",
          onClick: async () => {
            await api(`/pricing-rules/${rule.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: !rule.active })
            });
            showToast("Fiyat kurali durumu guncellendi.");
            await refreshPricingRules();
            renderIndustrySummary();
          },
          sortValue: rule.active ? "1" : "0"
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = confirm(`${rule.name} kuralini silmek istediginize emin misiniz?`);
            if (!ok) return;
            await api(`/pricing-rules/${rule.id}`, { method: "DELETE" });
            showToast("Fiyat kurali silindi.");
            await refreshPricingRules();
            renderIndustrySummary();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshWorkflowTemplates() {
  const companyId = getSelectedCompanyId();
  const industryProfileId = getSelectedIndustryProfileId();

  if (!companyId || !industryProfileId) {
    workflowTemplates = [];
    renderTable("workflowTemplateTable", ["Sablon", "Modul", "Adim", "Durum", "Islem"], []);
    return;
  }

  workflowTemplates = await api(
    `/workflow-templates${buildQuery({ companyId, industryProfileId })}`
  );

  renderTable(
    "workflowTemplateTable",
    ["Sablon", "Modul", "Adim", "Durum", "Islem"],
    workflowTemplates.map((template) => {
      const stepCount = Array.isArray(template.steps) ? template.steps.length : 1;
      return [
        template.name,
        template.module,
        stepCount,
        template.active ? "Aktif" : "Pasif",
        [
          {
            label: "Duzenle",
            className: "btn ghost",
            onClick: async () => {
              const name = promptRequired("Sablon adi", template.name);
              if (name === null) return;
              const module = promptRequired("Modul", template.module);
              if (module === null) return;
              const description = promptOptional("Aciklama (opsiyonel)", template.description ?? "");
              if (description === null) return;
              const stepsRaw = promptRequired(
                "Adimlar JSON",
                JSON.stringify(template.steps ?? [], null, 2)
              );
              if (stepsRaw === null) return;

              let steps;
              try {
                steps = JSON.parse(stepsRaw);
              } catch {
                showToast("Adimlar JSON formati gecersiz.", "error");
                return;
              }

              await api(`/workflow-templates/${template.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  module,
                  description: description || undefined,
                  steps
                })
              });
              showToast("Workflow sablonu guncellendi.");
              await refreshWorkflowTemplates();
              renderIndustrySummary();
            },
            sortValue: ""
          },
          {
            label: template.active ? "Pasife Al" : "Aktif Et",
            className: "btn ghost",
            onClick: async () => {
              await api(`/workflow-templates/${template.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !template.active })
              });
              showToast("Workflow durumu guncellendi.");
              await refreshWorkflowTemplates();
              renderIndustrySummary();
            },
            sortValue: template.active ? "1" : "0"
          },
          {
            label: "Sil",
            className: "btn danger",
            onClick: async () => {
              const ok = confirm(`${template.name} sablonunu silmek istediginize emin misiniz?`);
              if (!ok) return;
              await api(`/workflow-templates/${template.id}`, { method: "DELETE" });
              showToast("Workflow sablonu silindi.");
              await refreshWorkflowTemplates();
              renderIndustrySummary();
            },
            sortValue: ""
          }
        ]
      ];
    })
  );
}

async function refreshReportPresets() {
  const companyId = getSelectedCompanyId();
  const industryProfileId = getSelectedIndustryProfileId();

  if (!companyId || !industryProfileId) {
    reportPresets = [];
    renderTable("reportPresetTable", ["Anahtar", "Ad", "Durum", "Config", "Islem"], []);
    return;
  }

  reportPresets = await api(`/report-presets${buildQuery({ companyId, industryProfileId })}`);

  renderTable(
    "reportPresetTable",
    ["Anahtar", "Ad", "Durum", "Config", "Islem"],
    reportPresets.map((preset) => [
      preset.key,
      preset.name,
      preset.active ? "Aktif" : "Pasif",
      formatJsonPreview(preset.config),
      [
        {
          label: "Duzenle",
          className: "btn ghost",
          onClick: async () => {
            const name = promptRequired("Preset adi", preset.name);
            if (name === null) return;
            const description = promptOptional("Aciklama (opsiyonel)", preset.description ?? "");
            if (description === null) return;
            const configRaw = promptRequired(
              "Config JSON",
              JSON.stringify(preset.config ?? {}, null, 2)
            );
            if (configRaw === null) return;

            let config;
            try {
              config = JSON.parse(configRaw);
            } catch {
              showToast("Config JSON formati gecersiz.", "error");
              return;
            }

            await api(`/report-presets/${preset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                description: description || undefined,
                config
              })
            });
            showToast("Rapor preset guncellendi.");
            await refreshReportPresets();
            renderIndustrySummary();
          },
          sortValue: ""
        },
        {
          label: preset.active ? "Pasife Al" : "Aktif Et",
          className: "btn ghost",
          onClick: async () => {
            await api(`/report-presets/${preset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: !preset.active })
            });
            showToast("Rapor preset durumu guncellendi.");
            await refreshReportPresets();
            renderIndustrySummary();
          },
          sortValue: preset.active ? "1" : "0"
        },
        {
          label: "Sil",
          className: "btn danger",
          onClick: async () => {
            const ok = confirm(`${preset.name} presetini silmek istediginize emin misiniz?`);
            if (!ok) return;
            await api(`/report-presets/${preset.id}`, { method: "DELETE" });
            showToast("Rapor preset silindi.");
            await refreshReportPresets();
            renderIndustrySummary();
          },
          sortValue: ""
        }
      ]
    ])
  );
}

async function refreshIndustrySection() {
  await refreshIndustryProfiles();

  if (!getSelectedCompanyId() || !getSelectedIndustryProfileId()) {
    resetIndustryDetailTables();
    renderIndustrySummary();
    return;
  }

  await Promise.all([
    refreshAttributeDefinitions(),
    refreshPricingRules(),
    refreshWorkflowTemplates(),
    refreshReportPresets()
  ]);
  renderIndustrySummary();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportSystemJson() {
  const companyId = getSelectedCompanyId();
  const dealerId = getSelectedDealerId();
  if (!companyId) return;

  const [companyInfo, companyDealers, companyProducts, companyCategories, companyDispatches, companyOrders, companyLedger] = await Promise.all([
    api(`/companies/${companyId}`),
    api(`/dealers${buildQuery({ companyId })}`),
    api(`/products${buildQuery({ companyId })}`),
    api(`/categories${buildQuery({ companyId })}`),
    api(`/dispatches${buildQuery({ companyId })}`),
    api(`/orders${buildQuery({ companyId, dealerId: dealerId || undefined })}`),
    dealerId ? api(`/ledger${buildQuery({ companyId, dealerId })}`) : Promise.resolve([])
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    company: companyInfo,
    dealers: companyDealers,
    products: companyProducts,
    categories: companyCategories,
    dispatches: companyDispatches,
    orders: companyOrders,
    ledger: companyLedger,
    audit: auditLogs
  };

  downloadJson(`bayi-portal-backup-${companyId}.json`, payload);
}
async function refreshAll() {
  await refreshCompanies();
  await refreshDealers();
  await refreshWarehouses();
  await refreshLocations();
  updateWarehouseLocation();
  await refreshWarehouseReport();
  await refreshCategories();
  await refreshDealerSettings();
  await refreshProducts();
  await refreshVariants();
  await refreshProductImages();
  await refreshStockSummary();
  await refreshStockMovements();
  await refreshOrders();
  await refreshDispatches();
  await refreshProductionBatches();
  await refreshProductionPlan();
  await refreshPriceLists();
  await refreshDealerPriceLists();
  await refreshSalesSummary();
  await refreshWooProductSalesSummary();
  await refreshIntegrationLogs();
  await refreshUnmappedSummary();
  await refreshWooIntegrations();
  await refreshGenericIntegrations();
  await refreshMappings();
  await refreshLedger();
  await refreshAuditLogs();
  await refreshIndustrySection();
  await refreshSettingsSection();
  await refreshUsers();
  renderDispatchSelectors();
  setDispatchFormCreateMode();
  resetDispatchFormItems();
  updateOverview();
  applyRoleVisibility();
}
async function setup() {
  if (adminApiKeyInput) {
    adminApiKeyInput.value = getAdminApiKey();
  }

  saveAdminApiKeyButton?.addEventListener("click", async () => {
    const value = adminApiKeyInput?.value ?? "";
    setAdminApiKey(value);
    showToast(value.trim() ? "Yonetim API key kaydedildi." : "Yonetim API key temizlendi.");
    await refreshAuthContext();
    applyRoleVisibility();
  });
  try {
    await api("/health");
    health.textContent = "API: aktif";
    health.classList.add("ok");
  } catch {
    health.textContent = "API: erisilemiyor";
  }

  await refreshAuthContext();
  applyRoleVisibility();

  organizeMenuSections();

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (!target) return;
      setSection(target, btn.textContent ?? "", btn);
    });
  });

  companySelect.addEventListener("change", async () => {
    const selected = getSelectedCompany();
    if (selected) {
      companySettingsForm.name.value = selected.name ?? "";
      companySettingsForm.email.value = selected.email ?? "";
      companySettingsForm.phone.value = selected.phone ?? "";
    }

    await refreshDealers();
    await refreshWarehouses();
    await refreshLocations();
    updateWarehouseLocation();
    await refreshWarehouseReport();
    await refreshCategories();
    await refreshDealerSettings();
    await refreshProducts();
    await refreshVariants();
    await refreshProductImages();
    await refreshStockSummary();
    await refreshStockMovements();
    await refreshOrders();
    await refreshDispatches();
    await refreshProductionBatches();
    await refreshProductionPlan();
    await refreshPriceLists();
    await refreshDealerPriceLists();
    await refreshSalesSummary();
    await refreshWooProductSalesSummary();
    await refreshIntegrationLogs();
    await refreshUnmappedSummary();
    await refreshWooIntegrations();
    await refreshGenericIntegrations();
    await refreshMappings();
    await refreshLedger();
    await refreshAuditLogs();
    await refreshIndustrySection();
    await refreshSettingsSection();
    await refreshUsers();
    renderDispatchSelectors();
    setDispatchFormCreateMode();
    resetDispatchFormItems();
    updateOverview();
    applyRoleVisibility();
  });

  dealerSelect.addEventListener("change", async () => {
    await refreshDealerSettings();
    await refreshOrders();
    await refreshDispatches();
    await refreshLedger();
    await refreshWooIntegrations();
    await refreshGenericIntegrations();
    await refreshMappings();
    await refreshDealerPriceLists();
    await refreshSettingsSection();
    renderDispatchSelectors();
    applyRoleVisibility();
  });

  warehouseSelect.addEventListener("change", () => {
    updateWarehouseLocation();
  });

  warehouseReportSelect.addEventListener("change", refreshWarehouseReport);

  stockProductSelect.addEventListener("change", renderStockVariants);
  priceProductSelect.addEventListener("change", renderPriceVariants);
  variantProductSelect.addEventListener("change", renderVariantsTable);
  mappingProductSelect.addEventListener("change", renderMappingVariantOptions);
  mappingPlatform.addEventListener("change", refreshMappings);
  integrationStatusFilter?.addEventListener("change", refreshIntegrationLogs);
  integrationSearch?.addEventListener("input", refreshIntegrationLogs);
  integrationFrom?.addEventListener("change", refreshIntegrationLogs);
  integrationTo?.addEventListener("change", refreshIntegrationLogs);
  unmatchedCreateType?.addEventListener("change", updateUnmappedCreateTypeUI);
  refreshUnmappedSummaryButton?.addEventListener("click", refreshUnmappedSummary);
  unmappedSummaryFrom?.addEventListener("change", refreshUnmappedSummary);
  unmappedSummaryTo?.addEventListener("change", refreshUnmappedSummary);

  getIndustryProfileSelectors().forEach((select) => {
    select.addEventListener("change", async () => {
      syncIndustryProfileSelection(select.value);
      await refreshIndustrySection();
    });
  });

  refreshIndustrySectionButton?.addEventListener("click", async () => {
    await refreshIndustrySection();
    showToast("Sektor verileri yenilendi.");
  });

  seedIndustryProfilesButton?.addEventListener("click", async () => {
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const replace = confirm(
      "Mevcut sektor profillerini sifirlamak ister misiniz? Tamam: mevcutlari sil ve tekrar olustur, Iptal: mevcutlari koru."
    );
    await api("/industry-profiles/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, replace })
    });
    showToast("Hazir sektor profilleri yuklendi.");
    await refreshIndustrySection();
  });

  industryProfileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const form = event.target;
    await api("/industry-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        code: form.code.value,
        name: form.name.value,
        description: form.description.value || undefined,
        isDefault: Boolean(form.isDefault?.checked),
        active: Boolean(form.active?.checked)
      })
    });
    form.reset();
    if (form.active) form.active.checked = true;
    showToast("Sektor profili eklendi.");
    await refreshIndustrySection();
  });

  attributeDefinitionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const form = event.target;
    const industryProfileId = form.industryProfileId.value || getSelectedIndustryProfileId();
    if (!industryProfileId) {
      showToast("Lutfen once sektor profili secin.", "error");
      return;
    }
    let options;
    try {
      options = parseOptionalJsonInput(form.options.value, "Secenekler");
    } catch (error) {
      showToast(parseErrorMessage(error, "Secenekler JSON hatali."), "error");
      return;
    }
    await api("/attribute-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        industryProfileId,
        entity: form.entity.value,
        key: form.key.value,
        label: form.label.value,
        dataType: form.dataType.value,
        options,
        helpText: form.helpText.value || undefined,
        required: Boolean(form.required?.checked),
        sortable: Boolean(form.sortable?.checked),
        filterable: Boolean(form.filterable?.checked),
        active: Boolean(form.active?.checked)
      })
    });
    form.key.value = "";
    form.label.value = "";
    form.helpText.value = "";
    form.options.value = "";
    showToast("Dinamik alan eklendi.");
    await refreshAttributeDefinitions();
    renderIndustrySummary();
  });

  pricingRuleForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const form = event.target;
    const industryProfileId = form.industryProfileId.value || getSelectedIndustryProfileId();
    if (!industryProfileId) {
      showToast("Lutfen once sektor profili secin.", "error");
      return;
    }
    const fixedMargin = form.fixedMargin.value ? Number(form.fixedMargin.value) : undefined;
    const discountRate = form.discountRate.value ? Number(form.discountRate.value) : undefined;
    const minPrice = form.minPrice.value ? Number(form.minPrice.value) : undefined;
    const maxPrice = form.maxPrice.value ? Number(form.maxPrice.value) : undefined;
    const priority = form.priority.value ? Number(form.priority.value) : 100;
    if (![fixedMargin, discountRate, minPrice, maxPrice, priority].every((item) => item === undefined || Number.isFinite(item))) {
      showToast("Fiyat kurali numeric alanlarinda gecersiz deger var.", "error");
      return;
    }
    await api("/pricing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        industryProfileId,
        name: form.name.value,
        ruleType: form.ruleType.value,
        targetType: form.targetType.value,
        targetRef: form.targetRef.value || undefined,
        formula: form.formula.value || undefined,
        fixedMargin,
        discountRate,
        minPrice,
        maxPrice,
        priority,
        active: Boolean(form.active?.checked)
      })
    });
    form.name.value = "";
    form.targetType.value = "";
    form.targetRef.value = "";
    form.formula.value = "";
    form.fixedMargin.value = "";
    form.discountRate.value = "";
    form.minPrice.value = "";
    form.maxPrice.value = "";
    form.priority.value = "100";
    showToast("Fiyat kurali eklendi.");
    await refreshPricingRules();
    renderIndustrySummary();
  });

  workflowTemplateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const form = event.target;
    const industryProfileId = form.industryProfileId.value || getSelectedIndustryProfileId();
    if (!industryProfileId) {
      showToast("Lutfen once sektor profili secin.", "error");
      return;
    }
    let steps;
    try {
      steps = JSON.parse(form.steps.value);
    } catch {
      showToast("Workflow adimlari JSON formati gecersiz.", "error");
      return;
    }
    await api("/workflow-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        industryProfileId,
        module: form.module.value,
        name: form.name.value,
        description: form.description.value || undefined,
        steps,
        active: Boolean(form.active?.checked)
      })
    });
    form.module.value = "";
    form.name.value = "";
    form.description.value = "";
    form.steps.value = "";
    showToast("Workflow sablonu eklendi.");
    await refreshWorkflowTemplates();
    renderIndustrySummary();
  });

  reportPresetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }
    const form = event.target;
    const industryProfileId = form.industryProfileId.value || getSelectedIndustryProfileId();
    if (!industryProfileId) {
      showToast("Lutfen once sektor profili secin.", "error");
      return;
    }
    let config;
    try {
      config = JSON.parse(form.config.value);
    } catch {
      showToast("Preset config JSON formati gecersiz.", "error");
      return;
    }
    await api("/report-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        industryProfileId,
        key: form.key.value,
        name: form.name.value,
        description: form.description.value || undefined,
        config,
        active: Boolean(form.active?.checked)
      })
    });
    form.key.value = "";
    form.name.value = "";
    form.description.value = "";
    form.config.value = "";
    showToast("Rapor preset eklendi.");
    await refreshReportPresets();
    renderIndustrySummary();
  });

  document.getElementById("reloadCompanies").addEventListener("click", refreshCompanies);
  document.getElementById("refreshAll").addEventListener("click", refreshAll);
  document.querySelectorAll(".quick-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (!target) return;
      setSection(target, btn.textContent ?? "", btn);
    });
  });
  applyReportFiltersButton?.addEventListener("click", async () => {
    await refreshReportViews();
  });

  exportSalesCsvButton?.addEventListener("click", () => {
    exportTableCsv("salesTable", "satis-ozeti.csv");
  });

  exportWooCsvButton?.addEventListener("click", () => {
    exportTableCsv("wooProductSalesTable", "woo-urun-satis-ozeti.csv");
  });

  exportProductSummaryCsvButton?.addEventListener("click", () => {
    exportTableCsv("productSummaryTable", "urun-ozeti.csv");
  });

  exportProductionPlanCsvButton?.addEventListener("click", () => {
    exportTableCsv("productionPlanTable", "uretim-plani.csv");
  });

  productionPlanForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await refreshProductionPlan();
    showToast("Uretim plani guncellendi.");
  });

  refreshSaasButton?.addEventListener("click", async () => {
    await refreshSaasSummary();
    showToast("SaaS ozeti guncellendi.");
  });

  document.getElementById("addOrderItem")?.addEventListener("click", (event) => {
    event.preventDefault();
    addOrderItemRow();
  });

  document.getElementById("submitOrder")?.addEventListener("click", async (event) => {
    event.preventDefault();
    await submitManualOrder();
  });

  imageProductSelect?.addEventListener("change", refreshProductImages);

  addDispatchItemButton?.addEventListener("click", (event) => {
    event.preventDefault();
    buildDispatchItemRow();
  });

  categoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;

    const form = event.target;
    await api("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, name: form.name.value })
    });

    form.reset();
    showToast("Kategori eklendi.");
    await refreshCategories();
  });

  productImageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const productId = form.productId.value;
    if (!productId) return;

    const files = Array.from(form.file?.files ?? []);
    const rawUrlText = String(form.url.value ?? "").trim();
    const urls = rawUrlText
      ? rawUrlText
          .split(/\r?\n|,/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

    if (!files.length && !urls.length) {
      showToast("Lutfen gorsel URL girin veya dosya secin.", "error");
      return;
    }

    let uploadedFileCount = 0;
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      await api(`/products/${productId}/images/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          dataUrl,
          setAsMain: false,
          addToGallery: true
        })
      });
      uploadedFileCount += 1;
    }

    let createdUrlCount = 0;
    for (const url of urls) {
      await api(`/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      createdUrlCount += 1;
    }

    showToast(
      `Galeriye eklendi. Dosya: ${uploadedFileCount} | URL: ${createdUrlCount}`
    );

    form.url.value = "";
    if (form.file) form.file.value = "";
    await refreshProducts();
    await refreshProductImages();
  });

  dispatchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;

    const form = event.target;
    const rows = Array.from(dispatchItemsContainer.querySelectorAll(".row"));
    const items = rows
      .map((row) => {
        const selects = row.querySelectorAll("select");
        const inputs = row.querySelectorAll("input");
        const productId = selects[0]?.value;
        const variantId = selects[1]?.value || undefined;
        const quantity = Number(inputs[0]?.value ?? 0);
        const price = Number(inputs[1]?.value ?? 0);
        if (!productId || !Number.isFinite(quantity) || quantity <= 0) return null;
        return { productId, variantId, quantity, price: Number.isFinite(price) ? price : 0 };
      })
      .filter(Boolean);

    if (!items.length) {
      showToast("Sevkiyat icin en az bir kalem girin.", "error");
      return;
    }

    const dispatchNumber = form.dispatchNumber.value || `SVK-${Date.now()}`;
    const payload = {
      dispatchNumber,
      warehouseId: form.warehouseId.value,
      dealerId: form.dealerId.value,
      status: form.status.value,
      date: form.date.value || undefined,
      items,
      allowOverLimit: false
    };

    const editId = form.dataset.editId || form.editId?.value || "";
    const isEditMode = form.dataset.mode === "edit" && Boolean(editId);

    try {
      if (isEditMode) {
        await api(`/dispatches/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast("Sevkiyat guncellendi.");
      } else {
        await api("/dispatches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            ...payload
          })
        });
        showToast("Sevkiyat kaydedildi.");
      }
    } catch (error) {
      const message = parseErrorMessage(error, "Sevkiyat kaydedilemedi.");
      if (canOverrideRiskLimit() && /risk|vade/i.test(message)) {
        const force = window.confirm(
          `${message}\n\nYonetici olarak risk limitini asarak sevkiyati kaydetmek ister misiniz?`
        );
        if (!force) {
          showToast(message, "error");
          return;
        }

        if (isEditMode) {
          await api(`/dispatches/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, allowOverLimit: true })
          });
          showToast("Sevkiyat (limit asimi onayi ile) guncellendi.");
        } else {
          await api("/dispatches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId,
              ...payload,
              allowOverLimit: true
            })
          });
          showToast("Sevkiyat (limit asimi onayi ile) kaydedildi.");
        }
      } else {
        showToast(message, "error");
        return;
      }
    }

    setDispatchFormCreateMode();
    form.dispatchNumber.value = `SVK-${Date.now()}`;
    resetDispatchFormItems();
    await refreshDispatches();
    await refreshStockSummary();
    await refreshStockMovements();
    await refreshLedger();
  });

  dispatchFormCancel?.addEventListener("click", () => {
    if (!dispatchForm) return;
    setDispatchFormCreateMode();
    dispatchForm.dispatchNumber.value = `SVK-${Date.now()}`;
    resetDispatchFormItems();
    showToast("Sevkiyat duzenleme modu kapatildi.");
  });

  productionBatchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;

    const form = event.target;
    await api("/production/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        warehouseId: form.warehouseId.value || undefined,
        productId: form.productId.value,
        batchNumber: form.batchNumber.value,
        quantity: Number(form.quantity.value),
        productionDate: form.productionDate.value,
        expiryDate: form.expiryDate.value || undefined
      })
    });

    const today = new Date().toISOString().slice(0, 10);
    form.batchNumber.value = buildPlannedBatchNumber(getProductById(form.productId.value)?.name ?? "URUN");
    form.productionDate.value = today;
    form.expiryDate.value = "";
    form.quantity.value = "";

    showToast("Uretim partisi kaydedildi.");
    await refreshProductionBatches();
    await refreshProductionPlan();
    await refreshStockSummary();
    await refreshStockMovements();
    await refreshWarehouseReport();
  });

  exportSystemJsonButton?.addEventListener("click", async () => {
    await exportSystemJson();
    showToast("Sistem yedegi indirildi.");
  });

  document.getElementById("companyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      name: form.name.value,
      email: form.email.value || undefined,
      phone: form.phone.value || undefined
    };
    const created = await api("/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    form.reset();
    showToast("Firma eklendi.");
    await refreshCompanies();
    companySelect.value = created.id;
    await refreshDealers();
    await refreshProducts();
  });

  dealerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;
    const payload = {
      companyId,
      name: dealerForm.name.value,
      email: dealerForm.email.value || undefined,
      phone: dealerForm.phone.value || undefined,
      taxNumber: dealerForm.taxNumber.value || undefined,
      address: dealerForm.address.value || undefined
    };
    await api("/dealers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    dealerForm.reset();
    showToast("Bayi eklendi.");
    await refreshDealers();
  });

  warehouseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;
    const payload = {
      companyId,
      name: warehouseForm.name.value,
      address: warehouseForm.address.value || undefined
    };
    await api("/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    warehouseForm.reset();
    showToast("Depo eklendi.");
    await refreshWarehouses();
    await refreshLocations();
    updateWarehouseLocation();
  });

  companySettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;
    const payload = {
      name: companySettingsForm.name.value || undefined,
      email: companySettingsForm.email.value || undefined,
      phone: companySettingsForm.phone.value || undefined
    };
    await api(`/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showToast("Firma ayarlari guncellendi.");
    await refreshCompanies();
  });

  deleteCompanyBtn?.addEventListener("click", async () => {
    const companyId = getSelectedCompanyId();
    if (!companyId) return;
    const selected = getSelectedCompany();
    const name = selected?.name ?? "Secili firma";
    const ok = window.confirm(`${name} firmasini silmek istediginize emin misiniz?`);
    if (!ok) return;

    try {
      await api(`/companies/${companyId}`, { method: "DELETE" });
      showToast("Firma silindi.");
      setProductFormCreateMode();
      await refreshAll();
      return;
    } catch (error) {
      const message = parseErrorMessage(error, "Firma silinemedi.");
      const force = window.confirm(`${message}\n\nBagli tum kayitlarla birlikte silinsin mi?`);
      if (!force) {
        showToast("Silme iptal edildi.", "error");
        return;
      }

      await api(`/companies/${companyId}?force=true`, { method: "DELETE" });
      showToast("Firma ve bagli tum veriler silindi.");
      setProductFormCreateMode();
      await refreshAll();
    }
  });
  dealerSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dealerId = getSelectedDealerId();
    if (!dealerId) return;
    const payload = {
      marginPercent: dealerSettingsForm.marginPercent.value
        ? Number(dealerSettingsForm.marginPercent.value)
        : 0,
      roundingType: dealerSettingsForm.roundingType.value
    };
    await api(`/dealers/${dealerId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showToast("Bayi ayarlari guncellendi.");
    await refreshDealerSettings();
  });

  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const companyId = getSelectedCompanyId();
    if (!companyId) return;

    const weight =
      form.weight.value !== "" ? Number(String(form.weight.value).replace(",", ".")) : undefined;
    const basePrice =
      form.basePrice.value !== ""
        ? Number(String(form.basePrice.value).replace(",", "."))
        : undefined;

    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
      showToast("Gramaj degeri gecersiz.", "error");
      return;
    }

    if (basePrice !== undefined && (!Number.isFinite(basePrice) || basePrice < 0)) {
      showToast("Baz fiyat gecersiz.", "error");
      return;
    }

    const payload = {
      companyId,
      categoryId: form.categoryId.value || undefined,
      name: form.name.value,
      sku: form.sku.value || undefined,
      imageUrl: form.imageUrl.value || undefined,
      unit: form.unit.value,
      weight,
      basePrice
    };

    const selectedFile = form.imageFile?.files?.[0];
    const editId = form.dataset.editId || form.editId?.value || "";
    let savedProductId = editId || null;

    if (editId) {
      const updatedProduct = await api(`/products/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: payload.categoryId,
          name: payload.name,
          sku: payload.sku,
          imageUrl: payload.imageUrl,
          unit: payload.unit,
          weight: payload.weight,
          basePrice: payload.basePrice
        })
      });
      savedProductId = updatedProduct?.id ?? editId;
      showToast("Urun guncellendi.");
    } else {
      const createdProduct = await api("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      savedProductId = createdProduct?.id ?? null;
      showToast("Urun eklendi.");
    }

    if (selectedFile && savedProductId) {
      const dataUrl = await fileToDataUrl(selectedFile);
      await api(`/products/${savedProductId}/images/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          dataUrl,
          setAsMain: true,
          addToGallery: true
        })
      });
      showToast("Urun gorseli yuklendi.");
    }

    form.reset();
    setProductFormCreateMode();
    await refreshProducts();
    await refreshVariants();
    await refreshStockSummary();
    await refreshProductImages();
  });

  productFormCancel?.addEventListener("click", () => {
    if (!productForm) return;
    productForm.reset();
    setProductFormCreateMode();
    showToast("Urun duzenleme iptal edildi.");
  });

  document.getElementById("variantForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const productId = form.productId.value;
    const payload = {
      name: form.name.value,
      sku: form.sku.value || undefined,
      unit: form.unit.value,
      multiplier: form.multiplier.value ? Number(form.multiplier.value) : 1
    };
    await api(`/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    form.reset();
    showToast("Varyasyon eklendi.");
    await refreshVariants();
  });

  document.getElementById("stockForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const companyId = getSelectedCompanyId();
    if (!companyId || !warehouseLocationId) return;
    const product = getProductById(form.productId.value);
    if (!product) return;

    const payload = {
      companyId,
      productId: product.id,
      variantId: form.variantId.value || undefined,
      locationId: warehouseLocationId,
      type: form.type.value,
      quantity: Number(form.quantity.value)
    };

    await api(`/stock-movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    form.reset();
    showToast("Stok hareketi kaydedildi.");
    await refreshStockSummary();
    await refreshStockMovements();
  });

  priceListForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) return;
    const form = event.target;

    const created = await api("/price-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name: form.name.value,
        currency: (form.currency.value || "TRY").toUpperCase()
      })
    });

    defaultPriceListId = created?.id ?? null;
    form.reset();
    form.currency.value = "TRY";
    showToast(`Yeni fiyat listesi olusturuldu ve secildi: ${created?.name ?? "-"}`);
    await refreshPriceLists();
    await refreshPriceItems();
    renderPriceListsTable();
  });

  priceListManageSelect?.addEventListener("change", async () => {
    defaultPriceListId = priceListManageSelect.value || null;
    await refreshPriceItems();
    renderPriceListsTable();
  });

  priceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!defaultPriceListId) {
      showToast("Once fiyat listesi secin.", "error");
      return;
    }
    const payload = {
      productId: priceForm.productId.value,
      variantId: priceForm.variantId.value || undefined,
      price: Number(priceForm.price.value)
    };
    await api(`/price-lists/${defaultPriceListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    priceForm.reset();
    showToast("Fiyat kaydedildi.");
    await refreshPriceItems();
  });

  importProductsToPriceListButton?.addEventListener("click", async () => {
    if (!defaultPriceListId) {
      showToast("Once fiyat listesi secin.", "error");
      return;
    }

    const result = await api(`/price-lists/${defaultPriceListId}/import-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overwriteExisting: Boolean(priceImportOverwrite?.checked)
      })
    });

    showToast(
      `Aktarim tamamlandi. Yeni: ${result.created ?? 0} | Guncellenen: ${result.updated ?? 0} | Atlanan: ${result.skipped ?? 0}`
    );
    await refreshPriceItems();
  });

  copyPriceListLinesButton?.addEventListener("click", async () => {
    await copyPriceListAsLines();
  });

  exportPriceListPdfButton?.addEventListener("click", () => {
    exportPriceListPdfTable();
  });

  dealerPriceListForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dealerId = getSelectedDealerId();
    if (!dealerId) return;
    if (!priceListSelect.value) {
      showToast("Atamak icin bir fiyat listesi secin.", "error");
      return;
    }
    const payload = { priceListId: priceListSelect.value };
    await api(`/dealers/${dealerId}/price-lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const list = priceLists.find((item) => item.id === priceListSelect.value);
    showToast(`Fiyat listesi atandi: ${list?.name ?? "-"}`);
    await refreshDealerPriceLists();
  });

  wooSiteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dealerId = getSelectedDealerId();
    if (!dealerId) {
      showToast("Lutfen once bayi secin.", "error");
      return;
    }

    const form = event.target;
    const payload = {
      platform: "WOO",
      baseUrl: form.baseUrl.value,
      consumerKey: form.consumerKey.value,
      consumerSecret: form.consumerSecret.value,
      active: true
    };

    await api(`/dealers/${dealerId}/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showToast("Woo baglantisi kaydedildi.");
    form.reset();
    await refreshWooIntegrations();
    setSection("woo");
  });

  genericIntegrationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dealerId = getSelectedDealerId();
    if (!dealerId) {
      showToast("Lutfen once bayi secin.", "error");
      return;
    }

    const form = event.target;
    const platform = String(form.platform.value || "OTHER").toUpperCase();
    const payload = {
      platform,
      baseUrl: form.baseUrl.value || undefined,
      consumerKey: form.consumerKey.value || undefined,
      consumerSecret: form.consumerSecret.value || undefined,
      active: Boolean(form.active?.checked)
    };

    await api("/dealers/" + dealerId + "/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showToast(getPlatformLabel(platform) + " baglantisi kaydedildi.");
    form.reset();
    if (form.active) form.active.checked = true;
    await refreshGenericIntegrations();
    setSection("integrations", "Diger Kanal Hazirligi");
  });

  document.getElementById("mappingForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    const dealerId = getSelectedDealerId();
    if (!companyId || !dealerId) {
      showToast("Lutfen firma ve bayi secin.", "error");
      return;
    }

    const form = event.target;
    await api("/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId,
        platform: form.platform.value,
        externalProductId: form.externalProductId.value,
        externalVariantId: form.externalVariantId.value || undefined,
        localProductId: form.localProductId.value,
        localVariantId: form.localVariantId.value || undefined
      })
    });

    showToast("Urun esleme kaydedildi.");
    form.reset();
    await refreshMappings();
  });

  unmatchedCreateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    const dealerId = getSelectedDealerId();

    if (!companyId || !dealerId) {
      showToast("Lutfen firma ve bayi secin.", "error");
      return;
    }

    if (!selectedUnmappedLog || !selectedUnmappedLog.externalProductId) {
      showToast("Lutfen once eslesmeyen satirdan 'Urun Ekle' secin.", "error");
      return;
    }

    const form = event.target;
    const createType = form.createType.value;
    const name = form.name.value?.trim();
    const sku = form.sku.value?.trim() || undefined;
    const unit = form.unit.value;

    if (!name) {
      showToast("Urun adi zorunlu.", "error");
      return;
    }

    let localProductId;
    let localVariantId;

    if (createType === "PRODUCT") {
      const createdProduct = await api("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name, sku, unit })
      });
      localProductId = createdProduct.id;
    } else {
      const parentProductId = form.parentProductId.value;
      if (!parentProductId) {
        showToast("Varyasyon icin ana urun secin.", "error");
        return;
      }

      const createdVariant = await api(`/products/${parentProductId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku,
          unit,
          multiplier: form.multiplier.value ? Number(form.multiplier.value) : 1
        })
      });

      localProductId = parentProductId;
      localVariantId = createdVariant.id;
    }

    await api("/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId,
        platform: "WOO",
        externalProductId: selectedUnmappedLog.externalProductId,
        externalVariantId: selectedUnmappedLog.externalVariantId,
        localProductId,
        localVariantId
      })
    });

    showToast("Urun olusturuldu ve esleme yapildi.");
    selectedUnmappedLog = null;
    form.reset();
    if (unmatchedSelectedInfo) unmatchedSelectedInfo.value = "";
    if (unmatchedExternalInfo) unmatchedExternalInfo.value = "";

    await refreshProducts();
    await refreshVariants();
    await refreshMappings();
    await refreshIntegrationLogs();
    updateUnmappedCreateTypeUI();
  });
  document.getElementById("ledgerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    const dealerId = getSelectedDealerId();
    if (!companyId || !dealerId) {
      showToast("Lutfen firma ve bayi secin.", "error");
      return;
    }

    const form = event.target;
    await api("/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId,
        type: form.type.value,
        amount: Number(form.amount.value),
        referenceType: "MANUAL",
        referenceId: form.note.value || undefined
      })
    });

    showToast("Cari hareket kaydedildi.");
    form.reset();
    await refreshLedger();
  });

  userForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    if (!companyId) {
      showToast("Lutfen once firma secin.", "error");
      return;
    }

    const form = event.target;
    const role = form.role.value;
    await api("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId: role === "DEALER" ? getSelectedDealerId() || undefined : undefined,
        name: form.name.value,
        email: form.email.value,
        role
      })
    });

    showToast("Kullanici eklendi.");
    form.reset();
    await refreshUsers();
  });
  downloadMappingTemplate.addEventListener("click", () => {
    const header = "externalProductId,externalVariantId,localProductId,localVariantId";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mapping_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });


 mappingImportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyId = getSelectedCompanyId();
    const dealerId = getSelectedDealerId();
    if (!companyId || !dealerId) return;
    const raw = mappingCsv.value.trim();
    if (!raw) {
      showToast("CSV bos.", "error");
      return;
    }
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 3) continue;
      const [externalProductId, externalVariantId, localProductId, localVariantId] = parts;
      rows.push({
        externalProductId,
        externalVariantId: externalVariantId || undefined,
        localProductId,
        localVariantId: localVariantId || undefined
      });
    }
    if (!rows.length) {
      showToast("CSV formatini kontrol edin.", "error");
      return;
    }
    const result = await api("/mappings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        dealerId,
        platform: mappingPlatform.value,
        rows
      })
    });
    mappingImportResult.textContent = `Basarili: ${result.success} | Hatali: ${result.errors?.length ?? 0}`;
    showToast("Toplu esleme tamamlandi.");
    mappingCsv.value = "";
    await refreshMappings();
  });

  setProductFormCreateMode();
  try {
    await refreshAll();
  } catch (error) {
    showToast(parseErrorMessage(error, "Veriler yuklenemedi. Yonetim API key girip tekrar deneyin."), "error");
  }
  setSection("overview");
}

function normalizeMenuText(value) {
  return (value ?? "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPanelByHeading(headingText) {
  const normalizedHeading = normalizeMenuText(headingText);
  return Array.from(document.querySelectorAll(".panel")).find((panel) => {
    const heading = panel.querySelector("h2");
    return normalizeMenuText(heading?.textContent ?? "") === normalizedHeading;
  });
}

function ensureSectionContainer(sectionId) {
  const existing = document.querySelector(`.section[data-section="${sectionId}"]`);
  if (existing) return existing;

  const main = document.querySelector("main.container");
  if (!main) return null;

  const section = document.createElement("section");
  section.className = "section";
  section.dataset.section = sectionId;
  main.appendChild(section);
  return section;
}

function ensureSectionGrid(section) {
  const existingGrid = section.querySelector(".grid");
  if (existingGrid) return existingGrid;

  const grid = document.createElement("div");
  grid.className = "grid";
  section.appendChild(grid);
  return grid;
}

function movePanelToSection(panelHeading, sectionId) {
  const panel = findPanelByHeading(panelHeading);
  if (!panel) return;

  const section = ensureSectionContainer(sectionId);
  if (!section) return;

  const grid = ensureSectionGrid(section);
  grid.appendChild(panel);
}

function remapSidebarTarget(label, target) {
  const normalizedLabel = normalizeMenuText(label);
  const button = Array.from(document.querySelectorAll(".nav-btn")).find(
    (btn) => normalizeMenuText(btn.textContent ?? "") === normalizedLabel
  );
  if (!button) return;
  button.dataset.target = target;
}

function remapQuickNavTarget(label, target) {
  const normalizedLabel = normalizeMenuText(label);
  const button = Array.from(document.querySelectorAll(".quick-nav")).find(
    (btn) => normalizeMenuText(btn.textContent ?? "") === normalizedLabel
  );
  if (!button) return;
  button.dataset.target = target;
}

function organizeMenuSections() {
  movePanelToSection("Firma Ekle", "dealers");
  movePanelToSection("Firma Listesi", "dealers");
  movePanelToSection("Bayi Ekle", "dealers");

  movePanelToSection("Kategori Ekle", "categories");
  movePanelToSection("Kategori Listesi", "categories");
  movePanelToSection("Varyasyon Ekle", "variants");
  movePanelToSection("Varyasyon Listesi", "variants");
  movePanelToSection("Urun Galeri", "gallery");
  movePanelToSection("Galeri Kayitlari", "gallery");

  remapSidebarTarget("Kategoriler", "categories");
  remapSidebarTarget("Varyasyonlar", "variants");
  remapSidebarTarget("Urun Resimleri / Galeri", "gallery");
  remapSidebarTarget("Yeni Bayi Ekle", "dealers");
  remapQuickNavTarget("Yeni Bayi / Firma Ekle", "dealers");
}

const MENU_PANEL_RULES = [
  ["overview", "Dashboard", ["Genel Bakis", "Ilk Kurulum Akisi", "Firma Ayarlari", "Bayi Ayarlari", "Bayi Portal"]],
  ["reports", "Bugunku satis", ["Rapor Filtreleri", "Satis Ozeti"]],
  ["stock", "Tahmini bayi stok uyarilari", ["Stok Durumu"]],
  ["stock", "Kritik depo stoklari", ["Depo Stok Raporu", "Stok Durumu"]],
  ["ledger", "Tahsilat bekleyen bakiyeler", ["Cari Ozeti"]],
  ["dispatch", "Son sevkiyatlar", ["Sevkiyat Listesi"]],
  ["production", "Uretim plani uyarilari", ["Uretim Planlama Asistani", "Uretim Onerileri"]],

  ["products", "Urun Listesi", ["Urunler"]],
  ["products", "Yeni Urun Ekle", ["Urun Ekle"]],
  ["categories", "Kategoriler", ["Kategori Ekle", "Kategori Listesi"]],
  ["variants", "Varyasyonlar", ["Varyasyon Ekle", "Varyasyon Listesi"]],
  ["prices", "Fiyat Listeleri", ["Yeni Fiyat Listesi", "Fiyat Listesi", "Fiyat Listesi Kalemleri", "Fiyat Listeleri", "Liste Urun Havuzu"]],
  ["gallery", "Urun Resimleri / Galeri", ["Urun Galeri", "Galeri Kayitlari"]],
  ["integrations", "XML / Katalog Ayarlari", ["Entegrasyon Merkezi", "Diger Kanal Hazirligi"]],

  ["dealers", "Bayi Listesi", ["Bayi Listesi"]],
  ["dealers", "Yeni Bayi Ekle", ["Firma Ekle", "Bayi Ekle"]],
  ["dealers", "Bayi Detayi", ["Bayi Listesi"]],
  ["prices", "Bayi Fiyat Kurallari", ["Bayiye Fiyat Listesi Ata", "Bayi Fiyat Listeleri", "Liste Urun Havuzu"]],
  ["woo", "Bayi API / Entegrasyon Ayarlari", ["WooCommerce Entegrasyonu"]],
  ["integrations", "Bayi XML Ayarlari", ["Entegrasyon Merkezi", "Diger Kanal Hazirligi"]],
  ["stock", "Bayi Tahmini Stoklari", ["Stok Durumu"]],

  ["stock", "Genel Stok Gorunumu", ["Stok Durumu", "Depo Stok Raporu"]],
  ["stock", "Depo Stoklari", ["Depo Stok Raporu", "Depo Listesi"]],
  ["stock", "Stok Hareketleri", ["Stok Hareketi", "Stok Hareket Listesi"]],
  ["stock", "Stok Duzeltme", ["Stok Hareketi"]],
  ["stock", "Iade Islemleri", ["Stok Hareketi"]],
  ["stock", "Kritik Stok Uyarilari", ["Stok Durumu"]],

  ["dispatch", "Sevkiyat Listesi", ["Sevkiyat Listesi"]],
  ["dispatch", "Yeni Sevkiyat Olustur", ["Yeni Sevkiyat Olustur"]],
  ["dispatch", "Irsaliyeler", ["Sevkiyat Listesi"]],
  ["dispatch", "Taslak Sevkiyatlar", ["Sevkiyat Listesi"]],
  ["dispatch", "Iptal Edilen Sevkiyatlar", ["Sevkiyat Listesi"]],

  ["orders", "Tum Siparisler", ["Siparis Listesi"]],
  ["reports", "Kanal Bazli Siparisler", ["Rapor Filtreleri", "Satis Ozeti"]],
  ["woo", "WooCommerce Siparisleri", ["WooCommerce Entegrasyonu"]],
  ["orders", "Manuel Bildirilen Satislar", ["Manuel Siparis", "Siparis Listesi"]],
  ["unmapped", "Eslesmeyen Urunler", ["Eslesmeyen Siparis Satirlari", "Eslesmeyenden Urun Olustur"]],
  ["unmapped-summary", "Eslesmeyen Urun Ozeti", ["Eslesmeyen Urun Ozeti", "Uretim Firsati Listesi"]],
  ["integrations", "Ice Aktarim Gecmisi", ["Entegrasyon Merkezi"]],

  ["ledger", "Cari Listesi", ["Cari Ozeti"]],
  ["ledger", "Firma Ekstresi", ["Cari Hareket"]],
  ["ledger", "Tahsilatlar", ["Cari Hareket"]],
  ["ledger", "Borc / Alacak Hareketleri", ["Cari Hareket"]],
  ["ledger", "Bakiye Ozeti", ["Cari Ozeti"]],
  ["ledger", "Vade Takibi", ["Cari Ozeti"]],

  ["production", "Uretim Onerileri", ["Uretim Planlama Asistani", "Uretim Onerileri"]],
  ["production", "Urun Bazli Talep Analizi", ["Uretim Onerileri"]],
  ["production", "Son 30 Gun Satis Analizi", ["Uretim Onerileri"]],
  ["production", "Stokta Kac Gun Kaldi", ["Uretim Onerileri"]],
  ["production", "Uretim Partileri", ["Uretim Partileri"]],
  ["production", "Son Kullanma / Parti Takibi", ["Uretim Partileri"]],

  ["reports", "Satis Ozeti", ["Rapor Filtreleri", "Satis Ozeti"]],
  ["reports", "Urun Performansi", ["Rapor Filtreleri", "Woo Urun Satis Ozeti", "Urun Ozeti"]],
  ["reports", "Bayi Performansi", ["Rapor Filtreleri", "Satis Ozeti"]],
  ["reports", "Stok Raporu", ["Urun Ozeti"]],
  ["reports", "Sevkiyat Raporu", ["Urun Ozeti"]],
  ["reports", "Cari Raporu", ["Satis Ozeti"]],
  ["reports", "Donemsel Karsilastirmalar", ["Rapor Filtreleri", "Satis Ozeti", "Woo Urun Satis Ozeti", "Urun Ozeti"]],

  ["woo", "WooCommerce", ["WooCommerce Entegrasyonu"]],
  ["mapping", "Urun Eslestirme", ["Urun Esleme", "CSV Esleme", "Esleme Listesi"]],
  ["integrations", "Shopify", ["Diger Kanal Hazirligi"]],
  ["integrations", "Pazaryeri Entegrasyonlari", ["Diger Kanal Hazirligi"]],
  ["integrations", "XML Feed Yonetimi", ["Entegrasyon Merkezi", "Diger Kanal Hazirligi"]],
  ["users", "API Anahtarlari", ["Kullanici Listesi"]],
  ["unmapped", "Entegrasyon Loglari", ["Eslesmeyen Siparis Satirlari"]],
  ["integrations", "Senkronizasyon Durumu", ["Entegrasyon Merkezi"]],

  ["users", "Kullanici Listesi", ["Kullanici Listesi"]],
  ["users", "Yeni Kullanici", ["Kullanici Ekle"]],
  ["users", "Roller ve Yetkiler", ["Kullanici Listesi"]],
  ["users", "API Kullanicilari", ["Kullanici Listesi"]],
  ["users", "Oturum Gecmisi", ["Kullanici Listesi"]],

  ["settings", "Genel Ayarlar", ["Sistem Ayarlari Merkezi"]],
  ["overview", "Sirket Bilgileri", ["Firma Ayarlari", "Bayi Ayarlari", "Bayi Portal"]],
  ["stock", "Depolar", ["Depo Ekle", "Depo Listesi", "Depo Stok Raporu"]],
  ["stock", "Lokasyonlar", ["Depo Listesi"]],
  ["system", "Audit Log", ["Audit Log"]],
  ["system", "Yedekleme / Disa Aktarim", ["Sistem Yonetimi"]],
  ["settings", "Sistem Loglari", ["Firma Veri Sagligi", "Entegrasyon Sagligi"]],
  ["saas", "Platform / SaaS", ["Platform Yonetimi (SaaS Hazirligi)", "Tenant Ozet Tablosu"]],

  ["industry", "Sektor Profilleri", ["Sektor Profilleri", "Sektor Ozeti"]],
  ["industry", "Dinamik Alanlar", ["Dinamik Alan Tanimlari", "Dinamik Alan Listesi"]],
  ["industry", "Sektor Fiyat Kurallari", ["Sektor Fiyat Kurallari", "Fiyat Kurali Listesi"]],
  ["industry", "Workflow Sablonlari", ["Workflow Sablonlari", "Workflow Listesi"]],
  ["industry", "Rapor Presetleri", ["Rapor Presetleri", "Rapor Preset Listesi"]],

  ["overview", "Firma Bilgileri", ["Firma Ayarlari", "Bayi Ayarlari", "Bayi Portal"]],
  ["dealers", "Yeni Bayi / Firma Ekle", ["Firma Ekle", "Bayi Ekle"]],
  ["woo", "Bayi API Ayarlari", ["WooCommerce Entegrasyonu"]],
  ["overview", "Firma/Bayi Ayarlari", ["Firma Ayarlari", "Bayi Ayarlari", "Bayi Portal"]],
  ["users", "Kullanici Rolleri", ["Kullanici Listesi"]],
  ["woo", "Entegrasyon Baglantilari", ["WooCommerce Entegrasyonu"]],
  ["settings", "Sistem Ayarlari", ["Sistem Ayarlari Merkezi"]],
  ["users", "Yetki Rolleri", ["Kullanici Listesi"]]
];

const MENU_PANEL_MAP = Object.fromEntries(
  MENU_PANEL_RULES.map(([target, label, panels]) => [
    `${target}|${normalizeMenuText(label)}`,
    panels.map((panel) => normalizeMenuText(panel))
  ])
);

function getSectionElement(target) {
  return document.querySelector(`.section[data-section="${target}"]`);
}

function getSectionPanels(target) {
  const section = getSectionElement(target);
  if (!section) return [];
  return Array.from(section.querySelectorAll(".panel"));
}

function getPanelKey(panel) {
  const heading = panel.querySelector("h2");
  return normalizeMenuText(heading?.textContent ?? "");
}

function scorePanelMatch(panelKey, normalizedLabel, tokens) {
  if (!panelKey || !normalizedLabel) return 0;

  let score = 0;
  if (panelKey === normalizedLabel) score += 20;
  if (panelKey.includes(normalizedLabel)) score += 12;
  if (normalizedLabel.includes(panelKey)) score += 6;

  tokens.forEach((token) => {
    if (panelKey.includes(token)) score += token.length >= 5 ? 3 : 2;
  });

  return score;
}

function findBestPanelKeys(target, focusLabel) {
  const normalizedLabel = normalizeMenuText(focusLabel);
  if (!normalizedLabel) return [];

  const tokens = normalizedLabel.split(" ").filter((token) => token.length > 2);
  const panels = getSectionPanels(target);

  let bestScore = 0;
  const bestKeys = [];

  panels.forEach((panel) => {
    const panelKey = getPanelKey(panel);
    const score = scorePanelMatch(panelKey, normalizedLabel, tokens);
    if (!score) return;

    if (score > bestScore) {
      bestScore = score;
      bestKeys.length = 0;
      bestKeys.push(panelKey);
      return;
    }

    if (score === bestScore && !bestKeys.includes(panelKey)) {
      bestKeys.push(panelKey);
    }
  });

  return bestScore > 0 ? bestKeys : [];
}

function resolvePanelKeys(target, focusLabel) {
  const normalizedLabel = normalizeMenuText(focusLabel);
  if (!normalizedLabel) return [];

  const mapKey = `${target}|${normalizedLabel}`;
  const directMatch = MENU_PANEL_MAP[mapKey];
  if (directMatch?.length) {
    return directMatch;
  }

  return findBestPanelKeys(target, focusLabel);
}

function clearSectionPanelFilter(target) {
  getSectionPanels(target).forEach((panel) => panel.classList.remove("panel-hidden-by-menu"));
}

function applySectionPanelFilter(target, focusLabel) {
  const panels = getSectionPanels(target);
  if (!panels.length) return;

  clearSectionPanelFilter(target);

  const panelKeys = resolvePanelKeys(target, focusLabel);
  if (!panelKeys.length) return;

  const allowed = new Set(panelKeys);
  panels.forEach((panel) => {
    const panelKey = getPanelKey(panel);
    const visible = allowed.has(panelKey);
    panel.classList.toggle("panel-hidden-by-menu", !visible);
  });
}

function focusSectionContent(target) {
  const section = getSectionElement(target);
  if (!section) return;

  const firstVisiblePanel = section.querySelector(".panel:not(.panel-hidden-by-menu)");
  if (firstVisiblePanel) {
    firstVisiblePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setActiveSidebarButton(target, activeButton) {
  const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
  navButtons.forEach((btn) => btn.classList.remove("active"));

  const pickedButton =
    activeButton && navButtons.includes(activeButton)
      ? activeButton
      : navButtons.find((btn) => btn.dataset.target === target);

  if (pickedButton) {
    pickedButton.classList.add("active");
  }
}

function setSection(target, focusLabel = "", activeButton = null) {
  setActiveMenuContext(target, focusLabel);

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.toggle("active", section.dataset.section === target);
  });

  setActiveSidebarButton(target, activeButton);
  applySectionPanelFilter(target, focusLabel);
  focusSectionContent(target);

  if (target === "settings") {
    refreshSettingsSection().catch(() => {
      showToast("Sistem ayarlari verileri yuklenemedi.", "error");
    });
  }

  if (target === "saas") {
    refreshSaasSummary().catch(() => {
      showToast("SaaS ozeti yuklenemedi.", "error");
    });
  }

  if (target === "production") {
    refreshProductionPlan().catch(() => {
      showToast("Uretim plani yuklenemedi.", "error");
    });
  }

  if (target === "unmapped-summary") {
    refreshUnmappedSummary().catch(() => {
      showToast("Eslesmeyen urun ozeti yuklenemedi.", "error");
    });
  }

  if (target === "reports") {
    refreshReportViews().catch(() => {
      showToast("Rapor verileri yuklenemedi.", "error");
    });
  }

  if (target === "orders") {
    refreshOrders().catch(() => {
      showToast("Siparis verileri yuklenemedi.", "error");
    });
  }

  if (target === "dispatch") {
    refreshDispatches().catch(() => {
      showToast("Sevkiyat verileri yuklenemedi.", "error");
    });
  }

  if (target === "ledger") {
    refreshLedger().catch(() => {
      showToast("Cari verileri yuklenemedi.", "error");
    });
  }

  if (target === "integrations") {
    refreshGenericIntegrations().catch(() => {
      showToast("Kanal entegrasyonlari yuklenemedi.", "error");
    });
  }

  if (target === "industry") {
    refreshIndustrySection().catch(() => {
      showToast("Sektor ayarlari yuklenemedi.", "error");
    });
  }
}

setup();



































































































