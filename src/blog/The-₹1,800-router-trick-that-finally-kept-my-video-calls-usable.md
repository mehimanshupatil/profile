---
title: "The ₹1,800 router trick that finally kept my video calls usable"
pubDate: 2026-09-06
description: "How I stopped surrendering to jittery Zoom calls by adding a cheap router, a second SSID, and simple SQM rules — and the day my plan briefly bricked everything."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A desk with a laptop, a small router, and a cup of coffee"
  caption: "Photo by Dan Dimmock on Unsplash"
  creditUrl: "https://unsplash.com/@dandimmock"
tags: ["home-network", "remote-work", "infra"]
---

It was 8:15pm, and my client demo was already running late. My video was a frozen mosaic. My co‑worker’s voice turned into rubber bands. On the other side of the apartment, a teenager had started an HD stream. The ISP's router proudly reported “full bars” and 50 Mbps down. My calls were a mess.

I’ve done the usual troubleshooting: close tabs, switch to ethernet, restart the router, plead with family members. That night I decided to stop negotiating with luck. I bought a cheap router, set up a dedicated work SSID, and wired in a one‑rule habit that almost always keeps my video calls usable. It cost me ₹1,800 and a Saturday afternoon. It’s not perfect. It’s practical.

Why upload (not download) is the real problem
Most people check download speeds because speed tests show big numbers. The thing that kills your Zoom or Meet, though, is upload and queueing on the ISP link. When multiple devices upload (backup, cloud sync, streaming), your video packets wait in a long, unmanaged queue inside the ISP modem. That queue is bufferbloat. Big download numbers don’t help when your outgoing audio waits 200 ms to go out.

You can’t always fix your ISP. But you can control the queueing that leaves your home. Limit your upload slightly below the true max, and the router shapes traffic to avoid bufferbloat. Suddenly, real‑time apps get their packets out first.

What I actually did (step‑by‑step, for people who want the gist)
I bought a small, OpenWrt‑friendly router for ₹1,800 (a basic TP‑Link I picked off Amazon). If you don’t want to flash firmware, you can often do similar with stock firmware that offers QoS, but OpenWrt gives the clearest control.

1) Measured real upload: on a good hour I ran speedtests to note the real sustained upload (mine was 6.5 Mbps). I subtracted about 10–15% and used that as the SQM cap — so 5.5 Mbps egress. This gap is the secret sauce. It leaves a little headroom for the modem and avoids full queues.

2) Created a separate SSID for work devices: “HOME‑WORK”. No TVs. No kid phones. Static DHCP leases for my laptop and my meetings tablet. This makes it easy to prioritize only the devices that matter.

3) Enabled SQM with cake on OpenWrt and set ingress/egress to the conservative numbers. Cake targets bufferbloat by default and is forgiving.

4) Prioritized by MAC/DSCP fallback: I added a simple firewall rule that marks packets from my laptop’s MAC with DSCP AF41. Cake respects DSCP markings, so my meeting traffic receives low latency. This is more robust than relying on port numbers (Zoom changes ports; Netflix does whatever it wants).

5) Kept simple remote access: I left the ISP router in modem/bridge mode when possible. If your ISP locks the modem, you can still run the cheap router behind it, but do not double‑NAT SIP or port forwarding unless you know why.

A real failure and what it taught me
I bricked the router on my first try. I flashed the wrong build and the device never booted. That cost me one Saturday, a factory‑mode paperclip, and a replacement router. Lesson: read the hardware revisions and the exact OpenWrt image. If you’re not comfortable flashing, buy a GL.iNet device that ships with OpenWrt and saves you the hassle for a few hundred extra rupees.

Another early mistake: I prioritized by ports. That failed when Zoom and Meet changed flows and when some meeting apps tunnel things differently. I switched to MAC + DSCP marking, which is less brittle. Still, if your ISP’s upstream is saturated (neighbours competing on the same feeder or a shared GPON in a complex), nothing local will miraculously create bandwidth.

What changed for me, practically
Video calls stopped stuttering. Latency jitter dropped from 120–200 ms to a steady 20–40 ms for my prioritised devices. That’s the difference between somebody being audible and being frozen. I stopped having to tell clients “sorry, my network is acting up” and then reschedule the call.

The setup also gave me cheap benefits: forced family devices off the work SSID during critical hours, found a misbehaving NAS that was continuously uploading backups, and cut my incidental mobile data when guests were over by keeping a guest SSID throttled.

Real constraints you should accept
This is home‑edge engineering, not a silver bullet. If your ISP does stupid things (carrier NAT, forced modem firmware, or throttling during peak hours), a local router only helps so much. Also, the moral and social constraint: grabbing bandwidth control means having an honest conversation with roommates or family. They will notice. Be ready to agree a “work window” instead of policing devices.

If you don’t want to spend time: many modern low‑cost mesh routers now include SQM/bufferbloat mitigation baked in. It costs more than ₹1,800 but saves you the flashing drama.

One takeaway
Controlling the upload queue matters more than chasing higher Mbps on paper. A cheap router, a second SSID, a conservative SQM cap, and device prioritisation bought me reliable meetings. It won’t fix ISP outages, and yes, I bricked one router doing it. But after a month, my evenings stopped being hostage to jittery calls. That was worth the ₹1,800 and an afternoon of swearing.