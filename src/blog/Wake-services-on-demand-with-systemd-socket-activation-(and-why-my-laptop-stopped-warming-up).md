---
title: "Wake services on demand with systemd socket activation (and why my laptop stopped warming up)"
pubDate: 2026-10-04
description: "How I use systemd --user socket activation to start dev services only when needed—cutting warm‑up time, saving RAM, and the debugging tradeoffs I learned the hard way."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop keyboard with a coffee cup and notebook beside it"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "systemd", "local-development"]
---

It was 9:07 on a Tuesday and I was waiting. Waiting for four services to come up so I could actually test a single API endpoint. My laptop fan hummed. My calendar said “demo at 9:30.” The services each took a few seconds to start, but combined with browser reloads and a flaky external API, the warm‑up cost me twenty minutes — every morning. Twenty minutes of context loss while I squinted at logs and swapped terminals. I finally stopped trying to make the services boot faster and instead taught my machine to start them only when I needed them.

The trick was systemd socket activation for my user services: a .socket unit listens on the port, and systemd launches the .service on the first connection. The result in practice: my machine stays lean. Starting work is instant. I only pay the CPU/memory cost of services I touch that day.

Why I started using socket activation
I had three constraints that pushed me here:

- I run multiple microservices for local development (Node APIs, a small Go worker, and a local SMTP stub). Each one idles most of the day.
- My office internet and a couple of vendor APIs are flaky; cold-starting everything increases the odds of flaky failures during demos.
- My laptop is 16GB and I refuse the overhead of dozens of background processes for every repo I open.

Socket activation solved the practical friction: no more waiting for unrelated services when I only need one. It also made demos more deterministic—if I hit an endpoint, the service will start then and there, not sometime in the middle of a recorded screen when I’m talking.

How I set it up (the small pattern I use)
I keep this pattern tiny and repo-local. Each service gets two files in a dev/systemd/ folder: service.service and service.socket. The socket unit is minimal: it declares the ListenStream port and the WantedBy=default.target for the user instance. The service unit has Type=simple or exec, the usual ExecStart, and a Restart=on-failure so it can recover.

The mental model I follow:

- The socket is what I enable; the service is passive until the socket delivers a connection.
- I enable and start only the .socket unit (systemctl --user enable --now my-service.socket). No need to enable the service.
- I keep ports deterministic across machines by defining them in a tiny dev.env file so teammates share the same contract.

Why this is nice: when I open a repo, I enable the socket for the services I expect to touch that day. My prompt is unchanged. Hitting an endpoint in the browser or curl triggers an immediate startup and the request is accepted once the service binds. No global docker-compose up with 12 services.

Some practical details that saved me headaches:

- Use ListenStream=127.0.0.1:PORT to avoid IPv6 surprises and to keep sockets local.
- For HTTP services, systemd buffers the initial TCP accept; if your app wants the remote address, you need to read it from the connection or use systemd's socket‑activation helpers (rare for my use).
- If the service writes logs to stdout, capture them with journalctl --user -u my-service.service so I can tail only when it starts.

What broke (and the limitation that matters)
No magic. Two real, non-trivial failures taught me where socket activation isn't a silver bullet.

1) The hidden crash: One morning a service was accepting connections (the socket existed) but crashed immediately on startup due to a dependency that wasn't yet running. From my browser it looked like a never‑responding endpoint. It took longer to debug because systemd kept the socket open and curl hung waiting for a response. The mistake was treating socket activation as a replacement for proper health checks. I now add a quick liveness probe in the service that exits with a clear error if prerequisites are missing; systemd's Restart=on-failure surfaces the problem in the journal instead of silently eating my request.

2) macOS and WSL: systemd socket activation is a Linux thing. Half my team uses macOS. We mitigated by keeping the socket-enabled units in the repo and publishing a tiny replacement script for macOS using launchd (ugh) and socat. In WSL, systemd support is getting better, but not everyone will be able to use this workflow out of the box. So: this is primarily for Linux users (my home machine runs Ubuntu; my office laptop is the same).

Tradeoffs I accepted
- Slightly heavier setup per service. It’s two small files and a one-time enable. That’s acceptable because it’s predictable and repo-local.
- More discipline around startup errors. If a service crashes at start, the symptom changes from “fast 500” to “connection hangs then logs show panic.” It forced me to add better startup validation.
- Not a replacement for container orchestration or docker-compose when you actually need multiple services to be up at once for integration tests.

Why I still use it
Because it moved the pain where it belongs: at the moment I actually need a service. My laptop no longer wastes RAM on dozen little test servers. My morning demos start in seconds. I get fewer 9:15 panicked reloads and more focused work.

If you care about reproducible dev environments (and you should), socket activation nudges you toward defining ports, startup contracts, and clear logs. It also feels like actual engineering: you solve the problem of “why is my machine slow” by changing how services come to life, not by throwing hardware at it.

One takeaway
If you run many small local services on Linux and your workflow is stalled by warm‑up time, add a .socket unit to the simplest service you use every day, enable the socket, and see how it changes your mornings. It won't fix flaky external APIs or replace proper health checks, but it will give you instant time back — and force you to make startup errors loud and actionable.