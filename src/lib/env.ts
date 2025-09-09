// Centralized environment variable access with strict runtime validation
// - Validates required public vars
// - Parses server-only secrets (do not import in client components when using secrets)

import { z } from 'zod'

// Public variables (safe to expose to the browser). These must exist for the app to run.
const PublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g., https://xyzcompany.supabase.co)'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
})

// Server-only variables (never expose to client). Optional unless a path explicitly requires them.
const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

function parsePublicEnv() {
  const parsed = PublicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  })
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `- ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid public environment configuration.\n${issues}`)
  }
  return parsed.data
}

function parseServerEnv() {
  const parsed = ServerSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `- ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid server environment configuration.\n${issues}`)
  }
  return parsed.data
}

// Parse once at module load; Next.js only exposes NEXT_PUBLIC_* to the client bundle
const PUBLIC = parsePublicEnv()
const SERVER = parseServerEnv()

export const PUBLIC_SUPABASE_URL = PUBLIC.NEXT_PUBLIC_SUPABASE_URL
export const PUBLIC_SUPABASE_ANON_KEY = PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const PUBLIC_APP_URL = PUBLIC.NEXT_PUBLIC_APP_URL

// Optional secret for server-side use only
export const SUPABASE_SERVICE_ROLE_KEY = SERVER.SUPABASE_SERVICE_ROLE_KEY

export const env = {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY,
}
