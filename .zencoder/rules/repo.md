# CloudEZ Repository Overview

A concise, high-signal summary to speed up onboarding, debugging, and support.

## Project
- **Name**: CloudEZ
- **Purpose**: Personal cloud storage with Supabase auth/storage, deployed on Vercel
- **Framework**: Next.js App Router
- **Language**: TypeScript

## Key Versions
- **next**: 15.5.2
- **react / react-dom**: 19.1.0
- **tailwindcss**: ^4
- **eslint**: ^9
- **@supabase/supabase-js**: ^2.56.1

## Scripts
- **dev**: `next dev`
- **dev:https**: `node server.js` (local HTTPS with `localhost+2.pem` and `localhost+2-key.pem`)
- **build**: `next build`
- **start**: `next start`
- **lint**: `eslint`

## Environment Variables (required)
Defined/validated in `src/lib/env.ts` (throws if missing required):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional in code but needed for some server ops)
- `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

Sample in README:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Directory Highlights
- `src/app` — Next.js App Router pages and API routes
- `src/app/api` — Route handlers (upload, download, files/preview, friends, chat, profile, account)
- `src/components` — UI components (FileManager, FilePreview, etc.)
- `src/contexts` — React contexts (AuthContext)
- `src/lib` — Supabase client, env loader, utils, realtime sync, database types
- `public` — PWA assets (`manifest.json`, `sw.js`, icons)
- `scripts` — Shell helpers (DB setup, tests, domain checks)
- `.next` — Build output (ignored in VCS normally)

## Notable Config
- `next.config.ts`: disables ESLint during builds (`ignoreDuringBuilds: true`)
- `vercel.json`:
  - **Build/Dev**: standard Next.js
  - **Headers**: Strict security headers + CSP
  - **CSP** (important during development):
    - `connect-src` allows `https://*.supabase.co` and `wss://*.supabase.co`
    - Images allow `blob: data: https://*.supabase.co`
- `server.js`: local HTTPS dev server using bundled certs; run with `npm run dev:https`

## API Routes (selection)
- `POST /api/upload`
- `GET /api/download/[id]`
- `GET /api/files/preview/[id]`
- Friends: `/api/friends/{request,respond,search,unfriend}`
- Chat: `/api/chat/{conversations,messages,presence,read,reactions}`
- Profile: `GET /api/profile/[id]`
- Account: `POST /api/account/delete`

## Database & Storage
- SQL files in repo for schema and policies: `database_schema_*.sql`
- Storage bucket expected: `documents`
- RLS required; policies detailed in README

## Development
1. `npm install`
2. Create `.env.local` with required vars
3. Start:
   - HTTP: `npm run dev`
   - HTTPS: `npm run dev:https` (uses local certs in repo)
4. Open `http://localhost:3000` or `https://localhost:3000`

## Deployment (Vercel)
- Set env vars in Vercel
- Uses `vercel.json` headers/CSP; adjust if integrating new origins (analytics, S3, etc.)

## Troubleshooting Tips
- **Missing env var error**: Thrown from `src/lib/env.ts` early; verify `.env.local` and Vercel project envs
- **CSP blocks**: If previews or realtime fail, check `connect-src`/`img-src` in `vercel.json`
- **Supabase RLS**: 403s typically mean policy misconfig; confirm user IDs and bucket folder naming
- **Local HTTPS issues**: If cert trust errors occur, open `https://localhost:3000` once and accept, or switch to `npm run dev`
- **Build ESLint warnings**: Ignored during build; run `npm run lint` locally to surface issues

## Other Notes
- PWA assets present (`manifest.json`, `sw.js`)
- Tailwind v4 config via `@tailwindcss/postcss` and `postcss.config.mjs`

— Generated automatically to assist with support and code navigation.