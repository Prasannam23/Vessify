import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url("Invalid DATABASE_URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  BETTER_AUTH_URL: z.string().url("Invalid BETTER_AUTH_URL"),
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  FRONTEND_URL: z.string().url("Invalid FRONTEND_URL"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config_instance: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!config_instance) {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error("Environment validation failed:");
      result.error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    
    config_instance = result.data;
  }
  
  return config_instance;
}

export const env = getConfig();
