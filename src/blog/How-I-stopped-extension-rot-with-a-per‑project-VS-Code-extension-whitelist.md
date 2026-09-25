---
title: "How I stopped extension rot with a per‑project VS Code extension whitelist"
pubDate: 2026-09-25
description: "I got tired of juniors' extensions breaking demos and slow installs on office Wi‑Fi. I built a tiny per‑repo extension whitelist + setup script that saved onboarding time — and introduced one annoying failure."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a desk displaying code in a dark editor"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "vscode", "onboarding"]
---

It was 11:13 on a slow Bengaluru Friday and a new hire was frantically pinging me.

“My Prettier keeps reformatting the test file and CI is failing. I installed some extensions the recruiter suggested, then pulled and everything changed.”

I looked at the Git diff. Indentation changed across 40 files. The culprit: three different formatter extensions, two conflicting editorconfig plugins, and a theme that somehow toggled the editor's auto‑save behavior. The junior had a cheap 4G dongle and was on the office Wi‑Fi that drops every few minutes. They spent 40 minutes waiting for extensions to download. I spent 40 minutes reverting accidental reformatting. The rest of the team spent another hour debugging “works on my machine” failures.

We had a problem I’d seen in other shops: extension rot. Machines accumulate extensions—some useful, some dangerous, some heavy—and nobody agrees which ones to use for a repo. On slow connections (and yes, most Indian offices and home setups) that friction becomes drag: onboarding takes longer, demos die in meetings, and CI becomes a formatting battleground.

I wanted a small policy that fixes the common cases without being religious about editors.

Why the usual fixes failed

We already had the basic tooling:

- .editorconfig and Prettier config in the repo. Good.
- .vscode/extensions.json with "recommendations". Also good — except it's a suggestion. VS Code will show a prompt, but it doesn't enforce anything. People ignore prompts when they’re late for a call.
- A line in the README telling people which extensions to install. Nobody reads the README before a 10am demo.

I tried heavier enforcement: a pre-commit hook that auto‑installed missing extensions. That worked once (it installed a formatter mid‑commit and rewrote code). Then it failed spectacularly for someone on a 2GB dongle. The hook blocked commits until 400MB of extensions finished. Not acceptable.

The tiny per‑project policy I actually use

I wanted three things from a solution:

- predictable editor behavior in CI and demos,
- lightweight onboarding on slow networks,
- no surprise automatic rewrites.

So I built a tiny repo script and one gentle git hook. It’s 60 lines of shell and a JSON file. The pieces:

1) extensions.json (committed)
- I keep .vscode/extensions.json but treat it as authoritative. It lists two kinds of entries: "recommended" (the minimal set we expect everyone to have) and "optional" (nice-to-have). I document which formatter/linter is canonical.

2) scripts/setup-editor
- This script reads extensions.json, shows the diff between installed and recommended, and offers to install only the "recommended" ones.
- It supports --offline. On slow connections we skip installs and just warn.
- It caches downloaded VSIX files into .cache/extensions-cache (team-maintained, optional). If someone has downloaded an extension once (on a stable connection), the cache speeds installs for others on flaky Wi‑Fi.

3) scripts/check-extensions (git hook friendly)
- Lightweight: runs fast and non-blocking.
- It lists currently installed extensions (code --list-extensions) and fails only if a known "forbidden" extension is present (we keep a short blacklist of formatters/lint-on-save plugins that rewrite files silently).
- Otherwise it prints recommendations and a single line command to run setup-editor.

4) Onboarding line in README
- "Run ./scripts/setup-editor || ./scripts/setup-editor --offline" — one line. New hires run it when they clone.

Why this works in practice

Predictability comes from a single source of truth in the repo. We enforce only the hard parts: which formatter actually runs during CI, and which extensions are forbidden because they rewrite files without explicit action.

Lightweight onboarding is the key win for India‑style constraints. The script only installs what we deem necessary. The cache and --offline mode saved two new hires from spending their 4G data budgets on a theme pack they didn't need.

Also: nobody rewrites your code mid‑commit. The setup step is manual. The check-extensions hook doesn't auto-install. It warns, points to the one-line setup, and moves on.

The failure I learned from

We screwed up once. A developer in Ahmedabad cloned, ran setup, and then forgot to restart VS Code. The installed formatter was present but not active until reload. They edited and committed. CI tripped on style. It was my fault for assuming restart behavior.

The other failure: the forbidden list. Early on I added a popular formatter to "forbidden" because it silently replaced tabs, and one developer legitimately needed it for a side project bundle. The script flagged their environment and blocked a hotfix during a production incident (we had the hook set to block within our internal tooling). We relaxed the hook to warn rather than block for non‑critical repos. The lesson: enforcement should never be the path of least resistance during incidents.

The tradeoffs I accepted

- I gave up on absolute enforcement. The script warns and helps, but won't stop someone in an emergency.
- I accepted a tiny onboarding step. People need to run one script after clone. It's worth asking once.
- I maintain a small cache. It costs disk and occasional updates, but saves mobile data and waiting time.

What I actually walked away with

A one-line habit that saves hours: put the canonical extension list in the repo, provide a single setup script, and enforce only the things that rewrite files silently. Make installs optional and cacheable. If someone insists on using a different tool for their side project, fine—just not in our repo's context.

If you maintain a repo with other humans, especially across slow connections or shared desks, this is the tiny prevention that pays. It won't fix your culture, but it will stop half the weird demos and one‑third of the CI formatting errors.