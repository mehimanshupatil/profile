---
status: accepted
---

# Drop OpenUI; Answers and Lenses are hand-written

Ask me Answers and Lens pitches are written by hand in `src/data/answers.ts` and `src/data/lenses.ts` and rendered by the site's own components. We dropped OpenUI generation (ADR 0001's scheduled pipeline, ADR 0002's Fact Base and review PRs) because the owner has no account for its Gateway, and hand-written answers to a fixed set of questions remove both the cost and the risk of an LLM making claims about the owner. The departure-board replay keeps the "live" feel without any model.
