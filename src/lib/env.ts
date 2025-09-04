// Centralized environment variable access with basic validation

type EnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: string | undefined
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined
  SUPABASE_SERVICE_ROLE_KEY: string | undefined
  NEXT_PUBLIC_APP_URL: string | undefined
}

const rawEnv: EnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function requireEnv(name: keyof EnvShape): string {
  const value = rawEnv[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Export normalized constants
export const PUBLIC_SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const PUBLIC_SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Optional on some routes; do not throw on missing
export const SUPABASE_SERVICE_ROLE_KEY = rawEnv.SUPABASE_SERVICE_ROLE_KEY

export const PUBLIC_APP_URL = rawEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Helper for places that want all at once
export const env = {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  PUBLIC_APP_URL,
}


