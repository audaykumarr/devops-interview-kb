---
id: python-automation-tooling-retry-backoff-jitter-001
title: "A script calling a flaky API retries immediately with a fixed 1-second delay. During a real outage, this made things worse. Why, and how should retry logic actually be designed?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: intermediate
question_type:
  - practical
  - troubleshooting
tags:
  - python
  - retry
  - resilience
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An automation script calling a flaky internal API retries immediately on failure, using a fixed 1-second delay between attempts. During a real outage of that API, dozens of instances of this script running in parallel made the outage measurably worse rather than helping it recover. Why did this happen, and how should retry logic actually be designed?

## Short Answer

Fixed, short-interval retries across many concurrent callers create a "thundering herd" — every failed instance retries at almost the same moment, sending a synchronized burst of load at an already-struggling service, which can prevent it from ever getting enough breathing room to recover. The fix is exponential backoff (increasing the delay between successive retries) combined with jitter (randomizing the exact delay so many callers don't retry in lockstep) — this spreads retry load out over time instead of concentrating it in synchronized bursts.

## Detailed Explanation

The retry logic's actual failure mode here isn't about any single script instance — a single instance retrying with a fixed 1-second delay seems harmless in isolation — it's about what happens in aggregate when many instances hit the same failure at roughly the same time and all retry with the same fixed timing, which synchronizes their retries into repeated, coordinated bursts against a service that's already struggling.

## Symptoms

- Multiple concurrent instances of a script or service all retrying against the same downstream dependency during an outage.
- The downstream service's recovery is slower or doesn't happen at all while the retry storm continues, even after the original triggering issue would otherwise have cleared.
- Load against the failing service shows a spiky, synchronized pattern rather than a smooth distribution, correlating with the fixed retry interval.

## Possible Causes

- Retry delay is a fixed, short interval, meaning every failed caller retries at nearly the same relative time after their failure.
- No randomization (jitter) exists in the retry timing, so many callers that failed around the same original moment continue retrying in near-lockstep indefinitely.
- No backoff (increasing delay over successive attempts) exists, meaning the retry rate against the struggling service never decreases even as failures continue, unlike a backoff strategy that naturally reduces load the longer a problem persists.

## Investigation Steps

1. Confirm the retry configuration: interval, whether it's fixed or increasing, and whether any randomization exists.
2. Correlate the downstream service's load pattern during the incident against the retry interval, to confirm the synchronized-burst hypothesis with actual data rather than assuming it.
3. Estimate the actual number of concurrent callers retrying against the service during the incident, to understand the real scale of the aggregate retry load.

## Resolution

1. **Implement exponential backoff**: each successive retry waits longer than the last (commonly doubling: 1s, 2s, 4s, 8s...), which means the aggregate retry rate against the struggling service naturally decreases the longer an outage persists, rather than staying constant indefinitely.

```python
import random
import time

def retry_with_backoff(func, max_attempts=5, base_delay=1, max_delay=30):
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception:
            if attempt == max_attempts - 1:
                raise
            delay = min(base_delay * (2 ** attempt), max_delay)
            jittered_delay = delay * (0.5 + random.random())
            time.sleep(jittered_delay)
```

2. **Add jitter to randomize the exact delay**: rather than every caller waiting exactly the calculated backoff duration, adding randomization (as shown above, scaling the delay by a random factor) spreads retries across a window of time instead of many callers retrying at the exact same moment — this is what actually breaks the synchronization causing the thundering herd, since backoff alone (without jitter) still leaves many callers retrying in lockstep if they originally failed at close to the same time.
3. **Set a reasonable maximum delay and attempt count**, so backoff doesn't grow unboundedly (a caller waiting minutes between retries may no longer be useful) and so the script eventually gives up and surfaces a clear failure rather than retrying indefinitely.
4. **Verify the fix** by simulating a downstream outage in a test environment with multiple concurrent callers, confirming the retry pattern is actually spread out rather than synchronized.

## Prevention

- Use exponential backoff with jitter as the default retry pattern for any client calling a service that might legitimately be temporarily unavailable, rather than a fixed short interval.
- Consider circuit-breaker patterns for high-volume callers, where after a threshold of consecutive failures, the caller stops retrying entirely for a cooldown period rather than continuing to add load to a service that's clearly down.
- Load-test retry behavior specifically under simulated downstream failure with realistic concurrent caller counts, not just test that retry logic works for a single caller in isolation.

## Key Takeaways

- Fixed-interval retries across many concurrent callers synchronize into repeated bursts against a struggling service — a thundering herd that can prevent recovery rather than help it.
- Exponential backoff reduces aggregate retry load the longer a problem persists, since successive retries space out further apart.
- Jitter (randomizing the exact delay) is what actually breaks synchronization across many concurrent callers — backoff alone, without jitter, can still leave callers retrying in lockstep.
- Set a reasonable maximum delay and attempt count, and consider a circuit-breaker pattern for high-volume callers to stop adding load entirely once a service is clearly down.

## Interview Follow-Up Questions

- How would you design a circuit breaker to complement retry-with-backoff, and when would you reach for one over the other?
- How would you test that your retry logic actually behaves correctly under a simulated, realistic concurrent-caller outage scenario?
- What's the trade-off of a higher maximum retry count and delay versus failing fast and surfacing the error to a human sooner?

## References

- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Python docs: time.sleep](https://docs.python.org/3/library/time.html#time.sleep)
