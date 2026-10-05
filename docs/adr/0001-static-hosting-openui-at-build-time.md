---
status: OpenUI part superseded by ADR-0003; static GitHub Pages hosting still accepted
---

# Static hosting on GitHub Pages; OpenUI runs only in the scheduled pipeline

The site stays a fully static build on GitHub Pages. OpenUI Cloud is called only from the scheduled GitHub Actions pipeline (cron), never from a visitor's browser, and its output is baked into the build. We rejected moving to Cloudflare/Vercel for a live `/api/chat` endpoint and a separate Lambda proxy: both add a server to secure and rate-limit on a public site, plus open-ended per-visitor LLM cost. The trade-off is that nothing on the site responds live to arbitrary visitor input.
