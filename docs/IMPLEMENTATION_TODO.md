# Implementation Plan and Branch Map

This document tracks the prioritized improvements and maps them to branches. Each section contains concrete, verifiable tasks and acceptance criteria.

Conventions
- Branch naming: use the exact names below.
- Commit style: conventional commits (feat:, fix:, refactor:, chore:, docs:, test:, ci:, perf:)
- Done when: all acceptance criteria are met and minimal tests pass locally and in CI.

Table of Contents
- [1. Env Example and Validation](#1-env-example-and-validation)
- [2. Testing Setup (Unit/Integration)](#2-testing-setup-unitintegration)
- [3. E2E Setup (Playwright)](#3-e2e-setup-playwright)
- [4. CI Pipeline](#4-ci-pipeline)
- [5. Error/Loading Boundaries](#5-errorloading-boundaries)
- [6. API Validation (zod)](#6-api-validation-zod)
- [7. Rate Limiting and Security Headers](#7-rate-limiting-and-security-headers)
- [8. Feature-based Structure Refactor](#8-feature-based-structure-refactor)
- [9. PWA Service Worker + Offline Sync](#9-pwa-service-worker--offline-sync)
- [10. Observability (Sentry)](#10-observability-sentry)
- [11. Prettier, Husky, Lint-Staged](#11-prettier-husky-lint-staged)
- [12. Contributing and Security Docs](#12-contributing-and-security-docs)
- [13. TanStack Query + Realtime](#13-tanstack-query--realtime)
- [14. Accessibility and i18n](#14-accessibility-and-i18n)
- [15. Performance and Bundle Budgets](#15-performance-and-bundle-budgets)

---

## 1. Env Example and Validation
Branch: feature/env-example-and-validation

Tasks
- [ ] Add `.env.example` listing all required env vars with safe placeholders.
- [ ] Update `src/lib/env.ts` to strictly validate server/client vars (e.g., zod) and throw on missing/invalid.
- [ ] Document required setup in README and link to `.env.example`.

Acceptance Criteria
- [ ] Running without required env fails fast with actionable error.
- [ ] `.env.example` is comprehensive and up to date.

## 2. Testing Setup (Unit/Integration)
Branch: feature/testing-setup-vitest-rtl

Tasks
- [ ] Add Vitest config with TS + JSX support and JSDOM.
- [ ] Install React Testing Library and user-event.
- [ ] Add sample tests for a core component (FileManager) and a lib function.
- [ ] Add coverage config and npm scripts (`test`, `test:watch`, `coverage`).

Acceptance Criteria
- [ ] `npm run test` passes locally with coverage report.
- [ ] At least 1 meaningful test per critical area (component + lib).

## 3. E2E Setup (Playwright)
Branch: feature/e2e-setup-playwright

Tasks
- [ ] Add Playwright with Chromium and web-first assertions.
- [ ] Seed auth scenario or mock provider for login.
- [ ] Write E2E for: login, upload, create share link, open shared file.
- [ ] Add npm scripts (`e2e`, `e2e:headed`).

Acceptance Criteria
- [ ] `npm run e2e` runs headless and passes.
- [ ] CI can run E2E with ephemeral env.

## 4. CI Pipeline
Branch: ci/github-actions-pipeline

Tasks
- [ ] Add GitHub Actions workflow: install, typecheck, lint, unit tests, build, e2e (matrix optional).
- [ ] Cache dependencies for speed.
- [ ] Upload test artifacts on failure.

Acceptance Criteria
- [ ] CI passes on PR with checks required for merge.

## 5. Error/Loading Boundaries
Branch: feature/error-loading-boundaries

Tasks
- [ ] Add `loading.tsx` and `error.tsx` to major routes (dashboard, sharing, friends, profile).
- [ ] Add global `not-found.tsx`.
- [ ] Ensure friendly fallback UI and logging hooks.

Acceptance Criteria
- [ ] Navigations show skeletons; runtime errors show helpful UI and recover option.

## 6. API Validation (zod)
Branch: feature/zod-api-validation

Tasks
- [ ] Introduce zod schemas for route handlers/server actions inputs and outputs.
- [ ] Normalize API error format (code, message, details).
- [ ] Add shared DTOs under `src/shared/schemas`.

Acceptance Criteria
- [ ] Invalid input results in 400 with consistent error body.
- [ ] Types inferred from schemas across client and server.

## 7. Rate Limiting and Security Headers
Branch: feature/rate-limiting-and-security-headers

Tasks
- [ ] Implement rate limiting middleware backed by DB (use existing rate limiting schema).
- [ ] Add security headers: CSP, HSTS, X-Frame-Options (frame-ancestors), Referrer-Policy, Permissions-Policy.
- [ ] Validate upload constraints (MIME, size, extension allowlist).

Acceptance Criteria
- [ ] Abusive traffic is throttled; headers present in responses; uploads constrained.

## 8. Feature-based Structure Refactor
Branch: refactor/feature-based-structure

Tasks
- [ ] Create `src/features/` with domains: files, sharing, friends, profile.
- [ ] Move related components, services, hooks, types into feature folders.
- [ ] Create `src/shared/` for UI primitives, lib, and types.
- [ ] Update imports; avoid deep relative paths (use tsconfig baseUrl/paths).

Acceptance Criteria
- [ ] No broken imports; components logically grouped by feature; builds cleanly.

## 9. PWA Service Worker + Offline Sync
Branch: feature/pwa-service-worker-offline-sync

Tasks
- [ ] Add service worker (workbox or next-pwa) with caching strategies for app shell and previews.
- [ ] Implement background sync queue for uploads and retries.
- [ ] Offline fallback pages and graceful degradation.

Acceptance Criteria
- [ ] App is installable; offline browsing of cached metadata works; queued uploads sync when online.

## 10. Observability (Sentry)
Branch: feature/observability-sentry

Tasks
- [ ] Add Sentry SDK for Next.js (server + client) with DSN from env.
- [ ] Capture route errors, API errors, and performance traces.
- [ ] Redact PII and mask sensitive fields.

Acceptance Criteria
- [ ] Errors appear in Sentry with useful context; no PII leakage.

## 11. Prettier, Husky, Lint-Staged
Branch: chore/prettier-husky-lint-staged

Tasks
- [ ] Add Prettier config and scripts; run a one-time format.
- [ ] Add Husky pre-commit hook with lint-staged (format + eslint on staged files).
- [ ] Enforce on CI.

Acceptance Criteria
- [ ] Commits are auto-formatted and linted; CI blocks non-formatted diffs.

## 12. Contributing and Security Docs
Branch: docs/contributing-and-security

Tasks
- [ ] Add CONTRIBUTING.md (setup, scripts, branch strategy, PR template).
- [ ] Add SECURITY.md (reporting, scope, dependency policy).
- [ ] Add LICENSE if missing.

Acceptance Criteria
- [ ] Docs render well on GitHub; referenced by README.

## 13. TanStack Query + Realtime
Branch: feature/tanstack-query-and-realtime-integration

Tasks
- [ ] Introduce TanStack Query for client mutations/caching.
- [ ] Standardize invalidation and optimistic updates.
- [ ] Bridge `realtimeSync` with query cache updates.

Acceptance Criteria
- [ ] Consistent cache behavior; realtime updates reflected without full reloads.

## 14. Accessibility and i18n
Branch: feature/accessibility-and-i18n

Tasks
- [ ] A11y Sweep: focus management, ARIA, keyboard nav, contrast checks.
- [ ] Add i18n scaffold (next-intl) with example translation and locale switcher.

Acceptance Criteria
- [ ] Key flows pass axe checks; at least 2 locales supported for one page.

## 15. Performance and Bundle Budgets
Branch: perf/bundle-analysis-and-optimizations

Tasks
- [ ] Add bundle analyzer and define size budgets.
- [ ] Audit large deps; lazy load previews; ensure next/image usage.
- [ ] Cache headers for file downloads; strategic prefetching.

Acceptance Criteria
- [ ] Budgets enforced in CI; improved Lighthouse perf scores.

---

How to Use
1. Create a branch from latest default (main) using the names above.
2. Implement tasks and keep commits small, logical, and well-described.
3. Open PR referencing this document section (e.g., “Implements 7. Rate Limiting…”).
4. Ensure CI passes and acceptance criteria are met before merge.
