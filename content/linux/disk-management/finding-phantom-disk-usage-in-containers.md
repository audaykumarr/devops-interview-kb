---
id: linux-disk-management-phantom-disk-usage-in-containers-001
title: "How would you find the same df/du phantom-disk-usage issue on a containerized workload, where the culprit process might be in a different mount namespace?"
category: linux
subcategory: disk-management
technologies:
  - linux
  - docker
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - linux
  - containers
  - disk-space
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A host is running low on disk space, and the classic deleted-but-open-file culprit is suspected — but the processes on this host are containerized, each potentially in its own mount namespace. How does that complicate finding the culprit compared to a plain, non-containerized host?

## Short Answer

`lsof +L1` run on the host still finds deleted-but-open files across all processes visible to it, since the host can see into every container's process from the host's own PID namespace — the complication isn't that the file becomes invisible, it's correctly identifying *which container* a given open file descriptor belongs to, since the process holding it appears in the host's process list but its filesystem context is a different container's overlay/mount namespace, requiring correlating the PID back to a specific container.

## Detailed Explanation

Containers share the host kernel, so the host's own process and file-descriptor visibility already spans every container running on it — the missing piece is purely the mapping from a raw host-visible PID to the specific container that PID belongs to.

## Symptoms

- Host-level disk usage (`df`) shows a filesystem at or near full, but `du` totals across the visible filesystem don't account for the gap.
- The suspected cause is a container's process holding a deleted file open, but which container isn't immediately obvious.

## Possible Causes

- A containerized process has a deleted-but-open file, most commonly a log file rotated incorrectly inside the container.
- The container's writable layer or a bind-mounted host directory is where the phantom disk usage is actually accumulating.

## Investigation Steps

1. Run `lsof +L1` on the **host** (not inside any individual container) — since containers are just processes from the host's perspective (sharing the host kernel), the host's `lsof` can see every process's open file descriptors, including deleted-but-open ones, across every container.
2. For any deleted-but-open file found, identify the owning process's PID from `lsof`'s output.
3. Correlate that PID back to a specific container: `docker inspect --format '{{.State.Pid}}' <container>` for each running container, matching against the PID found, or more directly, use `docker top <container>` for each container to see its process list, or a single pass via `for c in $(docker ps -q); do echo "$c: $(docker top $c)"; done` to build the mapping quickly.
4. Once the owning container is identified, confirm whether the growing file lives in that container's writable layer (typically under `/var/lib/docker/overlay2/<container-id>/...` on the host) or on a bind-mounted host directory — this determines whether restarting the container alone frees the space, or whether the bind-mounted host path itself needs attention.

## Commands

```bash
sudo lsof +L1

for pid in <found-pids>; do
  for c in $(docker ps -q); do
    cpid=$(docker inspect --format '{{.State.Pid}}' "$c")
    [ "$cpid" = "$pid" ] && echo "PID $pid belongs to container $c"
  done
done

docker top <container>
docker inspect --format '{{.GraphDriver.Data.MergedDir}}' <container>
```

## Resolution

Once the specific container is identified, the fix mirrors the non-containerized case: restart the container (or specifically the process inside it, if the container supports that) to release the deleted file's held-open descriptor and free the space — for a containerized workload, restarting the container is usually the simplest reliable way to guarantee the process re-opens a fresh handle, since directly signaling a process inside another mount/PID namespace to reopen a log file can be more awkward to target correctly from the host.

## Prevention

- Configure log rotation *inside* the container image/application the same way as the non-containerized case (`copytruncate` or signal-based reopening) — container log rotation footguns are the same underlying issue, just easier to lose track of across many containers.
- Monitor each container's actual disk usage (via `docker stats`, or cAdvisor/Prometheus metrics if using Kubernetes) rather than only host-level aggregate disk usage, so a specific container's growing phantom usage is visible before the host-level filesystem fills up entirely.
- Prefer sending container logs to stdout/stderr and letting the container runtime's own logging driver handle rotation externally, rather than each application managing its own log files inside the container — sidesteps this entire class of issue for logs specifically.

## Key Takeaways

- `lsof +L1` run on the host still finds deleted-but-open files across all containerized processes, since containers share the host kernel and are visible to the host's process/file-descriptor view.
- The complication is correlating a found PID back to a specific container, not the file itself becoming invisible.
- `docker inspect`/`docker top` provide the PID-to-container mapping needed to identify the culprit.
- Sending logs to stdout/stderr and letting the container runtime handle rotation externally avoids this entire class of issue for logging specifically.

## Interview Follow-Up Questions

- How would this investigation differ on a Kubernetes cluster with many nodes, versus a single Docker host?
- Why might restarting a container not fully resolve the issue if the growing file lives on a bind-mounted host path rather than the container's own writable layer?
- How would you build a check that proactively detects this pattern across a fleet of containers, rather than discovering it during an incident?

## References

- [Linux man-pages: lsof(8)](https://man7.org/linux/man-pages/man8/lsof.8.html)
- [Docker Docs: View logs for a container or service](https://docs.docker.com/engine/logging/)
