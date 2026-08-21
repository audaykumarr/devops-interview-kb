---
id: argocd-sync-waves-argocd-hooks-vs-helm-hooks-001
title: "How do Argo CD's resource hooks compare to Helm's pre-install/pre-upgrade hooks, given Argo CD can also deploy Helm charts directly?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - helm
difficulty: advanced
question_type:
  - comparison
  - conceptual
tags:
  - argocd
  - helm
  - gitops
  - hooks
estimated_time_minutes: 7
companies: []
related_questions:
  - argocd-sync-waves-controlling-apply-order-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Argo CD has its own resource hooks (`PreSync`/`Sync`/`PostSync`), and Helm has its own hooks (`pre-install`/`pre-upgrade`/etc.), and Argo CD can deploy Helm charts directly. How do the two hook systems compare, and which one actually takes effect when a Helm chart with its own hooks is deployed through Argo CD?

## Short Answer

When Argo CD renders and applies a Helm chart, it uses Argo CD's own hook system, not Helm's native hook execution — Argo CD templates the chart (effectively `helm template`, not `helm install`/`upgrade`) and then applies the resulting manifests itself, so any resource annotated with Helm's `helm.sh/hook` annotation is instead interpreted by Argo CD's hook mechanism if it also carries (or is translated to) an Argo CD hook annotation; Helm's own hook *execution engine* never actually runs, because Argo CD isn't invoking `helm install`/`helm upgrade` at all.

## Detailed Explanation

Helm's hook system relies on the `helm` CLI/SDK actually executing the install or upgrade — hooks are resources annotated with `helm.sh/hook: pre-install` (etc.), and it's Helm's own logic, running during `helm install`/`helm upgrade`, that knows to apply those hook resources at the right point in the release lifecycle and wait for them before proceeding.

Argo CD's Helm support works differently: Argo CD uses Helm as a **templating engine only** (equivalent to `helm template`), rendering the chart into plain Kubernetes manifests, and then Argo CD itself applies those manifests using its own sync engine — the same engine it uses for plain YAML or Kustomize sources. This means the actual install/upgrade lifecycle Helm hooks depend on never runs; there's no `helm install` process orchestrating hook timing. Recognizing this, Argo CD specifically interprets `helm.sh/hook` annotations found in a rendered Helm chart and translates them into its own equivalent hook behavior (`PreSync` for `pre-install`/`pre-upgrade`, `PostSync` for `post-install`/`post-upgrade`, etc.), so a Helm chart's hooks generally continue to work when deployed via Argo CD — but they're being executed by Argo CD's hook engine under the hood, not Helm's.

This distinction matters in a few concrete ways: Argo CD's sync waves (`argocd.argoproj.io/sync-wave`) can be combined with translated Helm hooks for finer-grained ordering than Helm alone would give you, since Argo CD's hook/wave system is more expressive; but any Helm hook behavior that depends on actual `helm` CLI state (like Helm's release history/rollback mechanics, which Argo CD doesn't use since it doesn't track "Helm releases" the way the CLI does) won't carry over, because Argo CD's model of what happened is its own sync history, not a Helm release object. In practice, straightforward `pre-install`/`post-install` hooks translate cleanly; anything a chart does that assumes genuine Helm release lifecycle semantics is worth verifying explicitly when adopting Argo CD for a chart previously deployed via plain `helm install`.

## Key Takeaways

- Argo CD renders Helm charts via templating only (like `helm template`), then applies the result with its own sync engine — Helm's own install/upgrade hook execution never actually runs.
- Argo CD translates `helm.sh/hook` annotations into its equivalent hook behavior, so most Helm hooks continue to work, but they're executed by Argo CD's engine, not Helm's.
- Argo CD's sync waves can combine with translated Helm hooks for finer ordering control than Helm alone provides.
- Anything relying on genuine Helm release-history/rollback semantics doesn't carry over, since Argo CD doesn't track Helm releases the way the `helm` CLI does.

## Interview Follow-Up Questions

- What would break if a Helm chart's hooks specifically relied on `helm rollback` semantics, and how would that manifest when deployed via Argo CD instead?
- How would you verify a Helm chart's hooks behave correctly under Argo CD before migrating a production chart from `helm install` to GitOps?
- Why might Argo CD's sync-wave model be considered more expressive than Helm's own hook-weight system for controlling ordering?

## References

- [Argo CD: Helm](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/)
- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [Helm: Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
