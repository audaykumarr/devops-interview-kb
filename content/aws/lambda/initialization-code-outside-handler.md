---
id: aws-lambda-initialization-code-outside-handler-001
title: "Why does Lambda initialization code placed outside the handler function only run once per environment, and how would you use that intentionally?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - aws
  - lambda
  - performance
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Code placed outside a Lambda function's handler (at module/global scope) only runs once per execution environment, not once per invocation. Why does that happen, and how would you deliberately use it to your advantage?

## Short Answer

The execution environment itself — including any module-level code that ran when it was first initialized — persists and is reused across multiple invocations while it stays warm, per Lambda's execution-environment-reuse mechanism; only the handler function itself is invoked fresh each time. This means anything placed outside the handler (imports, SDK client construction, a database connection, a loaded configuration file) executes once when the environment is first created, and is then simply reused, unmodified, by every subsequent invocation that lands on that same warm environment — a deliberate optimization opportunity for anything expensive to set up but safe to reuse across invocations.

## Detailed Explanation

**Why it happens**: an execution environment's initialization phase runs the function's module-level code once, as part of preparing that environment to be ready to handle invocations — this is distinct from, and happens before, any actual invocation of the handler function itself. Once initialized, the environment (including whatever state that module-level code created — variables, open connections, loaded data) persists in memory, and Lambda routes subsequent invocations to that same environment (while it stays warm) by simply calling the handler function again, without re-running the module-level initialization code a second time.

**Deliberate uses of this**: 

**AWS SDK client construction** — creating an SDK client (a DynamoDB client, an S3 client) involves some setup overhead; constructing it once at module scope and reusing it across invocations avoids repeating that overhead on every single invocation, meaningfully reducing per-invocation latency for warm invocations compared to constructing a fresh client inside the handler every time.

**Database/connection pooling** — establishing a database connection has real latency cost; opening it once at module scope (rather than per-invocation) means only the first invocation on a given environment pays that connection-setup cost, with subsequent invocations on the same warm environment reusing the already-open connection directly.

**Loading configuration or reference data once** — if the function needs some relatively static reference data (a configuration file, a lookup table) that doesn't change per-invocation, loading it once at module scope avoids redundantly reloading it on every single invocation.

**Caching computed or fetched values across invocations** — anything expensive to compute or fetch that's safe to reuse (not invocation-specific) can be cached in a module-scope variable, benefiting every subsequent invocation on that same warm environment, though this benefit is inherently probabilistic — it only helps for invocations that happen to land on an already-warm environment, not for genuinely cold starts.

**The caveat worth being deliberate about**: since this reuse is tied to a specific execution environment (which Lambda can create multiple instances of for concurrent invocations, and which eventually get recycled), this optimization only benefits some fraction of invocations (the warm ones), not a guarantee across all traffic — and anything cached this way needs to be safe to share across multiple invocations potentially interleaved on the same environment (Lambda doesn't guarantee strict invocation isolation for module-scope state the way it isolates each invocation's handler execution).

## Key Takeaways

- Module-level code runs once when an execution environment initializes, not once per invocation — the environment (and its module-scope state) persists and is reused across subsequent invocations while warm.
- Deliberately placing expensive, reusable setup (SDK clients, database connections, static reference data) outside the handler avoids repeating that cost on every warm invocation.
- This benefit is probabilistic, only applying to invocations landing on an already-warm environment, not a guarantee across all traffic.
- Anything cached at module scope needs to be safe to reuse across potentially multiple invocations sharing that same environment instance.

## Interview Follow-Up Questions

- What would go wrong if you cached invocation-specific (not genuinely reusable) data at module scope by mistake?
- How would you measure how much latency benefit this optimization is actually providing in production?
- How does this interact with Lambda SnapStart's approach to reducing cold-start latency?

## References

- [AWS: Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [AWS: Best practices for working with AWS Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
