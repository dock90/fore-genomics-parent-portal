# Refactor & security audit — 2026-07-20

Full-repo survey following the order-status-service extraction and FedEx
automation (commit `aaacbcf`). Prioritized: **P0 = fix now (correctness or
security)**, P1 = high-value cleanup, P2 = hygiene. Nothing below is fixed yet
except where marked ✅.

## P0 — security / correctness

1. **Broken role gates: `checkRole()` is async but called without `await`.**
   `src/utils/roles.ts` returns a `Promise`; `if (!checkRole('ADMIN'))` negates a
   Promise object (always truthy → never blocks). Middleware only matches
   `/admin(.*)` pages, NOT `/api/admin(.*)` (`src/middleware.ts:4-5`), so these
   API routes are effectively open to ANY signed-in user (e.g. a parent), with
   no ownership check either — PHI exposure:
   - `api/admin/kits/[kitId]/report/route.ts:39` (genetic report signed URL)
   - `api/admin/kits/[kitId]/combined/route.ts:13` (consent+TRF full-PII PDF)
   - `api/admin/kits/[kitId]/trf/route.ts:14,190` (GET + POST writes)
   - `api/admin/kits/[kitId]/trf/signed/route.ts:13` (upload)
   - `api/admin/consents/[consentId]/pdf/route.ts:13`
   - `api/counselor/trfs/[kitId]/sign/route.ts:19`
   Same no-await bug in ~12 server actions (`src/app/actions.ts:20,43,191,259,
   330,427,481,495,509,524,729,779`) — currently saved only by page-level
   middleware. **Fix:** central `requireRole()` helper (awaited, returns 403),
   `await` everywhere, add `/api/admin(.*)` + `/api/counselor(.*)` to the
   middleware matcher for defense-in-depth.

2. **IDOR:** `api/orders/[orderId]/kits/route.ts:16` returns any order's kits
   (child/consent/questionnaire PII) with only a signed-in check. The sibling
   `orders/[orderId]/invitations` route does ownership correctly — copy it.

3. **`admin/orders/create/_actions.ts:107` (`createOrder`) has no role check at
   all** (creates users/orders/Clerk invites); relies solely on middleware.

4. **Cron auth fails open:** `daily-counselor-notifications` and
   `automation-health-check` skip auth when `CRON_SECRET` is unset, use non-
   timing-safe compare, and only export POST — **Vercel Cron sends GET, so they
   likely never fire from the scheduler at all** (explains silent automations).
   `fedex-poll/route.ts` is the fail-closed GET+POST reference; reuse its
   `authorized()`.

5. **Calendly OAuth callback** (`api/calendly/oauth/callback`): unauthenticated,
   no CSRF `state`, and creates a new token row per call. Require admin auth,
   validate `state`, upsert one row.

6. **Middleware fails open on error** (`src/middleware.ts:52-55` catch →
   `next()`). Fail closed for protected matchers.

## P1 — high-value refactors

7. "Resolve actor email from Clerk" duplicated at ~15 sites → one
   `getActorEmail(userId)` helper (`actions.ts:105,163,553,690,743,814`;
   admin/counselor kit routes; `user-service.ts:37,84`; layouts).
8. Order creation duplicated: `stripe-order-service.ts:14-172` vs
   `webhooks/shopify/route.ts:106-268` (user→order→kits→invite→audit→Klaviyo→
   Slack); kit-creation loop exists 3×. Extract `createOrderWithKits()`.
9. `api/onboarding/complete/route.ts` — two ~150-line near-identical branches
   (110-256 vs 285-411). Collapse; route its inline `Order.status` writes
   through `applyOrderStatusTransition` (with a notify-suppressed mode) so they
   get audit entries.
10. Dead code (~925 lines, 0 importers): `lib/trf-pdf-service.ts`,
    `lib/browserless-pdf-service.ts`, `lib/test-pdf-generation.ts`. Delete.
    (`order-service.ts` is NOT dead — dynamically imported by onboarding.)
11. Full `puppeteer` (~300MB Chromium) imported in request paths
    (`lib/trf-service.ts:1,127`, `lib/consent-service.ts:1,100`) — exceeds
    Vercel limits; works only via browserless fallback. Move to
    `puppeteer-core` + `@sparticuz/chromium` or browserless-only.
12. N+1s: `dashboard/page.tsx:69-78` (kit query per order, redundant with
    `allOrders` include); `api/admin/audit-logs` (user lookup per log row →
    one `in` query).
13. GCS signed-URL logic hand-rolled in 3 services (`report-storage`,
    `google-storage`, `genome-storage`) → shared `signedReadUrl()`.
14. Admin report download (`api/admin/kits/[kitId]/report`) writes no audit
    entry for PHI access — add `REPORT_ACCESS` once auth is fixed.

## P2 — hygiene

15. ~11 empty `catch {}` blocks swallowing errors (`actions.ts:28,38,477,491,
    505,519`, `calendly.ts:85,130`, `email-service.ts:180`, …) — log at minimum.
16. Catch-and-rethrow-only try/catch: `stripe-order-service.ts:169`,
    `webhooks/calendly/route.ts:149,216`.
17. 23 `as any` across 11 files; worst: `user-service.ts`, `orders/create/
    _actions.ts` (`'ORDER_RECEIVED' as any`), `middleware.ts`
    (`sessionClaims?.metadata as any`). Type Clerk session metadata; use Prisma
    `OrderStatus`.
18. Status labels/pipeline lists duplicated in ~9 places despite canonical
    `STATUS_LABELS` in `order-status-service.ts` — consolidate.
19. `lib/order-service.ts:3-13` hand-maintained `OrderStatus` union has drifted
    (missing `RESAMPLE_REQUIRED`, `COMPLETE_COUNSELING_REQUIRED`) — import from
    `@prisma/client`. 
20. Env vars unvalidated (`STRIPE_SECRET_KEY!` throws at import; many
    `|| 'default'`s) — zod env schema at boot.
21. Logger inconsistency (`console.*` vs `createLogger`) and mixed tabs/spaces —
    enforce `prettier --check` + lint rule in CI.
22. `webhooks/stripe/route.ts:13` uses `NextResponse.next()` (middleware-only
    API) with CORS headers that are never returned — dead code.
23. Unbounded `findMany` on growable tables (`admin/approved-trfs`,
    `audit-service.ts:59,86,113`, ADMIN dashboard loading ALL orders+nested) —
    paginate.
24. `webhooks/calendly/route.ts:33` `timingSafeEqual` throws on length mismatch
    (500 instead of 401) — guard lengths like `shopify/route.ts:33-40`; no
    replay/timestamp check.
25. `api/calendly/scheduling-url` + `oauth/initiate`: auth NONE (feature-flag
    only) — low sensitivity, but inconsistent.

## Done today ✅

- `applyOrderStatusTransition()` extracted — single status path (audit +
  Klaviyo + email + Slack); admin UI + FedEx automation both use it.
- Removed unused `OrderService.updateOrderStatus` raw-write bypass.
- FedEx poller cron written fail-closed, timing-safe, GET+POST (the reference
  implementation for item 4).
- Docs: README rewrite, FEDEX_TRACKING.md, KLAVIYO_FLOWS.md updated.

## Suggested order of attack

1. P0 items 1-3 (one focused PR: `requireRole()` + await + middleware matchers
   + ownership check) — small diff, closes the PHI holes.
2. P0 items 4-6 (cron fail-closed + GET, Calendly callback, middleware).
3. P1 items 10, 19, 15 (deletions + drift fixes — zero behavior risk).
4. P1 items 7-9, 12-14 as separate small PRs.
