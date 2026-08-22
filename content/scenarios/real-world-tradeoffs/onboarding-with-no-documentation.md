---
id: scenarios-real-world-tradeoffs-onboarding-no-docs-001
title: "You've just joined a team responsible for critical infrastructure, and there's essentially no documentation — the previous engineers who understood it have all left. How do you approach getting up to speed safely?"
category: scenarios
subcategory: real-world-tradeoffs
technologies:
  - devops
difficulty: intermediate
question_type:
  - scenario
tags:
  - scenarios
  - onboarding
  - legacy-systems
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You've just joined a team responsible for critical production infrastructure, and there's essentially no documentation — the engineers who originally built and understood it have all since left the company. You're expected to start contributing and eventually be on-call for a system you don't yet understand. How do you approach getting up to speed safely, without either being paralyzed by the lack of documentation or moving too fast and causing an incident?

## Short Answer

Start by building a map of what actually exists and how it behaves through direct observation (reading code, tracing actual traffic/data flow, reviewing incident/change history) rather than waiting for documentation that doesn't exist, while deliberately staying conservative about making changes until your understanding has been validated against reality. Prioritize understanding the highest-risk, most-consequential parts of the system first (what would cause the worst incident if misunderstood), and write down what you learn as you go — both for your own reference and as the documentation that should have existed in the first place.

## Detailed Explanation

The core tension is real: you can't wait indefinitely to build complete understanding before contributing (the team needs you productive, and complete understanding of an undocumented system can take a very long time), but moving too fast on a system you don't yet understand risks causing exactly the kind of incident that erodes trust and sets back both the team and your own confidence.

**Build understanding through direct observation, not by waiting for documentation to appear**: reading the actual code and configuration, tracing real traffic or data flow through the system, and reviewing the git/change history (which often reveals *why* things are the way they are, even without formal documentation) are all available regardless of whether anyone wrote things down — this is genuinely slower than reading good documentation would be, but it's the actual path available, and it's the same investigative approach useful for any undocumented legacy system.

**Review incident and postmortem history specifically, since it reveals what actually matters**: past incidents (even informal ones, in Slack history or ticket systems if no formal postmortems exist) reveal which parts of the system are actually fragile or poorly understood by everyone, not just you — this is high-value information for prioritizing where to focus your own understanding-building first, since it points at the parts of the system most likely to bite you.

**Prioritize understanding by risk, not by whatever's most interesting or most immediately relevant to your first task**: the parts of the system that would cause the worst incident if misunderstood deserve disproportionate attention early, even if your first assigned task doesn't specifically touch them — you're building a mental risk map of the system, not just learning what you need for the immediate task in front of you.

**Stay deliberately conservative about changes until your understanding is validated**: for genuinely undocumented, critical systems, favor small, easily-reversible changes early, and specifically seek review or pairing from anyone with even partial institutional knowledge (a teammate who worked adjacent to the system, even if they didn't build it themselves) before making a change you're not fully confident about — this isn't about avoiding contribution, it's about calibrating risk appropriately to your actual current understanding.

**Write down what you learn as you go — this is the actual fix for the underlying problem**: every piece of understanding you build through investigation is documentation that should have existed and now genuinely can, both for your own future reference (you will forget details you learned once, under pressure, months later) and for whoever joins after you facing the exact same gap — treating your own onboarding process as an opportunity to finally create the missing documentation turns a one-time personal cost into a lasting team asset.

**Communicate honestly about your current confidence level, rather than either overstating or understating it**: telling your team explicitly "I understand this part well enough to be confident, but I'm still building confidence in that part" helps the team make better decisions about what to assign you and what needs extra review — false confidence (claiming full understanding to seem competent) is genuinely dangerous for a critical system; excessive hedging (refusing to contribute until you feel fully confident, which may never fully happen for a complex undocumented system) is also unproductive.

## Key Takeaways

- Build understanding through direct observation (code, actual system behavior, change history) rather than waiting for documentation that doesn't exist — this is genuinely slower but is the actual available path.
- Incident and postmortem history reveals which parts of the system are actually fragile or poorly understood, giving a high-value signal for prioritizing where to focus understanding first.
- Prioritize by risk (what would cause the worst incident if misunderstood), not just by whatever's immediately relevant to your first assigned task.
- Write down what you learn as you go — this converts your own onboarding investigation into the documentation that should have existed, benefiting both your future self and whoever joins next.

## Interview Follow-Up Questions

- How would you balance the time investment in building this understanding against the team's expectation that you become productive quickly?
- What would you do if your investigation revealed the system has a genuinely dangerous, undocumented issue that nobody currently knows about?
- How would you handle being put on-call for this system before you feel your understanding is genuinely sufficient?

## References

- [Google SRE Book: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
