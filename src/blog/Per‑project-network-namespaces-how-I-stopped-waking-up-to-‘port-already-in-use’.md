---
title: "Per‑project network namespaces: how I stopped waking up to ‘port already in use’"
pubDate: 2026-09-19
description: "I stopped binding every service to host ports and started using per‑project Docker networks plus a tiny reverse proxy. No more port fights, fewer demo panics — and the tradeoffs I learned."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with hands typing, a notebook, coffee cup, and a plant nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "local-development", "networking"]
---

I was halfway through a client demo in a crowded Bengaluru co‑working space when my laptop spat out the friendliest error DevOps ever writes: "EADDRINUSE: address already in use." Two projects, one laptop, both trying to bind 8080. I fumbled to kill the wrong process, the demo stalled, the client watched the spinner, and I promised myself I wasn’t doing this again.

This happened monthly. On my 8GB work laptop, I run multiple services across side projects and company forks. Every time I grabbed a new branch, I’d copy a docker-compose file and expose ports to the host because that's the path of least resistance. Then another project wanted 5432 or 3000 or 8080. It’s a tiny, avoidable war.

So I stopped binding development services to host ports. Instead I started running each project in its own Docker network (a per‑project namespace) and routing requests through a single, always‑on local reverse proxy. The result: no more port conflicts, easier hostname‑based routing, and fewer frantic port kills before meetings. Here’s how I did it, what broke, and the tradeoffs worth knowing.

## What I changed (concrete, minimal)
- Don’t publish ports from app containers to the host unless you absolutely need to. Let them listen only on the container interface.
- Give each project its own Docker network: docker network create proj_<name>.
- Run a single local reverse proxy (I use Traefik because it discovers Docker services via labels). Traefik sits on host ports 80/443 and forwards by Host header to services inside their project networks.
- Connect Traefik to a project’s network when you bring the project up: docker network connect traefik-proxy proj_<name> (and disconnect/purge when you tear down).

Example sketch of a docker‑compose service (note: I avoid host ports):
- service app:
    expose: - "3000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.myproj.local`)"
      - "traefik.http.services.app.loadbalancer.server.port=3000"

I map app.myproj.local to 127.0.0.1 via /etc/hosts (or use xip.io/lvh.me if you don’t want to edit hosts). Traefik listens on 80 and routes based on host. No host port on the app. No conflicts.

Why this works: hostname routing replaces numeric port routing. Multiple services can each claim "port 80" logically (via different hostnames) without colliding on the host OS. Docker networks isolate container DNS and service names inside the project.

## The mistakes I made (so you don’t)
1. I initially had Traefik connect to every project network permanently. That worked until networks accumulated and some stale networks referenced containers that no longer existed. My Traefik dashboard listed "ghost" backends and I had to prune networks. Fix: connect Traefik on project up, disconnect on down, and script network cleanup — a 30‑line helper that I now keep in ~/.local/bin/devnetctl.

2. I assumed docker-compose -p would avoid name collisions. It helps with container names, but if you publish host ports anywhere the conflict is back. The rule is simple: avoid "ports:" exposing unless you truly need to reach a container by port from outside Traefik.

3. Memory and tooling friction. Traefik runs in the background and eats ~80–150MB. On my 8GB laptop with VS Code and a browser, it felt heavy. I tried lighter proxies (Caddy, nginx), but Traefik’s Docker provider was easiest. If your machine is tighter (4GB), run the proxy on a ₹300 VPS + ssh tunnel, or use podman which is slightly lighter for single‑user setups.

4. Security oversight. I once left Traefik listening on 0.0.0.0 in my office network. Someone on the same Wi‑Fi could hit my dev services. Fix: bind Traefik to 127.0.0.1 or run it as a systemd --user service that only listens on localhost. I now double‑check docker‑compose files in my dotfiles repo for accidental 0.0.0.0 binds before demos.

5. Podman/WSL wrinkles. On a personal machine I switched to Podman to avoid Docker Desktop. Podman’s network semantics differ; my "docker network connect" scripts failed the first week. The takeaway: the pattern (per‑project networks + hostname proxy) is the idea. Implementation details differ across runtimes.

## Why it stuck (and when it doesn’t)
It saved me from the recurring, low‑grade friction of killing ports and guessing which process owned 8080. It also improved demos: I can hand a QA a single hostname (qa.myproj.local) and know what they’ll see. For client work and late‑night demos with patchy Wi‑Fi, this predictability matters.

But it's not perfect:
- It adds complexity. New teammates need the Traefik concept. I added a one‑page setup note and a script that: create network, docker-compose up -d, docker network connect traefik-proxy <network>, and update /etc/hosts.
- It assumes HTTP/Host header routing. Non‑HTTP services (gRPC over raw TCP, special TLS setups) need extra plumbing.
- If Traefik is down, all your projects are unreachable on the host. I fixed this by running Traefik as a systemd --user unit so it auto‑starts on login. On my ₹40,000 second‑hand laptop, that little reliability bump is worth it.

A practical Indian context: my co‑working space often has a flaky ISP. Restarting the Wi‑Fi can change how containers resolve if you use remote DNS tricks. Binding everything to localhost and keeping Traefik local meant I avoided a class of network flakiness that used to eat an hour before important calls.

Final take: stop exposing services to the host. Use per‑project Docker networks and a single small reverse proxy for hostname routing. You trade a bit of setup and another running service for quiet mornings and calm demos. For me, that was worth the extra 150MB and a few shell scripts.