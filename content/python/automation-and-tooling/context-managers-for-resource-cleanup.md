---
id: python-automation-tooling-context-managers-cleanup-001
title: "An automation script opens a database connection, does some work, and closes it at the end — but an exception partway through leaves the connection open. Why does 'with' fix this, and how does it actually work?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - python
  - context-managers
  - resource-management
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A script opens a database connection, performs some operations, and calls `.close()` at the end. But if an exception occurs partway through, execution jumps straight past the `.close()` call, leaving the connection open — eventually exhausting the connection pool after enough failed runs. Using `with conn:` instead is the standard fix. How does this actually guarantee cleanup, mechanically?

## Short Answer

A `with` statement uses Python's context manager protocol, which guarantees the resource's cleanup method (`__exit__`) runs when the `with` block ends, regardless of whether it ended normally or via an exception — this is structurally the same guarantee Bash's `trap ... EXIT` provides, just implemented via Python's own language-level protocol rather than a shell mechanism, and it closes exactly the same class of gap: cleanup code placed "at the end" only runs if execution actually reaches that point normally, while `with` guarantees it regardless.

## Detailed Explanation

The `with` statement is built on the context manager protocol: any object implementing `__enter__` (called when the `with` block starts) and `__exit__` (called when the block ends, for any reason) can be used with `with`, and Python guarantees `__exit__` runs even if an exception propagates out of the block — this is what makes it structurally reliable in a way that manual cleanup code at the end of a function isn't.

**`__exit__` runs on exception, not just normal completion**: when code inside a `with` block raises an exception, Python still calls the context manager's `__exit__` method (passing exception details as arguments) before letting the exception continue propagating — this is the core guarantee that solves the original problem: a database connection's `__exit__` implementation closes the connection regardless of whether the block completed normally or was interrupted by an exception.

```python
with get_db_connection() as conn:
    do_work(conn)
    # even if do_work raises here, conn is still closed correctly
```

**This generalizes to any resource needing guaranteed cleanup, not just database connections**: file handles (`with open(...) as f:`), locks (`with lock:`), temporary directories, network connections — anything with an acquire/release lifecycle benefits from the same pattern, and Python's standard library provides context manager support for most of these built-in resource types already.

**Writing your own context manager is straightforward, via a class or a decorator**: implementing `__enter__`/`__exit__` on a class works for more complex cases, but `contextlib.contextmanager` lets you write a context manager as a generator function with a single `yield` marking the boundary between setup and teardown — often simpler for straightforward acquire/release patterns:

```python
from contextlib import contextmanager

@contextmanager
def db_connection():
    conn = create_connection()
    try:
        yield conn
    finally:
        conn.close()
```

The `try`/`finally` inside the generator is what actually provides the guarantee — code after `yield` runs when the `with` block exits, and `finally` ensures it runs whether the block completed normally or raised an exception, mirroring exactly the same guarantee a class-based `__exit__` provides.

**Multiple resources can be managed together, and nested/multiple `with` statements close in the correct reverse order**: `with open('a') as fa, open('b') as fb:` (or nested `with` blocks) ensures both files are properly closed even if an exception occurs partway through, with cleanup happening in the correct reverse-acquisition order, mirroring how you'd want resource cleanup to happen manually if you were writing it out by hand correctly.

## Key Takeaways

- The `with` statement guarantees a context manager's cleanup (`__exit__`) runs when the block ends, whether normally or via an exception — solving the same class of gap Bash's `trap ... EXIT` solves for shell scripts.
- Manual cleanup code placed "at the end" of a function only runs if execution reaches that point normally, exactly the gap that caused the original bug.
- `contextlib.contextmanager` lets you write a context manager as a generator with `try`/`finally` around a single `yield`, often simpler than a full class-based implementation for straightforward acquire/release patterns.
- This pattern applies to any resource with an acquire/release lifecycle — files, locks, connections, temporary directories — not just database connections specifically.

## Interview Follow-Up Questions

- How would you handle a case where cleanup itself might fail — should that exception be suppressed, or should it propagate alongside (or instead of) the original exception?
- What's the difference between using a context manager and using a `try`/`finally` block directly without one?
- How would you write a context manager that needs to conditionally suppress an exception under specific circumstances?

## References

- [Python docs: with statement](https://docs.python.org/3/reference/compound_stmts.html#the-with-statement)
- [Python docs: contextlib](https://docs.python.org/3/library/contextlib.html)
