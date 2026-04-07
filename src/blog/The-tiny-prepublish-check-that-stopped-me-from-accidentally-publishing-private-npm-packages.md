---
title: "The tiny prepublish check that stopped me from accidentally publishing private npm packages"
pubDate: 2026-04-07
description: "How a 40‑line prepublish check saved me from leaking proprietary code, what it looks for, and the real tradeoffs (including the day it blocked a legit release)."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop keyboard with code visible on the screen"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "npm", "software-engineering"]
---

It was 10:27pm, I was tired, and my fingers still remembered last week's publish flow. I ran npm publish from the wrong folder — one with an internal customer-facing package — and by the time I realised what I’d done, the package was already public.

Panic follows the first few seconds. Then comes practical work: yank the version, yank the package from the registry, update the README to "Not for public use", ping the infra team to block downloads, and apologise. I promised myself two things that night: 1) never publish without a checklist; 2) automate the checklist so my tired brain couldn't override it.

What I broke — and why it was easy to break
I didn’t discover a mysterious npm loophole. I simply had:

- package.json with "private": false (default), because we’d forked a public repo
- npm registry set to the public registry in my local config (npmrc had been overwritten by a previous experiment)
- no guard that checked package scope, registry, or branch before publish

npm publish is quick and forgiving. That’s the feature. It’s also why accidents happen.

What I actually built (short)
I added a prepublishOnly hook that runs a tiny Node script. It checks three things locally before allowing an npm publish:

- package.json has private: true OR the package scope matches our internal scope (@ourorg)
- the npm registry is our private proxy (we run Verdaccio on a ₹300/month VPS) or an explicitly allowed registry
- I’m not publishing from a feature branch (force-publishes require an explicit env override)

If any check fails, the script exits non‑zero and prints an actionable error with the fix.

Why I picked those checks
We had three recurring mistakes:

1. Publishing from wrong registry (local npmrc gets changed often).
2. Publishing a package that shouldn’t be public (no @scope, private:false).
3. Publishing from a half-finished branch because I forgot to switch to main/release.

These are easy to test from the local environment and cheap to surface to the developer. They don’t replace CI policy but they block the most common human errors.

The script, in practice
No fluff here—my prepublishOnly is a 40‑line script (Node) that:

- loads package.json
- reads NPM_CONFIG_REGISTRY, or runs npm config get registry
- verifies package.private === true OR package.name startsWith('@ourorg/')
- verifies registry matches a small allowlist (private Verdaccio URL, our Nexus URL)
- checks git rev-parse --abbrev-ref HEAD and warns if it’s not main/release
- supports an explicit ALLOW_PUBLISH=1 env var for special cases

I added "prepublishOnly": "node ./scripts/prepublish-check.js" to package.json. Works with npm, yarn, and pnpm because they call the same lifecycle scripts.

The day it failed me (the honest failure)
A month later I hit my own safety net — in the worst possible moment. Our CI pipeline published a hotfix after we merged a critical change. CI runs in a container with a minimal npm config. My check expected NPM_CONFIG_REGISTRY to be set to our Verdaccio URL; the CI had the registry set via .npmrc in the repo, not as an env var, so npm config get registry returned the public registry and the script blocked the publish.

Result: failed release job, 45 minutes of digging, an angry PM. I patched the script to fall back to reading ~/.npmrc and project .npmrc, then to consult an explicit CI_ALLOW_PUBLISH env var. The takeaway: local checks are only as reliable as the environment they run in. They can introduce false negatives.

Why this still works (and what I enforce in CI)
I now treat the local prepublish hook as the first line of defence. The second line is a server-side check:

- private registry rejects unscoped packages unless explicitly allowed
- our release CI has a publish step that checks package scope and registry again and will never publish if package.private === false and package not scoped

If you can’t change your company’s registry rules, at least add the server-side gate in CI — that’s non-negotiable.

Tradeoffs I accepted
- Friction: a short extra step when legitimately publishing from a non-default environment. ALLOW_PUBLISH=1 solves most cases.
- Bypassability: devs can delete the hook or run npm publish with --ignore-scripts. I accepted this because the hook protects the accidental publish not a determined one. To prevent determined bypass, you need server-side policies.
- False positives: as I learned, environment differences create edge cases. I added clear error messages and a short doc so people understand why the hook failed.

Small, concrete wins
- Zero accidental public publishes in a year across our four‑person infra team.
- Fewer "oh no, I published" Slack threads at 11pm.
- A tiny culture change: new hires now run publish, read error messages, and learn the intended registry flow. That single teaching moment is worth the 30 seconds of friction.

Implementation notes you can copy
- Keep the script short and explicit. If you’re in a hurry, a shell script that checks package.private and npm config get registry is enough.
- Prefer failure with an instruction: "Set NPM_CONFIG_REGISTRY=https://verdaccio.ourorg and run npm publish from main".
- Put an allowlist for registries rather than trying to guess good vs bad registries.
- Mirror the checks in CI—local hooks prevent accidents, CI gates prevent leaks.

A final, slightly embarrassing thought
The first time I fixed the script I was smug. Then CI taught me humility. Safety nets are great until they interrupt your release on a Friday. So build them, but expect them to be wrong occasionally, and make them explain themselves plainly.

Takeaway
If you publish npm packages from a laptop in India (or anywhere), the real win is a small, local safety check that catches the dumb mistakes you make when tired — not a perfect, unbypassable fortress. Pair it with a CI gate and clear error messages, and you'll save nights of apology emails.