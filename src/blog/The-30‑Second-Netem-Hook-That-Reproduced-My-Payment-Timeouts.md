---
title: "The 30‑Second Netem Hook That Reproduced My Payment Timeouts"
pubDate: 2026-09-14
description: "I started adding a tiny network‑emulation step to my local dev stack to reproduce flaky UPI/payment timeouts on bad mobile networks — what worked, what broke, and the tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a desk showing code in a terminal with a coffee cup beside it"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "networking", "payments"]
---

The demo went sideways two minutes before the client joined. Our checkout page showed "processing…" forever while the UI spinner politely rotated. The logs had 504s from the payments gateway. On my laptop, requests completed in 200–300 ms. On the client's phone — on an Airtel 4G call handoff in a parking lot — they timed out. I spent an hour rewriting retry logic before the obvious hit me: I wasn't running my stack on a realistic network.

That day I added a 30‑second habit to my local setup: a tiny netem toggle that adds realistic delay, jitter, and packet loss to the service nearest the payment flow. It reproduced the timeout consistently. We fixed a race in our idempotency layer. We closed the deal worth roughly ₹2 lakh. But it didn't come free — and I want to be clear about what this is for and when not to use it.

## How I set it up (the short, usable version)

I needed something cheap, repo‑local, and toggleable. The simplest reliable approach for me was running tc/netem inside the container that represents my API or payment‑proxy. That limits blast radius and doesn't demand messing with host network interfaces every time.

The workflow is:

1. Start your stack normally (docker-compose / podman).
2. Run a one‑liner to add netem to the container's eth0.
3. Reproduce and debug.
4. Remove the netem rule.

Example I use in a repo script called ./tools/netem (Linux host, Docker):

- Enable (adds 250ms ±50ms delay, 2% loss):
  docker exec -it api-service bash -c "tc qdisc add dev eth0 root netem delay 250ms 50ms loss 2%"

- Disable:
  docker exec -it api-service bash -c "tc qdisc del dev eth0 root netem"

A slightly more robust version finds containers from compose service names and adds rates, reordering or corruption when needed. For CI‑adjacent tests I keep an env flag that skips netem unless explicitly requested.

Why this works: for payment flows the most impactful variables are latency, jitter, and sporadic packet loss during carrier handoffs. Adding delay+loss in the container often triggers the same client‑side retries, windowing, or timeout code paths that otherwise only show up on bad cellular links.

I learned to calibrate settings to Indian metro reality. Jio/Airtel handoffs and congested tunnels often add 100–400 ms and occasional packet loss spikes. I start with 150–300 ms delay and 1–3% loss, then tighten or loosen based on evidence from logs and a captured HAR from a problematic phone.

Why inside the container: it needs NET_ADMIN capability, but it's far safer than altering host lo or eth0 and less likely to break other tools or your VPN.

## Honest failures and the tradeoffs

This is not a silver bullet. Expect a few unpleasant truths up front.

First, it slows you down. Running netem makes local flows take longer. Your hot‑reload loops feel sluggish. I initially applied it broadly (every service) and my iteration time tripled; I stopped using it for day‑to‑day dev and switched to a targeted approach: only the service touching external payments gets the emulation.

Second, it can mask other problems. Netem reproduces latency/loss conditions well, but it won't simulate CGNAT, carrier MTU issues, or bad DNS/transparent proxies that some ISPs use. Once, I fixed a retry bug after netem testing and still hit failures on a client's 2G device — there the issue was a broken intermediary that rewrote headers. Netem didn't help.

Third, it's fiddly on macOS. Docker Desktop hides network namespaces; running tc on the host loopback often doesn't affect container traffic the way you expect. My mac‑using teammates prefer running a tiny Linux VM (multipass / colima) and applying netem there. On Linux it's straightforward; on macOS you should expect extra indirection.

Fourth, I touched the wrong interface once. I ran tc on my host eth0 by accident and broke my Tailscale VPN mid‑incident. I lost access to a staging box and spent an unproductive morning undoing rules. That taught me to wrap these commands into scripts with clear warnings and an emergency 'clear all' command.

Finally: if you add netem into CI to "catch everything", you'll slow CI, increase flakiness, and probably train your team to ignore failures. I use netem for local diagnosis and a small set of deterministic integration tests that run on a separate, slower pipeline when we need to validate behaviour under high latency.

## When to reach for netem, and when not to

Use it when you have:
- A customer repro that suggests timeouts, race conditions, or non‑idempotent retries under latency and loss.
- A payment/third‑party call in the chain that you can't easily replicate with mocked responses.
- A specific container or service you can safely throttle without affecting everything else.

Don't use it as a daily development mode. Don't expect it to replicate every ISP quirk. And don't rely on it instead of real device testing: run a ₹2,500 test phone for UPI/cards once a week, or ask your QA to test on the carrier where the bug occurred.

What I walked away with is simple: network conditions cause real bugs, and the fastest path to reproduce many of them is not more logging but a tiny, local network emulator you can flip on in 30 seconds. Keep the toggle narrow, document it in the repo, and pair it with a real-device sanity check before you ship.

My last rule: netem finds the class of problems I couldn't reproduce otherwise, but it also amplifies laziness. If your code passes only under emulated sloppiness, you have a deeper contract problem. Use it to find the bug, not to paper over the design.