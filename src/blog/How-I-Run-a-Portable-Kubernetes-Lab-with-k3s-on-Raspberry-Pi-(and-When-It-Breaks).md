---
title: "How I Run a Portable Kubernetes Lab with k3s on Raspberry Pi (and When It Breaks)"
pubDate: 2026-03-10
description: "A practical guide to running a portable, low-cost Kubernetes lab with k3s on Raspberry Pi—what works, what doesn't, and how I use it for real dev testing in India."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=2000&h=1000&fit=crop"
  alt: "A Raspberry Pi single-board computer connected to cables on a desk beside a laptop"
  caption: "Image credit: Christopher Gower / Unsplash"
  creditUrl: "https://unsplash.com/photos/1517336714731-489689fd1ca8"
tags: ["k3s on Raspberry Pi", "edge computing", "devops"]
---

A year ago I wanted a cheap, portable Kubernetes cluster to test CI artifacts, simulate flaky networks, and run small services during client demos. I didn’t want cloud bills or waiting for VMs to boot. The answer I settled on: a handful of Raspberry Pis running k3s. It’s cheap, fast to iterate on, and annoyingly realistic for a lot of edge cases you’ll never see on a beefy cloud node.

If you’re in India and juggling limited budgets, flaky home power, and occasional travel, here’s a pragmatic, experience‑based playbook for getting k3s on Raspberry Pi working—and what to expect when it doesn’t.

Why k3s on Raspberry Pi?
- Cost and portability: A Pi cluster (3× Raspberry Pi 4 Model B with 4GB or 8GB) costs a fraction of running cloud VMs hourly, and you can carry it to a client meeting.
- Realistic constraints: CPU, memory, and network limits force you to design lightweight images and sane resource requests.
- Local networking: Run an internal image registry, test internal DNS, or validate MetalLB-backed load balancing without cloud dependencies.

What I actually run
- Three nodes: 1× control-plane + 2× workers (4GB Pi boards). Good balance of redundancy vs. power draw.
- OS: Raspberry Pi OS Lite (up-to-date, minimal).
- k3s install: k3s (lightweight Kubernetes distribution) with containerd.
- Extras: local registry, MetalLB for LoadBalancer services, Traefik for ingress, Longhorn or NFS for persistent volumes if needed.

Hardware checklist (practical, India-ready)
- 3× Raspberry Pi 4 (4GB) — prices vary a lot; buy from a trusted reseller or local electronics market to avoid long waits.
- Power: A powered USB-C hub or individual high-quality adapters (avoid cheap adapters; SD cards + Pi hate undervoltage).
- Network: Gigabit switch with PoE if you plan to run headless in an office; otherwise a small travel router works.
- Storage: Use a USB‑attached SSD for at least one node if you want durable PVs. SD cards are fine for stateless workloads but will wear.
- Case, cables, and a cheap UPS (12V inverter or a small UPS) — power glitches are common during load tests.

Quick bootstrap (the approach I use)
1. Flash Pi OS Lite, enable SSH, set static IPs or DHCP reservations.
2. On the control plane:
   - curl -sfL https://get.k3s.io | sh -s - server --cluster-init
   - Note the kubeconfig at /etc/rancher/k3s/k3s.yaml (copy it securely).
3. Join workers with the provided token:
   - curl -sfL https://get.k3s.io | K3S_URL=https://<control-ip>:6443 K3S_TOKEN=<token> sh -
4. Install MetalLB and a local registry (I use 10.64.0.0/24 for MetalLB and a registry on a worker).
5. Push images to local registry and use imagePullSecrets or configure insecure-registry on k3s.

Why this setup is useful day-to-day
- Fast iteration: Build an image on your laptop, push to local registry, kubectl apply — deploy in under a minute.
- Real network: Test DNS, CNI quirks, and load‑balancer behavior under constrained bandwidth.
- Demo environment: Bring a tiny cluster to client workshops; no internet required if you pre-pull images.

Real constraints and tradeoffs (be honest)
- Reliability: SD cards die. If your workload needs durability, put PVs on SSD or use a remote NFS/Gluster. Expect to replace cards every 6–18 months under heavy writes.
- Performance: Don’t expect cloud VM performance. CI tasks with heavy parallelism will choke—use this for lightweight integration tests, not production CI.
- Power and heat: Pis can throttle under sustained load. In hot Indian summers, plan airflow and avoid stacking them in closed cases.
- Cluster management: Upgrades are manual (or semi-automated). k3s simplifies things, but a cluster spread across home and co-working spaces means dealing with flaky networks.

Troubles I ran into (so you don’t repeat them)
- Inconsistent boots after an OS update: Some Pi + SD combos failed to boot after a kernel bump. Solution: keep a known-good image snapshot and test updates on a single node first.
- Containerd image freshness: Pushing an image with the same tag sometimes made a node keep the old cached copy. Add image digests or force kubelet to pull by changing imagePullPolicy.
- MetalLB IP exhaustion: Allocate a small, well-documented range and reserve it in your DHCP/router to avoid conflicts.

Cost and alternatives in India
- Initial spend: Roughly ₹12,000–25,000 depending on Pi availability, SSD choice, and whether you reuse peripherals. Still cheaper than sustained cloud usage.
- Alternative: Use cloud micro instances for ephemeral tests if you need more CPU and less maintenance. Or try multipass/minikube when you only need a single-node dev cluster.

When you should not use this setup
- Production workloads: Unless you’re running a hardened, highly available edge product, Pis are better for lab/testing.
- High-throughput storage: If your app is I/O heavy, the Pi/SD combo will frustrate you.

A couple of practical tips I’d give a colleague
- Automate node reprovisioning: I keep a script that reflashes and re-joins nodes in under 10 minutes — lifesaver when an SD card dies.
- Export kubeconfig with hostnames and use kubectl contexts per cluster; don’t mix with your production clusters.
- Use local image registries aggressively; it saves bandwidth and speeds iteration—important if you’re on a metered Indian ISP.

Conclusion
k3s on Raspberry Pi isn’t a perfect mimic of cloud Kubernetes, but that’s the point: it’s intentionally constrained. Those constraints expose real issues—network flakiness, storage limits, and resource contention—that matter for edge use cases and lightweight CI. If you want a cheap, portable, hands-on sandbox to iterate on deployment patterns, debug DNS/CNI oddities, or run demos without cloud bills, this setup is hard to beat. Just budget for SD card replacements, a decent PSU, and accept that sometimes you’ll spend an afternoon rebuilding a node—and learn something useful in the process.

If you want, I can share my bootstrap scripts (Ansible + bash) and a list of exact components I buy in India for a three-node rig. Would that help?