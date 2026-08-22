---
id: gitops-repository-patterns-drift-reconciliation-001
title: "An engineer manually ran kubectl edit against a production Deployment to fix an urgent issue, bypassing Git. What happens next in a GitOps-managed cluster, and why does that matter?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - gitops
  - drift
  - reconciliation
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

During an urgent production issue, an engineer runs `kubectl edit` directly against a Deployment to make a quick fix, bypassing Git entirely. The cluster is managed by a GitOps tool (Argo CD or Flux). What actually happens next, and why does this scenario matter for understanding how GitOps reconciliation works?

## Short Answer

The GitOps controller continuously compares live cluster state against what's declared in Git, and the manual `kubectl edit` change immediately shows up as drift (live state no longer matching Git). Depending on configuration, one of two things happens: if auto-sync/self-heal is enabled, the controller automatically reverts the manual change back to match Git (potentially undoing the engineer's urgent fix); if it's not enabled, the drift persists and is flagged, but nothing auto-corrects it — either way, this scenario is exactly why "the fix should have gone through Git" matters, since the manual change is either silently overwritten or silently drifting outside the system's actual source of truth.

## Detailed Explanation

This scenario illustrates the core tension GitOps reconciliation is built around: the system is designed to continuously enforce that live state matches a single declared source of truth, which is exactly the right behavior for preventing configuration drift in general, but creates a specific, important edge case when someone needs to make a genuinely urgent change faster than the normal Git-review process allows.

**The reconciliation loop continuously detects drift, regardless of how it happened**: whether live state diverges from Git because of a manual `kubectl edit`, an external tool making a direct change, or someone else's automation, the GitOps controller's comparison logic doesn't distinguish the cause — it just sees "live state doesn't match declared state" and reports (and potentially acts on) that drift the same way regardless of why it occurred.

**With self-heal/auto-sync enabled, the manual change gets silently reverted**: this is often surprising and frustrating to an engineer who just made an urgent fix — from the GitOps controller's perspective, it's correctly doing its job (enforcing that live state matches the declared source of truth), but from the engineer's perspective, their fix "disappeared" without an obvious explanation unless they understand this is exactly the tool's intended behavior.

**Without self-heal enabled, the drift persists but is visible as OutOfSync**: the manual fix survives, but the cluster is now in a state that's diverged from what Git declares — which is itself a real, if different, problem: the actual running configuration and Git's record of what should be running have quietly disagreed, meaning anyone later trusting Git as an accurate description of production would be wrong until this is reconciled one way or the other (either committing the manual change back to Git, or letting a future sync revert it).

**The correct process for genuinely urgent changes is committing directly to Git, fast-tracked through review, not bypassing Git entirely**: a well-designed GitOps workflow should have a fast path for genuine emergencies (an expedited PR review, or in the most extreme break-glass cases, a documented emergency process) that still goes through Git, rather than the engineer needing to choose between "wait for normal review during an active incident" and "bypass Git and create drift" — the existence of this scenario as a recurring real-world problem is itself a signal that the emergency-change process needs to be designed deliberately, not left as an implicit gap.

**Retroactively reconciling drift after an emergency manual change**: if a manual change genuinely was necessary and correct, the follow-up step is committing that same change to Git after the fact, so the source of truth catches up to reality — leaving it as unreconciled drift (whether reverted or persisting) is technical debt that should be resolved deliberately, not left indefinitely.

## Key Takeaways

- The GitOps reconciliation loop treats any divergence between live state and Git identically, regardless of cause — it doesn't distinguish "someone made an urgent fix" from any other kind of drift.
- With self-heal/auto-sync enabled, manual changes get silently reverted; without it, drift persists and Git's declared state quietly stops accurately describing production.
- The right process for genuine emergencies is a fast-tracked Git change (expedited review, or a documented break-glass process), not bypassing Git — the existence of this friction is a signal to design a deliberate emergency-change path, not to work around GitOps entirely.
- Any manual change that was genuinely necessary should be retroactively committed to Git afterward, so the source of truth catches up to what's actually running.

## Interview Follow-Up Questions

- How would you design a fast-tracked emergency change process that still goes through Git, for situations too urgent for normal PR review timelines?
- How would you detect and alert on drift that's persisting because self-heal is disabled, before it becomes a source of confusion later?
- How would you communicate to engineers why their manual `kubectl edit` fix "disappeared," in a way that builds understanding rather than frustration with the GitOps tooling?

## References

- [Argo CD: Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Flux: How it works](https://fluxcd.io/flux/concepts/)
