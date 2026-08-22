---
id: gcp-storage-cors-misconfiguration-browser-upload-failure-001
title: "A browser-based app can list bucket contents but fails to upload directly to Cloud Storage with a CORS error — how do you fix the bucket's CORS configuration?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - gcp
  - cloud-storage
  - cors
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A web application, running entirely in the browser, uploads files directly to a Cloud Storage bucket using a signed URL. GET requests to read objects work fine, but the upload (a PUT request) fails with a browser console error referencing CORS. What's happening, and how would you fix the bucket's CORS configuration?

## Short Answer

The bucket's CORS configuration either doesn't include the PUT method, or doesn't allow the specific headers the upload request sends (commonly `Content-Type` or a custom header) — CORS rules must explicitly list every HTTP method and header a cross-origin request will use, and a configuration that happens to work for GET (often because GET was tested first, or because a permissive read-only default was already in place) doesn't automatically also cover PUT unless it's explicitly included.

## Detailed Explanation

The browser enforces CORS restrictions specifically for cross-origin requests — since the request is going from your application's origin to `storage.googleapis.com`, a genuinely different origin, the browser requires the storage service's response to explicitly permit the request's specific method and headers before allowing the request through at all.

## Symptoms

- GET requests from the browser application to the bucket succeed without issue.
- PUT (upload) requests from the same application to the same bucket fail with a CORS-related error in the browser console.
- The failure is specifically a browser-side CORS rejection, not a 403/permission error from Cloud Storage itself (the browser blocks the request before it would even reach the point of an actual permission check, if the CORS preflight itself fails).

## Possible Causes

- The bucket's CORS configuration's `method` list includes `GET` but not `PUT`, meaning the CORS preflight check for the upload request fails outright.
- The `responseHeader` list doesn't include a header the upload request actually sends (commonly `Content-Type`, or a custom header the application sets), causing the preflight to reject the request even if the method itself is allowed.
- The `origin` list doesn't match the application's actual origin precisely (a scheme, subdomain, or port mismatch), which would also affect GET requests — but if GET happens to work, this is less likely the specific gap, pointing more toward the method/header explanation instead.

## Investigation Steps

**Check the exact CORS preflight failure reason in the browser's network tab**: the browser's developer tools network panel shows the actual OPTIONS preflight request and its response — inspecting whether the preflight response's `Access-Control-Allow-Methods` includes PUT, and whether `Access-Control-Allow-Headers` includes every header the actual PUT request sends, directly identifies the specific gap rather than guessing.

**Check the bucket's current CORS configuration directly**: `gcloud storage buckets describe gs://<bucket> --format="default(cors_config)"` shows the actual configured CORS rules — comparing the `method` and `responseHeader` lists against what the browser's network tab showed as missing confirms the precise gap.

**Confirm the application's actual request headers match what CORS needs to allow**: reviewing the application's upload code for exactly which headers it sets on the PUT request (Content-Type, any custom headers) ensures the CORS configuration's `responseHeader` list is updated to cover all of them, not just the ones assumed to be relevant.

## Resolution

Update the bucket's CORS configuration to include `PUT` (and any other methods the application actually needs, like `POST` for resumable upload initiation) in the `method` list, and ensure `responseHeader` includes every header the application's requests actually send (commonly `Content-Type`, and potentially `x-goog-resumable` for resumable uploads). Apply the updated configuration via `gcloud storage buckets update gs://<bucket> --cors-file=cors.json`. Confirm the fix by re-attempting the upload from the actual browser application and confirming the CORS error is gone.

## Key Takeaways

- CORS rules must explicitly list every HTTP method and header a cross-origin request uses — a configuration working for GET doesn't automatically cover PUT unless PUT is explicitly included.
- The browser's network tab, inspecting the actual OPTIONS preflight request/response, is the most direct way to identify exactly which method or header is missing from the CORS configuration.
- `Content-Type` is a commonly-overlooked header that needs explicit inclusion in `responseHeader` for upload requests specifically.
- Confirm the CORS configuration matches exactly what the application's actual requests send, rather than assuming based on what "should" be needed.

## Interview Follow-Up Questions

- How would you scope a bucket's CORS `origin` list securely, avoiding an overly permissive wildcard while still supporting the application's actual legitimate origins?
- What's the difference between a CORS preflight failure and a genuine IAM/signed-URL permission failure, and how would you distinguish them from the browser console alone?
- How would you test CORS configuration changes before applying them to a production bucket serving a live application?

## References

- [Google Cloud: Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/cross-origin)
