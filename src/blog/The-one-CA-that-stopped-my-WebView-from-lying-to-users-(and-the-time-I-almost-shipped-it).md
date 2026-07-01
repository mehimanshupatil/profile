---
title: "The one CA that stopped my WebView from lying to users (and the time I almost shipped it)"
pubDate: 2026-07-01
description: "How adding a single local CA to my Android debug builds fixed WebView TLS failures during SSO demos — and why I added CI checks after almost shipping the change."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer typing on a laptop with code visible on the screen"
  caption: "Photo by Kobu Agency on Unsplash"
  creditUrl: "https://unsplash.com/@kobuagency"
tags: ["android", "testing", "developer-tools"]
---

It was 10 minutes before a demo to a client in Bengaluru. My laptop served a local SSO proxy so the app could hit our staging IdP. In Chrome on the emulator the login page loaded fine. In our app's WebView it showed a generic "connection not private" message. Panic is an ugly, familiar companion.

This wasn't flaky JavaScript or an empty database. Chrome trusted my mitmproxy CA I had installed for debugging. WebView — the one our users hit — did not. The result: perfect staging SSO in the browser, and a dead demo inside the app.

Why WebView disagrees (short version)
Android apps don't behave like the system browser when it comes to user-installed CAs. Since Android N, apps by default do NOT trust user CA certificates. Chrome and the system browser still do (if the CA is in the user store), but WebView follows the app's network security config. If your corporate proxy or mitmproxy intercepts TLS for SAML/SSO, WebView will reject the chain unless the app explicitly trusts that CA.

Diagnosis took me ten minutes of adb logcat, a failing OkHttp call, and a curl from the emulator. The TLS error in logcat (javax.net.ssl.SSLHandshakeException: Trusted anchors not found) confirmed it: WebView/OkHttp was dropping the cert chain.

What actually fixed it
There are three ways I experimented with; the one I settled on balances repeatability, CI checks, and safety.

1) Install the CA as a system certificate on emulators or rooted devices.
This is the "closest to production" approach. If you can root a test device or use an AOSP emulator where adb root works, you can push the PEM into /system/etc/security/cacerts with the correct filename (hash + .0) and proper file permissions. Emulators that accept this change behave like a clean system browser and WebView.

Pros: realistic, catches cert-chain regressions.
Cons: fragile. Emulators differ, images update, and you can't do this on non-rooted real devices. It also requires more scripting in CI.

2) Use Android's Network Security Config for debug builds (what I use)
Create a network_security_config.xml that explicitly trusts the user or a debug CA for debug builds only. Example (simplified):

<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <debug-overrides>
    <trust-anchors>
      <certificates src="user"/>
    </trust-anchors>
  </debug-overrides>
</network-security-config>

Then include this resource only in the debug build flavor and reference it from the debug AndroidManifest. For me, this allowed WebView and OkHttp to accept the mitmproxy cert during local testing and CI runs against emulators without fiddly root steps.

Pros: straightforward, works across emulator images and unrooted devices, easy to wire into Gradle flavors.
Cons: it changes the app's trust model during debug builds and can mask real TLS bugs if you forget to test with production certs.

3) Run the IdP through a no-mitm, test endpoint
If you control the IdP, the safest approach is to run a test endpoint that bypasses interception. Not always possible if your company enforces proxying in office networks.

My real failure — and why I added a safety net
A month after switching to the debug-trust approach I made a rookie mistake. I merged a refactor that cleaned up manifest merging and accidentally left the debug network_security_config referenced in the common manifest (not the debug-only manifest). CI didn't catch it. A QA run found it before release, but the code had made it into a release candidate.

That scare taught me two useful things: one, trusting user certificates outside of debug builds is a real risk; two, code review alone isn't enough.

I fixed it by changing how we include the resource: the debug manifest now includes the network_security_config via a Gradle manifest placeholder that only exists in debug builds. I added a small Gradle task that scans merged manifests in CI and fails the build if any release build references any debug-only network-security file. A quick static check — 20 lines — saved us from a potential trust vulnerability.

Tradeoffs I accepted
- I accepted that debug builds would not perfectly mimic production TLS behavior. That meant I still do a quick pre-release run against production certs (a checklist item) to catch anything the debug config would hide.
- I avoided rooting devices for most of our team. Rooted emulators have higher fidelity but require more maintenance for new devs and CI agents.
- I didn't try to automate installing the CA on all developers' machines. In India, with people working from home across unreliable networks, onboarding a "run this script to push CA into emulator" felt brittle. Network Security Config plus a small guide worked better.

Practical steps I use now
- Generate a local CA for mitmproxy and distribute it via secure internal docs (not checked into repo).
- Add a debug-only network_security_config that trusts user certs or a specific debug CA.
- Protect production builds: manifest placeholders + CI manifest checks.
- Keep a short checklist: "build release, test login flow on a clean device, verify cert chain in logcat" before any staged rollout.

If you run into this: adb logcat is your friend. Look for SSLHandshakeException. Check whether Chrome says OK but WebView fails. If so, it's almost certainly a trust-store / network-security-config mismatch.

What I walked away with
A single, explicit switch — trust debug CAs only in debug builds — saved me dozens of failed demos and five hours of chasing phantom bugs across OkHttp and WebView. But the fix forced me to harden the build pipeline. You can make development easier without making your app less secure, but only if you make the exception obvious and impossible to accidentally ship.

If you’ve solved this differently — rooted emulators, custom trust managers, or a CI image with a system CA installed — I’d love to hear the tradeoffs you saw. I still prefer the debug-only network config for day-to-day speed, but I run a clean-production test before every release. It’s the tiny bit of friction that actually keeps demos honest.