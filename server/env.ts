import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Школьный ассистент"),
  OPENAI_API_KEY: z.string().optional(),
  OBJECT_STORAGE_DRIVER: z.string().default("s3"),
  OBJECT_STORAGE_BUCKET: z.string().optional()
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OBJECT_STORAGE_DRIVER: process.env.OBJECT_STORAGE_DRIVER,
  OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET
});
