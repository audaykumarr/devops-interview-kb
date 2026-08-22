---
id: kubernetes-admission-multiple-mutating-webhooks-conflict-001
title: "Two mutating webhooks both touch a pod's containers field, and the final result isn't what either webhook intended alone — how do you diagnose and resolve this?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: expert
question_type:
  - troubleshooting
tags:
  - kubernetes
  - admission-control
  - webhooks
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster has a service-mesh sidecar-injection webhook and a separate security-hardening webhook that adjusts container `securityContext`. Both are mutating webhooks, and both touch the pod's `containers` array. Recently, pods are ending up with an unexpected final configuration that matches neither webhook's individual intent. How do you diagnose what's actually happening, and design around it?

## Short Answer

Mutating webhooks run sequentially, each seeing the *previous* webhook's output as its input — if two webhooks both modify overlapping fields (like a specific container's `securityContext`, or the containers array's length via sidecar injection), the second webhook to run operates on an already-modified object, and its logic may not account for the first webhook's changes (a container index shifting after sidecar injection, for instance) — the final result is whatever falls out of that specific sequential interaction, which can easily differ from either webhook's standalone intent. Diagnosing this means determining the actual execution order and inspecting the intermediate state between the two webhooks.

## Detailed Explanation

Each mutating webhook's logic is typically written and tested in isolation, assuming it's the only thing modifying the object — when two such independently-designed webhooks both touch overlapping structure, neither one's logic was necessarily designed with the other's changes in mind, and the interaction between them is emergent, not something either webhook's author explicitly reasoned about.

## Symptoms

- The final pod configuration doesn't match what either individual webhook, tested alone, would be expected to produce.
- The problem may be intermittent or dependent on webhook registration order, which isn't always obviously visible.
- Neither webhook, tested in isolation against a fresh pod spec, shows the unexpected behavior on its own.

## Possible Causes

- A container index shift: sidecar injection adds a new container to the array, and a security-hardening webhook that references containers by array index (rather than by name) ends up modifying the wrong container after the array's shape changed.
- Both webhooks set the same field with different intended values, and whichever runs second simply overwrites the first's value, silently discarding one webhook's intent.
- The webhooks' relative execution order isn't what either webhook's author assumed when writing their logic, because ordering (typically alphabetical by webhook configuration name, absent other constraints) wasn't something either author explicitly controlled or verified.

## Investigation Steps

**Determine the actual execution order of the two webhooks for this request**: reviewing both `MutatingWebhookConfiguration` objects' names (the typical ordering key) confirms which one the API server invokes first — this is the foundational fact needed before reasoning about the interaction.

**Use `kubectl apply --dry-run=server` combined with each webhook's own logging to inspect the intermediate state**: if the first webhook logs the object it received and the mutation it applied, and the second webhook does the same, comparing these logs reveals exactly what object the second webhook actually operated on — including whatever the first webhook already changed.

**Check whether either webhook references containers by index rather than by name**: this is one of the most common concrete causes of this class of bug — a webhook written assuming "the app container is always index 0" breaks silently the moment a sidecar-injecting webhook (running first) adds a new container at index 0, shifting everything else.

**Reproduce the interaction with a minimal test pod spec, deliberately, outside of production**: creating a simple test pod and walking through each webhook's mutation step by step (via dry-run at each stage, or by temporarily disabling one webhook to observe the other's output alone, then re-enabling both) isolates and confirms the specific interaction causing the unexpected final state.

## Resolution

Fix the webhook(s) referencing containers by index to instead reference by name (a much more robust pattern that doesn't break when array position shifts), and/or explicitly control webhook execution order (via naming convention, since ordering follows configuration name) so the interaction between the two webhooks is deliberate and understood rather than accidental. Where possible, design each webhook's mutation logic to be idempotent and defensive about the object's current state, rather than assuming it's always operating on a pristine, unmodified pod spec. Confirm the fix by re-testing the same reproduction scenario used during investigation.

## Key Takeaways

- Mutating webhooks run sequentially, each seeing the previous one's output — two webhooks touching overlapping fields can interact in ways neither was individually designed to handle.
- Referencing containers by array index rather than by name is a common, fragile pattern that breaks specifically when another webhook (like sidecar injection) changes the array's shape.
- Webhook execution order (typically alphabetical by configuration name) directly determines which webhook's changes the other one sees — this ordering is often implicit and unverified rather than deliberately controlled.
- Design mutation logic to be defensive and idempotent about the object's current state, rather than assuming it's always the first and only thing modifying the object.

## Interview Follow-Up Questions

- How would you deliberately control the execution order of multiple mutating webhooks, given ordering follows configuration naming rather than an explicit priority field?
- How would you design a test suite that catches this class of webhook-interaction bug before it reaches production, given each webhook is normally tested in isolation?
- What would you do if the two conflicting webhooks are owned by two different teams (or one is a third-party tool like a service mesh) who aren't coordinating with each other?

## References

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
