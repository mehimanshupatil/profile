---
title: "Why I Added LocalStack to My Dev Workflow (and Why It Didn't Fix Everything)"
pubDate: 2026-02-09
description: "How using LocalStack cut my AWS iteration time, reduced surprises in integration tests, and the real tradeoffs that kept me running occasional tests on real AWS."
author: "Rohan Deshpande"
image:
  url: "https://cdn.pixabay.com/photo/2015/01/08/18/29/entrepreneur-593358_1920.jpg"
  alt: "Person working on a laptop with coffee and notes, development environment visible"
  caption: "Image credit: Pixabay / StartupStockPhotos"
  creditUrl: "https://pixabay.com/photos/entrepreneur-laptop-coffee-startup-593358/"
tags: ["LocalStack", "integration testing", "developer workflow"]
---

When you’re shipping features that touch S3, SNS, Lambda or DynamoDB, the slowest part of building isn’t writing code — it’s waiting for an environment to behave. Waiting for cloud deployments, compiling infra changes, or dealing with flakey test runs eats momentum. After a few painful deploy-test-fix cycles that cost me hours (and a few late-night chai runs), I added LocalStack to my local workflow. It cut my iteration time dramatically — but it also taught me when "close enough" isn't.

This isn’t a praise piece or a vendetta. It’s a practical account of how I use LocalStack daily, the problems it solves for teams in India, and the concrete limits that still force me back into the real AWS occasionally.

What LocalStack actually gave me
- Faster feedback loops: No deploy-to-cloud wait. Write a small integration, point the SDK to localhost, run tests. That saved me multiple rounds of 2–10 minute waits every day.
- Safer experiments: I could spin up namespaces, malformed policies, and messy S3 objects without worrying about accidental costs or resource sprawl in a shared dev account.
- CI stability for common flows: Our CI runs a LocalStack instance for feature branches. We catch obvious wiring bugs (wrong queue names, misconfigured event sources) before anyone reaches a staging deploy.

How I wire it into code (high level)
- Environment flag: If LOCALSTACK=true, configure AWS SDK to use endpoint_url http://localhost:4566 and dummy credentials. Tests and local apps read that flag.
- Docker Compose: Run LocalStack in a container alongside a small Postgres container and the app. It’s easy to bring the whole stack up with docker-compose up --build.
- Lightweight fixtures: Create reproducible test fixtures (seed S3 buckets, DynamoDB items, SNS topics) with one setup script. Reuse the same script in CI to ensure parity.

A typical local-dev command I use:
- docker-compose up localstack app
- npm run test:integration (or pytest tests/integration)

Why this matters in India
- Cloud cost sensitivity: For small teams or freelancers in India, iterating on live AWS can mean small bills that add up. LocalStack reduces that.
- Bandwidth and latency: When my home internet acts up, round trips to AWS (even in Mumbai/Hyderabad regions) slow me down. Hitting localhost is immediate.
- Faster onboarding: New hires don’t need cloud IAM access to run integration tests. They can get productive faster without waiting for AWS permissions.

Tradeoffs and the bits that bite
- It's not a perfect emulator. LocalStack implements many AWS APIs, but some behaviors differ. IAM edge cases, S3 consistency and lifecycle rules, and service limits manifest differently. Expect surprises when you move to real AWS.
- Feature gaps: New AWS services or advanced features (X-Ray sampling, some Step Functions integrations, or some cross-account behaviors) may not be present in the open-source LocalStack. Some of these are gated behind LocalStack Pro.
- Resource hungry: LocalStack runs a lot of services in one process. On a 4GB laptop (common among Indian devs keeping costs low), startup can be slow and memory pressure real. I limit services in docker-compose to only the ones I need.
- False confidence if you rely entirely on it: We learned this the hard way — a permission nuance in IAM caused a staging deploy failure because LocalStack didn't enforce the same restriction. Now, we run a small set of smoke tests against a real AWS account before releases.

A pragmatic workflow that worked for us
- Local-first development: Default to LocalStack for day-to-day dev and branch-level CI integration tests.
- Staging-on-AWS gate: Run a minimal smoke-test suite against a shared staging AWS account for pull requests before merging to main. These tests cover authentication, actual IAM policies, and region-specific behavior.
- Periodic end-to-end runs: Nightly or weekly full E2E tests run against real AWS to catch drift.
- Keep fixtures small and idempotent: Recreate resources from scripts to avoid stateful surprises between LocalStack and AWS.

Some practical tips that saved time
- Start LocalStack with only the services you need (SERVICES=s3,sqs,dynamodb). It reduces memory and startup time.
- Use a tiny shared script to translate between real ARNs and LocalStack endpoints so tests don’t need deep if/else logic.
- Pin LocalStack versions in CI. A new LocalStack release once broke our tests with behaviour changes; pinning provided stability.
- Cache container images on CI runners (or use self-hosted runners) to avoid repeated downloads — bandwidth costs matter here.

When to skip LocalStack
- Final acceptance or compliance tests: Anything requiring precise AWS-managed behavior (KMS key policies, VPC endpoints, cross-account roles) belongs on real AWS.
- Performance/load testing: LocalStack is fine for functional tests, but not for capacity planning.

My final take: use LocalStack, but don’t worship it
LocalStack changed the day-to-day rhythm of building cloud features for us. We ship faster, catch obvious wiring problems earlier, and save avoidable cloud costs. But it’s a tool, not a replacement for a real cloud — especially for hard security and infra edge cases. For Indian teams balancing bandwidth, cost, and velocity, it’s a practical middle ground: cheap, fast, and effective — until it isn’t. Accept that you'll still need a sliver of real-AWS testing, and design your CI pipeline around that reality.

If you try this, start small: pick two services you use the most, wire LocalStack to your dev scripts, and add a one-line staging smoke test against real AWS. That single extra safety net will save the “it worked locally” regret later.