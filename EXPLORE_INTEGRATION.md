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
| `src/lib/feature-flags.ts` | `EXPLORE` flag (on unless `NEXT_PUBLIC_ENABLE_EXPLORE=false`) |
| `cors.json` | Adds `explore.foregenomics.com` (+ `localhost:3001`) origins |

**Explore (`explore-foregenomics`)**

| Area | Change |
|------|--------|
| `<head>` config block | `window.FORE_EXPLORE_CONFIG` (Clerk key, Health Hub URL) + `FORE_REAL_MODE` |
| Password gate | In real mode it becomes a "Signing you in…" screen; password stays only as an offline/demo fallback |
| `autoBoot()` | Skips the Tanner demo when in real mode |
| Bootstrap script (end of `<body>`) | Clerk SSO, child list, streams the real VCF into the existing parser, wires the child switcher |

The CTA and endpoints are gated so Explore only appears once the order status is
`COMPLETE_REPORT_DELIVERED` / `COMPLETE_NO_COUNSELING_REQUIRED` **and** a genome
file is attached to the kit.

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
- Put that **same `pk_live_…` key** into Explore's `FORE_EXPLORE_CONFIG.clerkPublishableKey`
  in `index.html`.
- In the Clerk Dashboard, allow `https://explore.foregenomics.com` as a redirect
  origin so the `redirect_url` back from sign-in is honored.

> Local dev: with the dev key, HH and Explore must run on the same host to share
> the session (e.g. both on `localhost`). True cross-subdomain SSO is a
> production-instance behavior.

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
# optional — omit to keep Explore enabled:
# NEXT_PUBLIC_ENABLE_EXPLORE = false
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
