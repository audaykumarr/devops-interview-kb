---
id: kubernetes-crds-testing-operator-reconcile-logic-001
title: "How would you test a custom operator's reconcile logic without needing a full live cluster for every test run?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - practical
tags:
  - kubernetes
  - operators
  - testing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An operator's reconcile logic has real complexity — multiple conditional paths depending on observed state, error handling, status updates. Testing it by deploying to a real cluster and manually manipulating custom resources for every test case is slow and doesn't fit into a fast CI feedback loop. How would you actually test this logic efficiently?

## Short Answer

Use envtest (part of the controller-runtime/kubebuilder ecosystem) — it runs a real, but minimal and ephemeral, API server and etcd instance (without a full kubelet/scheduler/actual container runtime) specifically for testing controller logic against genuine Kubernetes API behavior, without needing a full cluster. This gives you real API server validation, defaulting, and watch/informer behavior — which a pure mock/fake client can't fully replicate — while still running fast enough for a normal CI test suite.

## Detailed Explanation

**A full live cluster for every test run is both slow and often doesn't test the right thing precisely**: standing up or reusing a real cluster (with real nodes, a real scheduler actually placing pods, real container images) adds meaningful test time and infrastructure dependency for testing logic that's really about "does the reconcile function behave correctly given this API state" — most of what a full cluster actually provides (real container execution) isn't what the reconcile logic itself needs to be tested against.

**envtest runs a real API server and etcd, without the rest of a full cluster**: this gives genuine Kubernetes API behavior — real schema validation, real defaulting, real optimistic concurrency via `resourceVersion`, real watch/informer event delivery — which matters because a reconcile loop's correctness often depends on these exact API behaviors, not just on the reconcile function's own internal logic in isolation; a purely mocked client can silently pass tests that would fail against real API server semantics.

**Tests against envtest create real custom resources and assert on real resulting state**: a typical envtest-based test creates a custom resource instance (using a real client against the ephemeral API server), triggers the operator's reconcile function (either by running the actual controller manager against this test API server, or by directly invoking the reconcile function with a client pointed at it), and then asserts on the resulting object state (status conditions, whether expected downstream resources were created) — this exercises the real reconcile logic against real API semantics, closely matching production behavior.

**Unit tests for pure logic (no API interaction) should still be separate from envtest-based integration tests**: reconcile logic that's genuinely pure computation (given this input state, what should the desired output be) benefits from fast, simple unit tests with no API server involved at all — reserving envtest specifically for testing the actual API-interacting parts of reconciliation (creating/updating/reading real objects, handling real API errors) keeps the fast unit tests fast and the slower, more realistic envtest-based tests focused on what actually needs that realism.

**A genuinely full end-to-end test against a real cluster (kind, a cloud dev cluster) still has its place, just not for every test case**: envtest doesn't test actual pod scheduling, real container behavior, or genuine multi-node interactions — a smaller number of true end-to-end tests against a real (even if lightweight, like `kind`) cluster, run less frequently than the fast unit/envtest suite (perhaps in a separate CI stage, not on every commit), covers what envtest structurally can't, without paying that cost on every single test run.

## Key Takeaways

- envtest runs a real, minimal, ephemeral API server and etcd specifically for testing controller/operator logic, without needing a full cluster with real nodes/scheduler/container runtime.
- This gives genuine API server behavior (validation, defaulting, optimistic concurrency, watch events) that a purely mocked client can't fully replicate, while still running fast enough for normal CI.
- Keep pure-logic unit tests (no API interaction) separate and fast, reserving envtest for the parts of reconciliation that actually interact with the API server.
- A smaller number of true end-to-end tests against a real (even lightweight) cluster still has a place for what envtest structurally can't cover, run less frequently than the main fast test suite.

## Interview Follow-Up Questions

- How would you structure a CI pipeline to run fast unit tests on every commit, envtest-based integration tests on every PR, and full end-to-end tests less frequently?
- What's a specific reconcile-logic bug that envtest would catch but a purely mocked-client unit test wouldn't?
- How would you test an operator's behavior under a genuinely broken/unavailable external dependency (a cloud API it calls out to), given envtest itself doesn't simulate that?

## References

- [Kubebuilder: Writing Controller Tests](https://book.kubebuilder.io/cronjob-tutorial/writing-tests.html)
- [controller-runtime: envtest](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/envtest)
