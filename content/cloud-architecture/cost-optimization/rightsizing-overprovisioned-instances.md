---
id: cloud-architecture-cost-optimization-rightsizing-001
title: "An audit finds most of your EC2 instances are running at under 15% average CPU utilization. How would you approach rightsizing them without risking a performance incident?"
category: cloud-architecture
subcategory: cost-optimization
technologies:
  - aws
difficulty: intermediate
question_type:
  - practical
tags:
  - cloud-architecture
  - cost-optimization
  - rightsizing
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cost audit finds that most of your EC2 instances run at under 15% average CPU utilization, suggesting significant over-provisioning. How would you approach rightsizing them to smaller, cheaper instance types, without risking a performance incident from cutting capacity too aggressively?

## Short Answer

Don't rightsize based on average utilization alone — look at peak utilization over a representative period (including your actual worst-case traffic events, not just a typical day), since average-CPU-driven rightsizing is exactly what causes performance incidents when a legitimate but infrequent spike hits a now-undersized instance. Rightsize incrementally, one service at a time, monitoring closely after each change, rather than resizing everything at once based on a single metric.

## Detailed Explanation

Average utilization is a genuinely misleading metric for rightsizing on its own — a service running at 15% average CPU might spike to 90%+ during a specific, infrequent event (a batch job, a traffic surge, a monthly report generation), and resizing based only on the average would leave it with no headroom for exactly the moments capacity matters most.

**Look at the full utilization distribution, not just the average**: peak utilization (p99, or actual observed maximums) over a representative period — long enough to capture your actual worst-case patterns, not just a typical week — tells you the real minimum capacity needed, which is a fundamentally different (and much safer) basis for rightsizing than average utilization alone.

**Account for growth and headroom, not just current peak**: rightsizing to exactly match current peak utilization leaves no margin for normal growth or an unusually severe event beyond your observed history — a reasonable rightsizing target leaves some deliberate headroom above observed peak, sized based on your actual risk tolerance and how quickly you could react to underprovisioning if it did occur.

**Rightsize incrementally, verifying each change before moving to the next**: resizing many instances simultaneously based on a blanket rule risks compounding any misjudgment across your whole fleet at once — starting with a smaller, lower-risk set of services, monitoring closely after the change, and only proceeding to the next batch once confidence is established is a much safer rollout than a single large-scale resize.

**Consider whether the workload is actually a good fit for a different instance family, not just a smaller size in the same family**: sometimes low CPU utilization with, for example, high memory usage suggests the workload would be better served by a memory-optimized instance type at a smaller size, rather than simply shrinking within the general-purpose family it happens to already be running in — rightsizing is an opportunity to reconsider instance family fit, not just instance size.

**Combine rightsizing with autoscaling where the workload has genuine variability**: for workloads with real peak/trough variation, autoscaling (right-sizing dynamically based on actual current load) is often a better fit than picking one static, smaller instance size — this avoids the whole tension between "sized for peak" and "sized for average" by not requiring a single fixed size to satisfy both.

## Key Takeaways

- Rightsizing based on average utilization alone is a common mistake that risks performance incidents when a legitimate but infrequent spike hits an undersized instance.
- Base rightsizing decisions on peak utilization over a representative period that captures your actual worst-case patterns, with deliberate headroom above observed peak.
- Rightsize incrementally, verifying each batch of changes before proceeding, rather than resizing your whole fleet at once based on a blanket rule.
- Consider whether a different instance family (not just a smaller size in the current one) better fits the workload's actual resource profile, and consider autoscaling for genuinely variable workloads instead of a single static size.

## Interview Follow-Up Questions

- How would you handle a service where historical utilization data doesn't reliably predict future peak load (a rapidly growing service)?
- How would you build organizational buy-in for a rightsizing initiative, given the risk (real or perceived) of causing a performance incident?
- How would you measure the actual cost savings and confirm no performance regression after a rightsizing change?

## References

- [AWS: Rightsizing recommendations](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-rightsizing.html)
- [AWS: Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
