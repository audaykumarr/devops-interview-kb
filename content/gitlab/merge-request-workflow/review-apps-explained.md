---
id: gitlab-merge-request-workflow-review-apps-001
title: "Reviewers keep approving frontend PRs based on reading the diff alone, and subtle visual bugs keep slipping through to production. How would GitLab Review Apps address this?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - practical
  - architecture
tags:
  - gitlab
  - review-apps
  - code-review
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Reviewers on frontend merge requests are approving changes based on reading the code diff alone, since actually running the branch locally is enough friction that most people skip it — subtle visual or interaction bugs keep slipping through review and reaching production. How would GitLab Review Apps address this, and how would you set it up?

## Short Answer

A Review App is a temporary, live deployment of a specific merge request's actual changes, automatically created by a CI/CD job and torn down when the MR closes or merges — giving reviewers a real, running instance of the change to actually click through and visually verify, rather than relying entirely on reading a diff and mentally simulating what the UI would look like. Setting it up means adding a CI job that deploys the branch to a dynamic, MR-specific environment and posts the URL back to the merge request for easy access.

## Detailed Explanation

The core gap Review Apps close is between "the diff looks correct" and "the actual running application behaves correctly" — for frontend and visual changes specifically, reading code is a poor substitute for actually seeing and interacting with the result, and the friction of manually pulling a branch and running it locally is exactly what causes reviewers to skip that step in practice.

## Requirements

- Reviewers need a fast, low-friction way to see and interact with a merge request's actual changes running live, not just its diff.
- Each merge request needs its own isolated, temporary environment, so reviewing one MR doesn't interfere with or get confused with another's.
- The temporary environment should be cleaned up automatically when no longer needed, avoiding indefinite resource accumulation.

## Architecture

**A CI/CD job deploys the MR's branch to a dynamic environment**: using GitLab's `environment:` keyword with a dynamically-generated environment name/URL (commonly incorporating the MR's ID or branch name), a pipeline job builds and deploys the specific branch's code to its own isolated environment — this could be a dedicated namespace in a Kubernetes cluster, a separate cloud environment, or any infrastructure capable of hosting an independent, addressable instance of the application.

```yaml
review:
  stage: deploy
  script:
    - deploy_review_app.sh
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.review.example.com
    on_stop: stop_review
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

stop_review:
  stage: deploy
  script:
    - teardown_review_app.sh
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
```

**GitLab surfaces the Review App's URL directly on the merge request**: once the deploy job completes, GitLab automatically displays a link to the live environment right in the MR's interface — removing the friction of a reviewer needing to know how to manually pull and run the branch themselves, since the running instance is one click away.

**Automatic teardown on MR close/merge prevents indefinite resource accumulation**: configuring the `stop_review` job (triggered automatically when the MR is merged or closed, or available as a manual action) ensures each Review App's underlying infrastructure is cleaned up once it's no longer needed, rather than every past MR's environment persisting and consuming resources indefinitely.

**This directly targets the actual gap causing bugs to slip through**: since reviewers can now interact with a real, running version of the change with essentially the same effort as clicking a link (versus the friction of a local checkout and run), it removes the primary reason reviewers were skipping that step and relying on diff-reading alone — the fix addresses the actual root cause (friction) rather than just asking reviewers to try harder.

## Trade-offs

Review Apps require real infrastructure investment (the ability to spin up and tear down isolated environments per MR, which itself needs building and maintaining) and add cost/resource usage proportional to how many MRs are open concurrently — a genuine trade-off against the value of catching visual/interaction bugs earlier, generally worthwhile for frontend-heavy projects where this class of bug is common and costly, but real setup and ongoing infrastructure cost to weigh against that value for other kinds of projects.

## Key Takeaways

- Review Apps give reviewers a real, running deployment of an MR's actual changes, closing the gap between "the diff looks right" and "the application actually behaves correctly."
- The core value is removing friction — a one-click link to a live environment replaces the manual effort of pulling and running a branch locally, which is what was causing reviewers to skip that step.
- Automatic teardown on MR close/merge prevents indefinite accumulation of per-MR environments and their associated cost.
- This is a genuine infrastructure investment, most clearly worthwhile for frontend-heavy projects where visual/interaction bugs are common and costly to catch late.

## Interview Follow-Up Questions

- How would you handle Review Apps for a change that requires specific seeded data or a particular backend state to demonstrate correctly?
- How would you control cost for Review Apps in a project with a high volume of concurrently open merge requests?
- How would you extend this pattern to also run automated visual regression testing against each Review App, not just manual reviewer interaction?

## References

- [GitLab Docs: Review Apps](https://docs.gitlab.com/ee/ci/review_apps/)
- [GitLab Docs: CI/CD environments](https://docs.gitlab.com/ee/ci/environments/)
