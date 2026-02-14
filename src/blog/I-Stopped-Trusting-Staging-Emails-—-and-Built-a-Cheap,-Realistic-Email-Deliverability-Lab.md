---
title: "I Stopped Trusting Staging Emails — and Built a Cheap, Realistic Email Deliverability Lab"
pubDate: 2026-02-14
description: "A practical, low-cost way to test real inbox behaviour in India: local inboxes, a small VPS with proper SPF/DKIM, and realistic seeds to improve email deliverability."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&h=800&w=1600"
  alt: "Developer typing on a laptop showing terminal windows, a coffee cup beside the keyboard."
  caption: "Image credit: Pexels"
  creditUrl: "https://www.pexels.com/photo/people-using-laptop-3861969/"
tags: ["email deliverability", "developer tooling", "devops"]
---

We all know the feeling: you push a change to transactional email templates, QA says everything looks fine, but users complain that OTPs and receipts are landing in spam. That happened to me after a release where the staging system used MailHog and assumed "works on staging = works in production." Spoiler: it doesn't. Staging catches SMTP handshakes, not real ISP heuristics.

So I built a small, pragmatic lab to test real inbox behaviour without paying for enterprise tools. My position is simple: use local tools for fast iteration, but add one realistic external hop (a VPS with correct DNS and signing) to catch the things staging misses. This hybrid approach caught deliverability regressions faster and reduced post-deploy firefights. Below is how I did it and what you should expect.

Why staging-only testing lies to you
- Local SMTP dev tools (MailHog, MailCatcher, smtp4dev) are fantastic for template iteration, link checking, and local bugs. They don't test spam filtering, IP reputation, SPF/DKIM problems, or ISP-specific throttles.
- Hosted sandbox services simulate SMTP but still won't show how Gmail, Yahoo, or Indian corporate filters treat your headers, content, and sending IP.

The setup I recommend (cheap, reproducible)
1. Fast local loop for everyday work
   - Keep MailHog or smtp4dev in Docker for rendering and template checks. This is your "fast feedback" layer.
   - Hook your app environments (dev, feature branches) to this by default so designers and QA can iterate without sending real email.

2. A small "real" sending environment
   - Spin up a small VPS (you can find providers with India-region or Singapore nodes for ~₹200–₹600/month). I used a ₹350/month VPS to mirror latency and routing typical for our user base.
   - Install Postfix (or Exim) as your SMTP relay and configure OpenDKIM for signing. Set SPF, DKIM, and DMARC records in DNS. Use the VPS provider's console to set the reverse PTR record to match your mail hostname.
   - Send through this VPS from a staging environment as your “pre-production” sender. This is the environment that talks to real inboxes.

3. Seed list and monitoring
   - Maintain a seed list of real accounts: Gmail, Outlook, Yahoo, major Indian corporate email providers, and a few popular ISP mailboxes. Keep at least one test account per major provider.
   - Use Mail-Tester and Gmail/Postmaster tools for single-message checks and reputation metrics.
   - Check message headers (X- headers, Received chains), spam scores, and landing location (Primary/Promotions/Spam).

Why this catches real problems
- SPF/DKIM/DMARC mistakes are obvious when you send through your VPS; a local MailHog never exposes them.
- ISP heuristics often treat bulk-like patterns (identical content, high-frequency sends from a new IP) differently. Sending through a VPS reveals rate limits and greylisting behavior.
- Gmail's filters penalize missing or inconsistent PTR, poor DKIM signatures, or spammy header sequences. You only see that with a real send.

Practical steps and commands (high level)
- Postfix + OpenDKIM: configure Postfix as a relay, add OpenDKIM milter, publish DKIM public key in DNS.
- PTR: set reverse DNS to mail.example.staging (must match HELO).
- SPF: TXT @ "v=spf1 ip4:<VPS_IP> include:_spf.yourprovider.com -all"
- DMARC: TXT _dmarc "v=DMARC1; p=none; rua=mailto:postmaster@example.com"
- Use a one-off script or CI job to send test messages to your seed list after template or header changes.

Tradeoffs and real constraints
- It takes time to configure and maintain. DKIM keys rotate, VPS IPs change, and you must keep DNS records in sync. Expect a day or two of initial setup and a few hours per quarter for maintenance.
- A small VPS IP will have no reputation initially. That can be both a pro (you'll see how fresh IPs behave) and a con (you won't see live reputation effects of large-scale senders). Avoid using this VPS for production-scale sending—it's for realistic testing only.
- You still need a deliverability partner for large campaigns. This lab doesn't replace services like Amazon SES, Sendinblue, or dedicated ESPs when you reach scale; it surfaces problems before you incur their costs.

What I stopped doing (and why)
- I stopped relying on "it works on staging" sign-offs. Instead, merges that change email content or headers must pass a "real send" to the VPS and land-checks on the seed list.
- I stopped ignoring DNS hygiene. A single missed SPF include or broken DKIM key caused hours of customer support pain once—now it's part of the checklist.

India-specific notes
- Indian corporate mail servers and some ISPs can be conservative. Test with a few corporate domains (if you can provision internal test accounts) to catch policies that differ from Gmail.
- Choosing a VPS region near your main user base (Mumbai/Delhi or Singapore) makes routing and latency closer to production, which occasionally affects throttling behaviours.
- Costs are modest: my VPS, a domain, and minimal DNS hosting come under ₹1,000/year for the lab.

Final takeaway
Email deliverability is messy and empirical. Fast local tools are indispensable, but they will not reveal ISP-level rejections, spam-folder problems, or reputation issues. A cheap, properly-configured external sender combined with seeded inbox checks teaches you far more than mailhog + wishful thinking. Yes, setting this up takes time and a bit of maintenance, and no setup is a silver bullet—but for the number of support tickets we avoided after switching to this workflow, it paid for itself within two sprints.

If you want, I can share the minimal Docker Compose + Postfix/OpenDKIM config I used so you can fork it and get a lab running in a few hours.