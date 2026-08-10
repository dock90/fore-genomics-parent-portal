# Fore Explore ↔ Health Hub integration

This wires the **Fore Explore** genome explorer (`explore.foregenomics.com`) to
the **Health Hub** (`healthhub.foregenomics.com`) so parents:

1. sign in once at the Health Hub and are **automatically signed in to Explore**
   (shared Clerk session across the `foregenomics.com` subdomains), and
2. open Explore against **their child's real raw genome file (VCF/.vcf.gz)**
   instead of the baked-in demo data.

Explore stays a self-contained static app; it just learns who the parent is
(via Clerk) and fetches the child's genome through two new Health Hub endpoints.

---

## ⚠️ Access control — Explore is NOT launched

Explore has not cleared content/regulatory review, so **no customer gets it**.
Access is a single fail-closed allowlist:

```
EXPLORE_ALLOWED_EMAILS="tester1@example.com,tester2@example.com"
```

- **Server-only — never `NEXT_PUBLIC_`.** The tester list must not reach the
  browser bundle. `src/app/dashboard/page.tsx` resolves it server-side and hands
  `DashboardContent` a plain boolean.
- **Unset or empty ⇒ nobody has access.** That is the point. The previous gate
  (`NEXT_PUBLIC_ENABLE_EXPLORE !== "false"`) defaulted to *on*, which is how an
  unlaunched CTA reached a real customer. `NEXT_PUBLIC_ENABLE_EXPLORE` is retired
  and read nowhere.
- Read per request, so **adding a tester needs no redeploy**. Clearing the
  variable kills Explore instantly for everyone.

Enforced in four places (`src/lib/explore-access.ts` is the only source of truth):

| Layer | File | Behaviour when denied |
|-------|------|----------------------|
| Dashboard CTA | `src/app/dashboard/page.tsx` → `DashboardContent.tsx` | No Explore card rendered |
| Explore API (all 4 routes) | `src/app/api/explore/*/route.ts` | `403 {"error":"explore_unavailable"}` |
| Results-Ready email | `src/lib/klaviyo.ts` | `explore_url: null`, `explore_url_available: false` — template must hide the CTA |
| Explore app itself | `explore-foregenomics` `components/ExploreApp.tsx` | "Fore Explore isn't available yet" card |

The API layer is the real barrier, not the CTA: `explore.foregenomics.com` is a
separate deployment that any signed-in customer can open directly by URL.

**Also gated, separately:** Explore's `?demo=1` / `?feDemo=1` showcase modes take
no sign-in at all, so no server allowlist can reach them. They are off unless
`NEXT_PUBLIC_EXPLORE_ENABLE_DEMO=true` is set on the Explore project. Keep them
off in production — the `?demo=1` profile is a real child's clinical report.

Admin surfaces (`src/app/admin/**`) are deliberately untouched: uploading a VCF
and reading Explore readiness keep working regardless of the allowlist.

---

## Data flow

```
Parent (signed in at healthhub.foregenomics.com)
        │  clicks "Explore <child>'s genome"  →  explore.foregenomics.com/?kitId=<kitId>
        ▼
Explore (static index.html)
  1. loads @clerk/clerk-js with the SAME publishable key as the Health Hub
  2. reads the shared Clerk session (same root domain → shared automatically)
     └─ if signed out → redirect to healthhub.foregenomics.com/sign-in?redirect_url=…
  3. GET  healthhub.foregenomics.com/api/explore/children      (Bearer <clerk token>)
  4. GET  healthhub.foregenomics.com/api/explore/genome?kitId= (Bearer <clerk token>)
        └─ returns a short-lived signed GCS URL to the child's VCF.gz
  5. fetch(signedUrl) → stream → DecompressionStream("gzip") → existing panel parser
```

Ownership is enforced server-side: `/api/explore/*` verifies the Clerk user is
the **parent** on the order that owns the kit before returning anything.

---

## What changed (in code)

**Health Hub (`fore-genomics-parent-portal`)**

| File | Change |
|------|--------|
| `prisma/schema.prisma` | New `Kit.genomeDataFileName String?` (points at the VCF in GCS) |
| `prisma/migrations/20260713000000_add_kit_genome_data_file/` | Additive nullable column migration |
| `src/lib/genome-storage.ts` | GCS service for genome files (signed read/write URLs, existence check) |
| `src/lib/explore-cors.ts` | CORS helpers for the cross-origin Explore calls |
| `src/app/api/explore/children/route.ts` | Lists the parent's kits that have a genome file |
| `src/app/api/explore/genome/route.ts` | Returns a short-lived signed URL for one kit's genome |
| `src/components/DashboardContent.tsx` | Attractive per-kit **"Explore <child>'s genome"** CTA |
| `src/lib/explore-access.ts` | **The access gate** — `EXPLORE_ALLOWED_EMAILS`, fail-closed (see above) |
| `src/lib/feature-flags.ts` | `EXPLORE` flag **removed** — it defaulted to on; superseded by the allowlist |
| `cors.json` | Adds `explore.foregenomics.com` (+ `localhost:3001`) origins |

**Explore (`explore-foregenomics`)**

| Area | Change |
|------|--------|
| `<head>` config block | `window.FORE_EXPLORE_CONFIG` (Clerk key, Health Hub URL) + `FORE_REAL_MODE` |
| Password gate | In real mode it becomes a "Signing you in…" screen; password stays only as an offline/demo fallback |
| `autoBoot()` | Skips the Tanner demo when in real mode |
| Bootstrap script (end of `<body>`) | Clerk SSO, child list, streams the real VCF into the existing parser, wires the child switcher |

The CTA and endpoints are gated so Explore only appears once the order status is
complete (`COMPLETE_COUNSELING_REQUIRED` / `COMPLETE_NO_COUNSELING_REQUIRED` —
every complete order has its report delivered) **and** a genome file is attached
to the kit. Admins attach the VCF from the order detail page (Genome row under
each kit's Reports section).

---

## Required setup (cannot be done from code)

### 1. Clerk — production instance + shared subdomain session

Cross-subdomain SSO only works on a Clerk **production** instance whose domain is
`foregenomics.com` (the session cookie is then set on `.foregenomics.com` and is
shared by every subdomain automatically — no "satellite" configuration needed;
Clerk treats same-root subdomains as shared by default).

- Confirm the Health Hub production deploy uses a **`pk_live_…`** publishable key
  for `foregenomics.com` (the repo's `.env.local` currently holds a **dev** key,
  `pk_test_…legal-lamprey-78.clerk.accounts.dev`, which will **not** share a
  session with `explore.foregenomics.com`).
- Set that **same `pk_live_…` key** as the **Vercel env var `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  in the Explore project** (Settings → Environment Variables → Production). Explore reads it at
  runtime via `/api/env-config.js` (no hardcoding in `index.html`; the dev key is only a
  local/offline fallback). Optional Explore env vars: `NEXT_PUBLIC_HEALTH_HUB_URL`,
  `NEXT_PUBLIC_EXPLORE_SIGN_IN_PATH`.
- In the Clerk Dashboard, allow `https://explore.foregenomics.com` as a redirect
  origin so the `redirect_url` back from sign-in is honored.

### 1b. Clerk — Google OAuth (Health Hub sign-in; Explore inherits via SSO)

Explore has no sign-in UI of its own — it redirects to Health Hub `/sign-in`. Google
must be enabled on the **same Clerk instance** both apps use.

**Development instance** (shared Clerk credentials; no Google Cloud project needed):

1. [Clerk Dashboard → SSO connections](https://dashboard.clerk.com/~/user-authentication/sso-connections)
2. **Add connection** → **For all users** → **Google** → save
3. Or, after `clerk auth login` claims the app:
   `npx clerk@latest config patch --json '{"connection_oauth_google":{"enabled":true}}'`

**Production instance** (custom Google Cloud OAuth client required):

1. Enable Google in Clerk as above and copy the **Authorized Redirect URI**
2. Create a Google Cloud **Web application** OAuth client with:
   - Authorized JavaScript origins: `https://healthhub.foregenomics.com`, `https://explore.foregenomics.com`, and local `http://localhost:3001` if needed
   - Authorized redirect URI: the value from Clerk
3. Paste Client ID / Client Secret into the Clerk Google connection (**Use custom credentials**)
4. Publish the Google OAuth consent screen to **In production** when ready for real users

Health Hub UI: **Continue with Google** on `/sign-in` → `/sign-in/sso-callback` →
`/sign-in/sso-complete` (honors Explore `redirect_url`). Invitation `<SignUp />` shows
Google automatically once the connection is enabled.

> Local dev: with the dev key, HH and Explore must run on the same host to share
> the session (e.g. both on `localhost`). True cross-subdomain SSO is a
> production-instance behavior.

**Troubleshooting — redirect loop between Explore and `/sign-in`.** If opening Explore
bounces to `healthhub.foregenomics.com/sign-in?redirect_url=…explore…` and back forever, the
two apps are **not sharing a Clerk session**. Almost always one of:
1. Explore's `clerkPublishableKey` is a **dev** key (`pk_test_…accounts.dev`) or a **different
   instance** than the Health Hub's production key. Fix: use the **same `pk_live_…` key** on
   both, on a Clerk production instance whose domain is `foregenomics.com`.
2. The instance domain isn't `foregenomics.com`, so the `__session` cookie isn't set on
   `.foregenomics.com` and subdomains can't read it.

Explore now guards against the infinite loop: it redirects to sign-in **at most once**, and if
it returns still-signed-out it shows a "Please sign in" screen (Go to the Health Hub / retry)
instead of looping. But that screen will keep appearing until the shared **production** Clerk
instance is in place.

### 2. DNS + hosting for Explore

Point `explore.foregenomics.com` at wherever you host the static `index.html`
(Vercel static project, Cloud Storage + CDN, etc.). It's a single file — no build.

### 3. Google Cloud Storage — genome bucket + CORS

```bash
# Create the bucket (uniform access; pick your region)
gcloud storage buckets create gs://fore-genomics-genomes \
  --project=gtm-n6n54zxs-mtdhm --location=US --uniform-bucket-level-access

# Apply CORS so Explore can fetch signed URLs from the browser
gcloud storage buckets update gs://fore-genomics-genomes --cors-file=cors.json
```

Keep the bucket **private** — access is always via the short-lived signed URLs
minted by `/api/explore/genome`.

> **Important:** upload genome objects as `Content-Type: application/gzip` with
> **no** `Content-Encoding: gzip` metadata. Explore decompresses the bytes itself;
> if GCS advertised `Content-Encoding` the browser would pre-decompress and
> Explore's `DecompressionStream` would fail. `genome-storage.ts`'s
> `createGenomeUploadUrl()` already sets the right content type.

### 4. Health Hub environment variables (Vercel)

```
GOOGLE_CLOUD_GENOME_BUCKET = fore-genomics-genomes
NEXT_PUBLIC_EXPLORE_URL    = https://explore.foregenomics.com

# WHO GETS EXPLORE. Server-only — no NEXT_PUBLIC_ prefix, ever.
# Unset or empty = nobody. Set in Production, Preview AND Development.
EXPLORE_ALLOWED_EMAILS     = tester1@example.com,tester2@example.com

# NEXT_PUBLIC_ENABLE_EXPLORE is retired — delete it if it still exists in Vercel,
# so nobody tries to "re-enable Explore" with a variable nothing reads.
```

The genome bucket reuses the existing `GOOGLE_CLOUD_*` service-account creds.

### 5. Database migration

`vercel-build` runs `prisma migrate deploy`, so deploying applies the new
`genomeDataFileName` column automatically (additive, nullable — safe).

---

## Attaching a genome file to a kit

Set `Kit.genomeDataFileName` to the stored object name. To upload directly from a
browser (bypassing the Vercel 4.5 MB body cap — genomes are large), mint a signed
PUT URL with the helper already provided:

```ts
import { genomeStorageService } from "@/lib/genome-storage";

const { uploadUrl, fileName, contentType } =
  await genomeStorageService.createGenomeUploadUrl(kitId, "TANNER.vcf.gz");
// browser: PUT the file to uploadUrl with header Content-Type: <contentType>
// then persist fileName:
await prisma.kit.update({ where: { id: kitId }, data: { genomeDataFileName: fileName } });
```

A small admin UI for this (mirroring the existing report-upload flow) is the
natural follow-up.

---

## Quick verification

1. Attach a genome file to a completed test kit (steps above).
2. Sign in at the Health Hub → the kit card shows **"Explore <child>'s genome"**.
3. Click it → Explore opens on its subdomain, signs you in silently, and loads
   that child's variants (watch the status line and the child switcher).
4. Confirm an `EXPLORE_GENOME_ACCESS` row lands in the audit log.
