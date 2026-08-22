---
id: gitops-repository-patterns-infra-vs-app-config-001
title: "Should GitOps principles apply to your underlying cluster/infrastructure configuration, or just to application deployments? What's actually different about managing infrastructure this way?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
  - terraform
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
tags:
  - gitops
  - infrastructure-as-code
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

GitOps is most commonly discussed for application deployments (Kubernetes manifests, Helm charts). Should the same GitOps principles apply to your underlying cluster and infrastructure configuration too — networking, IAM, the clusters themselves — or is that a fundamentally different problem better solved by traditional Infrastructure as Code pipelines?

## Short Answer

The same core GitOps principle (Git as source of truth, changes applied via declarative reconciliation rather than manual action) genuinely applies to infrastructure too, but the *mechanism* differs meaningfully: application GitOps typically uses a continuously-running, auto-syncing reconciliation loop (Argo CD/Flux constantly comparing and correcting drift), while infrastructure changes (via Terraform or similar) are more commonly applied through a triggered pipeline run (plan, review, apply) rather than continuous background reconciliation — because infrastructure changes often carry more risk and need a human-reviewed plan/apply step before taking effect, not just automatic, continuous drift correction.

## Detailed Explanation

Both are genuinely "GitOps" in the sense that Git is the source of truth and changes flow through Git, but the operational model differs because the risk profile and change frequency of infrastructure versus application deployments are meaningfully different.

**Application GitOps favors continuous, automated reconciliation**: application deployments happen frequently, are generally lower individual risk (a bad Deployment can usually be quickly rolled back), and benefit from Argo CD/Flux's continuous drift-correction — if live state diverges from Git for any reason, it gets automatically corrected without needing a human to notice and trigger anything.

**Infrastructure changes more commonly use a triggered plan/apply pipeline instead of continuous reconciliation**: a Terraform-based infrastructure change is typically applied via a CI pipeline that runs on a Git push/merge — generating a plan (what would change), requiring human review of that plan, and applying only after explicit approval — rather than a continuously-running background process that silently reconciles infrastructure drift the moment it's detected, since an unreviewed, automatic infrastructure change (potentially affecting networking, IAM, or the cluster itself) carries meaningfully higher risk than an automatic application-config correction.

**Drift detection still matters for infrastructure, just often handled differently**: Terraform and similar tools can detect infrastructure drift (a manual change made outside the pipeline) via a scheduled `plan` run showing an unexpected diff, but the typical response is alerting a human to investigate and decide how to reconcile, rather than the tool automatically and silently correcting it the way an application GitOps controller's self-heal would — reflecting the same "infrastructure changes need more deliberate human judgment before being applied or reverted" principle.

**Some tools blur this line, applying continuous reconciliation to infrastructure too**: Kubernetes-native infrastructure management (using Kubernetes Custom Resources to represent cloud infrastructure, reconciled by an operator, sometimes called "Kubernetes as a control plane for infrastructure") does apply the continuous-reconciliation model to infrastructure — this is a real, growing pattern, but it's a deliberate choice to accept infrastructure changes being continuously auto-corrected, which needs the same careful consideration of blast radius and review process as any other automated infrastructure change mechanism.

**The underlying principle is genuinely shared, even though the mechanism differs**: both models agree that Git is the single source of truth, that changes should flow through Git (not manual, out-of-band action), and that drift between declared and actual state matters and should be visible — the difference is really about how much human review gates the actual application of a detected difference, which reasonably scales with how risky and reversible a given category of change is.

## Key Takeaways

- The core GitOps principle (Git as source of truth, changes flow through Git) genuinely applies to infrastructure, not just application deployments.
- Application GitOps commonly uses continuous, automated reconciliation (Argo CD/Flux); infrastructure more commonly uses a triggered plan/review/apply pipeline, reflecting the higher risk and lower reversibility of many infrastructure changes.
- Infrastructure drift detection still matters, but the typical response is alerting a human to review and decide, rather than automatic silent correction.
- Some tools do apply continuous reconciliation to infrastructure (Kubernetes-native infrastructure control planes) — a deliberate, growing pattern that needs the same careful blast-radius consideration as any automated infrastructure change mechanism.

## Interview Follow-Up Questions

- How would you decide which categories of infrastructure change are safe for automated, continuous reconciliation versus requiring a human-reviewed plan/apply step?
- How would you handle infrastructure drift detected outside of a scheduled pipeline run, in the window between scheduled checks?
- What would change about this trade-off for an organization managing infrastructure primarily through Kubernetes-native custom resources rather than traditional Terraform?

## References

- [Weaveworks: GitOps Guide](https://www.weave.works/technologies/gitops/)
- [HashiCorp: Terraform and GitOps](https://developer.hashicorp.com/terraform/tutorials/automation/agent-driven-run)
