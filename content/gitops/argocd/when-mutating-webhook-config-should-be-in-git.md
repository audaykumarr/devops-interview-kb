---
id: gitops-argocd-mutating-webhook-config-belongs-in-git-001
title: "A mutating webhook injects configuration into your resources. When should that injected config actually be tracked in Git instead of ignored via ignoreDifferences?"
category: gitops
subcategory: argocd
technologies:
  - argocd
  - kubernetes
difficulty: advanced
question_type:
  - scenario
  - conceptual
tags:
  - argocd
  - gitops
  - mutating-webhooks
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Kubernetes mutating admission webhook injects configuration into your Deployments — a sidecar container, resource limits, an annotation. The default instinct is to add that field to `ignoreDifferences` so Argo CD stops fighting it. When should that injected config actually be tracked explicitly in Git instead?

## Short Answer

Track it in Git when the injected value is something the team needs visibility into, review, or control over changes to — a security-relevant sidecar's specific image version, or a resource limit that materially affects cost or capacity planning — since `ignoreDifferences` makes Argo CD blind to that field entirely, meaning changes to it happen with no review, no history, and no easy way to see what value is actually in effect without checking the live cluster directly. Keep using `ignoreDifferences` for fields that are genuinely operational noise the team has no reason to review individually (a timestamp annotation, an auto-generated hash label).

## Detailed Explanation

The trade-off `ignoreDifferences` makes is real, not just cosmetic: a field excluded from Argo CD's diff is a field GitOps' core value proposition (Git as the reviewable, auditable source of truth) no longer applies to. Nobody reviewing a pull request sees what value that field will actually have; nobody can look at Git history to understand when or why it changed; and Argo CD's own visibility (the Application's diff view) won't show any information about it at all. This is a fine trade for genuinely inconsequential fields, but a real cost for anything that matters.

**Consider tracking explicitly in Git** when the injected value is: security-relevant (a service mesh sidecar's specific image version, which might carry its own vulnerabilities and needs the same patching visibility as the main application image); cost/capacity-relevant (resource requests/limits a webhook injects based on a namespace default — worth knowing exactly what's in effect, especially when debugging a resource-constrained incident); or something that materially changes application behavior in a way engineers reasonably need to see during code review (a webhook-injected environment variable that changes runtime behavior).

For genuinely security- or cost-relevant injected configuration, one practical approach is querying the webhook's actual injected values directly (rather than guessing) and encoding that expected value into the Git-tracked manifest itself — effectively making Git the source of truth for what *should* be injected, with the webhook's actual injection now matching (rather than diverging from) what's declared, removing the need for `ignoreDifferences` on that field at all. This requires the webhook's behavior to be predictable/deterministic enough to encode, which isn't always the case (an autoscaler-adjusted replica count, for instance, is inherently not something Git can meaningfully declare, since it's supposed to change dynamically).

**Keep using `ignoreDifferences`** for fields that are genuinely operational noise nobody needs to review individually — a resource version-tracking annotation, a timestamp, an auto-generated hash label used internally by some controller — where the field changing constantly is expected and uninteresting, and forcing it into Git-tracked review would just create noisy, meaningless PR diffs on every sync.

## Key Takeaways

- `ignoreDifferences` trades away GitOps' core review/audit value for that specific field — a real cost, not a free convenience.
- Track injected config in Git explicitly when it's security-relevant, cost/capacity-relevant, or materially changes application behavior in ways worth code review.
- For predictable webhook injections, encoding the expected value into the Git-tracked manifest can remove the need for `ignoreDifferences` entirely, restoring full visibility.
- Reserve `ignoreDifferences` for genuinely inconsequential, expected-to-change-constantly fields where forcing Git tracking would just add noise.

## Interview Follow-Up Questions

- How would you audit an existing set of `ignoreDifferences` rules across many Applications to find ones that are hiding something that should actually be reviewed?
- What would you do if a webhook's injected value is inherently non-deterministic, making it impossible to encode a stable expected value in Git?
- How would you communicate this trade-off to a team that just wants the "annoying drift warnings" to go away, without them fully understanding what they're giving up?

## References

- [Argo CD: Diffing customization](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/)
- [Kubernetes Docs: Mutating admission webhooks](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#mutatingadmissionwebhook)
