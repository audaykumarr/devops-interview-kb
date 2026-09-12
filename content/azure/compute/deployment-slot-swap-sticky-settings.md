---
id: azure-compute-deployment-slot-swap-sticky-settings-001
title: "An App Service deployment tested perfectly in staging, but broke immediately in production right after a slot swap. What's the most likely cause, and how do you investigate it?"
category: azure
subcategory: compute
technologies:
  - azure
  - app-service
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - azure
  - app-service
  - deployment-slots
  - configuration
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team validated a new release thoroughly in an App Service staging slot — everything worked. They swapped staging into production, and the app immediately started throwing errors it never showed in staging, even though the swap is supposed to move exactly the tested code into production. What's the most likely cause, and how do you investigate it?

## Short Answer

The most likely cause is a "deployment slot setting" — an app setting or connection string marked as slot-specific stays attached to the slot itself rather than moving with the code during a swap. If production has a sticky setting (e.g., a connection string) that staging didn't have configured the same way, the swapped-in code runs against production's old sticky value instead of whatever was validated in staging, producing exactly this kind of "worked in staging, broke in production" surprise.

## Detailed Explanation

Slot swap is often described as "swapping the code," which is accurate but incomplete — it swaps the code and most configuration together, except for any setting explicitly marked as slot-specific, which is designed to stay put on purpose (so, for example, each slot can point at its own database). The failure mode here comes from that exception being misunderstood, not from the swap mechanism malfunctioning.

## Symptoms

- The app behaves correctly in the staging slot before the swap, using the exact code that will be swapped.
- Immediately after swap, production throws errors — often connection failures, missing configuration, or unexpected feature behavior — that staging never showed.
- No code difference exists between what was tested and what's now failing, which rules out a bad deployment artifact.

## Possible Causes

- **A connection string or app setting is marked "Deployment slot setting" on the production slot**, meaning it did not move during the swap and still holds its pre-swap value — if the new code expects a different value (a new database, a changed feature flag), it's now getting the old sticky one.
- **The reverse case**: a setting was marked sticky on staging but not on production, so staging was accidentally validating against a value production never actually has, making the staging test misleading rather than production's behavior actually changing.
- **Warm-up/health-check behavior differs between slots** if auto-swap or swap-with-preview isn't configured, meaning the first real production traffic hits an instance that hasn't been warmed the same way staging was.

## Investigation Steps

**Compare the "Deployment slot setting" flags on both slots' configuration** in the Azure Portal's Configuration blade (or via `az webapp config appsettings list` / `az webapp config connection-string list` with the `--slot` parameter) for both the production and staging slots — any setting flagged as slot-specific on one slot but not mirrored correctly on the other is the direct suspect.

**Check the actual runtime value the failing code is using post-swap** against what staging used pre-swap — for a connection string specifically, this usually means checking which database/service the errors are actually hitting, and comparing that to what staging was configured to hit.

**Review whether auto-swap or a swap-with-preview validation step is configured** — its absence doesn't cause this specific symptom, but its presence would have caught a warm-up-related failure before the swap became visible to real users.

## Resolution

Identify which setting is marked as a sticky ("Deployment slot setting") and align its value with what the new code actually expects — either update the sticky value directly, or un-stick it if the setting was never meant to differ between slots. If the failure is severe, swap back immediately (a swap is symmetric — swapping again restores the prior production code) while the fix is applied, then re-validate and swap forward again.

## Prevention

Maintain an explicit list of which settings are intentionally slot-specific and why (typically per-environment secrets like a slot's own database connection), and treat any new sticky setting as a deliberate decision, not a default. Use swap-with-preview (multi-phase swap) so the swapped code runs against the target slot's actual configuration before it receives live production traffic, catching exactly this class of mismatch before users see it.

## Key Takeaways

- Slot swap moves code and most configuration together, but any setting explicitly marked "Deployment slot setting" stays attached to the slot, not the code — this is the single most common cause of "worked in staging, broke after swap."
- The mismatch can go either direction: production can end up with a stale sticky value, or staging's test can have been invalid because it was using a sticky value production doesn't actually have.
- Swap-with-preview lets the incoming code run against the target slot's real configuration before it takes live traffic, directly closing this gap.
- A swap is symmetric and reversible — swapping back is the fastest safe rollback while a sticky-setting mismatch is fixed.

## Interview Follow-Up Questions

- How would you design your app settings so this class of mismatch becomes structurally hard to introduce in the first place?
- What's the trade-off of using auto-swap versus swap-with-preview for a high-traffic production app?
- How would you detect this kind of misconfiguration automatically, before a swap, rather than after users are affected?

## References

- [Azure App Service: Set up staging environments](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
