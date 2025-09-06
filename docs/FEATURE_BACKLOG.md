# CloudEZ Feature Backlog

A concise backlog of missing or incomplete features identified in the codebase, with suggested next steps for future implementation.

## High-priority

1. **End‑to‑end encryption (client‑side)**
   - Problem: Docs promise E2E, but no client‑side crypto or key management is present.
   - Acceptance:
     - Files are encrypted client‑side (e.g., AES‑GCM per‑file key via WebCrypto).
     - Keys derived from user secret/passphrase (PBKDF2/Argon2) and never sent to server.
     - Downloads decrypt in browser; previews handled.
   - Tasks:
     - Create `src/lib/crypto.ts`: `generateKey`, `encryptFile`, `decryptFile`, key (de)serialization.
     - Add per‑user encrypted master key storage (DB profile blob or local storage) and passphrase flow.
     - Integrate with upload/download; handle stream/chunk encryption; MIME after decrypt for previews.

2. **Public share‑by‑link with expiring tokens**
   - Current: Only user‑to‑user via `file_shares`; downloads require auth and "public" checks friendship.
   - Acceptance: Owner can generate time‑limited, optionally password‑protected links; anonymous GET works; revocation honored; audit logged.
   - Schema (new): `public_share_links(id uuid pk, document_id uuid, token text unique, expires_at timestamptz, password_hash text null, created_by uuid, created_at timestamptz default now())`.
   - API:
     - `POST /api/shares` (create link), `DELETE /api/shares/[id]` (revoke), `GET /api/share/[token]` (resolve → signed URL).
   - UI: File actions menu → "Create share link" (expiry, optional password) and list/revoke.

3. **Server‑side search**
   - Current: In‑memory filtering in `FileManager`; no DB‑backed search.
   - Acceptance: Full‑text search endpoint with pagination and ranking; per‑user isolation; rate‑limited.
   - DB:
     - Add `documents_search tsvector` + trigger to update from `name`, `description`, optional tags.
     - Index: `GIN(documents_search)`; consider `simple` or `english` config.
   - API: `GET /api/search?q=...&page=1&size=20` using `plainto_tsquery` and `ts_rank` ordering.
   - UI: Wire `FileManager` search box to API when query length ≥ 2; fallback to local filter for short terms.

4. **Comprehensive rate limiting**
   - Current: SQL schema exists; enforced on downloads only.
   - Acceptance: All API routes enforce per‑user limits and return 429 with reset info.
   - Tasks:
     - Create helper `src/lib/rateLimit.ts` that calls existing RPC (e.g., `rate_limit_allow`) consistently.
     - Apply to: upload, search, friends endpoints, chat, profile, account delete.
     - Add simple headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset` where applicable.

5. **Storage RLS policies for bucket**
   - Risk: Policies in docs are commented/out‑of‑band; easy to misconfigure.
   - Acceptance: `storage.objects` policies ensure users only access their own paths; verified via tests.
   - Tasks:
     - Apply/create policies for insert/select/update/delete on `documents` bucket.
     - Add smoke tests (scripts) for upload/download/denials.

## Medium‑priority

6. **Real folders and hierarchy**
   - Current: `documents.folder` is a plain text label; README mentions a `folders` table.
   - Acceptance: Hierarchical folders with move/rename; documents reference `folder_id`.
   - Schema:
     - `folders(id uuid pk, user_id uuid, name text, parent_id uuid null, created_at timestamptz)`; indexes on `(user_id, parent_id, name)`.
     - Migrate `documents.folder -> documents.folder_id uuid` (backfill using distinct labels).
   - API/UI: CRUD for folders, drag‑drop moves, breadcrumbs/tree view.

7. **Security hardening (CSP)**
   - Current: `'unsafe-eval' 'wasm-unsafe-eval'` in CSP.
   - Acceptance: Production removes unsafe directives or gates by env.
   - Tasks: Make CSP conditional (dev vs prod) and verify dependencies; document needed origins.

8. **Audit logging and input validation**
   - Acceptance: All sensitive operations logged; all inputs validated.
   - Tasks:
     - Add `audit_logs(id, user_id, action, target_id, meta jsonb, created_at)`.
     - Add Zod schemas for each API route; return 400 on invalid input; include minimal request metadata.

9. **Custom auth emails**
   - Acceptance: Branded reset/signup emails with correct app domain.
   - Tasks: Configure Supabase email templates/SMTP, verify links to `NEXT_PUBLIC_APP_URL` routes.

## Lower‑priority / Roadmap

10. **File versioning**
    - Schema: `document_versions(id, document_id, version int, file_path, size, created_at, created_by)` with FK.
    - API/UI: List versions, restore, diff metadata.

11. **PWA offline & background sync**
    - Tasks: Enhance `public/sw.js` to cache app shell and previews; queue uploads and retry via Background Sync.

12. **Advanced search (OCR)**
    - Pipeline: Extract text for images/PDF (serverless or worker); store in `ocr_text`; include in FTS.

13. **Mobile app**
    - Note: Tracked separately; RN scaffold script exists. Define minimal subset (auth, list, upload, share).

## Notes / Dependencies

- Rate limiting SQL exists (`database_schema_rate_limiting.sql`); unify usage via a single helper and consistent RPC naming (`check_rate_limit`/`rate_limit_allow`).
- Ensure CSP changes are gated by environment and validated in staging before production.
- Update `PRODUCTION_CHECKLIST.md` when implementing each feature.