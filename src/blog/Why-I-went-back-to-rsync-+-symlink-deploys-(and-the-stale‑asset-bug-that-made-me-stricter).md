---
title: "Why I went back to rsync + symlink deploys (and the stale‑asset bug that made me stricter)"
pubDate: 2026-06-30
description: "I swapped our over‑engineered CI deploy for a simple rsync + symlink rollout on a ₹300 VPS — until a stale‑asset bug taught me to treat manifests and caches as first‑class citizens."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of a laptop keyboard and a code editor visible on the screen"
  caption: "Photo by Scott Graham on Unsplash"
  creditUrl: "https://unsplash.com/@scottgraham"
tags: ["deployments","ops","infra"]
---

It was 1:12 a.m. and the customer on the other end of a long support thread sent me a screenshot: the landing page stripped of CSS, buttons everywhere misaligned, the font stack back to Times New Roman. Our tiny Indian SaaS had a big launch scheduled the next morning and five other engineers were asleep. I had pushed a "safe" frontend patch earlier; the deploy should have been atomic. It wasn't.

We run on a ₹300/month VPS for non‑critical environments, and for months I'd been using the simplest deploy I could: build locally in CI, rsync the release into /var/www/releases/<timestamp>, then update the /var/www/current symlink to point at the new release. Rollback is one line: change the symlink back. No fancy orchestration, no flakey CI runners, negligible cost. It had served us well—fast iterative deploys, predictable rollbacks, minimal tooling to explain to new hires.

Then came the stale‑asset problem.

Why I like rsync + symlink (still)
Rsync + symlink is boring and cheap. Your release process looks like:

- Build everything into a single directory (hashed asset filenames included).
- Rsync that directory to server under /var/www/releases/20260630-0130.
- Atomically point /var/www/current → that new directory.
- Nginx serves from /var/www/current.

Because the symlink update is atomic, you avoid half‑baked deployments where half the files are new and half are old. On a slow Indian VPS or flaky CI runner, that determinism matters more than orchestration magic. It also means you can undo in seconds by switching the symlink to the previous release. For a two‑to‑five person team, this simplicity reduced operational overhead.

What I missed: the manifest + cache coupling
Our build emitted hashed assets and a manifest.json referencing them. But we had another shortcut: we rsynced the new assets folder and then, as a final step, we updated a shared `/var/www/shared/manifest.json` in place and then flipped the symlink. In theory this saved disk (we wanted to keep a single shared assets directory). In practice it introduced a race.

Here's what actually happened at 01:12:

- Rsync pushed the new release directory.
- The script atomically moved the new release and flipped the `current` symlink.
- Nginx, still serving cached index.html from the old release, requested assets by hashed names from the new manifest (or the other way around — the exact timing varies).
- Cloudflare (yes, we used the free tier) had cached older hashed assets. Users got index.html pointing to new filenames, but those files weren't in the CDN yet. The result: 404s and broken CSS for some users while others saw the old assets.

Because we had mixed local symlink switching with a shared manifest, the set of files referenced by rendered HTML didn't always match what's available or cached.

The messy fix I learned the hard way
Fixing it involved three concrete changes:

1) No more in‑place shared manifests. Every release now contains a complete manifest.json under the release directory. The deploy flips the symlink to a directory that is fully self‑contained. That removes the “manifest swapped separately” race.

2) Make manifest changes atomic and visible. We write manifest.json to a temp file and `mv` it into place in the release directory before flipping symlink:

   TMP=/var/www/releases/$RELEASE/tmp_manifest.json
   echo "$MANIFEST_CONTENT" > $TMP && mv $TMP /var/www/releases/$RELEASE/manifest.json

3) Purge or warm CDN selectively. On our free Cloudflare plan aggressive purges hit rate limits and cause delays. So I added a pragmatic rule: for minor frontend fixes that don't change hashed filenames, don't purge. For any change that generates new hashed filenames, call Cloudflare's single‑file purge API (we do it only for the handful of new assets) and parallelize the purge with the symlink swap.

I also added short Cache‑Control headers for HTML and longer ones for hashed static assets. That meant if something did go wrong, fewer users would stay stuck with a broken page while the cache expired.

Honest failure: the night I broke rollbacks
A week later I tried to roll back during a production glitch. I flipped the symlink back and expected to be done. Except the newer release had already removed some vendor fonts we no longer used, and our rollback served HTML that referenced those fonts by new names. Because the CDN still had the newer fonts cached, some users saw a mixture: new fonts for some requests and old assets for others — the site looked inconsistent. In short, atomic symlink swap doesn't eliminate problems that come from cleaning shared state (we had a shared fonts directory that the deploy pruned). I had to restore the deleted vendor files from the previous release manually.

That taught me to never remove shared assets during a deploy. Prune sweep only after a grace period and only via an explicit maintenance window. Keep releases truly immutable.

When this approach is wrong
If you have database migrations that need coordinated deploys, massive blue/green infrastructure, or a large team pushing dozens of times a day, rsync+symlink will feel limiting. If you need multi‑region zero‑downtime and traffic shaping, use a proper CD system. But for small teams, low budgets, and those late‑night fixes on a ₹300 VPS, the simplicity and control are worth it.

What I actually walk away with
Atomic symlink deploys are still my default for small services because they're cheap, transparent, and rollbackable. The lesson I paid for is simple and repeatable: make your releases self‑contained, treat manifests as first‑class artifacts, and never mix in‑place shared edits with atomic swaps. Also, don't prune shared assets without thinking through the rollback story.

I ended up with a one‑page deploy script and a 4‑line checklist: build → rsync → ensure manifest is in the release → symlink swap → optional CDN purge. It covers 95% of our incidents and saves us from explaining elaborate tooling to the next hire at 2 a.m. The remaining 5%? Those need a scheduled maintenance window.