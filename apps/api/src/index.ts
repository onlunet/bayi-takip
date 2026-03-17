import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./lib/prisma";
import { loadConfig } from "./config";
import { registerRoutes } from "./routes/index";
import { canAccessAdminRoute, isDealerPath, isPublicPath } from "./lib/access";

const config = loadConfig();
const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const AUTH_CACHE_MS = 15000;
let authRequiredCache = { value: false, checkedAt: 0 };
const AUTO_SCOPE_QUERY_PREFIXES = [
  "/dealers",
  "/products",
  "/variants",
  "/categories",
  "/warehouses",
  "/locations",
  "/orders",
  "/dispatches",
  "/stock-movements",
  "/price-lists",
  "/users",
  "/ledger",
  "/audit",
  "/reports",
  "/integrations/logs",
  "/production/batches",
  "/mappings",
  "/industry-profiles",
  "/industry-config",
  "/attribute-definitions",
  "/attribute-values",
  "/pricing-rules",
  "/workflow-templates",
  "/report-presets"
];

const AUTO_SCOPE_BODY_PATHS = new Set([
  "/dealers",
  "/products",
  "/categories",
  "/warehouses",
  "/locations",
  "/orders",
  "/dispatches",
  "/stock-movements",
  "/price-lists",
  "/users",
  "/ledger",
  "/production/batches",
  "/mappings",
  "/mappings/import",
  "/industry-profiles",
  "/industry-profiles/seed",
  "/attribute-definitions",
  "/attribute-values",
  "/pricing-rules",
  "/workflow-templates",
  "/report-presets"
]);

function readHeader(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function pathMatches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function pathMatchesAny(path: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathMatches(path, prefix));
}

function readCompanyId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function getParamsObject(request: any) {
  if (request.params && typeof request.params === "object") {
    return request.params as Record<string, unknown>;
  }
  return {};
}

type ResourceCompanyScope = {
  companyId: string | null;
  notFound?: boolean;
};

async function resolveResourceCompanyScope(
  lowerPath: string,
  params: Record<string, unknown>
): Promise<ResourceCompanyScope | null> {
  const id = typeof params.id === "string" ? params.id : null;

  if (pathMatches(lowerPath, "/companies") && id) {
    return { companyId: id };
  }

  if (pathMatches(lowerPath, "/dealers")) {
    const dealerId =
      (typeof params.id === "string" ? params.id : null) ||
      (typeof params.dealerId === "string" ? params.dealerId : null);

    if (typeof params.integrationId === "string") {
      const integration = await prisma.dealerIntegration.findUnique({
        where: { id: params.integrationId },
        select: { companyId: true, dealerId: true }
      });

      if (!integration) return { companyId: null, notFound: true };
      if (dealerId && integration.dealerId !== dealerId) return { companyId: null, notFound: true };
      return { companyId: integration.companyId };
    }

    if (dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: { companyId: true }
      });
      if (!dealer) return { companyId: null, notFound: true };
      return { companyId: dealer.companyId };
    }
  }

  if (pathMatches(lowerPath, "/products") && id) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!product) return { companyId: null, notFound: true };
    return { companyId: product.companyId };
  }

  if (pathMatches(lowerPath, "/variants") && id) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      select: { product: { select: { companyId: true } } }
    });
    if (!variant) return { companyId: null, notFound: true };
    return { companyId: variant.product.companyId };
  }

  if (pathMatches(lowerPath, "/categories") && id) {
    const category = await prisma.category.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!category) return { companyId: null, notFound: true };
    return { companyId: category.companyId };
  }

  if (pathMatches(lowerPath, "/warehouses") && id) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!warehouse) return { companyId: null, notFound: true };
    return { companyId: warehouse.companyId };
  }

  if (pathMatches(lowerPath, "/dispatches") && id) {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!dispatch) return { companyId: null, notFound: true };
    return { companyId: dispatch.companyId };
  }

  if (pathMatches(lowerPath, "/price-lists") && id) {
    const priceList = await prisma.priceList.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!priceList) return { companyId: null, notFound: true };
    return { companyId: priceList.companyId };
  }

  if (pathMatches(lowerPath, "/mappings") && id) {
    const mapping = await prisma.productMapping.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!mapping) return { companyId: null, notFound: true };
    return { companyId: mapping.companyId };
  }

  if (pathMatches(lowerPath, "/stock-movements") && id) {
    const movement = await prisma.stockMovement.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!movement) return { companyId: null, notFound: true };
    return { companyId: movement.companyId };
  }

  if (pathMatches(lowerPath, "/users") && id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!user) return { companyId: null, notFound: true };
    return { companyId: user.companyId };
  }

  if (pathMatches(lowerPath, "/integrations") && id) {
    const integration = await prisma.dealerIntegration.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!integration) return { companyId: null, notFound: true };
    return { companyId: integration.companyId };
  }

  if (pathMatches(lowerPath, "/industry-profiles") && id) {
    const profile = await prisma.industryProfile.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!profile) return { companyId: null, notFound: true };
    return { companyId: profile.companyId };
  }

  if (pathMatches(lowerPath, "/attribute-definitions") && id) {
    const definition = await prisma.attributeDefinition.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!definition) return { companyId: null, notFound: true };
    return { companyId: definition.companyId };
  }

  if (pathMatches(lowerPath, "/attribute-values") && id) {
    const value = await prisma.attributeValue.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!value) return { companyId: null, notFound: true };
    return { companyId: value.companyId };
  }

  if (pathMatches(lowerPath, "/pricing-rules") && id) {
    const rule = await prisma.pricingRule.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!rule) return { companyId: null, notFound: true };
    return { companyId: rule.companyId };
  }

  if (pathMatches(lowerPath, "/workflow-templates") && id) {
    const workflow = await prisma.workflowTemplate.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!workflow) return { companyId: null, notFound: true };
    return { companyId: workflow.companyId };
  }

  if (pathMatches(lowerPath, "/report-presets") && id) {
    const preset = await prisma.reportPreset.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!preset) return { companyId: null, notFound: true };
    return { companyId: preset.companyId };
  }

  return null;
}

async function shouldRequireAdminAuth() {
  const envAdminKey = config.ADMIN_API_KEY?.trim();
  if (envAdminKey) return true;

  const now = Date.now();
  if (now - authRequiredCache.checkedAt < AUTH_CACHE_MS) {
    return authRequiredCache.value;
  }

  const userCount = await prisma.user.count();
  authRequiredCache = {
    value: userCount > 0,
    checkedAt: now
  };
  return authRequiredCache.value;
}

await app.register(cors, { origin: true });
await app.register(fastifyStatic, {
  root: publicDir,
  index: "index.html"
});

app.addHook("preHandler", async (request, reply) => {
  const rawPath = (request.raw.url ?? request.url).split("?")[0] || "/";
  const lowerPath = rawPath.toLowerCase();

  if (isPublicPath(lowerPath) || isDealerPath(lowerPath)) {
    return;
  }

  const authRequired = await shouldRequireAdminAuth();
  if (!authRequired) {
    (request as any).authUser = {
      id: "bootstrap-owner",
      companyId: null,
      role: "OWNER",
      dealerId: null,
      active: true
    };
    return;
  }

  const envAdminKey = config.ADMIN_API_KEY?.trim();
  const suppliedAdminKey = readHeader(request.headers["x-admin-key"] as string | string[] | undefined);

  if (envAdminKey && suppliedAdminKey === envAdminKey) {
    (request as any).authUser = {
      id: "env-admin",
      companyId: null,
      role: "OWNER",
      dealerId: null,
      active: true
    };
    return;
  }

  const suppliedUserKey = readHeader(request.headers["x-api-key"] as string | string[] | undefined);
  if (!suppliedUserKey) {
    reply.status(401).send({ message: "Yonetim API key gerekli" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { apiKey: suppliedUserKey },
    select: {
      id: true,
      companyId: true,
      role: true,
      dealerId: true,
      active: true
    }
  });

  if (!user || !user.active) {
    reply.status(401).send({ message: "Gecersiz veya pasif API key" });
    return;
  }

  if (!canAccessAdminRoute(user.role, request.method, lowerPath)) {
    reply.status(403).send({ message: "Bu islem icin yetkiniz bulunmuyor" });
    return;
  }

  const scopedCompanyId = readCompanyId(user.companyId);
  if (scopedCompanyId) {
    (request as any).scopedCompanyId = scopedCompanyId;

    if (lowerPath === "/companies" && request.method !== "GET") {
      reply.status(403).send({ message: "Yalnizca kendi firmaniz uzerinde islem yapabilirsiniz" });
      return;
    }

    const queryObject =
      request.query && typeof request.query === "object"
        ? (request.query as Record<string, unknown>)
        : null;
    const bodyObject =
      request.body && typeof request.body === "object" && !Array.isArray(request.body)
        ? (request.body as Record<string, unknown>)
        : null;

    if (queryObject) {
      const queryCompanyId = readCompanyId(queryObject.companyId);
      if (queryCompanyId && queryCompanyId !== scopedCompanyId) {
        reply.status(403).send({ message: "Farkli bir firmaya ait veriye erisim engellendi" });
        return;
      }

      if (!queryCompanyId && pathMatchesAny(lowerPath, AUTO_SCOPE_QUERY_PREFIXES)) {
        queryObject.companyId = scopedCompanyId;
        (request as any).query = queryObject;
      }
    }

    if (bodyObject) {
      const bodyCompanyId = readCompanyId(bodyObject.companyId);
      if (bodyCompanyId && bodyCompanyId !== scopedCompanyId) {
        reply.status(403).send({ message: "Farkli bir firma icin islem yapamazsiniz" });
        return;
      }

      if (!bodyCompanyId && request.method === "POST" && AUTO_SCOPE_BODY_PATHS.has(lowerPath)) {
        bodyObject.companyId = scopedCompanyId;
        (request as any).body = bodyObject;
      }
    }

    const paramsObject = getParamsObject(request);
    const resourceScope = await resolveResourceCompanyScope(lowerPath, paramsObject);
    if (resourceScope?.notFound) {
      reply.status(404).send({ message: "Kayit bulunamadi" });
      return;
    }

    if (resourceScope?.companyId && resourceScope.companyId !== scopedCompanyId) {
      reply.status(403).send({ message: "Bu kayda erisim yetkiniz yok" });
      return;
    }
  }

  (request as any).authUser = user;
});

await registerRoutes(app);

app.get("/auth/me", async (request, reply) => {
  const authUser = (request as any).authUser ?? null;
  const authRequired = await shouldRequireAdminAuth();
  if (!authUser) {
    reply.send({
      authRequired,
      user: null
    });
    return;
  }

  reply.send({
    authRequired,
    user: {
      id: authUser.id,
      companyId: authUser.companyId ?? null,
      dealerId: authUser.dealerId ?? null,
      role: authUser.role ?? "OWNER",
      active: Boolean(authUser.active ?? true)
    }
  });
});

app.get("/health", async () => ({ ok: true }));

export { app };
export const ready = app.ready();

if (process.env.VERCEL !== "1") {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}
