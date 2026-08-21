---
id: python-scripting-global-sort-needs-full-dataset-001
title: "How would you handle a data transformation that genuinely needs to see the whole dataset at once, like a global sort, when streaming isn't an option?"
category: python
subcategory: scripting
technologies:
  - python
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - python
  - memory
  - data-processing
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Streaming/chunked processing solves most large-file memory problems, but some operations — a global sort across the entire dataset, a deduplication pass requiring the whole dataset's context — genuinely can't be done by looking at one record at a time. How do you handle a transformation like that within a fixed memory budget?

## Short Answer

Use an external (disk-based) algorithm instead of an in-memory one: sort manageable chunks in memory, write each sorted chunk to disk, then merge the sorted chunks together in a streaming fashion (an external merge sort) — this bounds peak memory to roughly one chunk's size regardless of total dataset size, trading disk I/O and some added complexity for memory that no longer scales with input size.

## Detailed Explanation

The fundamental issue with something like a global sort is that, in the general case, you can't know a record's final position in sorted order without having seen (or at least indexed) every other record — a genuine full-dataset dependency that streaming per-record processing structurally can't satisfy. The classical answer, well-established in database and systems literature, is **external sorting**: an algorithm designed specifically for sorting data too large to fit in memory, using disk as an extension of memory in a structured way.

**External merge sort, concretely**: read the input in chunks small enough to fit comfortably in memory, sort each chunk in memory (using Python's normal `sorted()`, which is efficient for an in-memory chunk), and write each sorted chunk out to a separate temporary file on disk. Once all chunks are sorted and written, perform a k-way merge: open all the sorted chunk files simultaneously, and repeatedly pull the smallest next record across all open files (a min-heap, e.g. via Python's `heapq.merge()`, does this efficiently), writing the merged, fully-sorted result incrementally to the final output. Because the merge step only ever needs to hold one record from each chunk file in memory at a time (not the whole chunk, let alone the whole dataset), peak memory during the merge phase is proportional to the number of chunks, not the total dataset size — and the initial chunk-sorting phase's peak memory is proportional to the chosen chunk size, which is a tunable parameter independent of total input size.

**Python's `heapq.merge()`** is directly built for exactly this pattern — it takes multiple already-sorted iterables (in this case, generators reading each sorted chunk file lazily) and yields their merged, fully-sorted combination lazily, without needing to materialize the full merged result in memory at once.

**For deduplication or other whole-dataset operations that aren't naturally sort-based**, a similar principle often applies: sorting the data first (via external sort) can transform a whole-dataset-dependent operation (dedup requires comparing every record against every other) into a streamable one (once sorted, duplicates are adjacent, so a single streaming pass detects and removes them by comparing each record only to its immediate predecessor) — a common technique of trading an unavoidable whole-dataset dependency for a sort, which itself has a well-understood, memory-bounded external algorithm.

**When the dataset is small enough to fit in memory with margin**, none of this complexity is necessary — reaching for external algorithms only makes sense once the dataset genuinely doesn't fit in the available memory budget; for anything smaller, Python's standard in-memory `sorted()` is simpler and faster.

## Key Takeaways

- Some operations (global sort, whole-dataset deduplication) genuinely require full-dataset context and can't be solved by simple per-record streaming.
- External (disk-based) sorting bounds peak memory to roughly one chunk's size, trading disk I/O and complexity for memory independence from total dataset size.
- Python's `heapq.merge()` is purpose-built for the k-way merge step of an external merge sort, yielding the merged result lazily.
- Sorting first can transform other whole-dataset-dependent operations (like deduplication) into a streamable pass, since sorted duplicates become adjacent.

## Interview Follow-Up Questions

- How would you choose the chunk size for the initial sort phase, balancing memory usage against the number of chunks the merge phase needs to handle?
- What would you do if the dataset is too large even for a single chunk to be sorted in memory efficiently?
- How does this external-sort approach compare to just using a database's own `ORDER BY` for datasets that are already in a database?

## References

- [Python docs: heapq — Merge multiple sorted inputs](https://docs.python.org/3/library/heapq.html#heapq.merge)
- [Python docs: sorted()](https://docs.python.org/3/library/functions.html#sorted)
