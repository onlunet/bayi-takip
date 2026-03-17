import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });
const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    ADMIN_API_KEY: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});
export function loadConfig() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join(", ");
        throw new Error(`Invalid environment: ${message}`);
    }
    return parsed.data;
}
