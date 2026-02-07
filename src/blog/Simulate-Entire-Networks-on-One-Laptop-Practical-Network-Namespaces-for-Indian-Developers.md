---
title: "Simulate Entire Networks on One Laptop: Practical Network Namespaces for Indian Developers"
pubDate: 2026-02-07
description: "Run isolated network stacks on a single laptop to test routing, DNS, and multi-node behaviour—without cloud bills or slow VMs. A practical, hands‑on guide."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&w=2000&h=1000&fit=crop"
  alt: "A laptop on a wooden desk showing a terminal window, with a coffee mug beside it"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["network namespaces", "developer workflow", "devops"]
---

If you’ve ever needed to test how two services talk across different IPs, simulate an internal network, or reproduce a routing bug from production — but wanted to avoid spinning up multiple cloud VMs (and the bill that follows) — network namespaces are the little-known trick that will save you time and money.

I started using network namespaces after wasting credits on tiny cloud instances just to validate simple multi-host networking. Now I can spin up an isolated network topology on a single laptop, iterate fast during the day, and push a concise repro to CI or a colleague. It’s not magic, but it’s shockingly useful.

What network namespaces solve (quick)
- Isolate network stacks: separate IPs, routes, DNS per namespace.
- Simulate multi-machine setups: run services that believe they’re on different hosts.
- Test routing, NAT, firewall rules, and latency (with tc) locally.
- Keep costs low — useful for developers in India who juggle limited cloud budgets.

Main idea and tools
We’re using Linux kernel features exposed by iproute2 (ip netns), veth pairs, and standard tools: ip, iptables/nftables, and tc for traffic shaping. The main keyword here is network namespaces — use them to create multiple “mini machines” without VMs.

A minimal hands-on example
This is the exact workflow I use when I need a fast reproducible network:

1) Create two namespaces
sudo ip netns add ns-a
sudo ip netns add ns-b

2) Create a veth pair and place ends into namespaces
sudo ip link add veth-a type veth peer name veth-b
sudo ip link set veth-a netns ns-a
sudo ip link set veth-b netns ns-b

3) Assign IPs and bring interfaces up inside each namespace
sudo ip netns exec ns-a ip addr add 10.1.1.1/24 dev veth-a
sudo ip netns exec ns-a ip link set veth-a up
sudo ip netns exec ns-a ip link set lo up

sudo ip netns exec ns-b ip addr add 10.1.1.2/24 dev veth-b
sudo ip netns exec ns-b ip link set veth-b up
sudo ip netns exec ns-b ip link set lo up

Now ns-a and ns-b can ping each other:
sudo ip netns exec ns-a ping -c 2 10.1.1.2

4) Add a router namespace and connect both, or NAT to your host
If you want a more realistic multi-hop topology, create a third namespace as a router and use two veth pairs. If you want internet access from namespaces, set up NAT on the host with iptables MASQUERADE. I usually run:
sudo ip netns add router
# create veth pairs router<->hostns...
# enable forwarding and MASQUERADE on host

5) Add latency or packet loss with tc
To reproduce flaky links:
sudo ip netns exec ns-a tc qdisc add dev veth-a root netem delay 80ms loss 1%

Why this beats quick VMs for many tasks
- Speed: creating namespaces and veths is instant; no boot time.
- Low resource use: you can run dozens on a mid-range laptop.
- Reproducibility: share a small script with teammates; no cloud account needed.

A realistic constraint (because nothing’s perfect)
You do need root to manage namespaces, and debugging can get fiddly when things fail. Namespaces don’t emulate different kernels or OS-level quirks — they share your host kernel. That means they’re excellent for network logic, routing, DNS, and firewall testing, but a poor substitute if you must reproduce a service running on a different kernel version or OS. Also, this approach is Linux-first; Windows or macOS require WSL2 or a VM.

Practical tips and tradeoffs from long‑term use
- Use small helper scripts. I keep bash scripts that build common topologies (two nodes + router + NAT) and teardown scripts to avoid leftover state.
- Persist names responsibly. Clean up with ip netns del <name> — leftover namespaces are a common source of flakiness.
- Combine with container runtimes. You can run systemd‑less services inside namespaces or attach Docker containers to veths if you want process isolation plus network isolation. But Docker’s networking can become another layer to reason about.
- Watch for DNS surprises. Processes inside namespaces use the host’s resolv.conf unless you bind-mount a different one. I run a lightweight dnsmasq in a namespace when I need custom DNS records.
- Security and permissions. Because namespaces require elevated privileges to create, share scripts cautiously on public repos. In CI, you’ll need privileged runners or a small VM.

When you shouldn’t use network namespaces
- When you need to test across OS boundaries (Windows vs Linux).
- When trying to reproduce kernel bugs.
- When you need full hardware isolation for security certifications.

A quick Indian-context note
For many teams in India that balance tight cloud budgets and heavy iteration cycles, network namespaces let engineers reproduce customer network problems locally without spending INR on multiple instances. I’ve used namespaces to debug customer NAT traversal problems and flaky mobile backend connections before resorting to a cloud repro.

Final thoughts
If you’re comfortable with iproute2 and don’t mind running a handful of root commands, network namespaces will change how you debug network problems. They aren’t a silver bullet — debugging can be deeper and they don’t replace VMs when you need different OS kernels — but for routing, DNS, NAT, and latency scenarios, they’re efficient, repeatable, and cheap.

Next time you’re about to spin up three tiny cloud VMs to validate a network layout, try this: create two namespaces, a veth pair, and a quick tc rule. You’ll be surprised how much you can test on a single laptop. Want the exact scripts I use to spin up common topologies? Tell me what topology you need and I’ll share the repo I use every week.