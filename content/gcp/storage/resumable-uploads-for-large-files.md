---
id: gcp-storage-resumable-uploads-for-large-files-001
title: "A large file upload to Cloud Storage keeps failing partway through on an unreliable network — what does a resumable upload actually solve here?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: beginner
question_type:
  - conceptual
  - practical
tags:
  - gcp
  - cloud-storage
  - uploads
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Uploading a large file (several GB) to Cloud Storage over a flaky network connection keeps failing partway through, forcing a full restart from byte zero each time. What does a resumable upload actually change about this, and when would you use it versus a simple direct upload?

## Short Answer

A resumable upload splits the transfer into an initial session-creation step followed by one or more chunked upload requests, with the storage service tracking exactly how many bytes it has successfully received — if the connection drops mid-transfer, the client can query how much was actually received and resume sending from that exact byte offset, rather than restarting the entire upload from the beginning. A simple direct (single-request) upload has no such recovery mechanism — any failure mid-transfer means starting over completely.

## Detailed Explanation

**A direct upload is a single request with no recovery checkpoint**: for a straightforward, simple upload, the entire file is sent as one request body — if the connection drops at 95% complete, that 95% of transferred data is simply lost, and the only option is starting the entire upload over from byte zero.

**A resumable upload creates a session and tracks progress server-side**: initiating a resumable upload first creates a upload session (getting back a session URI), then the actual file data is sent in one or more PUT requests to that session URI — critically, the storage service tracks exactly how many bytes it has durably received for that session, which the client can query at any time.

**On failure, the client queries received-byte-count and resumes from exactly that point**: rather than restarting from zero, the client sends a status-check request to the session URI, learns the server already has (for example) the first 3.2GB durably received, and resumes uploading from that exact byte offset — dramatically reducing the wasted work from an interrupted transfer, especially valuable for large files over unreliable connections where a full restart is both slow and more likely to fail again before completing.

**Resumable uploads are the right choice specifically for large files and/or unreliable networks — not universally necessary**: for a small file over a reliable connection, the overhead of the session-creation round-trip isn't worth it, and a simple direct upload completes fine; the value of resumable uploads scales specifically with file size (more to lose on a failure) and connection unreliability (higher chance of a failure happening at all) — most GCP client libraries automatically choose resumable upload above a certain file-size threshold, without requiring the developer to make this choice manually every time.

**This is conceptually similar to (though mechanically different from) AWS S3's multipart upload**: both address the same underlying problem (large or unreliable-network file transfers needing failure recovery without a full restart), though the specific mechanics differ — S3's multipart upload splits the file into independently-uploaded parts assembled at the end, while Cloud Storage's resumable upload is a single logical transfer with a server-tracked byte offset for resumption.

## Key Takeaways

- A direct upload has no recovery mechanism — any mid-transfer failure means restarting the entire upload from byte zero.
- A resumable upload creates a server-tracked session; on failure, the client queries how many bytes were actually received and resumes from that exact offset.
- Resumable uploads are specifically valuable for large files and/or unreliable network conditions — the value scales with what's actually at risk of being lost on a failure.
- Most GCP client libraries automatically choose resumable upload above a file-size threshold, so this often doesn't require an explicit developer decision for every upload.

## Interview Follow-Up Questions

- How would you implement retry logic around a resumable upload session, including handling the case where the session itself expires before the upload completes?
- What's the mechanical difference between Cloud Storage's resumable upload and AWS S3's multipart upload, beyond just "they solve the same problem"?
- How would you design an upload flow for a browser-based client uploading directly to Cloud Storage, given the browser environment's own reliability constraints?

## References

- [Google Cloud: Resumable uploads](https://cloud.google.com/storage/docs/resumable-uploads)
