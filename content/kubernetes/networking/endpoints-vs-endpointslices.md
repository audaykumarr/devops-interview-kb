---
id: kubernetes-networking-endpoints-vs-endpointslices-001
title: "What's the difference between Kubernetes Endpoints and EndpointSlices, and why did Kubernetes introduce EndpointSlices?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - kubernetes
  - networking
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Kubernetes has both an `Endpoints` object and a newer `EndpointSlice` object, both tracking which Pod IPs back a Service. What's the actual difference, and why did Kubernetes introduce EndpointSlices instead of just continuing to use Endpoints?

## Short Answer

The original `Endpoints` object stores every backing Pod's IP for a Service in a single, unbounded object — for a Service with thousands of Pods, that single object grows large and every single change (a Pod becoming ready, a Pod being replaced) requires rewriting and redistributing the entire object to every watching component, which becomes a real scalability bottleneck. `EndpointSlice` splits the same information across multiple smaller objects (each capped at 100 endpoints by default), so a change to one Pod only requires updating the specific slice containing it, not the entire set — directly solving the scalability problem at high Pod counts.

## Detailed Explanation

The original `Endpoints` API groups all of a Service's backing Pod IPs into exactly one object, named after the Service. This is simple and worked fine for Services with a modest number of backing Pods, but it has a structural scalability problem: Kubernetes' watch-based architecture means every component watching that object (kube-proxy on every node, for instance) receives the *entire* object's content on every single change, even if only one Pod's status changed among thousands. For a Service backed by a large number of Pods (a large stateless deployment with thousands of replicas), this means every single Pod churn event (a rolling update, an autoscaling event, a single Pod crash-restarting) triggers redistributing the *entire* endpoint list to every watcher — a genuinely expensive, unscalable pattern that grows worse as Pod count grows, and was a documented real bottleneck for very large Kubernetes clusters/Services.

`EndpointSlice` addresses this by splitting a Service's backing Pods across multiple smaller objects instead of one large one — by default, each slice holds up to 100 endpoints, and a Service with thousands of backing Pods ends up with many slices instead of one giant object. When a single Pod's status changes, only the specific slice containing that Pod needs to be updated and redistributed to watchers — not the entire set across every slice — directly reducing the amount of data that needs to change and propagate per event, proportional to slice size rather than total Pod count.

EndpointSlices also added a few structural improvements beyond just splitting size: native support for multiple IP families (dual-stack IPv4/IPv6) more cleanly than the original Endpoints API accommodated, and a more extensible structure for future enhancements (like topology-aware routing hints) that would have been awkward to retrofit onto the original single-object design.

Since Kubernetes 1.21, EndpointSlices are the default and Endpoints objects are still created for compatibility with older components, but EndpointSlices are the actual mechanism modern kube-proxy and other Kubernetes networking components consume — worth knowing during troubleshooting specifically because checking the (potentially stale-feeling, but still maintained for compatibility) `Endpoints` object and checking the actual `EndpointSlice` objects can, in principle, diverge, making EndpointSlices the more authoritative thing to check on a modern cluster.

## Key Takeaways

- The original Endpoints object groups all of a Service's backing Pods into one unbounded object — every change redistributes the entire set to every watcher, a scalability bottleneck at high Pod counts.
- EndpointSlice splits the same information across multiple smaller objects (default cap 100 per slice), so a single Pod's change only propagates that one slice, not the whole set.
- EndpointSlices also added cleaner dual-stack IP support and a more extensible structure for features like topology-aware routing.
- EndpointSlices are the default and authoritative mechanism since Kubernetes 1.21; the original Endpoints object is retained mainly for backward compatibility.

## Interview Follow-Up Questions

- How would you inspect EndpointSlices directly to debug a Service routing issue, rather than relying on the older Endpoints object?
- What is topology-aware routing, and how does the EndpointSlice structure make it possible?
- How would this scalability problem manifest concretely — what would you actually observe on a struggling large cluster before EndpointSlices existed?

## References

- [Kubernetes Docs: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Docs: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
