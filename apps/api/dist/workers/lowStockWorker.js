import prisma from "../lib/prisma.js";
const threshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 10);
const intervalMs = Number(process.env.LOW_STOCK_INTERVAL_MS ?? 3600000);
async function tick() {
    const moves = await prisma.stockMovement.groupBy({
        by: ["companyId", "productId"],
        _sum: { quantity: true }
    });
    for (const move of moves) {
        const balance = Number(move._sum.quantity ?? 0);
        if (balance <= threshold) {
            await prisma.integrationLog.create({
                data: {
                    companyId: move.companyId,
                    platform: "OTHER",
                    status: "LOW_STOCK",
                    payload: {
                        productId: move.productId,
                        balance,
                        threshold
                    }
                }
            });
        }
    }
}
async function start() {
    await tick();
    setInterval(tick, intervalMs);
}
start().catch((error) => {
    console.error(error);
    process.exit(1);
});
