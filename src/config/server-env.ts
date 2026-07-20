import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  OPENAI_API_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  OPENAI_MODEL: z.preprocess(emptyStringToUndefined, z.string().optional()),
  SPOTIFY_CLIENT_ID: z.preprocess(emptyStringToUndefined, z.string().optional()),
  SPOTIFY_CLIENT_SECRET: z.preprocess(emptyStringToUndefined, z.string().optional()),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
});
