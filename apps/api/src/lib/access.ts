import { Role } from "@prisma/client";

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const WAREHOUSE_DENIED_PREFIXES = [
  "/ledger",
  "/users",
  "/audit",
  "/industry",
  "/attribute",
  "/pricing-rules",
  "/workflow-templates",
  "/report-presets"
];

const WAREHOUSE_WRITE_PREFIXES = [
  "/products",
  "/categories",
  "/variants",
  "/warehouses",
  "/locations",
  "/stock-movements",
  "/dispatches",
  "/orders",
  "/production",
  "/mappings",
  "/integrations"
];

const ACCOUNTING_READ_PREFIXES = [
  "/companies",
  "/dealers",
  "/orders",
  "/dispatches",
  "/ledger",
  "/reports",
  "/price-lists",
  "/audit",
  "/integrations",
  "/industry-config",
  "/industry-profiles",
  "/attribute-definitions",
  "/attribute-values",
  "/pricing-rules",
  "/workflow-templates",
  "/report-presets"
];
const ACCOUNTING_WRITE_PREFIXES = ["/ledger"];

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/index.html",
  "/dealer.html",
  "/app.js",
  "/dealer.js",
  "/styles.css",
  "/favicon.ico",
  "/health"
]);

function normalizePath(rawPath: string) {
  if (!rawPath) return "/";
  const path = rawPath.split("?")[0].trim().toLowerCase();
  return path || "/";
}

function pathMatches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function pathMatchesAny(path: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathMatches(path, prefix));
}

function isWriteMethod(method: string) {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function canAccessAdminRoute(role: Role, method: string, rawPath: string) {
  const path = normalizePath(rawPath);

  if (role === "OWNER" || role === "ADMIN") return true;
  if (role === "DEALER") return false;

  if (role === "WAREHOUSE") {
    if (pathMatchesAny(path, WAREHOUSE_DENIED_PREFIXES)) return false;
    if (isWriteMethod(method)) {
      return pathMatchesAny(path, WAREHOUSE_WRITE_PREFIXES);
    }
    return true;
  }

  if (role === "ACCOUNTING") {
    if (isWriteMethod(method)) {
      return pathMatchesAny(path, ACCOUNTING_WRITE_PREFIXES);
    }
    return pathMatchesAny(path, ACCOUNTING_READ_PREFIXES);
  }

  return false;
}

export function isPublicPath(rawPath: string) {
  const path = normalizePath(rawPath);
  if (PUBLIC_EXACT_PATHS.has(path)) return true;
  if (path.startsWith("/uploads/")) return true;
  if (path.startsWith("/assets/")) return true;
  return false;
}

export function isDealerPath(rawPath: string) {
  const path = normalizePath(rawPath);
  if (path === "/catalog.xml") return true;
  return path.startsWith("/dealer");
}
