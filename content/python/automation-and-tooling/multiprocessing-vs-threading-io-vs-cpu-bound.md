---
id: python-automation-tooling-multiprocessing-vs-threading-001
title: "You want to speed up a Python automation script that processes many files. Should you use threading or multiprocessing? What does the GIL actually have to do with this decision?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: intermediate
question_type:
  - comparison
tags:
  - python
  - concurrency
  - performance
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want to speed up a Python script that processes many files, and you're deciding between using the `threading` module or `multiprocessing`. What does Python's Global Interpreter Lock (GIL) actually have to do with this decision, and how do you decide?

## Short Answer

The GIL means only one thread can execute Python bytecode at a time within a single process, so threading doesn't provide real parallelism for CPU-bound work (actual Python computation) — but it does provide real concurrency benefit for I/O-bound work (waiting on network calls, disk reads, subprocess calls), since a thread waiting on I/O releases the GIL, letting other threads run during that wait. For genuinely CPU-bound work that needs real parallelism, `multiprocessing` is the right tool, since each process has its own Python interpreter and its own GIL, allowing actual simultaneous execution across CPU cores.

## Detailed Explanation

The GIL is a mutex that ensures only one thread executes Python bytecode at any given moment within a single process — a design choice in CPython that simplifies memory management (avoiding many classes of concurrency bugs around reference counting) at the cost of preventing true multi-core parallelism for pure Python code running under `threading`.

**For I/O-bound work, threading genuinely helps despite the GIL**: when a thread makes a blocking I/O call (a network request, reading a file, waiting on a subprocess), it releases the GIL for the duration of that wait — meaning other threads can run Python code during that time. For a script processing many files where most of the actual wall-clock time is spent waiting on network calls or disk I/O rather than doing CPU-intensive computation, `threading` (or `asyncio`, an alternative model for the same I/O-bound case) provides real, substantial speedup by overlapping those waits, even though only one thread's Python code executes at any literal instant.

**For CPU-bound work, threading provides no real parallelism benefit**: if the file processing itself is computationally intensive (parsing, transforming, computing something over the data), the GIL means only one thread can actually execute that Python code at a time regardless of how many threads you spawn — adding more threads for CPU-bound work doesn't speed up the computation itself, and can even slightly slow things down due to thread-switching overhead without any compensating benefit.

**`multiprocessing` sidesteps the GIL by using separate processes, each with its own interpreter**: since each process has its own independent Python interpreter and its own GIL, CPU-bound work distributed across multiple processes can genuinely execute in parallel across multiple CPU cores — this is the correct tool for actually speeding up CPU-intensive Python computation, at the cost of higher memory overhead (each process has its own memory space, so data has to be explicitly passed between processes rather than shared directly) and the overhead of process creation itself.

**The practical decision framework**: profile or reason about where your script's actual time is going — if it's dominated by waiting on I/O (network calls, disk, subprocess), `threading` or `asyncio` provides real benefit with lower overhead than `multiprocessing`; if it's dominated by actual CPU computation in Python, `multiprocessing` is needed to get genuine parallel speedup, since threading's concurrency doesn't translate into CPU parallelism under the GIL.

**A common pattern for genuinely mixed workloads**: some scripts benefit from both — using `multiprocessing` to distribute CPU-bound work across cores, with each process potentially using `threading`/`asyncio` internally to overlap I/O waits within its own share of the work — though this added complexity should be justified by measured performance need, not applied preemptively without evidence it's actually necessary.

## Key Takeaways

- The GIL means only one thread executes Python bytecode at a time within a process, so `threading` provides no real parallelism for CPU-bound Python computation.
- Threading still genuinely helps I/O-bound work, since a thread waiting on I/O releases the GIL, letting other threads' Python code run during that wait.
- `multiprocessing` sidesteps the GIL entirely by using separate processes with independent interpreters, enabling true parallel execution for CPU-bound work across multiple cores.
- Decide based on where your script's actual time goes: I/O-bound favors `threading`/`asyncio`; CPU-bound requires `multiprocessing` for genuine speedup.

## Interview Follow-Up Questions

- How would you profile a script to determine whether it's actually I/O-bound or CPU-bound before choosing a concurrency approach?
- What's the trade-off of `asyncio` versus `threading` for I/O-bound work specifically?
- How would you share data efficiently between processes in a `multiprocessing`-based solution, given each process has its own separate memory space?

## References

- [Python docs: Thread State and the Global Interpreter Lock](https://docs.python.org/3/c-api/init.html#thread-state-and-the-global-interpreter-lock)
- [Python docs: multiprocessing](https://docs.python.org/3/library/multiprocessing.html)
