---
id: azure-aks-autoscaler-not-scaling-001
title: "Your AKS cluster is under CPU pressure and pods are stuck Pending, but the cluster autoscaler isn't adding nodes. How would you troubleshoot it?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - aks
  - cluster-autoscaler
  - scaling
  - azure
estimated_time_minutes: 10
companies: []
related_questions:
  - kubernetes-troubleshooting-crashloopbackoff-001
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
technology_version:
  kubernetes: "1.30"
---

## Question

Traffic has spiked, existing nodes are at CPU capacity, and new pods are stuck in `Pending`. The AKS cluster autoscaler is enabled, but no new nodes are being added. How would you troubleshoot this?

## Short Answer

Check the pending pods' scheduling events first to confirm *why* they're unschedulable (it may not be CPU at all — could be a node affinity, taint, or PVC zone mismatch the autoscaler can't solve by adding nodes), then check the cluster autoscaler's own logs and the node pool's max count and quota limits, since a maxed-out node pool or an exhausted Azure vCPU quota will silently prevent scale-up even though everything looks "enabled."

## Detailed Explanation

The cluster autoscaler only adds nodes when it determines that doing so would actually let a pending pod schedule — it doesn't just react to "a pod is pending," it simulates scheduling against a hypothetical new node. If the pending pod has a constraint a new node from the pool wouldn't satisfy anyway (a `nodeSelector`/affinity for a node type not in that pool, a toleration mismatch against the pool's taints, or a PersistentVolumeClaim bound to a specific zone the pool doesn't scale into), the autoscaler correctly determines that scaling up wouldn't help and does nothing — which looks identical to "autoscaler is broken" from the pod's perspective.

Assuming the pending reason genuinely is insufficient CPU/memory that a new node would fix, the next most common cause is a hard ceiling: the node pool's configured `--max-count` may already be reached, or the Azure subscription's regional vCPU quota for that VM SKU family may be exhausted, both of which prevent scale-up regardless of demand. AKS's cluster autoscaler surfaces these conditions in its own logs (available via the `cluster-autoscaler` pod in `kube-system` for the managed add-on, or via AKS diagnostic settings), which is where "why isn't it scaling" almost always gets answered — generic pod events won't show an Azure-side quota rejection.

It's also worth confirming the autoscaler profile's scan interval and scale-up delay settings haven't been tuned in a way that looks like "not scaling" but is actually "scaling slowly" — and confirming which node pool the autoscaler is actually targeting if the cluster has multiple pools with autoscaling enabled on only some of them.

## Symptoms

- `kubectl get pods` shows pods stuck in `Pending` for longer than the expected scale-up time.
- `kubectl get nodes` shows no new nodes appearing despite existing nodes at high CPU/memory utilization.
- Cluster autoscaler is confirmed enabled on the node pool (`az aks nodepool show`).

## Possible Causes

- The pending pod has a scheduling constraint (affinity, taint/toleration, or zone-bound PVC) that no new node from the pool would satisfy, so the autoscaler correctly declines to scale.
- The node pool has hit its configured `--max-count`.
- The Azure subscription has hit its regional vCPU quota for the VM SKU family the node pool uses.
- The cluster autoscaler add-on is only enabled on a different node pool than the one that would actually help (in a multi-pool cluster).
- The autoscaler's scale-up is happening but slowly, due to `scan-interval` or scale-up delay profile settings, and the issue is patience, not a hard failure.

## Investigation Steps

1. `kubectl describe pod <pending-pod>` and read the `Events` section for the scheduler's stated reason (`Insufficient cpu`, a `didn't match node selector`, `had untolerated taint`, or a volume-affinity conflict).
2. `kubectl get nodes -o wide` to see current node count, CPU allocatable, and which pools they belong to.
3. `az aks nodepool show --resource-group <rg> --cluster-name <cluster> --name <pool> --query "{min:minCount,max:maxCount,current:count,autoscale:enableAutoScaling}"` to confirm the pool isn't already at its max and that autoscaling is actually enabled on the right pool.
4. Check cluster autoscaler logs for scale-up attempts and their outcome: `kubectl logs -n kube-system -l app=cluster-autoscaler --tail=200` (managed AKS autoscaler add-on).
5. Check Azure subscription quota for the relevant VM SKU family: `az vm list-usage --location <region> -o table` and compare current usage against limit.
6. If multiple node pools exist, confirm which pool the pending pod's constraints would actually let it land on, and whether autoscaling is enabled specifically on that pool.

## Commands

```bash
kubectl describe pod <pending-pod> -n <namespace>
kubectl get nodes -o wide
az aks nodepool show --resource-group myRG --cluster-name myCluster --name userpool \
  --query "{min:minCount,max:maxCount,current:count,autoscale:enableAutoScaling}"
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=200
az vm list-usage --location eastus -o table
```

## Resolution

If the pending reason is a genuine capacity constraint and the node pool has headroom, confirm the autoscaler add-on is targeting the right pool and check for transient Azure-side scale-up failures in its logs (e.g. a temporary SKU unavailability in the zone). If the pool's `--max-count` is the limiter, raise it (`az aks nodepool update --max-count`) after confirming the workload growth is expected and not itself a symptom of something else (like a runaway replica count). If Azure quota is the limiter, request a quota increase for that VM SKU family/region via the Azure portal or CLI — this can take time, so it's worth having a fallback (a different SKU with available quota) to add capacity immediately. If the root cause is a scheduling constraint the autoscaler can't satisfy, fix the constraint (correct node selector, add a matching node pool, or address the PVC zone mismatch) rather than expecting the autoscaler to solve an unschedulable-by-design pod.

## Prevention

- Set proactive alerts on Azure vCPU quota utilization per SKU family, not just cluster CPU utilization, so quota exhaustion is caught before it blocks a real scale-up event.
- Set node pool `--max-count` with real headroom above expected peak, and revisit it as baseline load grows.
- Document which node pools autoscaling is enabled on and why, especially in multi-pool clusters, so "is autoscaling on the right pool" isn't a debugging step during an incident.
- Test scale-up behavior deliberately (e.g. a load test) before relying on it during a real traffic spike, so quota and configuration issues surface outside an incident window.

## Interview Follow-Up Questions

- How does the cluster autoscaler decide which node pool to scale when multiple pools could satisfy a pending pod?
- How would Karpenter-style node provisioning change this troubleshooting process compared to the traditional cluster autoscaler?
- How would you distinguish a slow scale-up from a stuck one during a live incident?

## Key Takeaways

- The autoscaler simulates scheduling — a pod that couldn't schedule on a new node anyway won't trigger scale-up, and that's correct behavior, not a bug.
- Node pool `--max-count` and Azure regional vCPU quota are both silent, hard ceilings independent of "autoscaling enabled."
- Cluster autoscaler logs, not generic pod events, are where Azure-side scale-up rejections actually show up.
- In multi-pool clusters, confirm autoscaling is enabled on the pool that would actually satisfy the pending pod's constraints.

## References

- [AKS docs: Cluster autoscaler](https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler)
- [AKS docs: Use multiple node pools](https://learn.microsoft.com/en-us/azure/aks/use-multiple-node-pools)
- [Azure docs: Azure subscription and service limits, quotas](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits)
