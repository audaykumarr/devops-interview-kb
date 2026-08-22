---
id: cloud-architecture-cost-optimization-reserved-spot-ondemand-001
title: "How would you decide what mix of Reserved Instances, Spot Instances, and On-Demand capacity to use across a workload with both steady baseline traffic and unpredictable spikes?"
category: cloud-architecture
subcategory: cost-optimization
technologies:
  - aws
difficulty: intermediate
question_type:
  - comparison
tags:
  - cloud-architecture
  - cost-optimization
  - compute
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your workload has a steady, predictable baseline traffic level, plus unpredictable spikes on top of it, and occasional large batch jobs that can tolerate interruption. How would you decide what mix of Reserved Instances, Spot Instances, and On-Demand capacity to use, rather than defaulting to one purchasing model for everything?

## Short Answer

Match the purchasing model to the actual predictability and interruptibility of each portion of your workload: cover your steady, predictable baseline with Reserved Instances (or a Savings Plan) for the deepest discount on capacity you know you'll always need; use On-Demand for unpredictable spikes above baseline, where you need guaranteed availability but don't know the pattern far enough in advance to commit; and use Spot Instances for interruption-tolerant workloads (batch jobs, non-critical background processing) where the deep discount is worth the risk of instances being reclaimed with short notice.

## Detailed Explanation

Each purchasing model trades a different combination of cost, commitment, and availability guarantee, and the right strategy is layering all three against the actual shape of your workload rather than picking one model uniformly.

**Reserved Instances / Savings Plans fit predictable, steady baseline usage**: committing to a specific usage level for a term (typically 1 or 3 years) in exchange for a significant discount (often 30-70%+ off on-demand pricing) makes sense specifically because you already know you'll be running that baseline capacity continuously — the commitment isn't a risk if the usage was already going to happen regardless. Applying this to unpredictable or spiky usage is a mismatch: you'd be committing to a level you're not certain you'll actually sustain.

**On-Demand fits unpredictable, must-have capacity**: for the portion of your workload where you genuinely don't know the pattern far enough in advance to commit (unpredictable traffic spikes above your reserved baseline) but where you need a guarantee the capacity will actually be available when you need it, On-Demand's higher per-hour price is the cost of that flexibility and guaranteed availability — a reasonable trade for capacity you can't predict but can't afford to not have.

**Spot Instances fit interruption-tolerant workloads at the steepest discount**: Spot pricing offers the largest discount (often 70-90% off on-demand) in exchange for the provider being able to reclaim the instance with short notice when they need the capacity elsewhere — this is a strong fit for batch processing, CI/CD build agents, or other workloads that can gracefully handle interruption (checkpointing progress, retrying on a different instance) but is a poor fit for anything that needs guaranteed, uninterrupted availability, like a stateful primary database or a latency-sensitive user-facing service without redundancy.

**The practical layering**: size your Reserved/Savings Plan commitment to your actual measured steady-state baseline (not your peak, and ideally with some conservatism, since over-committing to a reservation you don't use wastes the discount's value), let On-Demand handle the unpredictable portion above that baseline, and move as much interruption-tolerant work as possible to Spot to capture its steep discount specifically where the interruption risk is actually acceptable.

**This requires actually understanding your workload's traffic shape**, which is worth measuring explicitly (historical usage data, not intuition) before committing to a specific Reserved Instance/Savings Plan level — committing based on a wrong assumption about your baseline either wastes money (over-committing to unused reserved capacity) or fails to capture available savings (under-committing and paying on-demand rates for usage that was actually predictable).

## Key Takeaways

- Match each purchasing model to the actual predictability and interruptibility of the workload segment it covers, rather than choosing one model for everything.
- Reserved Instances/Savings Plans fit predictable, steady baseline usage — the commitment isn't risky because that usage was already going to happen regardless.
- On-Demand fits unpredictable spikes where you need guaranteed availability but can't commit in advance; Spot fits interruption-tolerant workloads at the steepest discount.
- Size Reserved commitments based on actual measured baseline usage data, not intuition — both over- and under-committing waste available savings.

## Interview Follow-Up Questions

- How would you handle a workload where the "baseline" itself grows over time, given Reserved Instance commitments are typically 1-3 year terms?
- How would you design a system to gracefully handle Spot instance interruption without losing in-progress work?
- What's the risk of over-relying on Spot capacity for a workload that turns out to be less interruption-tolerant than initially assumed?

## References

- [AWS: Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)
- [AWS: Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [AWS: Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
