---
id: kubernetes-admission-designing-policy-block-latest-tag-001
title: "How would you design and roll out a policy blocking :latest image tags cluster-wide, without breaking every existing deployment on day one?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - practical
  - architecture
tags:
  - kubernetes
  - admission-control
  - policy-as-code
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Using `:latest` image tags is a known anti-pattern (unpredictable, non-reproducible deployments), and you want to enforce a policy blocking it cluster-wide via an admission policy engine. Several existing Deployments currently use `:latest`. How would you design and roll this policy out without immediately breaking those existing workloads on day one?

## Short Answer

Deploy the policy first in "audit" or "dry-run" mode (most policy engines, including Gatekeeper and Kyverno, support a mode that reports violations without actually blocking them), giving visibility into exactly which existing workloads would be affected — fix those identified workloads first, then switch the policy to actual enforcement mode only once the violation count is at (or near) zero, rather than enabling hard enforcement immediately and breaking everything using `:latest` on day one.

## Detailed Explanation

The rollout risk isn't the policy's correctness — it's the gap between "what the policy requires" and "what's already running." Closing that gap safely means measuring it first, not enforcing blind and discovering the gap via a production outage.

## Requirements

- New workloads using `:latest` should eventually be blocked from being created.
- Existing workloads already using `:latest` must not be suddenly broken by the policy's introduction.
- The rollout needs visibility into actual impact before enforcement begins, not a blind cutover.

## Architecture

**Start in audit/dry-run mode, not immediate enforcement**: Gatekeeper's `enforcementAction: dryrun` (or Kyverno's `validationFailureAction: audit`) makes the policy evaluate every matching request and record violations, without actually rejecting anything — this gives real, concrete visibility into which existing resources currently violate the intended policy, which is essential information you don't otherwise have before deciding it's safe to enforce.

**Use the audit results to build a concrete remediation list**: the policy engine's own reporting (Gatekeeper's constraint status showing violating resources, Kyverno's PolicyReport objects) gives an actual, queryable list of exactly which Deployments/workloads currently use `:latest` — this turns "we think a few things might break" into a specific, actionable list to work through.

**Fix the identified violations before flipping to enforcement**: working through the audit-identified list — pinning each affected Deployment to a specific, real version tag — closes the gap between current state and the policy's requirement, ideally coordinated with the owning teams rather than done unilaterally, since they may have context on why a specific deployment still uses `:latest`.

**Switch to actual enforcement only once violations are at or near zero**: `enforcementAction: deny` (Gatekeeper) or `validationFailureAction: Enforce` (Kyverno) actually blocks new violating requests — flipping this switch after the existing violations have been addressed means the transition to enforcement doesn't break anything that was already running, and only affects genuinely new attempts to violate the policy going forward.

**Consider a narrower initial scope before going cluster-wide**: for a large cluster with many teams, rolling the policy out to one namespace or one team first (via `namespaceSelector`), validating the audit-then-enforce process works smoothly there, before expanding cluster-wide, reduces the risk of a rollout-process mistake affecting everyone simultaneously.

## Trade-offs

The audit-then-enforce rollout takes real calendar time — you can't jump straight to the desired enforced end-state, and during the audit period, the anti-pattern the policy is meant to prevent is still technically possible for new workloads too (since enforcement isn't active yet). This is the necessary cost of a safe rollout for a policy affecting existing production workloads; for a genuinely new cluster with no existing violating workloads at all, skipping straight to enforcement mode is reasonable, since there's nothing existing to break.

## Key Takeaways

- Start any new cluster-wide policy in audit/dry-run mode, which reports violations without blocking them, to get real visibility into impact before enforcing.
- Use the policy engine's own violation reporting to build a concrete remediation list, rather than guessing what might break.
- Only switch to actual enforcement once existing violations are addressed — this is what avoids breaking already-running workloads on day one.
- For a large, multi-team cluster, consider a narrower initial rollout scope before expanding cluster-wide, to validate the process itself first.

## Interview Follow-Up Questions

- How would you handle a team that pushes back on fixing their identified `:latest` violations, delaying the policy's full enforcement?
- How would you design the policy to allow a genuine, reviewed exception for a specific workload that has a legitimate reason to still use `:latest`?
- How would you extend this same audit-then-enforce pattern to a much stricter policy, like requiring signed images, given the higher remediation burden that implies?

## References

- [OPA Gatekeeper: Audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Kyverno: Background Scans](https://kyverno.io/docs/policy-reports/)
