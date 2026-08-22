---
id: networking-load-balancing-health-check-flapping-001
title: "Your load balancer keeps marking healthy backend servers as unhealthy and removing them from rotation, causing capacity to drop and requests to concentrate on fewer servers. How do you diagnose and fix this?"
category: networking
subcategory: load-balancing
technologies:
  - networking
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - networking
  - load-balancing
  - health-checks
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your load balancer's health checks intermittently mark genuinely healthy backend servers as unhealthy and remove them from rotation — the servers are actually fine and serving traffic correctly when you check manually, but they get pulled anyway, concentrating load on fewer remaining servers and sometimes causing a cascading capacity problem. How do you diagnose and fix this?

## Short Answer

This is almost always either a health check that's too strict relative to normal transient latency/load (marking a momentarily-slow-but-fine server as failed) or a health check endpoint that doesn't accurately represent the service's actual health (checking something too shallow, like TCP connectivity, or too deep, like a dependency that's flaky but doesn't actually affect the service). Fix by tuning the failure threshold to tolerate brief transient blips, and making sure the health check endpoint's logic actually correlates with genuine service health, not a proxy that's noisier than reality.

## Detailed Explanation

The core diagnostic question is: is the health check correctly identifying real problems that are just intermittent, or is it a false positive — the check says unhealthy when the service genuinely wasn't actually failing to serve real traffic. Distinguishing these requires actually correlating health check failures against real request success/failure during the same window, not just assuming the health check's verdict is accurate.

## Symptoms

- Backend servers are removed from the load balancer's rotation intermittently, then re-added shortly after, without any corresponding real incident.
- Manually checking a "failed" server during or right after a flap shows it responding normally.
- Load concentration on remaining servers sometimes triggers a secondary, real problem (increased latency or actual failures) as a consequence of the flapping itself.

## Possible Causes

- The health check's failure threshold is too strict (e.g., marking unhealthy after a single failed check) relative to normal, brief transient latency spikes the service occasionally has under real load.
- The health check interval and timeout are too aggressive for the service's actual, normal response time distribution — a check with a short timeout will register a false failure during entirely normal tail-latency moments.
- The health check endpoint itself checks something that's a poor proxy for real service health — either too shallow (just TCP accept, missing real application-level failures) or too deep (checking a downstream dependency that has its own transient flakiness, dragging the health check down even though the service itself could still serve most real requests fine).
- The health check requests themselves are adding meaningful load to an already-loaded backend, creating a feedback loop where checking health makes health worse.

## Investigation Steps

1. Correlate health check failure timestamps against real application request success/failure rates for the same backend during the same window — if real requests were succeeding while the health check failed, that's strong evidence of a check-specific issue, not a real service problem.
2. Review the health check configuration: failure threshold (how many consecutive failures before marking unhealthy), interval, and timeout — compare the timeout against the service's actual p99 response time under normal load.
3. Inspect what the health check endpoint actually does — does it just confirm the process is listening, run a lightweight internal check, or call out to a downstream dependency (database, cache, another service)?
4. Check whether health check failures correlate with periods of genuinely higher load on the backend, which would point toward the check being too strict for normal load variance rather than a real problem.

## Resolution

1. **Tune the failure threshold to tolerate brief transient blips**: require multiple consecutive failures (not just one) before marking a backend unhealthy, and set the timeout with real margin above the service's normal p99 response time, not its median.
2. **Fix the health check endpoint to accurately reflect real service health**: if it's too shallow, add a lightweight internal check confirming the application can actually serve a real request path, not just that a process is listening; if it's too deep (checking a flaky downstream dependency that doesn't actually block real request serving), narrow the check to what genuinely determines whether this backend can serve traffic.
3. **Verify the fix by observing whether flapping stops** while confirming genuine failures (a backend that's actually broken) are still correctly detected — the goal is eliminating false positives, not making the health check unable to detect real problems.
4. **If health checks themselves are adding meaningful load**, reduce their frequency or make the check itself lighter-weight, so checking health doesn't contribute to the load problem it's trying to detect.

## Prevention

- Base health check thresholds on the service's actual, measured response time distribution under normal load, not an arbitrary default value.
- Design health check endpoints deliberately to reflect genuine service health — neither too shallow (missing real failures) nor too deep (coupling health to a dependency's own transient issues that don't actually block real requests).
- Monitor health check flap rate as its own signal, investigating any non-trivial baseline flapping rather than treating a small amount as normal noise.

## Key Takeaways

- Health check flapping on genuinely healthy servers is usually either too strict a failure threshold/timeout, or a health check endpoint that's a poor proxy for real service health.
- Correlate health check failures against actual request success/failure during the same window to distinguish a real problem from a check-specific false positive.
- Require multiple consecutive failures before marking unhealthy, and set timeouts with real margin above measured p99 latency, not the median.
- A health check endpoint should reflect genuine ability to serve real requests — not so shallow it misses real failures, not so deep it's coupled to an unrelated dependency's own flakiness.

## Interview Follow-Up Questions

- How would you design a health check for a service with a legitimately wide, bimodal response-time distribution (fast for most requests, slow for a specific subset)?
- What's the risk of tuning the failure threshold too loosely, in the opposite direction — how would you avoid missing genuinely failed backends?
- How would you handle a cascading capacity problem that's already started because of flapping-induced load concentration, separate from fixing the underlying health check?

## References

- [AWS: Elastic Load Balancing Health Checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [Kubernetes: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
