---
id: aws-lambda-timeout-troubleshooting-001
title: "A Lambda function times out for about 2% of invocations, seemingly at random, but works fine when you test it manually. How would you track down the cause?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - lambda
  - cold-start
  - timeout
  - serverless
estimated_time_minutes: 10
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Lambda function times out for roughly 2% of invocations, with no obvious pattern — it works fine every time you test it manually. How would you track down the cause?

## Short Answer

Pull the actual timed-out invocations from CloudWatch Logs (via Logs Insights, not manual scrolling) and check their `REPORT` line for init duration and billed duration — a cluster of failures with a large init duration points to cold starts inside a VPC or a slow-initializing dependency, while failures with normal init but long execution point to a downstream dependency (database, API, another Lambda) occasionally being slow. "Works when I test it manually" is itself a clue: manual tests are almost always warm invocations hitting a function that's already primed.

## Detailed Explanation

The reason manual testing doesn't reproduce this is usually that manual tests are low-frequency and hit an already-warm execution environment, while the 2% failing in production are disproportionately cold starts — new execution environments Lambda spins up to handle concurrent load, each of which pays an initialization cost before the handler even runs. If the function is attached to a VPC (common for anything talking to RDS or an internal service), cold start time includes ENI setup, which historically added real latency; even with today's improved VPC networking, a cold start plus a slow downstream call can still exceed a tight timeout in a way a warm invocation never does.

The second common cause is unrelated to cold starts: a downstream dependency (a database query, another service, an external API) that's usually fast but occasionally slow — a Lambda timeout set close to the typical execution time will intermittently trip on exactly those slow downstream calls, while a manual test during low load hits the downstream service when it's not under contention.

CloudWatch's `REPORT` log line for each invocation is the fastest way to tell these apart without guessing: it reports `Init Duration` (cold start cost, only present on cold starts), `Duration` (actual handler execution time), `Billed Duration`, and `Memory Size`/`Max Memory Used`. Pulling just the timed-out invocations and looking at these fields turns "seemingly random" into a specific, categorizable pattern.

## Symptoms

- A small, consistent percentage of invocations time out; the majority succeed.
- The failure doesn't reproduce under manual/interactive testing.
- No obvious correlation to time of day or deploy events at first glance.

## Possible Causes

- Cold starts, especially for VPC-attached functions, occasionally pushing total invocation time past the configured timeout.
- A downstream dependency (database, external API, another Lambda) that's usually fast but has an intermittent latency spike.
- Insufficient memory allocation — Lambda allocates CPU proportionally to memory, so an underprovisioned function can be slow enough under any real load to intermittently miss the timeout even without a cold start.
- Provisioned concurrency not covering a traffic spike, causing a burst of cold starts exactly when load increases.
- Retry/throttling behavior in a downstream AWS service (e.g. DynamoDB or RDS Proxy) that occasionally forces a slow retry inside the function.

## Investigation Steps

1. Use CloudWatch Logs Insights to query for the specific timed-out invocations by `REPORT` lines showing `Duration` at or near the configured timeout.
2. For those invocations, check whether `Init Duration` is present — its presence means it was a cold start.
3. Compare `Max Memory Used` against the configured memory to rule out memory pressure as a contributing factor.
4. If the function calls a downstream service, check that service's own latency metrics for the same timestamps to see if a spike lines up.
5. Check whether the function is VPC-attached, and if so, whether Hyperplane ENI reuse is in effect or each cold start is provisioning a fresh ENI.
6. Correlate failure timestamps against invocation concurrency/throughput metrics to see if failures cluster around traffic spikes (a cold-start signature) versus being evenly distributed (more likely a downstream dependency issue).

## Commands

```bash
aws logs start-query \
  --log-group-name /aws/lambda/my-function \
  --start-time $(date -d '2 hours ago' +%s) --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /REPORT/ | filter @message like /Duration: 1[0-9]{4}/'

aws lambda get-function-configuration --function-name my-function \
  --query '{Timeout:Timeout,MemorySize:MemorySize,VpcConfig:VpcConfig}'

aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time 2026-08-21T00:00:00Z --end-time 2026-08-21T06:00:00Z \
  --period 300 --statistics Maximum,Average
```

## Resolution

If cold starts are the cause, the fix depends on how latency-sensitive the function is: enable provisioned concurrency to keep a pool of warm environments ready (at a cost), reduce package size and initialization work outside the handler to shrink cold-start time, or simply raise the timeout if a slower-but-successful cold start is acceptable for this workload. If a downstream dependency's occasional slowness is the cause, the fix is on that dependency's side (connection pooling, read replicas, retry/backoff tuning) or increasing the timeout to tolerate its worst-case latency rather than its typical latency. If underprovisioned memory is contributing, increasing memory often reduces duration enough on its own to resolve intermittent timeouts, sometimes at a similar or lower total cost due to the shorter billed duration.

## Prevention

- Set Lambda timeouts based on the downstream dependency's worst-case observed latency, not its typical latency.
- Use provisioned concurrency for latency-sensitive, user-facing functions that can't tolerate cold-start variance.
- Alert on `Duration` approaching the configured `Timeout` (not just on outright failures), so intermittent near-misses are visible before they become full failures.
- Load-test with realistic concurrency, not just manual single-invocation testing, since cold-start behavior only shows up under concurrent/bursty load.

## Interview Follow-Up Questions

- How does Lambda's execution environment reuse work, and why does that make cold starts disproportionately affect low-traffic or bursty functions?
- What's the cost/latency tradeoff of provisioned concurrency versus just increasing the timeout?
- How would you design this function's retry behavior on the caller's side to handle the remaining, irreducible tail latency?

## Key Takeaways

- "Works when I test it manually" is a clue, not a dead end — manual tests are almost always warm invocations.
- The `REPORT` log line's `Init Duration` field is the fastest way to separate cold-start-caused timeouts from downstream-dependency-caused ones.
- Memory allocation affects CPU and therefore duration — increasing it can resolve timeouts that look unrelated to memory.
- Set timeouts based on worst-case dependency latency, not average-case, or intermittent failures are structurally guaranteed.

## References

- [AWS Lambda: Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-scaling.html)
- [AWS Lambda: Configuring provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [AWS Lambda: Monitoring functions with Amazon CloudWatch Logs Insights](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatch-logs-insights.html)
