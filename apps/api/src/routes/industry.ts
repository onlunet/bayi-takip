import { FastifyInstance } from "fastify";
import { AttributeDataType, AttributeEntity, IndustryCode, PricingRuleType, Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const boolQuery = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "evet"].includes(normalized)) return true;
    if (["0", "false", "no", "hayir"].includes(normalized)) return false;
    return undefined;
  });

const profileQuerySchema = z.object({
  companyId: z.string().min(1),
  active: boolQuery
});

const profileCreateSchema = z.object({
  companyId: z.string().min(1),
  code: z.nativeEnum(IndustryCode).default(IndustryCode.GENERIC),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  settings: z.unknown().optional(),
  active: z.boolean().optional().default(true)
});

const profileUpdateSchema = z.object({
  code: z.nativeEnum(IndustryCode).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  settings: z.unknown().optional(),
  active: z.boolean().optional()
});

const seedSchema = z.object({
  companyId: z.string().min(1),
  replace: z.boolean().optional().default(false)
});

const configQuerySchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().min(1),
  entity: z.nativeEnum(AttributeEntity).optional()
});

const definitionQuerySchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().optional(),
  entity: z.nativeEnum(AttributeEntity).optional(),
  active: boolQuery
});

const definitionCreateSchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().min(1),
  entity: z.nativeEnum(AttributeEntity),
  key: z.string().min(1),
  label: z.string().min(1),
  dataType: z.nativeEnum(AttributeDataType),
  options: z.unknown().optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().optional().default(false),
  sortable: z.boolean().optional().default(false),
  filterable: z.boolean().optional().default(true),
  helpText: z.string().optional(),
  active: z.boolean().optional().default(true)
});

const definitionUpdateSchema = definitionCreateSchema.partial().omit({
  companyId: true,
  industryProfileId: true
});

const valueQuerySchema = z.object({
  companyId: z.string().min(1),
  definitionId: z.string().optional(),
  resourceId: z.string().optional()
});

const valueUpsertSchema = z.object({
  companyId: z.string().min(1),
  definitionId: z.string().min(1),
  resourceId: z.string().min(1),
  valueText: z.string().optional(),
  valueNumber: z.coerce.number().optional(),
  valueBoolean: z.boolean().optional(),
  valueDate: z.coerce.date().optional(),
  valueJson: z.unknown().optional()
});

const pricingQuerySchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().optional(),
  active: boolQuery
});

const pricingCreateSchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().min(1),
  name: z.string().min(1),
  ruleType: z.nativeEnum(PricingRuleType),
  targetType: z.string().min(1),
  targetRef: z.string().optional(),
  currency: z.string().optional().default("TRY"),
  formula: z.string().optional(),
  fixedMargin: z.coerce.number().optional(),
  discountRate: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  priority: z.coerce.number().int().optional().default(100),
  active: z.boolean().optional().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  metadata: z.unknown().optional()
});

const pricingUpdateSchema = pricingCreateSchema.partial().omit({
  companyId: true,
  industryProfileId: true
});

const workflowQuerySchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().optional(),
  module: z.string().optional(),
  active: boolQuery
});

const workflowCreateSchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().min(1),
  name: z.string().min(1),
  module: z.string().min(1),
  steps: z.unknown(),
  description: z.string().optional(),
  active: z.boolean().optional().default(true)
});

const workflowUpdateSchema = workflowCreateSchema.partial().omit({
  companyId: true,
  industryProfileId: true
});

const presetQuerySchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().optional(),
  active: boolQuery
});

const presetCreateSchema = z.object({
  companyId: z.string().min(1),
  industryProfileId: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.unknown(),
  active: z.boolean().optional().default(true)
});

const presetUpdateSchema = presetCreateSchema.partial().omit({
  companyId: true,
  industryProfileId: true,
  key: true
});

const INDUSTRY_PROFILE_SEEDS: Array<{ code: IndustryCode; name: string; description: string }> = [
  { code: IndustryCode.GENERIC, name: "Genel Dagitim", description: "Cok sektorlu temel profil" },
  { code: IndustryCode.JEWELRY, name: "Kuyumcu Dagitim", description: "Ayar/gram ve maden odakli dagitim" },
  { code: IndustryCode.APPAREL, name: "Giyim Toptan", description: "Beden/renk varyant odakli profil" },
  { code: IndustryCode.LEATHER, name: "Deri Uretim ve Dagitim", description: "Canta, kemer, cuzdan uretim profili" }
];

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function ensureProfileBelongsToCompany(companyId: string, industryProfileId: string) {
  const profile = await prisma.industryProfile.findFirst({
    where: { id: industryProfileId, companyId },
    select: { id: true }
  });
  return Boolean(profile);
}

export async function registerIndustryRoutes(app: FastifyInstance) {
  app.get("/industry-config", async (request, reply) => {
    const query = configQuerySchema.parse(request.query);

    const profile = await prisma.industryProfile.findFirst({
      where: { id: query.industryProfileId, companyId: query.companyId, active: true }
    });

    if (!profile) {
      reply.status(404).send({ message: "Sektor profili bulunamadi" });
      return;
    }

    const [definitions, pricingRules, workflows, presets] = await Promise.all([
      prisma.attributeDefinition.findMany({
        where: {
          companyId: query.companyId,
          industryProfileId: query.industryProfileId,
          ...(query.entity ? { entity: query.entity } : {}),
          active: true
        },
        orderBy: [{ entity: "asc" }, { label: "asc" }]
      }),
      prisma.pricingRule.findMany({
        where: { companyId: query.companyId, industryProfileId: query.industryProfileId, active: true },
        orderBy: [{ priority: "asc" }, { name: "asc" }]
      }),
      prisma.workflowTemplate.findMany({
        where: { companyId: query.companyId, industryProfileId: query.industryProfileId, active: true },
        orderBy: { name: "asc" }
      }),
      prisma.reportPreset.findMany({
        where: { companyId: query.companyId, industryProfileId: query.industryProfileId, active: true },
        orderBy: { name: "asc" }
      })
    ]);

    reply.send({ profile, definitions, pricingRules, workflows, presets });
  });

  app.get("/industry-profiles", async (request, reply) => {
    const query = profileQuerySchema.parse(request.query);
    const profiles = await prisma.industryProfile.findMany({
      where: {
        companyId: query.companyId,
        ...(typeof query.active === "boolean" ? { active: query.active } : {})
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });
    reply.send(profiles);
  });

  app.post("/industry-profiles", async (request, reply) => {
    const data = profileCreateSchema.parse(request.body);
    const profile = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.industryProfile.updateMany({ where: { companyId: data.companyId }, data: { isDefault: false } });
      }

      return tx.industryProfile.create({
        data: {
          companyId: data.companyId,
          code: data.code,
          name: data.name,
          description: data.description,
          isDefault: data.isDefault,
          settings: data.settings ? asJson(data.settings) : undefined,
          active: data.active
        }
      });
    });

    reply.send(profile);
  });

  app.patch("/industry-profiles/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const data = profileUpdateSchema.parse(request.body);

    const existing = await prisma.industryProfile.findUnique({ where: { id }, select: { id: true, companyId: true } });
    if (!existing) {
      reply.status(404).send({ message: "Sektor profili bulunamadi" });
      return;
    }

    const profile = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.industryProfile.updateMany({
          where: { companyId: existing.companyId, NOT: { id } },
          data: { isDefault: false }
        });
      }

      return tx.industryProfile.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.settings !== undefined ? { settings: asJson(data.settings) } : {}),
          ...(data.active !== undefined ? { active: data.active } : {})
        }
      });
    });

    reply.send(profile);
  });

  app.delete("/industry-profiles/:id", async (request, reply) => {
    const id = (request.params as any).id as string;

    await prisma.$transaction(async (tx) => {
      const definitions = await tx.attributeDefinition.findMany({
        where: { industryProfileId: id },
        select: { id: true }
      });

      if (definitions.length) {
        await tx.attributeValue.deleteMany({
          where: { definitionId: { in: definitions.map((item) => item.id) } }
        });
      }

      await tx.attributeDefinition.deleteMany({ where: { industryProfileId: id } });
      await tx.pricingRule.deleteMany({ where: { industryProfileId: id } });
      await tx.workflowTemplate.deleteMany({ where: { industryProfileId: id } });
      await tx.reportPreset.deleteMany({ where: { industryProfileId: id } });
      await tx.industryProfile.delete({ where: { id } });
    });

    reply.send({ success: true });
  });

  app.post("/industry-profiles/seed", async (request, reply) => {
    const data = seedSchema.parse(request.body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.replace) {
        const existingDefinitions = await tx.attributeDefinition.findMany({
          where: { companyId: data.companyId },
          select: { id: true }
        });
        if (existingDefinitions.length) {
          await tx.attributeValue.deleteMany({
            where: { definitionId: { in: existingDefinitions.map((item) => item.id) } }
          });
        }

        await tx.attributeDefinition.deleteMany({ where: { companyId: data.companyId } });
        await tx.pricingRule.deleteMany({ where: { companyId: data.companyId } });
        await tx.workflowTemplate.deleteMany({ where: { companyId: data.companyId } });
        await tx.reportPreset.deleteMany({ where: { companyId: data.companyId } });
        await tx.industryProfile.deleteMany({ where: { companyId: data.companyId } });
      }

      let created = 0;
      let skipped = 0;
      for (const seed of INDUSTRY_PROFILE_SEEDS) {
        const exists = await tx.industryProfile.findFirst({
          where: { companyId: data.companyId, name: seed.name },
          select: { id: true }
        });

        if (exists) {
          skipped += 1;
          continue;
        }

        await tx.industryProfile.create({
          data: {
            companyId: data.companyId,
            code: seed.code,
            name: seed.name,
            description: seed.description,
            isDefault: created === 0,
            active: true
          }
        });

        created += 1;
      }

      return { created, skipped, total: INDUSTRY_PROFILE_SEEDS.length };
    });

    reply.send(result);
  });

  app.get("/attribute-definitions", async (request, reply) => {
    const query = definitionQuerySchema.parse(request.query);
    const definitions = await prisma.attributeDefinition.findMany({
      where: {
        companyId: query.companyId,
        ...(query.industryProfileId ? { industryProfileId: query.industryProfileId } : {}),
        ...(query.entity ? { entity: query.entity } : {}),
        ...(typeof query.active === "boolean" ? { active: query.active } : {})
      },
      orderBy: [{ entity: "asc" }, { label: "asc" }]
    });
    reply.send(definitions);
  });

  app.post("/attribute-definitions", async (request, reply) => {
    const data = definitionCreateSchema.parse(request.body);
    if (!(await ensureProfileBelongsToCompany(data.companyId, data.industryProfileId))) {
      reply.status(400).send({ message: "Sektor profili firma ile uyusmuyor" });
      return;
    }

    const definition = await prisma.attributeDefinition.create({
      data: {
        companyId: data.companyId,
        industryProfileId: data.industryProfileId,
        entity: data.entity,
        key: data.key,
        label: data.label,
        dataType: data.dataType,
        options: data.options ? asJson(data.options) : undefined,
        defaultValue: data.defaultValue ? asJson(data.defaultValue) : undefined,
        required: data.required,
        sortable: data.sortable,
        filterable: data.filterable,
        helpText: data.helpText,
        active: data.active
      }
    });

    reply.send(definition);
  });

  app.patch("/attribute-definitions/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const data = definitionUpdateSchema.parse(request.body);

    const definition = await prisma.attributeDefinition.update({
      where: { id },
      data: {
        ...(data.entity ? { entity: data.entity } : {}),
        ...(data.key !== undefined ? { key: data.key } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.dataType ? { dataType: data.dataType } : {}),
        ...(data.options !== undefined ? { options: asJson(data.options) } : {}),
        ...(data.defaultValue !== undefined ? { defaultValue: asJson(data.defaultValue) } : {}),
        ...(data.required !== undefined ? { required: data.required } : {}),
        ...(data.sortable !== undefined ? { sortable: data.sortable } : {}),
        ...(data.filterable !== undefined ? { filterable: data.filterable } : {}),
        ...(data.helpText !== undefined ? { helpText: data.helpText } : {}),
        ...(data.active !== undefined ? { active: data.active } : {})
      }
    });

    reply.send(definition);
  });

  app.delete("/attribute-definitions/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    await prisma.$transaction(async (tx) => {
      await tx.attributeValue.deleteMany({ where: { definitionId: id } });
      await tx.attributeDefinition.delete({ where: { id } });
    });
    reply.send({ success: true });
  });

  app.get("/attribute-values", async (request, reply) => {
    const query = valueQuerySchema.parse(request.query);
    const values = await prisma.attributeValue.findMany({
      where: {
        companyId: query.companyId,
        ...(query.definitionId ? { definitionId: query.definitionId } : {}),
        ...(query.resourceId ? { resourceId: query.resourceId } : {})
      },
      include: {
        definition: {
          select: { id: true, key: true, label: true, entity: true, dataType: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    reply.send(values);
  });

  app.post("/attribute-values", async (request, reply) => {
    const data = valueUpsertSchema.parse(request.body);
    const definition = await prisma.attributeDefinition.findFirst({
      where: { id: data.definitionId, companyId: data.companyId },
      select: { id: true }
    });

    if (!definition) {
      reply.status(400).send({ message: "Alan tanimi bulunamadi" });
      return;
    }

    const value = await prisma.attributeValue.upsert({
      where: { definitionId_resourceId: { definitionId: data.definitionId, resourceId: data.resourceId } },
      update: {
        valueText: data.valueText ?? null,
        valueNumber: data.valueNumber ?? null,
        valueBoolean: data.valueBoolean ?? null,
        valueDate: data.valueDate ?? null,
        valueJson: data.valueJson !== undefined ? asJson(data.valueJson) : Prisma.DbNull
      },
      create: {
        companyId: data.companyId,
        definitionId: data.definitionId,
        resourceId: data.resourceId,
        valueText: data.valueText ?? null,
        valueNumber: data.valueNumber ?? null,
        valueBoolean: data.valueBoolean ?? null,
        valueDate: data.valueDate ?? null,
        valueJson: data.valueJson !== undefined ? asJson(data.valueJson) : Prisma.DbNull
      }
    });

    reply.send(value);
  });

  app.delete("/attribute-values/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const value = await prisma.attributeValue.delete({ where: { id } });
    reply.send(value);
  });

  app.get("/pricing-rules", async (request, reply) => {
    const query = pricingQuerySchema.parse(request.query);
    const rules = await prisma.pricingRule.findMany({
      where: {
        companyId: query.companyId,
        ...(query.industryProfileId ? { industryProfileId: query.industryProfileId } : {}),
        ...(typeof query.active === "boolean" ? { active: query.active } : {})
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }]
    });
    reply.send(rules);
  });

  app.post("/pricing-rules", async (request, reply) => {
    const data = pricingCreateSchema.parse(request.body);
    if (!(await ensureProfileBelongsToCompany(data.companyId, data.industryProfileId))) {
      reply.status(400).send({ message: "Sektor profili firma ile uyusmuyor" });
      return;
    }

    const rule = await prisma.pricingRule.create({
      data: {
        companyId: data.companyId,
        industryProfileId: data.industryProfileId,
        name: data.name,
        ruleType: data.ruleType,
        targetType: data.targetType,
        targetRef: data.targetRef,
        currency: data.currency,
        formula: data.formula,
        fixedMargin: data.fixedMargin,
        discountRate: data.discountRate,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        priority: data.priority,
        active: data.active,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        metadata: data.metadata ? asJson(data.metadata) : undefined
      }
    });

    reply.send(rule);
  });

  app.patch("/pricing-rules/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const data = pricingUpdateSchema.parse(request.body);
    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.ruleType ? { ruleType: data.ruleType } : {}),
        ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
        ...(data.targetRef !== undefined ? { targetRef: data.targetRef } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.formula !== undefined ? { formula: data.formula } : {}),
        ...(data.fixedMargin !== undefined ? { fixedMargin: data.fixedMargin } : {}),
        ...(data.discountRate !== undefined ? { discountRate: data.discountRate } : {}),
        ...(data.minPrice !== undefined ? { minPrice: data.minPrice } : {}),
        ...(data.maxPrice !== undefined ? { maxPrice: data.maxPrice } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
        ...(data.metadata !== undefined ? { metadata: asJson(data.metadata) } : {})
      }
    });
    reply.send(rule);
  });

  app.delete("/pricing-rules/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const rule = await prisma.pricingRule.delete({ where: { id } });
    reply.send(rule);
  });

  app.get("/workflow-templates", async (request, reply) => {
    const query = workflowQuerySchema.parse(request.query);
    const templates = await prisma.workflowTemplate.findMany({
      where: {
        companyId: query.companyId,
        ...(query.industryProfileId ? { industryProfileId: query.industryProfileId } : {}),
        ...(query.module ? { module: query.module } : {}),
        ...(typeof query.active === "boolean" ? { active: query.active } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    reply.send(templates);
  });

  app.post("/workflow-templates", async (request, reply) => {
    const data = workflowCreateSchema.parse(request.body);
    if (!(await ensureProfileBelongsToCompany(data.companyId, data.industryProfileId))) {
      reply.status(400).send({ message: "Sektor profili firma ile uyusmuyor" });
      return;
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        companyId: data.companyId,
        industryProfileId: data.industryProfileId,
        name: data.name,
        module: data.module,
        steps: asJson(data.steps),
        description: data.description,
        active: data.active
      }
    });
    reply.send(template);
  });

  app.patch("/workflow-templates/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const data = workflowUpdateSchema.parse(request.body);
    const template = await prisma.workflowTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.module !== undefined ? { module: data.module } : {}),
        ...(data.steps !== undefined ? { steps: asJson(data.steps) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.active !== undefined ? { active: data.active } : {})
      }
    });
    reply.send(template);
  });

  app.delete("/workflow-templates/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const template = await prisma.workflowTemplate.delete({ where: { id } });
    reply.send(template);
  });

  app.get("/report-presets", async (request, reply) => {
    const query = presetQuerySchema.parse(request.query);
    const presets = await prisma.reportPreset.findMany({
      where: {
        companyId: query.companyId,
        ...(query.industryProfileId ? { industryProfileId: query.industryProfileId } : {}),
        ...(typeof query.active === "boolean" ? { active: query.active } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    reply.send(presets);
  });

  app.post("/report-presets", async (request, reply) => {
    const data = presetCreateSchema.parse(request.body);
    if (!(await ensureProfileBelongsToCompany(data.companyId, data.industryProfileId))) {
      reply.status(400).send({ message: "Sektor profili firma ile uyusmuyor" });
      return;
    }

    const preset = await prisma.reportPreset.upsert({
      where: {
        industryProfileId_key: {
          industryProfileId: data.industryProfileId,
          key: data.key
        }
      },
      update: {
        name: data.name,
        description: data.description,
        config: asJson(data.config),
        active: data.active
      },
      create: {
        companyId: data.companyId,
        industryProfileId: data.industryProfileId,
        key: data.key,
        name: data.name,
        description: data.description,
        config: asJson(data.config),
        active: data.active
      }
    });

    reply.send(preset);
  });

  app.patch("/report-presets/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const data = presetUpdateSchema.parse(request.body);
    const preset = await prisma.reportPreset.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.config !== undefined ? { config: asJson(data.config) } : {}),
        ...(data.active !== undefined ? { active: data.active } : {})
      }
    });

    reply.send(preset);
  });

  app.delete("/report-presets/:id", async (request, reply) => {
    const id = (request.params as any).id as string;
    const preset = await prisma.reportPreset.delete({ where: { id } });
    reply.send(preset);
  });
}
