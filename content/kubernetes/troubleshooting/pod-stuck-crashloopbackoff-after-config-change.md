---
id: kubernetes-troubleshooting-crashloopbackoff-001
title: "A pod goes into CrashLoopBackOff immediately after you roll out a ConfigMap change, but only in one namespace. How do you investigate it?"
category: kubernetes
subcategory: troubleshooting
technologies:
  - kubernetes
  - containers
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - crashloopbackoff
  - configmap
  - pods
  - debugging
estimated_time_minutes: 10
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

You roll out a ConfigMap change that's supposed to be identical across `staging` and `production` namespaces. In `staging` the rollout is clean. In `production`, the pod goes into `CrashLoopBackOff` immediately after the new pods start. How do you investigate and resolve this?

## Short Answer

Confirm the two namespaces actually received the same ConfigMap content (they often haven't), check the failing pod's logs and exit code to see whether it's a config parsing failure or something else entirely, and compare the full pod spec — including any namespace-specific overrides, resource limits, or mounted secrets — rather than assuming the deployment manifests are truly identical.

## Detailed Explanation

`CrashLoopBackOff` is a status, not a diagnosis — it just means the container is exiting and Kubernetes is backing off restarts. The fact that it's namespace-specific despite an "identical" ConfigMap change tells you the environments aren't as identical as assumed, so the investigation should focus on *what's different* between staging and production rather than the ConfigMap change in isolation.

Start with the exit code and logs, since they usually narrow this down fast. An exit code of `1` or a stack trace pointing at config parsing means the application is choking on the new config content itself — at which point you diff the actual ConfigMap objects in both namespaces (not the source YAML in Git, since Kustomize overlays, Helm value files, or manual `kubectl edit` drift can mean what's applied differs from what's committed). An exit code of `137` points at an OOM kill, which is common when a config change increases memory usage (e.g. a larger cache size or added connection pool) and production's resource limits are tighter or its traffic volume is higher than staging's.

It's also worth checking whether the ConfigMap is consumed as environment variables or as a mounted volume. Volume-mounted ConfigMaps update asynchronously (via kubelet sync, with a default delay) and don't trigger a pod restart on their own — so if the deployment wasn't rolled (no new ReplicaSet), the pod might be crashing due to a stale mount racing with an already-restarted dependent service, not the new config content. If it's consumed via `envFrom`, a change requires a pod restart to take effect at all, which changes what "immediately after rollout" implies.

## Symptoms

- New pods in `production` enter `CrashLoopBackOff` within seconds of creation.
- The same rollout in `staging` completes normally with healthy pods.
- `kubectl get pods` shows an increasing `RESTARTS` count and `Back-off restarting failed container` events.

## Possible Causes

- Production and staging ConfigMaps are not actually byte-identical (namespace-scoped overlay, manual edit, or a values file difference).
- The new config increases resource usage (memory/connections) and production's `resources.limits` are tighter or traffic is higher, causing OOMKill (exit 137).
- A referenced Secret or downstream dependency (e.g. a database endpoint) differs between namespaces and the new config now requires it.
- The ConfigMap is volume-mounted and the sync delay means the pod started before the updated file was available, hitting a parse error on a partial or stale file.
- A namespace-specific admission controller, `LimitRange`, or `ResourceQuota` in production rejects or alters the pod spec in a way staging's doesn't have.

## Investigation Steps

1. `kubectl get pods -n production -l app=<app>` to confirm the failure pattern and restart count.
2. `kubectl logs <pod> -n production --previous` to see the last container's output before it died.
3. `kubectl describe pod <pod> -n production` to check the exit code, reason (`OOMKilled` vs `Error`), and recent events.
4. `kubectl get configmap <name> -n production -o yaml` compared against `kubectl get configmap <name> -n staging -o yaml` (`diff` the output) to rule out drift.
5. `kubectl get deployment <name> -n production -o yaml` compared against staging to check for namespace-specific resource limits, env vars, or volume mounts.
6. If OOMKilled, check `kubectl top pod` history or the cluster's metrics/monitoring stack for the container's memory trend right before the crash.
7. Check `kubectl get resourcequota,limitrange -n production` for constraints that don't exist in staging.

## Commands

```bash
kubectl get pods -n production -l app=myapp
kubectl logs <pod-name> -n production --previous
kubectl describe pod <pod-name> -n production
kubectl get configmap myapp-config -n production -o yaml > prod-cm.yaml
kubectl get configmap myapp-config -n staging -o yaml > staging-cm.yaml
diff prod-cm.yaml staging-cm.yaml
kubectl get deployment myapp -n production -o yaml > prod-deploy.yaml
kubectl get deployment myapp -n staging -o yaml > staging-deploy.yaml
diff prod-deploy.yaml staging-deploy.yaml
kubectl get resourcequota,limitrange -n production
```

## Resolution

Once the actual divergence is identified — most commonly a ConfigMap that isn't truly identical, or a resource limit too tight for the new config's memory footprint — fix the root cause rather than the symptom: correct the ConfigMap content or the overlay generating it, or raise `resources.limits.memory` to match the new footprint with headroom. Roll the deployment again and confirm the pod reaches `Running` with a stable restart count of `0`.

## Prevention

- Generate environment-specific manifests from a single templated source (Kustomize base + overlays, or Helm with per-environment values) so "identical except intentional differences" is enforced by tooling, not assumed.
- Add a CI diff step that fails if a ConfigMap intended to be shared actually differs between environments in an unexpected way.
- Set resource requests/limits based on observed usage plus headroom, and alert on memory approaching the limit before it causes an OOMKill.
- Prefer `envFrom`/env-based config for values that must take effect atomically on pod restart, and be explicit about the sync-delay tradeoff when using volume-mounted ConfigMaps.

## Interview Follow-Up Questions

- How would your investigation differ if the pod entered `ImagePullBackOff` instead of `CrashLoopBackOff`?
- How do liveness and readiness probes interact with a pod that's crash-looping on startup?
- How would you set up alerting to catch this class of issue before it reaches production traffic?

## Key Takeaways

- `CrashLoopBackOff` is a symptom; the exit code and events tell you which category of problem you're in.
- Never assume "identical" manifests across environments — diff the actual applied objects.
- Volume-mounted ConfigMaps update asynchronously; env-based config requires a restart to apply at all.
- Namespace-scoped policies (`ResourceQuota`, `LimitRange`) can cause environment-specific failures invisible in the manifest diff alone.

## References

- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
