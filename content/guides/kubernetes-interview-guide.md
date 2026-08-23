---
id: kubernetes-interview-guide
title: "Kubernetes Interview Guide"
description: "A structured path through Kubernetes interview prep — what to learn first, what interviewers probe for at each level, and which questions to practice."
guide_type: interview
category: kubernetes
categories:
  - kubernetes
technologies:
  - kubernetes
  - helm
  - argocd
  - prometheus
interview_levels:
  - junior-devops
  - devops-engineer
  - senior-devops
  - sre
  - devsecops
  - staff-principal
estimated_reading_minutes: 12
featured_questions:
  - kubernetes-troubleshooting-crashloopbackoff-001
  - kubernetes-networking-service-routing-001
  - kubernetes-scheduling-pod-pending-untolerated-taint-001
  - kubernetes-storage-pod-pending-pvc-not-binding-001
  - kubernetes-rbac-serviceaccount-forbidden-after-deployment-001
  - kubernetes-resource-management-oomkilled-001
  - kubernetes-autoscaling-hpa-not-scaling-despite-latency-001
  - kubernetes-admission-webhook-certificate-expiry-outage-001
related_guides: []
related_technologies:
  - docker
  - terraform
  - gitops
status: published
last_reviewed: 2026-08-23
last_updated: 2026-08-23
---

## Introduction

Kubernetes interviews rarely stay on the surface for long. A question that opens as "how do Services work" is usually a setup for "now here's a Service that isn't routing traffic — where do you look first." This guide is built around that pattern: it sequences the concepts in the order they actually build on each other, tells you what each interview level is really being screened for, and points you at the specific questions in this site's Kubernetes bank (128 of them, spanning every difficulty and topic area) that are worth your limited prep time.

This is not a copy of the question bank. Every section below explains *why* a topic matters and *how* to approach it — the actual answers, commands, and investigation steps live in the linked questions themselves, which this guide never duplicates.

## Who This Guide Is For

This guide is written for engineers preparing for a DevOps, SRE, or Platform Engineering interview where Kubernetes is a significant part of the role — which today is most of them. It's useful whether you're:

- **New to Kubernetes interviews** and need a sequence to follow rather than randomly sampling questions.
- **Experienced with Kubernetes operationally** but have never had to articulate your reasoning out loud under interview pressure, where "I'd just check the logs" isn't a complete answer.
- **Targeting a specific level** — the further down this guide you go, the more it shifts from "does this candidate know the objects" toward "does this candidate reason correctly about failure modes and trade-offs."

It assumes you're preparing for a role that actually operates Kubernetes clusters day to day, not an academic quiz on Kubernetes internals for their own sake. If your interview is purely about container orchestration theory with no production angle, some of the later, judgment-heavy sections will be less relevant to you — the fundamentals sections still apply.

## Prerequisites

Before working through this guide, you should already be comfortable with:

- Basic container concepts (what an image is, what a container actually isolates, the difference between an image and a running container) — if these are shaky, container fundamentals belong on your list before Kubernetes-specific prep.
- Reading and writing simple YAML.
- Basic Linux process and networking concepts (processes, ports, DNS resolution) — Kubernetes networking questions assume this baseline and won't re-explain it.
- Comfort with a command-line shell — `kubectl` fluency is itself part of what's being evaluated, but you should already be generally comfortable typing commands and reading their output before adding Kubernetes-specific syntax on top.

You do **not** need prior production Kubernetes experience to use this guide productively — the Learning / Interview Path below is sequenced to build that understanding from the ground up. You do need the prerequisites above already in place, since this guide (and the question bank it links to) doesn't re-teach them.

## Learning / Interview Path

Work through these in order. Each one builds on assumptions from the ones before it — jumping straight to Networking or Autoscaling without a solid grip on Scheduling will leave gaps that show up as vague answers later, even if you technically "know" the later topic in isolation.

1. **Fundamentals & Core Objects** — Pods, Deployments, and the controller pattern that underlies almost everything else in Kubernetes. If you only remember one thing from this stage, make it this: Kubernetes is a collection of controllers continuously reconciling observed state toward desired state. Nearly every "why did X happen" question in later stages traces back to that one idea.
2. **Scheduling** — how the scheduler actually places pods, and the specific mechanisms (taints/tolerations, affinity/anti-affinity, resource requests) that constrain or redirect that placement. This is a prerequisite for autoscaling, which is really "scheduling plus a feedback loop."
3. **Resource Management & Autoscaling** — requests vs. limits, QoS classes, HPA/VPA, and the cluster-level capacity questions (cluster autoscaler, node provisioning latency) that only make sense once scheduling is solid.
4. **Networking** — Services, Endpoints, DNS, and CNI-level cross-node connectivity. This is consistently one of the areas where candidates who've only used Kubernetes casually (rather than debugged it under pressure) fall short, because networking failures are frequently silent rather than erroring loudly.
5. **Storage** — PersistentVolumes, PersistentVolumeClaims, StorageClasses, and the access-mode subtleties (`ReadWriteOnce` is node-scoped, not pod-scoped) that trip up even experienced candidates.
6. **Configuration** — ConfigMaps, Secrets, and the propagation-timing gotchas (a Secret consumed via `envFrom` needs a restart; a volume-mounted one doesn't, but lags) that show up constantly in real incidents.
7. **RBAC & Cluster Security** — authorization, ServiceAccounts, and cluster-hardening concerns like kubelet API exposure and read-only root filesystems. Treat this as one continuous topic, not two — access control and cluster hardening are the same discipline applied at different layers.
8. **Admission Control** — mutating and validating webhooks, and the operational risks specific to them (certificate expiry taking down the whole cluster, multiple webhooks interacting unexpectedly). This is consistently the area where staff/principal-level questions concentrate, because webhook failures have outsized blast radius.
9. **CRDs & Operators** — how custom resources, controllers, finalizers, and owner references extend Kubernetes' own reconciliation model to manage things Kubernetes doesn't natively understand (a database, a certificate, an Argo CD Application).
10. **Architecture & System Design** — pulling every earlier topic together into cluster-level design decisions: control plane sizing and etcd performance, multi-tenancy models, and how you'd actually design a platform on top of everything above.

Notice **troubleshooting isn't its own numbered stage.** It's the single largest question_type in this bank (44 of the 128 Kubernetes questions), and it's deliberately spread across every topic above rather than collected in one place — because that's how it actually shows up in interviews and in production. Once you've worked through a topic's fundamentals, immediately practice its troubleshooting questions before moving on; see the Scenario & Troubleshooting Focus section below for how to do that systematically.

## Key Concepts

A handful of ideas recur across nearly every topic above. If you can explain each of these precisely — not just recognize the term — you're in good shape for most of what follows:

- **Reconciliation, not imperative execution.** Controllers don't "do" things once; they continuously compare desired state (spec) against observed state (status) and act on the difference. This explains why a `kubectl apply` that "did nothing visible" might still be working correctly, and why manually patching a live object is fragile — the next reconciliation loop can silently revert it.
- **Requests vs. limits are different mechanisms with different consequences.** Requests drive scheduling decisions and (for CPU) HPA math; limits drive OOM kills and CPU throttling. Confusing the two is behind a surprising fraction of "why is this failing" questions.
- **A Service routes to Endpoints, not to pods directly.** Endpoints are populated by matching the Service's selector against pod labels, filtered by readiness. A perfectly healthy pod with a mismatched label produces a Service with zero Endpoints — and no error anywhere.
- **`Pending` and `Terminating` both mean "waiting on a precondition," not "broken."** A Pending pod is waiting on a scheduling decision (capacity, taints, affinity, volume binding); a stuck Terminating pod is usually waiting on a finalizer or a node that can't confirm it's actually gone. Both require identifying *what specifically* is being waited on, not guessing.
- **Cluster-level control plane health (etcd, the API server, admission webhooks) is a distinct failure domain from workload health.** A perfectly correct Deployment can fail for reasons that have nothing to do with its own spec — a slow admission webhook, an etcd disk-latency problem, an expired webhook certificate. Staff/principal-level questions concentrate here precisely because these failures are rarer but far more consequential.

## Interview Focus

What's actually being evaluated shifts meaningfully by level, even when the surface topic (say, "tell me about Services") looks the same:

- **Junior DevOps / DevOps Engineer** — do you know what the core objects are and what they're for, and can you use `kubectl` to actually investigate a straightforward problem (a Pending pod, a CrashLoopBackOff)? Interviewers are checking for real hands-on fluency, not memorized definitions.
- **Senior DevOps** — can you reason about *why* something is happening, not just recognize the symptom? This is where "the Service has no Endpoints" needs to become "here's how I'd confirm that, and here's the three most likely reasons it happened."
- **SRE** — expect more weight on observability, incident response process, and designing for failure (PodDisruptionBudgets, autoscaling headroom, alerting on the right signals) rather than pure object mechanics.
- **DevSecOps** — RBAC, admission control, and cluster hardening questions carry more weight; expect to be asked not just "how does this work" but "what's the actual blast radius if this is misconfigured."
- **Staff / Principal** — architecture and system-design questions dominate: control plane scaling, multi-tenancy trade-offs, and judgment calls with no single correct answer, where the interviewer is evaluating how you reason under ambiguity, not whether you land on their preferred answer.

Across every level, the strongest answers name the actual `kubectl` command or field you'd check, not just the general idea — "I'd look at the Service's Endpoints" is weaker than "I'd run `kubectl get endpoints <name>` and compare the pod IPs it returns against `kubectl get pods -o wide`."

## Practice Questions

The list below is generated live from the current Kubernetes question bank — nothing here is a fixed list that goes stale as new questions are added. Start with **Must Practice** for a fast, representative cross-section, then use the difficulty and interview-level groupings to focus your remaining time on where you actually need it.

## Scenario & Troubleshooting Focus

Troubleshooting is where Kubernetes interviews most often separate candidates who've operated real clusters from candidates who've only read about them — because the *investigation process* matters as much as the eventual fix. A strong answer to "a pod is stuck Pending" doesn't jump straight to a guess; it walks a narrowing sequence: what does `kubectl describe pod` actually say in its Events, is this a scheduling problem or an admission problem, what's the specific resource/taint/volume constraint involved.

The full set of troubleshooting-typed Kubernetes questions is available at [Kubernetes Troubleshooting Questions](/type/troubleshooting?category=kubernetes) — 44 questions spanning scheduling, networking, storage, autoscaling, RBAC, and admission control, each built around a real production symptom rather than a textbook definition. The scenario-style questions (open-ended, judgment-heavy situations rather than single-symptom debugging) are at [Kubernetes Scenario Questions](/type/scenario?category=kubernetes).

When practicing these, resist the urge to jump straight to the "Resolution" section of a question's answer. Read the symptom, write down (even mentally) what you'd actually check first and why, and only then compare against the question's own Investigation Steps — that rehearsal is what actually transfers to a live interview, since being handed the answer and recognizing it as correct is a different skill from producing it yourself under pressure.

## Common Mistakes

- **Treating `kubectl` command memorization as the goal.** Interviewers can tell the difference between someone who's memorized `kubectl get pods -o wide` and someone who understands *why* that specific command answers the question at hand. Understand the reasoning, and the commands follow naturally.
- **Answering at the wrong altitude for the role.** A junior-level answer that's all mechanics ("here's the YAML") reads as thin at senior level; a senior-level answer that's all trade-off discussion with no concrete command or field reads as vague at junior level. Calibrate to what Interview Focus above says your target level is actually evaluating.
- **Skipping networking and storage because they feel less "interesting" than autoscaling or CRDs.** These are consistently under-practiced relative to how often they actually come up, precisely because their failure modes are often silent rather than loudly erroring.
- **Preparing troubleshooting and architecture as separate, unrelated skills.** The best system-design answers are informed by having actually debugged the failure modes being designed around — practice them together, not sequentially in isolation.
- **Not distinguishing "I don't know" from "let me reason through what I'd check."** Kubernetes has enough surface area that no one knows every corner. Interviewers consistently rate "I haven't hit that specifically, but here's how I'd investigate it" far higher than a confident wrong guess.

## Recommended Preparation Path

If you have limited time before an interview, prioritize in this order:

1. **Start here:** Work through the Must Practice list above — it's deliberately spread across troubleshooting, networking, scheduling, storage, RBAC, resource management, and admission control, giving you a representative sample of the whole bank in under an hour.
2. **Next:** Go back to the Learning / Interview Path and spend real time on whichever numbered stage felt weakest while doing the Must Practice set — don't move forward until that gap is closed, since later stages assume it.
3. **Then:** Work through the troubleshooting questions for your two or three weakest topic areas specifically (linked above), since troubleshooting fluency is both the largest single category in this bank and the area interviewers weight most heavily as a real signal.
4. **Advanced / final pass:** If you're targeting Senior, SRE, DevSecOps, or Staff/Principal specifically, use the "Prepare by Interview Level" links below to pull the question set scoped to your actual target level, and focus your remaining time there rather than continuing to work broadly.

## Related Guides

More interview guides — AWS, Terraform, and a general DevOps guide — are in progress and will be cross-linked here once published.

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Kubernetes: Concepts](https://kubernetes.io/docs/concepts/)
