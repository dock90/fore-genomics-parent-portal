# Klaviyo stage-email wiring

Source of truth: `src/lib/klaviyo.ts` (event helpers) + `src/lib/order-status-service.ts`
(fire conditions). Last verified against code + Klaviyo account: 2026-07-20.

## Events the Health Hub fires

Order-status events fire from `applyOrderStatusTransition` in
`src/lib/order-status-service.ts` — the single status-change path used by **both** the
admin UI (`updateOrderStatus` in `src/app/actions.ts`) and the **FedEx tracking
automation** (`src/lib/fedex/`, see `FEDEX_TRACKING.md`). That means stage emails now
fire automatically when FedEx scans a kit — no admin touch needed. Events fire only on
the *transition into* the status (never on re-save), and **never on a silent update** —
the silent checkbox suppresses Klaviyo events, the admin notification email, and the
Slack post. Only the DB change + audit log happen. FedEx-driven advances are never
silent (parents should get "kit shipped"/"kit delivered" emails) and appear in the
audit log as actor `fedex-automation`.

| Status transition | Klaviyo event | Notes |
| --- | --- | --- |
| `SHIPPED_TO_USER` | `Kit Shipped` | Only fires when a tracking number is present (also fires if tracking # is added to an already-shipped order). |
| `DELIVERED_AWAITING_RETURN` | `Kit Delivered` | |
| `SHIPPED_TO_LAB` | `Sample Shipped` | Added 2026-07-19 — metric appears in Klaviyo after the first non-silent transition. |
| `RECEIVED_IN_PROCESS` | `Sample Ready` | Means "received at the lab". |
| `RESAMPLE_REQUIRED` | `Resample Ready` | Has never fired in prod yet (no metric exists in Klaviyo until it does). |
| first `COMPLETE_*` | `Results Ready` | Fires once, on the first transition into any complete status. Carries `counseling_required: true/false` (added 2026-07-19) so flows can route positive cases differently. |

Events fired elsewhere: `Placed Order` (Shopify webhook), `Invite Sent` (invite creation),
`Account Created` + `Enrollment Pending` (Clerk `user.created` webhook),
`Onboarding Completed` (onboarding complete route), `Results Viewed` (Fore Explore — see below).

### `Results Viewed` (added 2026-07-20)

Fires from `GET /api/explore/genome` (`src/app/api/explore/genome/route.ts`) — the endpoint
Fore Explore calls to load a child's genome. It only returns the genome after the ownership +
Explore-consent checks pass, so a successful fire means **a parent actually opened their
child's interactive results** in Explore (demo/showcase views never hit this route). It is the
engagement counterpart to `Results Ready` (report merely became available). Properties:
`order_id`, `order_number`, `kit_number`, `child_name`, `source: 'explore'`.

Intended flow use: `Results Ready` → wait N days → **if no `Results Viewed`**, send a "your
results are waiting" nudge; suppress that nudge for anyone who has viewed. Like `Sample Shipped`,
the metric only appears in Klaviyo after the first non-silent fire — fire a test `Results Viewed`
event (or open results once in prod) to surface it in the trigger/filter picker before building
the flow.

## Current state in Klaviyo (verified via API 2026-07-20, late)

- **`Stage — Results Ready` (`WPSneq`) is LIVE** — the F row below is done.
- **`Sample Submission Nudge Flow_ Kit Delivered_No Sample Shipped` (`XVrVSH`, Draft)**
  triggers on `Kit Delivered`: +3 d nudge (`ScVvTm`), +1 d nudge (`WNx77e`), +2 d final
  (`THVCaZ`), each behind a "skip if already returned" split. ⚠️ **BUG:** all three splits
  test `Kit Shipped` (`Ux3XEa`) since flow start — the outbound event, which fires *before*
  delivery — so every recipient would get all three nudges even after returning the sample.
  Each split must test `Sample Shipped` (`Rwpe35`) instead.
- `Order Progression_Customer Pipeline_2026` (`Xej4ja`, Draft; backup `SLVJ9h`) is still the
  timer drip (trigger `Account Created`, 8 emails on fixed delays). Never live. Its messages
  are the salvage source for the remaining stage flows.
- All stage metrics exist and now receive REAL events: the FedEx automation (see
  `FEDEX_TRACKING.md`) began firing `Kit Delivered` in production on 2026-07-20.

Flow authoring is Klaviyo-UI work (the connector reads flows but can't create/edit them).

## Target structure (stage-triggered) — remaining rows

| Flow | Trigger (metric) | Messages | Status |
| --- | --- | --- | --- |
| A. Welcome | `Account Created` | Email #1 acknowledgement (short delay is fine). | covered by live Welcome Series |
| B. Kit shipped | `Kit Shipped` (`Ux3XEa`) | Email #2 "Your Kit Has Shipped" (template `XLGQAp`). Tracking # available as `tracking_number` event property. | **to build** |
| C. Kit delivered | `Kit Delivered` (`V4G2dc`) | Email #3 "How to collect your sample" (`UJeRQE`) sent immediately, then the existing nudge sequence (fix its exit metric per above). One flow, one trigger. | **fix + extend `XVrVSH`** |
| D. Sample in transit | `Sample Shipped` (`Rwpe35`) | Email #4 "on its way to the lab" (`SiMVHy`). | **to build** |
| E. At the lab | `Sample Ready` (`SdRMGN`) | Email #5 "sample received" (`R4KQui`), then educational waits as delays: +1 d deep dive (`Ws3uZK`), +5 d "what results will show" (`Tpzwg2`). | **to build** |
| F. Results | `Results Ready` (`TvkeYq`) | | **LIVE** (`WPSneq`) |

## UI rebuild mechanics (for whoever does the Klaviyo work)

A Klaviyo flow has **exactly one trigger** — per-email triggers inside the existing drip
are not possible, which is why it must be split. The path that preserves all of Suzanne's
email content and settings:

1. In Flows, clone `Order Progression_Customer Pipeline_2026` once per row of the target
   table (Options ⋯ → Clone on the flow card).
2. In each clone (still Draft): change the trigger metric to the stage event, delete the
   emails + delays that belong to other stages, rename the flow (e.g. "Stage — Kit Shipped").
3. On the Results flow, add a trigger filter: `counseling_required` equals `false`.
4. Keep the original drip + `(Backup)` copy as drafts until the new flows are verified,
   then archive them so nobody sets the timer version live by accident.

Test events were fired 2026-07-19 (profile kevin@foregenomics.com, `backfill: true`,
properties flagged `test: true`) so `Sample Shipped` already appears in the trigger
picker and `counseling_required` is selectable in trigger filters — no need to wait
for the HH deploy to start the rebuild.

## Go-live checklist

1. Rebuild flows per the table (Klaviyo UI).
2. Create or cut the "Meet your genetic counselor" template.
3. Set every message from Draft → Live, then each flow → Live.
4. Mid-pipeline customers are NOT backfilled — Klaviyo only reacts to new events.
   Anyone owed an update needs a one-off send.
5. Remember: silent updates send nothing — uncheck it when the customer should be notified.
