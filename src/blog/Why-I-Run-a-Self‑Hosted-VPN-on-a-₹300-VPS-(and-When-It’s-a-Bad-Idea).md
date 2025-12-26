---
title: "Why I Run a Self‑Hosted VPN on a ₹300 VPS (and When It’s a Bad Idea)"
pubDate: 2025-12-26
description: "I moved my remote dev tools behind a self‑hosted VPN on a cheap VPS. Here's why it saved time, the setup I use, and the tradeoffs you should expect."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&w=2000&h=1000&fit=crop"
  alt: "Person typing on a laptop at a wooden desk with a coffee cup"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["self-hosted VPN", "remote work", "devops"]
---

A few years ago I was juggling SSH keys, Teams calls, and a dozen brittle port-forwards every time I wanted to work on a client project from home. Renting a cheap VPS and putting everything behind a private VPN changed that — not because it’s magical, but because it let me treat my remote workstation like a LAN. For about ₹300–₹700 a month I get predictable access, simple DNS, and fewer "can you open port 3000?" Slack pings.

This is not a sales pitch for anonymous browsing or for skipping company security policies. It’s a practical, developer-first pattern for reliably accessing development machines, internal services, and small team tooling. Here’s why I picked a self-hosted VPN, how I run it, and the real downsides that eventually bit me.

Why I chose a self-hosted VPN
- Convenience: One encrypted tunnel gives you access to multiple services (internal dashboards, dev servers, Docker hosts) without messing with SSH jump hosts or individual ports.
- Cost control: Clouds like Hetzner, DigitalOcean, and Lightsail run suitable VMs in the ₹300–₹700/month range. That’s a predictable line item your finance team — or yourself — can accept.
- Control: You decide what runs on the server, when it’s patched, and how long logs are kept. No surprises from a third-party VPN provider changing pricing or throttling.
- Low latency for work traffic: If your VPS is near fast peering (e.g., Mumbai/Frankfurt for India-based clients), remote dev tools feel more responsive than hopping through multiple proxies.

The setup I use (short, repeatable)
- Pick a VPS: I use a small instance with 1 vCPU, 1–2 GB RAM, and 20–40 GB disk. In India, Lightsail or DigitalOcean in SG/Mumbai work; Hetzner is cheaper but Europe-based. Expect ₹300–₹700/month including backups.
- Install WireGuard: It’s lightweight, faster than OpenVPN in my tests, and trivial to configure. A single config file per client does the trick.
- Use split DNS: Run systemd-resolved or dnsmasq on the VPS so internal names (ci.mycompany.dev) resolve through the tunnel, while normal web browsing uses your local resolver.
- Firewall and fail-safe: UFW/iptables to only open WireGuard UDP and SSH, and a simple iptables rule to drop in/out if the WireGuard process dies.
- Automated provisioning: I use a tiny Ansible playbook to bootstrap a new VPS (users, ssh keys, WireGuard configs, DNS records) — that makes replacement painless.
- Optional: Tailscale or headscale if you need easier key rotation and device management. But note: Tailscale’s free plan or their control plane is a third party; headscale self-hosted costs more setup.

Real tradeoffs and constraints
- Maintenance is real. The VPS needs OS patches, WireGuard updates, and occasional log review. If you treat it as “set and forget,” you’ll get surprised. Plan 30–60 minutes monthly.
- Single point of failure. If that machine is down, everything behind it is unreachable. I mitigate with daily backups and a documented, fast rebuild playbook — but it’s still a downtime window.
- Privacy and compliance limits. A self-hosted VPN doesn’t make you invisible on the internet. Your VPS provider still knows your IP and usage; if you need legal privacy guarantees, use a reputable commercial VPN with audited policies.
- Not a streaming or geo-unblock solution. Dedicated VPNs frequently change IP blocks; your VPS IP is fixed and likely flagged by some services.
- Company policy and auditability. If you work for a company with strict network controls, running your own VPN might violate policy. Always align with InfoSec — I keep mine for personal projects and client engagements where I’m allowed.

Practical tips that saved me headaches
- Use short-lived client configs. I regenerate WireGuard keys monthly for devices I still use and immediately revoke lost ones.
- Name your hosts and use a single TLS cert. Putting Traefik or Caddy on the VPS gives you HTTPS for internal UIs and removes the “are we using self-signed certs?” friction.
- Keep logs lightweight. I forward only auth and connection events to a cheap log sink (another tiny VPS or cloud log service) so I can spot odd login attempts without paying for big ELK stacks.
- Automate restore. I can rebuild my VPN server from scratch in 10–15 minutes with Ansible and DNS updates. That’s saved me twice when providers had hardware issues.
- Measure bandwidth. If you’re running CI artifacts or heavy container image transfers over the tunnel, you’ll hit VPS caps or slow I/O. Move bulk transfers to object storage and only tunnel interactive workflows.

When a self-hosted VPN is not the right choice
- You need compliance-grade logs and third-party audits: use corporate solutions.
- Your team needs long-term uptime and multi-region failover: a paid VPN service with SLAs may be better.
- You want anonymity or frequent IP rotation for geo-testing: use specific services built for that.

My take
For independent developers and small teams in India who need reliable, private access to dev machines and internal tools, a self-hosted VPN on a cheap VPS is one of the highest-utility, lowest-cost improvements you can make. It collapses fiddly networking into a single, manageable tunnel and fits into regular DevOps hygiene.

But it’s not a magic wand. Expect maintenance, a single point of failure, and policy conversations with your employer if you plan to use it for work. If you accept those tradeoffs, you’ll get a predictable, private workspace that feels — almost — like plugging in to your office network again.

If you want, I can share my Ansible playbook and the few WireGuard commands I use to provision new devices. Want that?