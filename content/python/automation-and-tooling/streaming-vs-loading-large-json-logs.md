---
id: python-automation-tooling-streaming-json-logs-001
title: "A log-processing script uses json.load() to parse a multi-gigabyte newline-delimited JSON log file and gets killed with an out-of-memory error. What's wrong, and how do you fix it?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - python
  - json
  - memory
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A log-processing script reads an entire multi-gigabyte newline-delimited JSON (NDJSON) log file using `json.load(f)` and gets killed with an out-of-memory error. The script only needs to compute a simple aggregate (count of error-level entries) across the file. What's actually wrong, and how do you fix it?

## Short Answer

`json.load()` (and `json.loads()`) parse their entire input into memory as a single, fully-materialized Python data structure — for a multi-gigabyte file, that means the script needs enough memory to hold the whole parsed structure at once, regardless of how simple the actual computation on it is. Since the file is newline-delimited JSON (one JSON object per line, not one giant JSON array), the fix is processing it line by line — parsing and discarding each line's JSON object individually as you go, so peak memory stays proportional to one line, not the entire file.

## Detailed Explanation

The mismatch here is between the file's actual structure (many independent JSON objects, one per line) and how it's being parsed (as if it were one giant JSON document) — NDJSON is specifically designed to be processed as a stream of independent records, and treating it that way is both correct for the format and solves the memory problem directly.

## Symptoms

- The script is killed (often with an OOM-related signal) when processing a large log file, while working fine on smaller test files.
- Memory usage grows steadily as the file is being read, correlating with file size.
- The script only needs a simple aggregate result, making the full in-memory parse unnecessary for the actual computation being performed.

## Possible Causes

- `json.load(f)` is used on a file that's actually newline-delimited JSON (many independent JSON objects), not a single JSON document — this parses and holds the entire file's worth of objects in memory simultaneously, even though NDJSON is meant to be read one record at a time.
- The computation being performed (a count, a sum, any single-pass aggregate) doesn't actually need the full dataset in memory at once, meaning the full in-memory parse is unnecessary overhead relative to what's actually needed.

## Investigation Steps

1. Confirm the file's actual format — genuinely newline-delimited JSON (one object per line) versus a single large JSON array or object — since the fix differs depending on which it actually is.
2. Confirm what the script's computation actually requires: a single-pass aggregate (count, sum, filter) needs only one record in memory at a time; some other computations (a global sort, deduplication requiring full context) genuinely need more, as covered in the related global-sort question.
3. Measure the file size and available memory to confirm the mismatch is genuinely infeasible to hold in memory at once, rather than assuming based on the OOM alone.

## Resolution

1. **For NDJSON, process line by line**, parsing and using each line's JSON object individually rather than loading the whole file at once:

```python
import json

error_count = 0
with open("logs.ndjson") as f:
    for line in f:
        record = json.loads(line)
        if record.get("level") == "error":
            error_count += 1
```

Since each line is parsed independently and the resulting object goes out of scope (eligible for garbage collection) once the loop moves to the next line, peak memory stays proportional to one record's size, not the entire file's.

2. **If the file is actually a single large JSON array (not NDJSON)**, a streaming JSON parser like `ijson` can incrementally parse array elements without materializing the whole structure in memory — a genuinely different situation from NDJSON, since a standard JSON array requires understanding its full structural nesting, which `json.load()` does eagerly and a streaming parser does incrementally.
3. **Verify the fix** by running against the actual large file and confirming memory usage stays bounded and low throughout processing, not just that the script completes without crashing.

## Prevention

- Match the parsing approach to the file's actual format and the computation's actual requirements — a single-pass aggregate over NDJSON should always be processed line by line, never loaded fully into memory.
- Test scripts against realistically large inputs during development, not just small sample files, so this class of bug is caught before it reaches production log volumes.
- Prefer NDJSON (or another line-oriented format) over a single large JSON array for log data specifically, since it's inherently friendlier to streaming processing.

## Key Takeaways

- `json.load()`/`json.loads()` fully materialize their input in memory — for a multi-gigabyte file, this requires memory proportional to the whole file, regardless of how simple the downstream computation is.
- NDJSON (one JSON object per line) is specifically designed for line-by-line streaming processing — parsing it as a single document defeats that design and causes exactly this class of memory problem.
- Processing NDJSON line by line keeps peak memory proportional to one record, not the whole file, since each parsed object goes out of scope once its line's processing is done.
- For a genuinely single large JSON array (not NDJSON), a streaming parser like `ijson` is the equivalent fix, incrementally parsing elements without materializing the full structure.

## Interview Follow-Up Questions

- How would this approach change if the aggregate computation required more than a single pass over the data (e.g., a running median)?
- How would you handle a malformed line in the middle of a large NDJSON file without crashing the entire processing run?
- How does this relate to the earlier discussion of external sorting for operations that genuinely need full-dataset context?

## References

- [Python docs: json](https://docs.python.org/3/library/json.html)
- [ijson: Iterative JSON parser](https://pypi.org/project/ijson/)
- [NDJSON specification](http://ndjson.org/)
