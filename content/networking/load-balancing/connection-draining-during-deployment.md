---
id: networking-load-balancing-connection-draining-001
title: "During every deployment, a handful of in-flight requests get dropped with connection-reset errors right as old servers are terminated. How do you fix this?"
category: networking
subcategory: load-balancing
technologies:
  - networking
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - networking
  - load-balancing
  - deployment
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

During every deployment, a small number of in-flight requests fail with connection-reset errors right around the moment old backend servers are terminated to make way for new ones. Why does this happen, and how do you fix it?

## Short Answer

This happens because the old servers are being terminated while they still have active, in-flight requests — the fix is enabling connection draining (also called deregistration delay) on the load balancer, which stops sending new requests to a server marked for removal but gives its existing in-flight connections a grace period to complete naturally before the server is actually terminated.

## Detailed Explanation

The failure happens because two things are racing against each other during a deployment: the load balancer marking an old server for removal and the deployment process actually terminating that server, versus however long the server's currently in-flight requests need to finish — if termination happens before in-flight requests complete, those connections get abruptly reset, which is exactly the symptom described.

## Symptoms

- A small, consistent number of requests fail with connection-reset or similar errors during every deployment, correlating precisely with old server termination.
- The errors don't happen during normal operation, only specifically during the deployment window.
- Retrying the same failed request immediately after usually succeeds, since it lands on a different, still-healthy server.

## Possible Causes

- Connection draining (deregistration delay) isn't enabled on the load balancer, meaning a server marked for removal is terminated immediately rather than being given time to finish in-flight requests.
- The connection draining timeout is configured too short relative to how long the application's actual longest-running requests take to complete.
- The deployment process terminates the old server directly, without waiting for or respecting the load balancer's deregistration process at all.

## Investigation Steps

1. Confirm the timing correlation precisely — do the connection resets happen exactly around old-server termination, or is the pattern actually something else (a different deployment-related issue)?
2. Check the load balancer's current connection draining / deregistration delay configuration (many cloud load balancers have this off by default or set to a short default value).
3. Measure your application's actual longest-running request duration under normal conditions, to determine what draining timeout would actually be sufficient.
4. Confirm the deployment process actually removes a server from the load balancer's rotation *before* terminating the underlying instance, rather than terminating first and expecting the load balancer to notice afterward.

## Resolution

1. **Enable connection draining / deregistration delay** on the load balancer, set to a duration comfortably longer than your application's longest normal in-flight request — this ensures a server marked for removal stops receiving new requests immediately but is given real time to finish serving requests already in progress before actual termination.
2. **Ensure the deployment process sequences correctly**: mark the server for removal from the load balancer first, wait for the draining period (or for in-flight requests to genuinely complete), and only then terminate the underlying server — don't terminate the server and expect the load balancer to handle it gracefully after the fact.
3. **Verify the fix** by triggering a deployment and confirming no connection resets occur, ideally under some realistic load so genuinely in-flight requests are present during the test.

## Prevention

- Make connection draining/deregistration delay a standard part of your deployment infrastructure configuration, not something enabled reactively after first noticing this problem.
- Set the draining timeout based on actual measured request duration data, revisiting it if the application's typical request duration changes significantly over time.
- Test deployments under realistic load in a staging environment, not just with no traffic, since this specific failure mode only manifests when there are genuinely in-flight requests during the deployment window.

## Key Takeaways

- Connection resets during deployment happen because old servers are terminated while they still have in-flight requests — a timing race, not a random failure.
- Connection draining (deregistration delay) is the standard fix: stop sending new requests to a server marked for removal, but give existing requests real time to finish before termination.
- Set the draining timeout based on your application's actual measured longest-running request duration, not an arbitrary short default.
- The deployment process must sequence correctly — remove from rotation first, then terminate — not terminate and expect the load balancer to handle it gracefully afterward.

## Interview Follow-Up Questions

- How would you handle a request that's still genuinely in progress even after the draining timeout expires — should it be forcibly terminated, and what does that mean for the client?
- How does this same draining concept apply to Kubernetes pod termination (`terminationGracePeriodSeconds`, readiness gates) rather than a traditional load balancer?
- How would you monitor for this specific failure mode proactively, rather than waiting for it to be noticed via user-facing errors?

## References

- [AWS: Connection draining for Classic Load Balancers / Deregistration delay for target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-connection-draining.html)
- [Kubernetes: Pod Lifecycle — Termination of Pods](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
