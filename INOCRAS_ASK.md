# For Kyle → Inocras: FedEx tracking automation

Kyle — we're automating kit tracking in the Health Hub so nobody manually enters
tracking numbers or delivery status again. Our receiving side is built and
deployed-ready. FedEx can push every scan event for all shipments on a FedEx
account, but **only the account holder can authorize that** — so we need
Inocras. Below is a forwardable ask; the options are in order of preference,
and C is worth doing regardless.

---

Subject: **Automating shipment tracking for Fore kits — small FedEx setup request**

Hi [name],

We're automating kit-journey tracking for Fore families (kit shipped → delivered →
sample back at your lab), which today is updated by hand. Since kits ship on your
FedEx account, we need one of the following from your side — in order of preference:

**Option A — enable a FedEx tracking webhook on your account (preferred)**
FedEx's "Advanced Integrated Visibility" pushes near-real-time scan events for
shipments on an account. Setup by whoever administers your FedEx account, at
developer.fedex.com:

1. Create a webhook project under your organization and subscribe the 9-digit
   account number used for Fore kit shipments.
2. Event categories: all (transit, delivered, exceptions/delays, estimated
   delivery updates).
3. Destination URL: `https://healthhub.foregenomics.com/api/webhooks/fedex`
4. Security token: we'll send you a value through a secure channel to enter at
   creation — please tell us the header name FedEx shows for it.

Notes: it's a paid FedEx add-on (monthly, tiered by tracking volume — we're happy
to discuss covering the Fore-attributable cost), available for US accounts. If the
account carries non-Fore traffic, that's fine: we match events against our kit
tracking numbers and discard the rest. FedEx removed names/addresses from these
payloads in 2025 — it's scan data only, no PHI or sample information.

**Option B — authorize the account under our FedEx developer organization**
Alternatively, associate the shipping account with Fore's FedEx developer org
(FedEx requires the account holder to execute their End User License Agreement
for this). We then build and run the webhook ourselves and you touch nothing
afterward.

**Option C — send us tracking numbers per kit (fallback; useful regardless)**
Include both tracking numbers — outbound kit **and** the prepaid return label —
in the ship confirmation you already send us, in a machine-readable form (CSV,
API, or a consistent email format). We poll FedEx ourselves from there; that
pipeline is already live on our side.

One question either way: do you generate the return label at kit assembly? If
so, both tracking numbers exist before the kit ships, which makes Option C cover
the entire journey with no other changes.

Could you let us know which option works and who on your side administers the
FedEx account? Happy to get on a call with them and FedEx support if useful.

Thanks!
Kevin

---

**What we need back from Inocras (checklist):**

- [ ] Chosen option (A / B / C)
- [ ] FedEx account admin contact
- [ ] If A: confirmation of destination URL + token header name, go-live date
- [ ] If B: signed FedEx EULA associating the account with Fore's developer org
- [ ] If C: feed format + where they'll send it
- [ ] Answer: is the return label generated at kit assembly?
