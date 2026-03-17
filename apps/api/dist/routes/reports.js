import prisma from "../lib/prisma";
function buildCreatedAtRange(from, to) {
    if (!from && !to)
        return undefined;
    const range = {};
    if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        range.gte = start;
    }
    if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
    }
    return range;
}
function startOfDayDaysAgo(days) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - days);
    return date;
}
function clampInteger(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
}
function clampNumber(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(max, Math.max(min, parsed));
}
function round2(value) {
    return Number(value.toFixed(2));
}
function decimalToNumber(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}
function getUrgency(coverageDays, dailyAverage, safetyDays, targetCoverageDays) {
    if (dailyAverage <= 0)
        return "NO_DEMAND";
    if (coverageDays === null)
        return "PLAN";
    if (coverageDays < Math.max(2, safetyDays * 0.5))
        return "CRITICAL";
    if (coverageDays < safetyDays)
        return "WARNING";
    if (coverageDays < targetCoverageDays)
        return "PLAN";
    return "OK";
}
function guessUnitFromPayload(payload) {
    const text = `${payload?.name ?? ""} ${payload?.parent_name ?? ""} ${JSON.stringify(payload?.meta_data ?? [])}`.toLowerCase();
    if (text.includes("kg"))
        return "KG";
    if (text.includes("lt"))
        return "LT";
    return "PIECE";
}
function parseUnmappedLine(log) {
    const payload = (log.payload ?? {});
    const externalProductId = payload.product_id ? String(payload.product_id) : "-";
    const externalVariantId = payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
    const orderId = String(log.externalId ?? "-");
    const lineIdentity = String(payload.id ?? `${externalProductId}:${externalVariantId}:${payload.name ?? "-"}`);
    const lineKey = `${orderId}:${lineIdentity}`;
    const quantity = Number(payload.quantity ?? 0);
    const priceOrTotal = Number(payload.total ?? payload.price ?? 0);
    const total = Number.isFinite(priceOrTotal) ? priceOrTotal : 0;
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    return {
        lineKey,
        orderId,
        externalProductId,
        externalVariantId,
        name: payload.parent_name ?? payload.name ?? `Harici Urun ${externalProductId}`,
        unit: guessUnitFromPayload(payload),
        quantity: safeQuantity,
        total,
        createdAt: new Date(log.createdAt)
    };
}
export async function registerReportRoutes(app) {
    app.get("/reports/stock-summary", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const products = await prisma.product.findMany({
            where: { companyId, active: true },
            include: { variants: true },
            orderBy: { name: "asc" }
        });
        const moves = await prisma.stockMovement.groupBy({
            by: ["productId", "variantId", "type"],
            where: { companyId },
            _sum: { quantity: true }
        });
        const totals = new Map();
        for (const move of moves) {
            const key = `${move.productId}:${move.variantId ?? ""}`;
            const entry = totals.get(key) ?? {};
            entry[move.type] = (entry[move.type] ?? 0) + Number(move._sum.quantity ?? 0);
            totals.set(key, entry);
        }
        const rows = products.flatMap((product) => {
            const baseKey = `${product.id}:`;
            const baseTotals = totals.get(baseKey) ?? {};
            const baseSum = Object.values(baseTotals).reduce((sum, value) => Number(sum) + Number(value), 0);
            const productRow = {
                productId: product.id,
                variantId: null,
                name: product.name,
                unit: product.unit,
                totals: baseTotals,
                balance: baseSum
            };
            const variantRows = product.variants.map((variant) => {
                const key = `${product.id}:${variant.id}`;
                const variantTotals = totals.get(key) ?? {};
                const variantSum = Object.values(variantTotals).reduce((sum, value) => Number(sum) + Number(value), 0);
                return {
                    productId: product.id,
                    variantId: variant.id,
                    name: `${product.name} - ${variant.name}`,
                    unit: variant.unit,
                    totals: variantTotals,
                    balance: variantSum
                };
            });
            return [productRow, ...variantRows];
        });
        reply.send(rows);
    });
    app.get("/reports/warehouse-stock", async (request, reply) => {
        const companyId = request.query.companyId;
        const warehouseId = request.query.warehouseId;
        if (!companyId || !warehouseId) {
            reply.status(400).send({ message: "companyId and warehouseId required" });
            return;
        }
        const location = await prisma.location.findFirst({
            where: { companyId, type: "WAREHOUSE", referenceId: warehouseId }
        });
        if (!location) {
            reply.send([]);
            return;
        }
        const products = await prisma.product.findMany({
            where: { companyId, active: true },
            orderBy: { name: "asc" }
        });
        const moves = await prisma.stockMovement.groupBy({
            by: ["productId"],
            where: { companyId, locationId: location.id },
            _sum: { quantity: true }
        });
        const map = new Map();
        moves.forEach((move) => map.set(move.productId, Number(move._sum.quantity ?? 0)));
        const rows = products.map((product) => ({
            productId: product.id,
            name: product.name,
            unit: product.unit,
            balance: map.get(product.id) ?? 0
        }));
        reply.send(rows);
    });
    app.get("/reports/sales-summary", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const from = request.query.from;
        const to = request.query.to;
        const createdAt = buildCreatedAtRange(from, to);
        const where = {
            companyId,
            ...(createdAt ? { createdAt } : {})
        };
        const orders = await prisma.order.groupBy({
            by: ["channel"],
            where,
            _sum: { totalPrice: true },
            _count: { _all: true }
        });
        reply.send(orders.map((row) => ({
            channel: row.channel,
            totalOrders: row._count._all,
            totalPrice: Number(row._sum.totalPrice ?? 0)
        })));
    });
    app.get("/reports/woo-product-sales", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const from = request.query.from;
        const to = request.query.to;
        const createdAt = buildCreatedAtRange(from, to);
        const orderWhere = {
            companyId,
            channel: "WOO",
            ...(createdAt ? { createdAt } : {})
        };
        const mappedItems = await prisma.orderItem.findMany({
            where: { order: orderWhere, product: { is: { active: true } } },
            include: {
                product: true,
                variant: true,
                order: { select: { id: true } }
            }
        });
        const mappedGrouped = new Map();
        for (const item of mappedItems) {
            const key = `${item.productId}:${item.variantId ?? ""}`;
            const existing = mappedGrouped.get(key) ?? {
                name: item.variant ? `${item.product.name} / ${item.variant.name}` : item.product.name,
                unit: item.variant?.unit ?? item.product.unit,
                totalQuantity: 0,
                totalAmount: 0,
                orderIds: new Set(),
                source: "MAPPED"
            };
            existing.totalQuantity += Number(item.quantity ?? 0);
            existing.totalAmount += Number(item.total ?? 0);
            existing.orderIds.add(item.order.id);
            mappedGrouped.set(key, existing);
        }
        const logWhere = {
            companyId,
            platform: "WOO",
            status: "UNMAPPED",
            ...(createdAt ? { createdAt } : {})
        };
        const unmappedLogs = await prisma.integrationLog.findMany({
            where: logWhere,
            orderBy: { createdAt: "desc" }
        });
        const uniqueLines = new Map();
        for (const log of unmappedLogs) {
            const payload = (log.payload ?? {});
            const lineKey = `${log.externalId ?? "-"}:${payload.id ?? payload.product_id ?? payload.name ?? "-"}:${payload.variation_id ?? ""}`;
            if (!uniqueLines.has(lineKey)) {
                uniqueLines.set(lineKey, payload);
            }
        }
        const unmappedGrouped = new Map();
        for (const payload of uniqueLines.values()) {
            const productId = payload.product_id ? String(payload.product_id) : "-";
            const variationId = payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
            const key = `${productId}:${variationId}`;
            const name = payload.name ?? payload.parent_name ?? `Harici Urun ${productId}`;
            const unitGuessText = `${payload.name ?? ""} ${payload.parent_name ?? ""} ${JSON.stringify(payload.meta_data ?? [])}`.toLowerCase();
            const unit = unitGuessText.includes("kg") ? "KG" : unitGuessText.includes("lt") ? "LT" : "PIECE";
            const qty = Number(payload.quantity ?? 0);
            const total = Number(payload.total ?? payload.price ?? 0);
            const existing = unmappedGrouped.get(key) ?? {
                name,
                unit,
                totalQuantity: 0,
                totalAmount: 0,
                totalOrders: 0,
                source: "UNMAPPED"
            };
            existing.totalQuantity += Number.isFinite(qty) ? qty : 0;
            existing.totalAmount += Number.isFinite(total) ? total : 0;
            existing.totalOrders += 1;
            unmappedGrouped.set(key, existing);
        }
        const mappedRows = Array.from(mappedGrouped.values()).map((row) => ({
            name: row.name,
            unit: row.unit,
            totalQuantity: row.totalQuantity,
            totalAmount: row.totalAmount,
            totalOrders: row.orderIds.size,
            source: row.source
        }));
        const unmappedRows = Array.from(unmappedGrouped.values());
        const rows = [...mappedRows, ...unmappedRows].sort((a, b) => b.totalQuantity - a.totalQuantity);
        reply.send(rows);
    });
    app.get("/reports/product-summary", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const from = request.query.from;
        const to = request.query.to;
        const orderCreatedAt = buildCreatedAtRange(from, to);
        const dispatchDate = buildCreatedAtRange(from, to);
        const [products, balanceRows, stockEntryRows, salesItems, dispatchItems] = await Promise.all([
            prisma.product.findMany({
                where: { companyId, active: true },
                select: { id: true, name: true, unit: true },
                orderBy: { name: "asc" }
            }),
            prisma.stockMovement.groupBy({
                by: ["productId"],
                where: { companyId },
                _sum: { quantity: true }
            }),
            prisma.stockMovement.groupBy({
                by: ["productId", "type"],
                where: {
                    companyId,
                    type: { in: ["PRODUCTION", "RETURN", "ADJUSTMENT"] }
                },
                _sum: { quantity: true }
            }),
            prisma.orderItem.findMany({
                where: {
                    order: {
                        companyId,
                        ...(orderCreatedAt ? { createdAt: orderCreatedAt } : {})
                    }
                },
                include: {
                    order: { select: { channel: true } },
                    variant: { select: { multiplier: true } }
                }
            }),
            prisma.dispatchItem.findMany({
                where: {
                    dispatch: {
                        companyId,
                        status: "APPROVED",
                        ...(dispatchDate ? { date: dispatchDate } : {})
                    }
                },
                include: {
                    variant: { select: { multiplier: true } }
                }
            })
        ]);
        const balanceByProduct = new Map();
        for (const row of balanceRows) {
            balanceByProduct.set(row.productId, decimalToNumber(row._sum.quantity));
        }
        const stockEntryByProduct = new Map();
        for (const row of stockEntryRows) {
            const current = stockEntryByProduct.get(row.productId) ?? 0;
            const quantity = decimalToNumber(row._sum.quantity);
            stockEntryByProduct.set(row.productId, current + Math.max(0, quantity));
        }
        const totalSalesByProduct = new Map();
        const apiSalesByProduct = new Map();
        for (const item of salesItems) {
            const multiplier = decimalToNumber(item.variant?.multiplier ?? 1);
            const quantity = decimalToNumber(item.quantity) * multiplier;
            if (!Number.isFinite(quantity) || quantity <= 0)
                continue;
            const totalCurrent = totalSalesByProduct.get(item.productId) ?? 0;
            totalSalesByProduct.set(item.productId, totalCurrent + quantity);
            if (item.order.channel !== "MANUAL") {
                const apiCurrent = apiSalesByProduct.get(item.productId) ?? 0;
                apiSalesByProduct.set(item.productId, apiCurrent + quantity);
            }
        }
        const dispatchByProduct = new Map();
        for (const item of dispatchItems) {
            const multiplier = decimalToNumber(item.variant?.multiplier ?? 1);
            const quantity = decimalToNumber(item.quantity) * multiplier;
            if (!Number.isFinite(quantity) || quantity <= 0)
                continue;
            const current = dispatchByProduct.get(item.productId) ?? 0;
            dispatchByProduct.set(item.productId, current + quantity);
        }
        const rows = products.map((product) => ({
            productId: product.id,
            name: product.name,
            unit: product.unit,
            totalStockEntry: round2(stockEntryByProduct.get(product.id) ?? 0),
            totalSales: round2(totalSalesByProduct.get(product.id) ?? 0),
            apiSales: round2(apiSalesByProduct.get(product.id) ?? 0),
            dispatch: round2(dispatchByProduct.get(product.id) ?? 0),
            balance: round2(balanceByProduct.get(product.id) ?? 0)
        }));
        reply.send(rows);
    });
    app.get("/reports/unmapped-product-summary", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const from = request.query.from;
        const to = request.query.to;
        const createdAt = buildCreatedAtRange(from, to);
        const logs = await prisma.integrationLog.findMany({
            where: {
                companyId,
                platform: "WOO",
                status: "UNMAPPED",
                ...(createdAt ? { createdAt } : {})
            },
            orderBy: { createdAt: "desc" }
        });
        const uniqueLines = new Map();
        for (const log of logs) {
            const parsed = parseUnmappedLine(log);
            if (!uniqueLines.has(parsed.lineKey)) {
                uniqueLines.set(parsed.lineKey, parsed);
            }
        }
        const grouped = new Map();
        for (const line of uniqueLines.values()) {
            const key = line.externalProductId;
            const existing = grouped.get(key) ?? {
                externalProductId: line.externalProductId,
                name: line.name,
                unit: line.unit,
                totalQuantity: 0,
                totalAmount: 0,
                orderIds: new Set(),
                variationIds: new Set(),
                firstSeenAt: null,
                lastSeenAt: null
            };
            existing.totalQuantity += line.quantity;
            existing.totalAmount += line.total;
            existing.orderIds.add(line.orderId);
            if (line.externalVariantId) {
                existing.variationIds.add(line.externalVariantId);
            }
            if (!existing.firstSeenAt || line.createdAt < existing.firstSeenAt) {
                existing.firstSeenAt = line.createdAt;
            }
            if (!existing.lastSeenAt || line.createdAt > existing.lastSeenAt) {
                existing.lastSeenAt = line.createdAt;
            }
            grouped.set(key, existing);
        }
        const totalQuantity = Array.from(grouped.values()).reduce((sum, row) => sum + row.totalQuantity, 0);
        const totalAmount = Array.from(grouped.values()).reduce((sum, row) => sum + row.totalAmount, 0);
        const rows = Array.from(grouped.values())
            .map((row) => {
            const sharePercent = totalQuantity > 0 ? (row.totalQuantity / totalQuantity) * 100 : 0;
            let productionOpportunity = "Dusuk";
            if (sharePercent >= 15 || row.totalQuantity >= 100) {
                productionOpportunity = "Uretime Deger";
            }
            else if (sharePercent >= 5 || row.totalQuantity >= 30) {
                productionOpportunity = "Takip Et";
            }
            return {
                externalProductId: row.externalProductId,
                name: row.name,
                unit: row.unit,
                totalQuantity: round2(row.totalQuantity),
                totalAmount: round2(row.totalAmount),
                totalOrders: row.orderIds.size,
                variationCount: row.variationIds.size,
                sharePercent: round2(sharePercent),
                productionOpportunity,
                firstSeenAt: row.firstSeenAt?.toISOString() ?? null,
                lastSeenAt: row.lastSeenAt?.toISOString() ?? null
            };
        })
            .sort((a, b) => b.totalQuantity - a.totalQuantity);
        reply.send({
            summary: {
                totalUniqueLines: uniqueLines.size,
                totalProducts: rows.length,
                totalQuantity: round2(totalQuantity),
                totalAmount: round2(totalAmount),
                productionCandidateCount: rows.filter((row) => row.productionOpportunity === "Uretime Deger").length
            },
            rows
        });
    });
    app.get("/reports/production-plan", async (request, reply) => {
        const query = request.query;
        const companyId = query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const lookbackDays = clampInteger(query.lookbackDays, 30, 7, 180);
        const targetCoverageDays = clampInteger(query.targetCoverageDays, 30, 7, 90);
        const safetyDays = clampInteger(query.safetyDays, 14, 3, 60);
        const minBatchQuantity = clampNumber(query.minBatchQuantity, 0, 0, 1000000);
        const lookbackStart = startOfDayDaysAgo(lookbackDays);
        const sevenStart = startOfDayDaysAgo(7);
        const fourteenStart = startOfDayDaysAgo(14);
        const thirtyStart = startOfDayDaysAgo(30);
        const products = await prisma.product.findMany({
            where: { companyId, active: true },
            select: { id: true, name: true, unit: true },
            orderBy: { name: "asc" }
        });
        const warehouseLocations = await prisma.location.findMany({
            where: { companyId, type: "WAREHOUSE" },
            select: { id: true }
        });
        const warehouseLocationIds = warehouseLocations.map((item) => item.id);
        const [orderItems, networkBalancesRaw, warehouseBalancesRaw, warehouseMovesRaw] = await Promise.all([
            prisma.orderItem.findMany({
                where: {
                    order: {
                        companyId,
                        status: { not: "CANCELLED" },
                        createdAt: { gte: lookbackStart }
                    },
                    product: { active: true }
                },
                include: {
                    order: { select: { createdAt: true, channel: true } },
                    variant: { select: { multiplier: true } }
                }
            }),
            prisma.stockMovement.groupBy({
                by: ["productId"],
                where: { companyId },
                _sum: { quantity: true }
            }),
            warehouseLocationIds.length
                ? prisma.stockMovement.groupBy({
                    by: ["productId"],
                    where: { companyId, locationId: { in: warehouseLocationIds } },
                    _sum: { quantity: true }
                })
                : Promise.resolve([]),
            warehouseLocationIds.length
                ? prisma.stockMovement.groupBy({
                    by: ["productId", "type"],
                    where: {
                        companyId,
                        locationId: { in: warehouseLocationIds },
                        createdAt: { gte: lookbackStart }
                    },
                    _sum: { quantity: true }
                })
                : Promise.resolve([])
        ]);
        const networkBalanceMap = new Map();
        networkBalancesRaw.forEach((item) => {
            networkBalanceMap.set(item.productId, Number(item._sum.quantity ?? 0));
        });
        const warehouseBalanceMap = new Map();
        warehouseBalancesRaw.forEach((item) => {
            warehouseBalanceMap.set(item.productId, Number(item._sum.quantity ?? 0));
        });
        const movementStatsMap = new Map();
        warehouseMovesRaw.forEach((item) => {
            const key = item.productId;
            const current = movementStatsMap.get(key) ?? {
                production: 0,
                dispatch: 0,
                returns: 0,
                adjustment: 0
            };
            const qty = Number(item._sum.quantity ?? 0);
            if (item.type === "PRODUCTION")
                current.production += qty;
            if (item.type === "DISPATCH")
                current.dispatch += Math.abs(qty);
            if (item.type === "RETURN")
                current.returns += qty;
            if (item.type === "ADJUSTMENT")
                current.adjustment += qty;
            movementStatsMap.set(key, current);
        });
        const salesMap = new Map();
        for (const item of orderItems) {
            const key = item.productId;
            const current = salesMap.get(key) ?? {
                lookback: 0,
                seven: 0,
                prevSeven: 0,
                thirty: 0,
                woo: 0,
                manual: 0,
                other: 0
            };
            const multiplier = Number(item.variant?.multiplier ?? 1);
            const quantity = Number(item.quantity ?? 0) * multiplier;
            const createdAt = new Date(item.order.createdAt);
            current.lookback += quantity;
            if (createdAt >= sevenStart)
                current.seven += quantity;
            if (createdAt >= fourteenStart && createdAt < sevenStart)
                current.prevSeven += quantity;
            if (createdAt >= thirtyStart)
                current.thirty += quantity;
            if (item.order.channel === "WOO")
                current.woo += quantity;
            else if (item.order.channel === "MANUAL")
                current.manual += quantity;
            else
                current.other += quantity;
            salesMap.set(key, current);
        }
        const rows = products
            .map((product) => {
            const sales = salesMap.get(product.id) ?? {
                lookback: 0,
                seven: 0,
                prevSeven: 0,
                thirty: 0,
                woo: 0,
                manual: 0,
                other: 0
            };
            const movementStats = movementStatsMap.get(product.id) ?? {
                production: 0,
                dispatch: 0,
                returns: 0,
                adjustment: 0
            };
            const warehouseStock = Number(warehouseBalanceMap.get(product.id) ?? 0);
            const networkStock = Number(networkBalanceMap.get(product.id) ?? 0);
            const dailyAverage = sales.lookback / lookbackDays;
            const coverageDays = dailyAverage > 0 ? warehouseStock / dailyAverage : null;
            const safetyStockQuantity = dailyAverage * safetyDays;
            const targetStockQuantity = dailyAverage * targetCoverageDays;
            let recommendedQuantity = Math.max(0, targetStockQuantity - warehouseStock);
            if (recommendedQuantity > 0 && minBatchQuantity > 0 && recommendedQuantity < minBatchQuantity) {
                recommendedQuantity = minBatchQuantity;
            }
            const trendPercent = sales.prevSeven > 0
                ? ((sales.seven - sales.prevSeven) / sales.prevSeven) * 100
                : sales.seven > 0
                    ? 100
                    : 0;
            const urgency = getUrgency(coverageDays, dailyAverage, safetyDays, targetCoverageDays);
            return {
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                warehouseStock: round2(warehouseStock),
                networkStock: round2(networkStock),
                lookbackSales: round2(sales.lookback),
                salesLast7: round2(sales.seven),
                salesLast30: round2(sales.thirty),
                salesByChannel: {
                    woo: round2(sales.woo),
                    manual: round2(sales.manual),
                    other: round2(sales.other)
                },
                dailyAverage: round2(dailyAverage),
                coverageDays: coverageDays === null ? null : round2(coverageDays),
                safetyStockQuantity: round2(safetyStockQuantity),
                targetStockQuantity: round2(targetStockQuantity),
                recommendedQuantity: round2(recommendedQuantity),
                trendPercent: round2(trendPercent),
                movementLastLookback: {
                    production: round2(movementStats.production),
                    dispatch: round2(movementStats.dispatch),
                    returns: round2(movementStats.returns),
                    adjustment: round2(movementStats.adjustment)
                },
                urgency
            };
        })
            .sort((a, b) => {
            const priority = {
                CRITICAL: 0,
                WARNING: 1,
                PLAN: 2,
                OK: 3,
                NO_DEMAND: 4
            };
            const urgencyDiff = (priority[a.urgency] ?? 9) - (priority[b.urgency] ?? 9);
            if (urgencyDiff !== 0)
                return urgencyDiff;
            if (b.recommendedQuantity !== a.recommendedQuantity) {
                return b.recommendedQuantity - a.recommendedQuantity;
            }
            return b.dailyAverage - a.dailyAverage;
        });
        const summary = rows.reduce((acc, row) => {
            acc.totalProducts += 1;
            acc.totalRecommendedQuantity += row.recommendedQuantity;
            if (row.urgency === "CRITICAL")
                acc.critical += 1;
            if (row.urgency === "WARNING")
                acc.warning += 1;
            if (row.urgency === "PLAN")
                acc.plan += 1;
            if (row.urgency === "OK")
                acc.ok += 1;
            if (row.urgency === "NO_DEMAND")
                acc.noDemand += 1;
            return acc;
        }, {
            totalProducts: 0,
            totalRecommendedQuantity: 0,
            critical: 0,
            warning: 0,
            plan: 0,
            ok: 0,
            noDemand: 0
        });
        reply.send({
            generatedAt: new Date().toISOString(),
            params: {
                lookbackDays,
                targetCoverageDays,
                safetyDays,
                minBatchQuantity
            },
            summary: {
                ...summary,
                totalRecommendedQuantity: round2(summary.totalRecommendedQuantity)
            },
            rows
        });
    });
}
