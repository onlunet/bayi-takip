import prisma from "../lib/prisma.js";
const QUICK_ACTIONS_BY_ROLE = {
    OWNER: [
        { key: "new_dispatch", label: "Yeni Sevkiyat", target: "dispatch", hint: "Bayiye mal cıkışı yapın." },
        { key: "new_payment", label: "Tahsilat Gir", target: "ledger", hint: "Cari borç/alacak güncelleyin." },
        { key: "sync_woo", label: "Sipariş Çek", target: "woo", hint: "WooCommerce siparişlerini senkronlayın." },
        { key: "map_unmatched", label: "Eşleşmeyen Ürün", target: "unmapped", hint: "Satış kaçırmamak için eşleyin." },
        { key: "check_reports", label: "Raporları Kontrol Et", target: "reports", hint: "API satış + sevk toplamını doğrulayın." }
    ],
    ADMIN: [
        { key: "new_dispatch", label: "Yeni Sevkiyat", target: "dispatch", hint: "Bayiye mal cıkışı yapın." },
        { key: "new_payment", label: "Tahsilat Gir", target: "ledger", hint: "Cari borç/alacak güncelleyin." },
        { key: "sync_woo", label: "Sipariş Çek", target: "woo", hint: "WooCommerce siparişlerini senkronlayın." },
        { key: "map_unmatched", label: "Eşleşmeyen Ürün", target: "unmapped", hint: "Satış kaçırmamak için eşleyin." },
        { key: "check_reports", label: "Raporları Kontrol Et", target: "reports", hint: "API satış + sevk toplamını doğrulayın." }
    ],
    WAREHOUSE: [
        { key: "new_dispatch", label: "Yeni Sevkiyat", target: "dispatch", hint: "Sevkiyat ve stok etkisini yönet." },
        { key: "stock_adjust", label: "Stok Düzelt", target: "stock", hint: "Hatalı stok girişlerini düzelt." },
        { key: "production", label: "Üretim Planı", target: "production", hint: "Kritik ürünleri planla." },
        { key: "reports", label: "Stok Raporu", target: "reports", hint: "Depo ve bayi dengesi kontrolü." },
        { key: "warehouse_logs", label: "Hareket Geçmişi", target: "stock", hint: "Son hareketleri doğrulayın." }
    ],
    ACCOUNTING: [
        { key: "new_payment", label: "Tahsilat Gir", target: "ledger", hint: "Cari kapama işlemini hızlandır." },
        { key: "risk_summary", label: "Risk Özeti", target: "dealers", hint: "Vade/limit aşımı olan bayileri gör." },
        { key: "dispatch_approve", label: "Sevkiyat Kontrol", target: "dispatch", hint: "Borç etkisini onay öncesi incele." },
        { key: "finance_reports", label: "Cari Raporu", target: "reports", hint: "Bakiye mutabakatı yap." },
        { key: "integrations", label: "Sync Hataları", target: "integrations", hint: "Entegrasyon hatalarını takip et." }
    ]
};
export async function registerDashboardRoutes(app) {
    app.get("/dashboard/onboarding", async (request, reply) => {
        const companyId = request.query.companyId;
        if (!companyId) {
            reply.status(400).send({ message: "companyId required" });
            return;
        }
        const authRole = String(request.authUser?.role ?? "OWNER").toUpperCase();
        const [company, dealerCount, productCount, priceListCount, integrationCount, orderCount, unmappedCount] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } }),
            prisma.dealer.count({ where: { companyId } }),
            prisma.product.count({ where: { companyId, active: true } }),
            prisma.priceList.count({ where: { companyId } }),
            prisma.dealerIntegration.count({ where: { companyId, active: true } }),
            prisma.order.count({ where: { companyId } }),
            prisma.integrationLog.count({
                where: {
                    companyId,
                    status: "UNMAPPED"
                }
            })
        ]);
        if (!company) {
            reply.status(404).send({ message: "Firma bulunamadi" });
            return;
        }
        const steps = [
            {
                key: "company",
                title: "Firma bilgisi",
                done: true,
                count: 1,
                target: "overview"
            },
            {
                key: "dealers",
                title: "Bayi/Firma tanımı",
                done: dealerCount > 0,
                count: dealerCount,
                target: "dealers"
            },
            {
                key: "products",
                title: "Ürün ve varyasyon",
                done: productCount > 0,
                count: productCount,
                target: "products"
            },
            {
                key: "pricing",
                title: "Fiyat listesi",
                done: priceListCount > 0,
                count: priceListCount,
                target: "prices"
            },
            {
                key: "integration",
                title: "Woo/API bağlantısı",
                done: integrationCount > 0,
                count: integrationCount,
                target: "woo"
            },
            {
                key: "first_sync",
                title: "İlk sipariş senkronu",
                done: orderCount > 0,
                count: orderCount,
                target: "orders"
            },
            {
                key: "mapping",
                title: "Eşleşmeyen ürünleri temizle",
                done: unmappedCount === 0,
                count: unmappedCount,
                target: "unmapped"
            }
        ];
        const completed = steps.filter((step) => step.done).length;
        const completionPercent = Math.round((completed / steps.length) * 100);
        const quickActions = QUICK_ACTIONS_BY_ROLE[authRole] ?? QUICK_ACTIONS_BY_ROLE.OWNER;
        reply.send({
            company: {
                id: company.id,
                name: company.name
            },
            role: authRole,
            completionPercent,
            completedSteps: completed,
            totalSteps: steps.length,
            steps,
            quickActions
        });
    });
}
