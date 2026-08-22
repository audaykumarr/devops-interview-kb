---
id: github-repository-governance-api-rate-limiting-001
title: "An internal tool making GitHub API calls started getting 403 errors, but checking the rate limit endpoint shows plenty of requests remaining. What else could be causing this?"
category: github
subcategory: repository-governance
technologies:
  - github
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - github
  - api
  - rate-limiting
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An internal automation tool making calls to the GitHub REST API starts receiving `403` errors. Checking `/rate_limit` shows the primary rate limit still has plenty of requests remaining, ruling out the obvious explanation. What else could be causing this?

## Short Answer

GitHub enforces secondary rate limits (also called abuse detection mechanisms) that are separate from the primary hourly request-count limit shown at `/rate_limit` — these trigger based on request concurrency, request burst rate, and specific expensive-endpoint patterns (like creating many resources in quick succession), regardless of how much of your primary quota remains. A `403` with plenty of primary quota left is the classic signature of hitting one of these secondary limits instead.

## Detailed Explanation

GitHub's rate limiting isn't a single number — the primary limit (requests per hour, tied to your authentication method) is what most people think of and what `/rate_limit` reports, but GitHub layers additional, separate abuse-prevention limits on top, specifically designed to catch patterns that look automated/abusive even when well under the primary hourly quota.

## Symptoms

- API requests receive `403` responses with a message referencing rate limiting or abuse detection.
- `/rate_limit` (or the `X-RateLimit-Remaining` response header) shows substantial primary quota still remaining.
- The pattern often correlates with either a burst of concurrent requests, or rapid sequential requests to a specific resource-creating endpoint.

## Possible Causes

- Too many concurrent requests are being made simultaneously — GitHub's secondary limits cap concurrent request volume independent of the primary hourly count.
- Requests are being made too rapidly in a short burst (e.g., many requests within a single second), triggering a burst-detection secondary limit even if the hourly total is well under the primary quota.
- The tool is hitting a specifically rate-limited "expensive" endpoint pattern — GitHub calls out certain actions (like creating many issues, comments, or PRs in quick succession) as subject to tighter secondary limits than general read requests.
- The `Retry-After` header (present on a secondary-limit `403` response) isn't being read and respected by the client, causing it to immediately retry and repeatedly re-trigger the same limit.

## Investigation Steps

1. Inspect the actual `403` response body and headers closely — GitHub's secondary rate limit responses typically include a distinct message (referencing "secondary rate limit" or "abuse detection") and often a `Retry-After` header, distinguishing them from a primary-limit `403`.
2. Review the tool's actual request pattern: how many requests are made concurrently, and how tightly are they spaced in time — this usually reveals whether a burst or concurrency pattern is the trigger.
3. Identify whether the affected requests are hitting a specific endpoint known for tighter secondary limits (issue/PR/comment creation, for instance) versus general read endpoints.
4. Check whether the client already implements any retry logic, and whether that retry logic respects a `Retry-After` header or blindly retries immediately (which would compound the problem rather than resolve it).

## Resolution

1. **Implement or fix retry logic to respect the `Retry-After` header** on a secondary-limit response, waiting the specified duration before retrying rather than immediately re-attempting (which would likely trigger the same limit again).
2. **Reduce request concurrency and add spacing between requests**, rather than firing many requests simultaneously or in a tight burst — even well under the primary hourly quota, a tool making requests too aggressively in short windows can trigger secondary limits.
3. **Batch or consolidate requests where the API supports it** (e.g., using GraphQL to fetch multiple pieces of data in one request instead of many separate REST calls), reducing the total request volume and burst intensity for equivalent work.
4. **Verify the fix** by monitoring for recurrence of `403` responses under the tool's normal, adjusted operating pattern, confirming the new pacing/concurrency actually stays under the secondary limits going forward.

## Prevention

- Design API client code to always check for and respect `Retry-After` (and generally implement exponential backoff, per the related retry-design discussion) rather than assuming a `403` always means the same thing as a primary-limit exhaustion.
- Space out and limit concurrency for any automation making bulk API calls, especially against resource-creation endpoints known to have tighter secondary limits.
- Prefer GraphQL for read-heavy use cases needing data from multiple related resources, reducing the total request count and burst intensity compared to many separate REST calls.

## Key Takeaways

- GitHub's secondary rate limits (abuse detection) are separate from the primary hourly quota shown at `/rate_limit` — a `403` with plenty of primary quota remaining is the classic signature of hitting one of these instead.
- Secondary limits trigger based on request concurrency, burst rate, and specific expensive-endpoint usage patterns, not total request count over time.
- Respect the `Retry-After` header on a secondary-limit response rather than immediately retrying, which would likely re-trigger the same limit.
- Reducing concurrency, spacing out requests, and batching via GraphQL where applicable are the practical fixes for a tool genuinely hitting secondary limits.

## Interview Follow-Up Questions

- How would you design a rate-limit-aware GitHub API client that gracefully handles both primary and secondary limits without needing separate handling logic for each?
- How would you determine, from monitoring data alone, whether an automation is at risk of hitting secondary limits before it actually starts failing?
- How does GitHub App authentication's rate limit differ from a personal access token's, and how would that affect this investigation?

## References

- [GitHub Docs: Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub Docs: Best practices for using the REST API](https://docs.github.com/en/rest/guides/best-practices-for-using-the-rest-api)
