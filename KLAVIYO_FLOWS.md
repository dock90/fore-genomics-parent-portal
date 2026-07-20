# Klaviyo stage-email wiring

Source of truth: `src/lib/klaviyo.ts` (event helpers) + `src/app/actions.ts` (fire conditions).
Last verified against code + Klaviyo account: 2026-07-19.

## Events the Health Hub fires

Order-status events fire from `updateOrderStatus` in `src/app/actions.ts`, only on the
*transition into* the status (never on re-save), and **never on a silent update** —
the silent checkbox suppresses Klaviyo events, the admin notification email, and the
Slack post. Only the DB change + audit log happen.

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
`Onboarding Completed` (onboarding complete route).

## Current state in Klaviyo (the problem)

`Order Progression_Customer Pipeline_2026` (flow `Xej4ja`, Draft; backup `WZiDeY`) triggers
on **Account Created** and then sends all ~10 emails on fixed time delays (+10 min, +1 d, +1 d…).
Emails would claim "kit shipped" / "results ready" on a timer regardless of the real order
status. It has never been live; no live flow listens to any stage event, so **no customer
gets any stage email today**.

Klaviyo's public API cannot restructure flows — the rebuild below is UI work
(https://www.klaviyo.com/flow/Xej4ja/edit is the existing draft to salvage messages from).

## Target structure (stage-triggered)

| Flow | Trigger (metric) | Messages |
| --- | --- | --- |
| A. Welcome | `Account Created` | Email #1 acknowledgement (short delay is fine). |
| B. Kit shipped | `Kit Shipped` | Email #2 "Your Kit Has Shipped" (template `XLGQAp`). Tracking # available as `tracking_number` event property. |
| C. Kit delivered | `Kit Delivered` | Email #3 "How to collect your sample" (`UJeRQE`). Coordinate with the draft "Sample Submission Nudge" flow — same trigger. |
| D. Sample in transit | `Sample Shipped` | Email #4 "on its way to the lab" (`SiMVHy`). |
| E. At the lab | `Sample Ready` | Email #5 "sample received" (`R4KQui`), then the educational waits as delays: +1 d deep dive (`Ws3uZK`), +5 d "what results will show" (`Tpzwg2`), then GC intro **once its template exists** (currently `template_id: null` — blocker). |
| F. Results | `Results Ready` | Email #6 "results are ready" (`QTvjMw`) with trigger filter `counseling_required = false`; +6 d thank-you (`XsbPcP`). Counseling-required cases: separate branch/flow with GC-first messaging (or handled personally until written). |

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
