# CloudEZ Production Checklist

- Environment variables set in your platform
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (server routes only)
  - NEXT_PUBLIC_APP_URL

- Supabase
  - Storage bucket `documents` created (private)
  - RLS enabled for `profiles`, `documents`, `file_shares`, `user_sessions`
  - Policies applied per DATABASE_SETUP.md
  - Rate limit function `rate_limit_allow` created (see database_schema_rate_limiting.sql)

- App configuration
  - PWA assets present and manifest matches available icons
  - Service worker does not cache API POST endpoints
  - Middleware excludes PWA/static assets

- Security
  - CSP/headers in vercel.json reviewed (remove 'unsafe-eval' if not needed)
  - Only required domains in connect-src (Supabase ws/http)

- Quality
  - Build passes: npm run build
  - Lint passes: npm run lint
  - Basic manual tests: sign up/in, upload, share, download (public/shared)


