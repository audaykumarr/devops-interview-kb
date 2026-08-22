---
id: kubernetes-crds-what-is-a-crd-vs-builtin-resource-001
title: "What's actually different about a CustomResourceDefinition versus a built-in Kubernetes resource like a Deployment?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - conceptual
tags:
  - kubernetes
  - crd
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Deployment and a custom resource like `ArgoApplication` or `Certificate` (from cert-manager) both show up in `kubectl get` output and can be created with `kubectl apply`. What's structurally different between a built-in resource type and a CRD-defined one, given they look and behave similarly from the `kubectl` user's perspective?

## Short Answer

A built-in resource type (like Deployment) is compiled directly into the API server's code, with its schema, validation, and storage handling all part of Kubernetes itself. A CustomResourceDefinition (CRD) registers an entirely new resource type with the API server *dynamically*, at runtime, without modifying or recompiling the API server — the API server generically handles storing and serving any CRD-defined resource's data, but doesn't inherently know what to *do* with it; that behavior comes from a separate controller (an operator) that watches the custom resource and takes action.

## Detailed Explanation

**Built-in resources are part of the API server's compiled code**: Deployment, Service, Pod, and the rest of Kubernetes' native resource types have their schema validation, storage logic, and (crucially) their *behavior* — what the Deployment controller does when a Deployment's spec changes — all built directly into Kubernetes' own source code and shipped as part of the API server and controller-manager binaries.

**A CRD registers a new resource type with the API server without changing its code at all**: applying a `CustomResourceDefinition` object tells the API server "here's a new resource kind, here's its schema (via OpenAPI validation), start accepting and storing objects of this kind" — the API server handles this generically, using the same etcd storage and API-serving machinery it uses for any resource, without needing new compiled code for each new CRD.

**The API server alone doesn't give a CRD any actual behavior — that's the operator's job**: creating a CRD and applying instances of it (custom resources) means the API server will happily store and serve them, respond to `kubectl get`/`describe`/`apply`, and enforce whatever schema validation was defined — but nothing *happens* as a result of creating one, unless a separate controller (commonly called an operator when paired with a CRD specifically) is running, watching for that resource type, and taking action based on its spec, the same way the built-in Deployment controller watches Deployments and creates ReplicaSets in response.

**This separation is exactly what makes the extension model work without forking Kubernetes**: any tool (cert-manager, Argo CD, a database operator) can define its own CRD and ship its own controller to give that CRD real behavior, entirely as an add-on to a standard, unmodified Kubernetes cluster — this is the mechanism that makes the entire ecosystem of Kubernetes operators possible without every extension requiring a custom Kubernetes distribution.

**From the API's perspective, a well-designed CRD-based resource is genuinely indistinguishable in usage from a built-in one**: `kubectl get certificates`, `kubectl describe certificate`, RBAC rules scoped to the `certificates` resource — all work exactly the same way they would for a built-in type, because the API server treats a CRD-registered resource as a first-class citizen of the API once registered, not as some lesser, bolted-on concept.

## Key Takeaways

- Built-in resources have their schema, storage, and behavior compiled directly into Kubernetes' own code.
- A CRD registers a new resource type with the API server dynamically, at runtime, without any code changes to the API server itself.
- The API server alone only stores and serves CRD-defined resources — it has no inherent behavior for them; that comes from a separate controller (an operator) watching and acting on them.
- This separation (generic storage/serving via the API server, behavior via a separate controller) is what makes the whole Kubernetes extension ecosystem possible without forking Kubernetes itself.

## Interview Follow-Up Questions

- What actually happens if you create custom resource instances for a CRD, but no controller/operator for that CRD is running in the cluster?
- How does CRD schema validation (via OpenAPI v3 schema in the CRD definition) compare to what built-in resources' validation provides?
- How would you decide whether a new internal tool's configuration should be modeled as a CRD with a custom operator, versus a simpler ConfigMap-based approach?

## References

- [Kubernetes: Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes: Extend the Kubernetes API with CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
