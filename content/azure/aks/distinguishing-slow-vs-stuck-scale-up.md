---
id: azure-aks-slow-vs-stuck-scale-up-during-incident-001
title: "During a live incident, how would you distinguish a genuinely slow autoscaler scale-up from one that's actually stuck and won't complete on its own?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - azure
  - aks
  - autoscaler
  - incident-response
estimated_time_minutes: 7
companies: []
related_questions:
  - azure-aks-autoscaler-not-scaling-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Pods are pending and you're waiting for the cluster autoscaler to add capacity. How do you tell, during a live incident, whether this is just normal (if slow) scale-up in progress versus something that's actually stuck and won't resolve without intervention?

## Short Answer

Check whether a scale-up decision has actually been made and a node is being provisioned (visible in autoscaler events and the cloud provider's VM scale set/node pool activity) versus nothing happening at all — a genuinely slow scale-up shows forward progress (a new node object appearing as `NotReady`, then transitioning to `Ready`, then the pending pod being scheduled) on a timescale of a few minutes, while a stuck scale-up shows no such progression at all, or a node stuck `NotReady` well past normal join time.

## Detailed Explanation

The distinction comes down to where in the pipeline things actually stand: decision → provisioning → node join → pod scheduling. A slow-but-working scale-up is somewhere further along that pipeline every time you check; a genuinely stuck one is frozen at the same point across repeated checks, which is the concrete signal to look for rather than just elapsed time alone.

## Symptoms

- Pods remain `Pending` significantly longer than the cluster's normal scale-up time (typically a few minutes for AKS).
- No new node appears in `kubectl get nodes` at all, or a new node appears but stays `NotReady` indefinitely.
- Autoscaler logs/events show no scale-up decision being made, or show a decision that isn't resulting in an actual running node.

## Possible Causes

- Genuinely slow (not stuck): normal cloud-provider VM provisioning latency, or scaling into a larger batch of pending pods than usual.
- Actually stuck: a quota or capacity limit preventing the requested VM size from being provisioned at all, a misconfigured node pool preventing any node from successfully joining, or the autoscaler itself not recognizing the pods as pending (a taint/toleration or node-selector mismatch making the autoscaler correctly conclude scaling wouldn't help).

## Investigation Steps

1. Check whether the autoscaler has made a scale-up decision at all: `kubectl get events --field-selector reason=TriggeredScaleUp` (or check the autoscaler's own logs if self-hosted) — no decision at all points toward a scheduling-constraint issue, not a slow-but-working scale-up.
2. If a decision was made, check whether a new node object exists: `kubectl get nodes` — a new node appearing (even if `NotReady`) confirms the autoscaler acted and the delay is now about that node successfully joining, not the autoscaler itself.
3. If a new node is stuck `NotReady`, check the underlying cloud resource (VM scale set instance status in the Azure portal/CLI) for provisioning failures — quota limits, capacity unavailability for the requested VM size, or a subnet/networking issue preventing the node from reaching the control plane.
4. If no new node appears at all, check whether the pending pod's requirements (node selector, taints/tolerations, resource requests) can actually be satisfied by any configured node pool — a real mismatch here means the autoscaler is correctly not scaling, which looks identical to "stuck" from the pod's perspective but has a completely different fix.

## Commands

```bash
kubectl get pods --field-selector=status.phase=Pending
kubectl describe pod <pending-pod> | grep -A5 Events

kubectl get events --field-selector reason=TriggeredScaleUp --sort-by='.lastTimestamp'
kubectl get nodes -o wide

az vmss list-instances --resource-group <rg> --name <vmss-name> -o table
az vmss show --resource-group <rg> --name <vmss-name> --query "sku"
```

## Resolution

If the investigation confirms genuine progress (a decision was made, a node is provisioning), the correct action is usually to wait — intervening prematurely (e.g. manually adding nodes) can conflict with the autoscaler's own reconciliation and cause confusion later. If the investigation confirms a real block (quota, capacity, misconfiguration, or an unsatisfiable scheduling constraint), the fix targets that specific cause directly — requesting a quota increase, choosing a different available VM size, correcting a taint/toleration or node-selector mismatch — rather than continuing to wait for something that won't resolve on its own.

## Prevention

- Set up alerting specifically on "pod pending longer than N minutes" so a stuck scale-up is caught proactively rather than discovered mid-incident.
- Monitor VM quota headroom for node pools proactively, so quota exhaustion is caught before it blocks a real scale-up.
- Document the normal expected scale-up timeline for the cluster so on-call engineers have a concrete baseline for "this is taking longer than normal" during an incident.

## Interview Follow-Up Questions

- How would you build alerting that specifically distinguishes "scale-up in progress" from "scale-up stuck" automatically, rather than relying on a human noticing?
- What's the risk of manually adding nodes while the autoscaler is also mid-scale-up, and how would you avoid that conflict?
- How would this investigation differ if the cluster used Karpenter instead of the traditional cluster autoscaler?

## Key Takeaways

- A genuinely slow scale-up shows forward progress — a scale-up decision, then a new node object, then that node transitioning to Ready.
- A stuck scale-up shows no such progression: no decision made, or a node stuck NotReady well past normal join time.
- "No decision made at all" often means a scheduling-constraint mismatch, not the autoscaler malfunctioning — a fundamentally different fix than a quota or capacity block.
- Intervening (e.g. manually adding nodes) before confirming which case you're in risks conflicting with the autoscaler's own reconciliation.

## References

- [AKS: Cluster autoscaler on AKS](https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler)
- [Kubernetes Autoscaler: Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
