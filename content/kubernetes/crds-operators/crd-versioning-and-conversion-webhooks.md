---
id: kubernetes-crds-versioning-conversion-webhooks-001
title: "A CRD needs a breaking schema change, but existing custom resources and consumers depend on the old shape — how do you version a CRD safely?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: expert
question_type:
  - architecture
  - scenario
tags:
  - kubernetes
  - crd
  - versioning
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An operator's CRD needs a breaking change — a field needs to be restructured, or renamed, in a way that isn't backward compatible. Existing custom resource instances in production use the old shape, and other tooling/controllers may still expect it. How would you version this CRD change safely, without breaking existing consumers?

## Short Answer

Introduce the new field structure as a new CRD API version (e.g., `v1beta2` alongside the existing `v1beta1`) rather than mutating the existing version's schema in place, mark the old version as deprecated but still served, and implement a conversion webhook that translates between the two versions automatically — this lets old and new consumers both keep working against the version they understand, with Kubernetes handling the conversion transparently, while giving a clear, deliberate deprecation path for eventually retiring the old version.

## Detailed Explanation

The problem has the same shape as evolving any long-lived, widely-consumed API — the solution is coexistence with translation, not a hard cutover, and Kubernetes provides the exact machinery (multiple served versions plus a conversion webhook) needed to implement it for CRDs specifically.

## Requirements

- Existing custom resource instances and controllers depending on the old schema must continue working during and after the change.
- New consumers should be able to use the improved/corrected schema going forward.
- There must be a clear, safe path to eventually retire the old version once consumers have migrated.

## Architecture

**CRDs support multiple API versions simultaneously, exactly for this purpose**: a `CustomResourceDefinition` can declare several versions (`v1beta1`, `v1beta2`, `v1`, etc.) under `spec.versions`, each with its own schema — this is the same versioning mechanism Kubernetes' own built-in APIs use for their own evolution, and CRDs get the same capability.

**A conversion webhook is what makes multiple versions actually interoperate transparently**: when a client requests a custom resource in a version different from how it's stored (or when a different version's client writes to it), the API server calls a conversion webhook (a small service the operator author implements and deploys) that translates the object between the old and new schema — this is what lets an old controller keep reading `v1beta1`-shaped objects while a new controller writes `v1beta2`-shaped ones, with Kubernetes handling the translation rather than either consumer needing to know about the other's version.

**One version is marked as the storage version, and it doesn't have to be the one clients interact with**: `spec.versions[].storage: true` designates exactly one version as what's actually persisted in etcd — clients can request and write in any served version, with the conversion webhook translating to/from the storage version as needed, meaning the storage format can itself be migrated over time as part of this same mechanism.

**Deprecation follows a defined path: served but not new-storage, then eventually not served at all**: marking an old version as deprecated (via CRD annotations/documentation, and eventually setting `served: false`) signals to consumers they need to migrate, without immediately breaking them — this needs to be a genuinely staged process with real communication to whoever depends on the old version, not an abrupt cutover, given custom resources are frequently consumed by other automation that may not notice a deprecation warning without explicit communication.

**Existing stored objects need an actual migration path to the new storage version eventually**: even with a working conversion webhook, objects physically stored in the old version's shape in etcd should eventually be migrated to the new storage version (typically via re-writing each object, triggering the conversion and re-save) — leaving this indefinitely deferred means the conversion webhook becomes a permanent, load-bearing dependency for every read/write, rather than a temporary bridge during a genuine migration window.

## Trade-offs

Building and maintaining a conversion webhook is real engineering investment — it's another piece of production infrastructure (a webhook service) that needs to be highly available, since a broken or unavailable conversion webhook can block reads/writes to the CRD entirely for whichever version needs conversion. This cost is unavoidable for a genuinely breaking schema change with existing production consumers; for a CRD with no production instances yet, or where all consumers can be coordinated to migrate simultaneously, a simpler direct schema change (still bumping the version for clarity, but without needing a conversion webhook) may be sufficient.

## Key Takeaways

- CRDs support multiple simultaneous API versions, the same mechanism Kubernetes' own built-in APIs use for their evolution.
- A conversion webhook translates objects between versions transparently, letting old and new consumers each keep working against the version they understand.
- Exactly one version is the storage version; clients can interact with any served version while the webhook handles translation to/from what's actually persisted.
- Deprecation should be a staged, communicated process (served-but-deprecated, then eventually not served), and existing stored objects need an actual migration path to the new storage version over time, not indefinite reliance on the conversion webhook.

## Interview Follow-Up Questions

- What happens to existing custom resource instances if the conversion webhook itself becomes unavailable — does the cluster keep functioning?
- How would you test a conversion webhook thoroughly, given a bug in it could corrupt data during translation between versions?
- How would you coordinate a breaking CRD version change across an organization where you don't have full visibility into every consumer of that CRD?

## References

- [Kubernetes: Versions in CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
- [Kubernetes: Custom Resource Conversion](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/#configure-customresourcedefinition-to-use-conversion-webhooks)
