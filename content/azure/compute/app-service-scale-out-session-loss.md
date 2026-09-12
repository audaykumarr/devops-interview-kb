---
id: azure-compute-scale-out-session-state-loss-001
title: "Right after scaling an App Service plan from one instance to several, users started randomly getting logged out and losing cart contents. What changed, and how would you fix it properly?"
category: azure
subcategory: compute
technologies:
  - azure
  - app-service
difficulty: intermediate
question_type:
  - troubleshooting
  - scenario
tags:
  - azure
  - app-service
  - scaling
  - session-state
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

An App Service plan was scaled from one instance to three to handle more traffic. Almost immediately, users started randomly getting logged out mid-session, and shopping cart contents occasionally vanished. The app's code didn't change. What actually broke, and how would you fix it — not just mask it?

## Short Answer

The app is storing session state in memory on the instance that handled the request (in-process session), which was harmless with one instance but breaks the moment there's more than one, since a user's next request can land on a different instance that has no idea their session exists. Azure's Application Request Routing can mask this temporarily via a session-affinity cookie, but that's not a real fix — the durable fix is externalizing session state to something all instances share, like Azure Cache for Redis.

## Detailed Explanation

This is a classic single-instance-to-multi-instance migration trap: code that was never designed to be stateless worked by accident with one instance, and scaling out exposed an assumption that was always wrong, not a new bug introduced by scaling itself.

## Symptoms

- Users are randomly logged out or lose in-progress state (like cart contents) after the app was scaled to multiple instances.
- The problem is intermittent and inconsistent per user — some sessions survive fine, others don't, which tracks with which instance(s) a given user's requests happen to hit.
- No related code change occurred around the time the problem started; only the instance count changed.

## Possible Causes

- **In-process (in-memory) session state**, such as ASP.NET's default InProc session provider or an app-level in-memory cache used to hold per-user state, is local to the instance's own process — an instance has no way to see another instance's in-memory session data.
- **Application Request Routing's session-affinity cookie (`ARRAffinity`)** is enabled by default and routes a given client back to the same instance where possible, which can partially mask the problem — a user's session may keep working as long as they're consistently routed to the same instance, until that instance restarts, gets recycled, or is removed during autoscale, at which point their session is simply gone.
- **Autoscale or platform-level instance recycling** removes the specific instance holding a user's in-memory state, which is the moment affinity stops being able to hide the underlying problem.

## Investigation Steps

**Confirm the session/cache mechanism the app actually uses** — check the code or framework configuration for an in-memory session provider or a static/in-process cache holding per-user data; this is the direct root cause if present.

**Check whether ARR affinity is enabled and correlate failures with instance changes** — if session loss clusters around autoscale events or instance restarts (visible in the App Service's scale history and instance-level logs), that confirms affinity was masking the problem until the specific instance holding a session went away.

**Reproduce deliberately by disabling session affinity** (Application settings → General settings → ARR affinity off) — if session loss becomes immediate and consistent instead of intermittent, that isolates the cause to in-memory, per-instance state.

## Resolution

Externalize session state to a shared store all instances can read and write — Azure Cache for Redis is the standard choice for this on App Service, with the session provider configured to use it instead of in-process memory. This removes the dependency on any single instance surviving, and makes the app's behavior correct regardless of instance count, restarts, or which instance a given request happens to land on.

## Prevention

Treat "does this work correctly with more than one instance" as a required check before relying on autoscale in production, not something to discover after the fact — any in-memory per-user state is a red flag during code review specifically because it depends on session affinity, which is a routing convenience, not a state-management guarantee.

## Key Takeaways

- In-process session/cache state is invisible across App Service instances — it works by coincidence with one instance and breaks the moment there's more than one.
- ARR session affinity can mask this problem temporarily by routing a user back to the same instance, but it isn't a fix — any instance restart or autoscale event breaks that illusion.
- The durable fix is externalizing session state to a shared backend like Azure Cache for Redis, not tuning affinity settings.
- This exact failure mode is a strong signal to specifically test "correct behavior under multiple instances" before trusting autoscale in production.

## Interview Follow-Up Questions

- What would change about this problem if the app used sticky WebSocket connections instead of standard HTTP sessions?
- How would you migrate a live production app from in-process session to Redis-backed session with minimal user impact during the cutover?
- What other kinds of in-memory state, besides session, commonly cause this same class of multi-instance bug?

## References

- [Azure App Service: Autoscaling best practices](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices)
