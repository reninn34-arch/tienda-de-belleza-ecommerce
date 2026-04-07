import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres").optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Variables de entorno inválidas: ${details}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production" && !env.JWT_SECRET) {
    throw new Error("JWT_SECRET es obligatorio en producción");
  }

  return env;
}
