### CloudEZ pre-deployment changes (authoritative)

This document lists all changes needed to make the codebase clean, professional, and production‑ready. Items are marked as Required (must do before deploy) or Recommended (strongly advised for robustness/scale).

---

## Required

- Environment access consistency
  - Standardize all server code to import env from `src/lib/env.ts` rather than `process.env.*` directly.
  - Update the following to use `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and (server‑only) `SUPABASE_SERVICE_ROLE_KEY` from `@/lib/env`:
    - `src/app/api/account/delete/route.ts`
    - `src/app/api/profile/[id]/route.ts`
    - `src/app/api/chat/messages/route.ts`
    - `src/app/api/chat/messages/[id]/route.ts`
    - `src/app/api/chat/conversations/route.ts`
    - `src/app/api/chat/reactions/route.ts`
    - `src/app/api/chat/presence/route.ts`
    - `src/app/api/chat/read/route.ts`
  - Keep `SUPABASE_SERVICE_ROLE_KEY` usage strictly server‑side; never import it in client components.

- Database schema and RLS in production
  - Apply and verify these SQLs in the production database (and keep them in source control):
    - `database_schema_production.sql`
    - `database_schema_policies.sql` (RLS policies)
    - `database_schema_rate_limiting.sql` (ensures `rate_limit_allow` RPC)
  - Confirm RLS is enabled on tables used by the app: `profiles`, `documents`, `file_shares`, `friend_requests`, `messages`, `conversation_participants`, `message_reactions`, `message_read_receipts`, `user_sessions`.
  - Verify the `rate_limit_allow` RPC exists and is executable by the app role.

- Content Security Policy (CSP) verification
  - File: `vercel.json` → `Content-Security-Policy` header.
  - Ensure `connect-src` includes only what you need: `https://*.supabase.co` and `wss://*.supabase.co` are present (good). Add any additional analytics/CDN endpoints if you introduce them.
  - Validate `img-src` covers your needs (currently: `self` blob: data: `https://*.supabase.co`). If avatars or images can be from other domains, whitelist them or proxy via your backend.

- Branding consistency
  - Standardize product name (choose either “CloudEZ” or “iCloudEZ”) across UI copy:
    - `src/app/auth/signin/page.tsx`
    - `src/app/auth/signup/page.tsx`
    - `src/app/auth/reset/page.tsx`
    - `src/app/dashboard/page.tsx`
    - `src/app/layout.tsx`
    - `src/app/page.tsx`

- PWA manifest and icons
  - File: `public/manifest.json` → ensure `icons` include at least 192×192 and 512×512 PNGs.
  - Verify the paths referenced actually exist in `/public` (you currently have 144 and 192; add 512 if missing).

- Robots and sitemap
  - Add `public/robots.txt` (at minimum `User-agent: *\nDisallow:`) so crawlers don’t 404.
  - If you want SEO, add `public/sitemap.xml` and ensure canonical URLs reference your production domain.

- Service Worker navigation behavior
  - File: `public/sw.js`
  - Confirm that notification clicks intentionally navigate to `/dashboard`. If you want deep-linking, pass a `url` with each notification and navigate to that instead.

- API error shape consistency
  - Normalize API error responses to a consistent structure, e.g. `{ error: { code: string, message: string } }`, across all endpoints for easier client handling.

---

## Strongly recommended

- File upload architecture (scalability and memory)
  - Current server route `src/app/api/upload/route.ts` calls `request.formData()` and uploads from Node. This can hit memory and body size limits for large files.
  - Recommended: Use client‑side direct uploads to Supabase Storage (via signed URLs or authenticated storage upload) and keep the server out of the hot path.
    - Add a minimal endpoint to mint a short‑lived signed path (server checks folder/category).
    - Update the uploader (`src/components/AutoUpload.tsx`) to stream directly to Supabase.

- Supabase type generation
  - Replace the manual `Database` interface in `src/lib/supabase.ts` with generated types:
    - Generate via CLI: `supabase gen types typescript --project-id <id> --schema public > src/lib/database.types.ts`
    - Import and use those types in the client and API routes to avoid schema drift.

- Logging and redaction
  - Introduce a lightweight logger (e.g., pino) for server routes with request IDs and redaction of secrets/PII.
  - Remove or lower verbosity of `console.log` in production; keep errors and essential audit logs.

- Monitoring and error reporting
  - Add basic uptime/error monitoring (e.g., Sentry). If you add it, update CSP and environment variables accordingly.

- Accessibility and UX polish
  - Ensure icon‑only buttons have `aria-label`s.
  - Confirm focus states are visible in dark and light modes.

---

## Final verification checklist

- Build and lint
  - `npm run build` succeeds without warnings you consider blockers.
  - `npm run lint` passes (or desired rules are disabled explicitly).

- Environment variables set in production
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - `NEXT_PUBLIC_APP_URL` (for absolute links/emails)

- Database in prod
  - All SQL migrations applied; RLS enforced; RPC available.

- Web app
  - Hard refresh verifies Service Worker behavior post‑deploy.
  - Landing page logo opens home and does not force redirect unless intended.

If you want, I can open a PR with the exact edits for each bullet, grouped by commit (env standardization, branding, PWA/icons, robots/sitemap, API error shape, optional upload rework).


