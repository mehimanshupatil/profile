---
title: "The tiny Terraform wrapper that made rollbacks predictable"
pubDate: 2026-05-04
description: "After a midnight Terraform mistake, I built a tiny wrapper that checkpoints state and plans, so rolling back infra stops being a guessing game — and what it still can't save."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop with code editor on screen and a coffee cup"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["infrastructure", "terraform", "devops"]
---

It was 2:10 a.m. I had accepted a small, urgent change: flip a flag and increase the autoscaling target. The person handing it over said “terraform apply, should be fine.” The plan showed drift on one resource — a storage bucket with a lifecycle rule — but nothing alarming. I hit apply. Five minutes later, an entire test dataset was gone and my pager wouldn't stop.

That night I learned two things: one, never trust an “urgent” apply without a checkpoint. Two, Terraform's state is both your friend and the source of peril. I built a tiny wrapper in the week after that incident. It doesn't make Terraform magic, but it makes rollbacks predictable enough that I stopped waking up with a knot in my stomach.

What the wrapper does, in one sentence
- Before any apply, it saves the current remote state and writes a binary plan file. It also logs a short message and uploads these artifacts to a versioned object store. If something goes wrong, we can fetch the exact state and plan that existed before the change and restore or re-run them.

Why this matters in practice
- The common pattern on small teams is "plan, approve, apply" with state sitting in s3/dynamo (or an equivalent). That's fine until an apply contains a destructive change or an unexpected drift. Without a reliable pre-apply snapshot, you either try to reverse-engineer what changed from logs, or you restore a state copy manually and hope nothing else moved in the meantime. My wrapper makes the pre-apply state a first-class artifact, so rollbacks are a procedure, not improvisation.

How it works (the useful bits)
- Checkpoint: tfw apply (my script) runs terraform state pull and stores the JSON blob under checkpoints/<timestamp>-<user>.tfstate in a versioned bucket (ours is an S3 bucket with versioning).
- Plan-out: tfw plan runs terraform plan -out=planfile and uploads planfile alongside the state snapshot.
- Metadata: I force a one-line commit message for each apply (like "increase worker replicas to 5 — incident #123"). The script pushes this metadata as a small JSON into the same folder so each checkpoint is discoverable.
- Apply: After checkpoint upload, tfw runs terraform apply planfile (or normal apply if the plan wasn't saved). We only allow auto-approve for quick fixes when the owner signs off; otherwise a human confirms.
- Rollback: tfw rollback <checkpoint-id> copies the saved tfstate over the remote state backend, then runs terraform apply -refresh-only to let Terraform reconcile the infra with that state. If the plan file exists, you can terraform apply the saved plan directly.

Why I use an object store with versioning
- I use our existing S3 (Mumbai) bucket with versioning enabled. Storage is tiny — tfstate JSONs and plan files are small — but versioning buys you an extra safety net if someone overwrites a checkpoint. In our setup the incremental cost has been under ₹300/month. You can use any S3-compatible provider or a cheap DigitalOcean Space; the important bit is immutability + discoverability.

One scripted example, pared down
- tfw plan -> saves plan and state, prints a short checkpoint id.
- tfw apply checkpoint-id -> reuses that plan; if none provided, creates a new checkpoint and then applies.
- tfw rollback checkpoint-id -> restores the state and runs refresh/apply.

Where it actually saved us
- A teammate accidentally added lifecycle rules that expired objects after 7 days while changing unrelated infra. The wrapper gave us an exact pre-apply tfstate and plan; we restored the state, re-applied the older plan, and recovered service quickly because nobody had to guess which resources Terraform had removed versus which were deleted by lifecycle rules. The incident took 40 minutes instead of the 3–4 hours it would have otherwise.

The honest failure and the tradeoffs
- The wrapper is not a time machine. In one case we deleted an RDS instance (bad module change) and expected the wrapper to "undo" it. It couldn't. Restoring the tfstate made the configuration think the DB existed again, but the actual data was gone. We still needed a DB snapshot restore. The wrapper prevents accidental drift and speeds up non-data-destructive recoveries — it doesn't replace backups.
- It adds friction. Every apply creates artifacts and costs a tiny bit of storage and a few more seconds. People will complain at first. We fixed this by making the script fast and by keeping the required "one-line message" policy non-negotiable. After a month the complaints stopped.
- It can mask root causes if used as a crutch. In one instance we rolled back three times to get a flaky module to behave. That hid a real bug in the module's lifecycle hooks. The wrapper should be a safety net, not the standard operating procedure.

Small operational notes that saved me grief
- Use backend locking (DynamoDB for S3 backend) or a lockfile — simultaneous tfw applies are a bad idea.
- Keep checkpoint metadata searchable (we use a simple grepable index and an internal web UI that lists recent checkpoints).
- Limit retention by policy: we keep 90 days by default and manually snapshot long-lived checkpoints for audits. That kept monthly storage tiny.
- Make rollback steps a documented runbook. If on-call can run tfw rollback, they can get the service back to a known state quickly. Don't force an engineer to invent the procedure during an incident.

Costs and constraints — India specifics
- We host the S3 bucket in ap-south-1; the additional storage and GET/PUT calls are negligible for our scale (under ₹300–₹500/month). If you're a freelancer or a tiny team, a DigitalOcean Space or an S3-compatible object store in India will work and cost even less.
- Our office internet is flaky; uploading plan files sometimes took 10–15 seconds. That made me batch workflows — do the plan locally, upload, then go for apply — which is a good discipline anyway.

What I actually walked away with
- The wrapper didn't make Terraform perfect. It made outcomes predictable. After a few weeks I slept better when doing midnight fixes because a human-readable checkpoint and a binary plan file existed if things went sideways. The single rule I enforced with tfw—the mandatory checkpoint before any apply—saved us more time and stress than a dozen post-mortem checklists.

If you take anything from this, it's simple: treat "state before change" as an artifact worth preserving. You won't always be able to restore data, but you'll always reduce the guesswork.