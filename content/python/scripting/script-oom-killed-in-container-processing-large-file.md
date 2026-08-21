---
id: python-scripting-oom-killed-processing-large-file-001
title: "A Python script that processes a large file works fine on your laptop but gets OOM-killed when run in a container with a memory limit. What's likely wrong, and how do you fix it?"
category: python
subcategory: scripting
technologies:
  - python
  - docker
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - python
  - memory
  - docker
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Python script reads a large input file, transforms each record, and writes the output. It runs fine on a laptop with 16GB of RAM, but the exact same script gets OOM-killed when run in a container with a 512MB memory limit — even though the input file itself is only 200MB. What's likely wrong, and how would you fix it?

## Short Answer

The most common cause is the script loading the entire file into memory at once (`.read()`, `.readlines()`, `json.load()` on a huge file, or building a full list/DataFrame in memory) rather than streaming it — Python's in-memory representation of parsed data is typically several times larger than the raw file bytes, so a "200MB file" can easily balloon to well over the container's 512MB limit once parsed into Python objects, especially if intermediate lists or duplicated copies are held simultaneously.

## Detailed Explanation

The laptop "working fine" is misleading — it's not that the script is memory-efficient, it's that 16GB of headroom hides an inefficient memory pattern that a 512MB cgroup limit exposes immediately. Several very common script patterns cause this multiplication effect:

- Reading a whole file into a single string or list (`f.read()`, `f.readlines()`, `list(csv.reader(f))`) holds the entire content in memory at once, rather than the peak being just "the current record."
- Python object overhead is real: each string, dict, or list element carries interpreter overhead well beyond its raw byte content, so a 200MB CSV parsed into a list of dicts (one dict per row) can easily use 3-5x the raw file size or more in Python object memory.
- Building an intermediate structure (e.g. reading everything into a list, then mapping/filtering into a second list) can temporarily hold both the original and transformed data in memory simultaneously, doubling peak usage even if the final result would be smaller.
- Using `pandas.read_csv()` on a large file without `chunksize` similarly loads the entire dataset into a DataFrame in memory, with pandas' own per-column overhead adding further multiplication.

The container's cgroup memory limit (via `cgroups`, the same mechanism discussed generally for container resource isolation) enforces a hard ceiling — when the process's resident memory crosses it, the kernel's OOM killer terminates the process outright (visible as exit code 137 in Docker/Kubernetes), with no graceful degradation and often no useful Python-level traceback, since the process is killed externally rather than raising a catchable exception.

## Symptoms

- The container exits with code 137 (SIGKILL from the OOM killer), often with no Python traceback at all.
- `docker stats` (or the equivalent Kubernetes metric) shows memory usage climbing steadily until the container is killed.
- The identical script with the identical input works fine outside the container or on a machine with much more RAM.

## Possible Causes

- The script reads the entire file into memory at once instead of streaming/iterating line by line or in chunks.
- An intermediate list or DataFrame holds a full copy of the data mid-transformation, doubling peak memory.
- A library default (e.g. `pandas.read_csv` without `chunksize`) loads everything eagerly regardless of how the script itself is written.
- A memory leak in a long-running loop (objects never released, e.g. accumulating results in a list that's never cleared) rather than a single large read — worth distinguishing from a one-time peak.

## Investigation Steps

1. Reproduce locally with the same memory limit Docker enforces in production (`docker run --memory=512m ...`) rather than debugging on an unconstrained machine.
2. Profile memory usage with `memory_profiler` or `tracemalloc` to identify which line(s) cause the largest jump in resident memory.
3. Check whether the file is read via a whole-file method (`.read()`, `.readlines()`, `json.load()`, `pd.read_csv()` without `chunksize`) versus an iterator-based one (`for line in f`, `csv.reader(f)` used as an iterator, `pd.read_csv(..., chunksize=N)`).
4. Check whether memory grows linearly with time (suggesting a leak/accumulation) or spikes once early (suggesting a single large eager read).

## Commands

```bash
docker run --memory=512m --memory-swap=512m -v "$PWD:/app" myimage python script.py

pip install memory-profiler
python -m memory_profiler script.py

python -X importtime script.py
```

```python
import tracemalloc
tracemalloc.start()
# ... run the suspect code ...
current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1e6:.1f}MB, Peak: {peak / 1e6:.1f}MB")
```

## Resolution

Rewrite the file processing to stream rather than load-all-at-once: iterate the file object directly (`for line in f`) instead of `.readlines()`, use `csv.reader`/`csv.DictReader` as an iterator instead of materializing it into a list, and for pandas, use `pd.read_csv(path, chunksize=N)` to process the file in bounded-size chunks, writing output incrementally instead of accumulating a full in-memory result. If an intermediate transformation currently builds a second full copy of the data, refactor it into a generator pipeline (or write output as each record is processed) so peak memory reflects one record/chunk at a time rather than the whole dataset at any point.

## Prevention

- Default to streaming/iterator-based file processing for any script that might run against unbounded input size, rather than reaching for `.read()`/`.readlines()` out of habit.
- Test scripts against the same memory limits production will actually enforce, not just against a comfortably over-provisioned laptop.
- Add memory profiling as a routine step when writing data-processing scripts intended to run in constrained environments, not just as a reactive debugging step after an OOM kill.
- Set container memory requests/limits based on profiled peak usage with realistic input sizes, not guessed round numbers.

## Interview Follow-Up Questions

- Why does Docker report exit code 137 specifically, and how does that map to the underlying kernel signal?
- How would you handle a case where the transformation logic genuinely needs to see the whole dataset at once (e.g. a global sort), not just streamable per-record work?
- What's the difference between the container being OOM-killed by the cgroup limit versus the host itself running out of memory?

## Key Takeaways

- A memory limit that's "fine" on a developer laptop can hide inefficient whole-file loading patterns that only surface once run under a real constraint.
- Python's in-memory representation of parsed data is typically several times larger than the raw file bytes.
- The fix is almost always switching from whole-file/whole-dataset loading to a streaming/chunked/iterator-based approach.
- Reproducing with the production memory limit locally (`docker run --memory=...`) turns a hard-to-debug production-only failure into a locally reproducible one.

## References

- [Python docs: tracemalloc](https://docs.python.org/3/library/tracemalloc.html)
- [pandas: Scaling to large datasets (chunking)](https://pandas.pydata.org/docs/user_guide/scale.html)
- [Docker docs: Runtime options with Memory, CPUs, and GPUs](https://docs.docker.com/engine/containers/resource_constraints/)
