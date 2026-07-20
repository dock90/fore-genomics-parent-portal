# FedEx tracking automation

Automates kit-journey tracking so nobody manually enters delivery statuses.
Two data sources feed one rule engine; behavior is identical whichever is live.

Added 2026-07-20. Source of truth: `src/lib/fedex/` + `src/lib/order-status-service.ts`.

```
FedEx AIV webhook (push; needs Inocras) ──┐
                                          ├─► applyEvent() ─► applyOrderStatusTransition()
Track API poller (pull; works today) ─────┘   src/lib/fedex/      │
                                                                  ├─ audit log (STATUS_CHANGE)
                                              FedexTrackingEvent  ├─ Klaviyo stage events
                                              audit table         ├─ admin notification email
                                                                  └─ Slack #orders post
```

## Status rules

An order has two FedEx legs: **OUTBOUND** (kit → family, `Order.outboundTrackingNumber`)
and **INBOUND** (sample → lab, `Order.inboundTrackingNumber`).

| Leg | FedEx event | Order status |
| --- | --- | --- |
| Outbound | first movement scan (PU/IT/OD/…) | `SHIPPED_TO_USER` |
| Outbound | delivered (DL) | `DELIVERED_AWAITING_RETURN` |
| Inbound | first movement scan | `SHIPPED_TO_LAB` |
| Inbound | delivered (DL) | `RECEIVED_IN_PROCESS` * |
| Either | exception/delay (DE/SE/DY/RS/…) | no change — audit log + Slack `:warning:` alert |
| Either | label created (OC/IN) / unknown code | no change — audit log only |

\* Default. `FEDEX_ADVANCE_ON_LAB_DELIVERY=false` keeps the order at `SHIPPED_TO_LAB`
until an admin (or the lab) confirms accession; the delivery timestamp is still recorded
on `Order.inboundDeliveredAt`.

Guardrails: the automation only ever moves orders **forward** along the pipeline
(late/out-of-order scans are common), may skip intermediate steps when polls missed
scans, and never touches `RESAMPLE_REQUIRED`, `COMPLETE_*`, or `ORDER_CANCELED`.
Because transitions go through `applyOrderStatusTransition`, every advance fires the
exact same Klaviyo events, admin email, audit entry, and Slack post as an admin edit
(actor: `fedex-automation`). See `KLAVIYO_FLOWS.md` for the event map.

## What runs where

- `src/app/api/public/cron/fedex-poll/route.ts` — Track API poller, every 30 min via
  Vercel Cron (`vercel.json`), `CRON_SECRET` bearer auth. Polls only unfinished legs of
  open orders (≤30 numbers/request). Works with Fore's own FedEx keys, today.
- `src/app/api/webhooks/fedex/route.ts` — Advanced Integrated Visibility receiver,
  shared-token auth. Goes live the day Inocras (or FedEx) points the webhook at it.
  Keep the poller on afterward as the safety net — FedEx retries failed pushes only 3×.
- `src/lib/fedex/mapping.ts` — code→status rules + tolerant payload parsers.
- `src/lib/fedex/store.ts` — Prisma reads/writes + `FedexTrackingEvent` audit rows.
- `prisma/migrations/20260720000000_fedex_tracking/` — Order columns
  (`outboundDeliveredAt`, `inboundDeliveredAt`, `lastFedexStatus`, `lastFedexEventAt`)
  + `FedexTrackingEvent` table. Deploys automatically (`vercel-build` runs `migrate deploy`).

## Env vars

| Var | Notes |
| --- | --- |
| `FEDEX_API_URL` | `https://apis-sandbox.fedex.com` to test, `https://apis.fedex.com` in prod |
| `FEDEX_API_KEY` / `FEDEX_SECRET_KEY` | From Fore's own project at developer.fedex.com (Track API) |
| `FEDEX_WEBHOOK_TOKEN` | `openssl rand -hex 32`; same value entered when the webhook is created |
| `FEDEX_WEBHOOK_TOKEN_HEADER` | Header FedEx sends the token in (default `x-webhook-token`; confirm at creation — `Authorization: Bearer` also accepted) |
| `FEDEX_ADVANCE_ON_LAB_DELIVERY` | Default `true`; see status rules above |
| `CRON_SECRET` | Already used by the other cron routes |

## Setup checklist

1. **FedEx developer account (Fore's own; no Inocras needed for polling)** — create a
   FedEx account at fedex.com, then at developer.fedex.com create an org → project →
   add **Track API** → copy sandbox keys → test → request production keys.
2. **Backfill tracking numbers** on in-flight orders (admin order form) — after that,
   the poller owns status updates for those orders.
3. **Ongoing capture of new orders' numbers**: until the webhook is live, tracking
   numbers still need to be entered once per order (admin form or Inocras's feed —
   Option C below removes even that).
4. **Inocras ask** — see below; when answered, set `FEDEX_WEBHOOK_TOKEN`, confirm the
   token header name, and send FedEx's sample payload at the endpoint. If the response
   is `{"received": 0}`, the envelope shape is new — extend `TRACKING_KEYS`/`CODE_KEYS`
   in `src/lib/fedex/mapping.ts` from the payload logged by the route.

## Testing

```bash
# Poller, local:
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/public/cron/fedex-poll

# Webhook, local (fake delivery scan for an order's inbound label):
curl -X POST http://localhost:3000/api/webhooks/fedex \
  -H "content-type: application/json" -H "x-webhook-token: $FEDEX_WEBHOOK_TOKEN" \
  -d '{"trackingNumber":"<an inbound tracking # in your DB>","scanEvent":{"eventCode":"DL","eventDescription":"Delivered","eventDateTime":"2026-07-20T15:04:05Z"}}'
```

FedEx's sandbox Track API only returns canned data for its published mock tracking
numbers (see "Mock Tracking Numbers" in the Track API docs); real numbers need prod keys.
Mapping-level smoke tests: `npx tsx /tmp/fedex-smoke.ts` equivalent lives in the PR notes;
the rule table above is the spec.

## Ops notes

- **Unmatched events are normal** once an account-level webhook is live — Inocras's
  non-Fore traffic lands in `FedexTrackingEvent` with `orderId = null` and is ignored.
  A spike of unmatched rows for numbers that SHOULD be ours = tracking numbers missing
  on orders.
- **Exceptions** (delay, return-to-shipper, …) never change status; they post to the
  Slack #orders channel (PHI-free) for follow-up.
- `Order.lastFedexStatus` / `lastFedexEventAt` give admins at-a-glance shipping state;
  the per-order `FedexTrackingEvent` rows are the full timeline.

## The ask to Inocras (for Kyle)

Kits ship on **Inocras's FedEx account**, and FedEx only streams account-level events
with the **account holder's** authorization (each account added to a developer org
requires their executed EULA + billing-detail validation). Possession of the account
number is not enough — and we're neither shipper nor recipient on either leg, so
tracking numbers or their authorization are the only hooks. Options, in order of
preference (C is worth doing regardless):

**A — Inocras enables the webhook on their account (preferred).** Their FedEx admin, at
developer.fedex.com: create a webhook project for **Advanced Integrated Visibility**,
subscribe the 9-digit account used for Fore kit shipments, all event categories,
destination URL `https://healthhub.foregenomics.com/api/webhooks/fedex`, security token
= the value we share via 1Password (tell us the header name FedEx displays). Notes for
them: it's a paid FedEx add-on (monthly, tiered by tracking volume — we can discuss
covering the Fore-attributable cost); US accounts only; their non-Fore traffic is fine
(we match by tracking number and discard the rest); FedEx removed names/addresses from
these payloads in 2025 — scan data only, no PHI.

**B — They authorize the account under Fore's FedEx developer org.** They execute
FedEx's EULA associating the shipping account with our org; we build and run the
webhook ourselves and they touch nothing afterward.

**C — They send tracking numbers per kit (fallback + useful regardless).** Both numbers
— outbound kit **and** prepaid return label — in the ship confirmation they already
send, machine-readable (CSV/API/consistent email format). Our poller does the rest.

Also ask: **is the return label generated at kit assembly?** If yes, both numbers exist
before the kit ships and Option C covers the whole journey.

What we need back: chosen option, their FedEx account admin contact, and (A) go-live
date / (B) signed EULA / (C) feed format.
