import { z } from "zod";
import prisma from "../lib/prisma.js";
import { ensureDealerMembershipTables, upsertDealerAuthCredential, upsertUserAuthCredential } from "../lib/dealerMembership.js";
const createSchema = z.object({
    companyId: z.string().min(1),
    dealerId: z.string().optional(),
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING", "DEALER"]).optional(),
    password: z.string().min(6).max(128).optional()
});
const updateSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING", "DEALER"]).optional(),
    active: z.boolean().optional(),
    password: z.string().min(6).max(128).optional()
});
function generateKey() {
    return `key_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
export async function registerUserRoutes(app) {
    app.post("/users", async (request, reply) => {
        const data = createSchema.parse(request.body);
        const role = data.role ?? "DEALER";
        if (!data.password) {
            reply.status(400).send({ message: "Kullanici olustururken sifre zorunludur." });
            return;
        }
        if (role === "DEALER" && !data.dealerId) {
            reply.status(400).send({ message: "Bayi rolunde dealerId zorunlu." });
            return;
        }
        const user = await prisma.user.create({
            data: {
                companyId: data.companyId,
                dealerId: data.dealerId,
                name: data.name,
                email: data.email.toLowerCase(),
                role,
                apiKey: generateKey()
            }
        });
        await ensureDealerMembershipTables();
        if (role === "DEALER") {
            await upsertDealerAuthCredential(prisma, user.id, data.password);
        }
        else {
            await upsertUserAuthCredential(prisma, user.id, data.password);
        }
        reply.send(user);
    });
    app.get("/users", async (request, reply) => {
        const companyId = request.query.companyId;
        const users = await prisma.user.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { createdAt: "desc" }
        });
        reply.send(users);
    });
    app.patch("/users/:id", async (request, reply) => {
        const data = updateSchema.parse(request.body);
        const { password, ...userData } = data;
        const user = await prisma.user.update({
            where: { id: request.params.id },
            data: userData
        });
        if (password) {
            await ensureDealerMembershipTables();
            const effectiveRole = (data.role ?? user.role);
            if (effectiveRole === "DEALER") {
                await upsertDealerAuthCredential(prisma, user.id, password);
            }
            else {
                await upsertUserAuthCredential(prisma, user.id, password);
            }
        }
        reply.send(user);
    });
}
