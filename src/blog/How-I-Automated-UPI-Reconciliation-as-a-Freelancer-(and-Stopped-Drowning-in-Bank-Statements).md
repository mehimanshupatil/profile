---
title: "How I Automated UPI Reconciliation as a Freelancer (and Stopped Drowning in Bank Statements)"
pubDate: 2026-02-25
description: "A practical, lightweight approach to reconcile UPI payments for freelancers in India—automate statements, match receipts, and save hours each month."
author: "Aanya Mehra"
image:
  url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?ixlib=rb-1.2.1&w=2000&h=1000&fit=crop"
  alt: "A smartphone showing a payments screen next to a laptop on a wooden desk"
  caption: "Image credit: Nathan Dumlao / Unsplash"
  creditUrl: "https://unsplash.com/photos/1520607162513-77705c0f0d4a"
tags: ["UPI reconciliation", "freelancer finance", "automation"]
---

If you're a freelancer in India, you know the feeling: a month ends, and your phone, bank SMSes and multiple bank statements have turned into a maze of half-remembered invoices and unexplained ₹200 transfers. I used to spend entire evenings matching UPI credits to invoices, hunting for screenshots, and wondering which client actually paid for March.

That changed when I built a tiny, pragmatic UPI reconciliation pipeline that does the boring matching for me. It doesn't need bank APIs, costly subscriptions, or a degree in data engineering — just some scripting, a few consistent conventions, and a willingness to accept that automation will handle the easy cases and leave the odd edge-case for manual review.

What "UPI reconciliation" means here
- Main goal: match every UPI credit in your bank statement to an invoice, receipt, or client note so you know what’s paid, pending, or suspicious.
- Outcome: a simple CSV or spreadsheet with columns like date, amount, counterparty, invoice id, matched (yes/no), and notes.

Why not just use an app?
There are plenty of accounting apps that claim to do reconciliation. They're great if you need GST-ready ledgers, bank sync, and invoices in one place. For me, those were overkill: I bill 15–25 small projects a year, often via personal UPI handles, and I needed something cheap, auditable, and under my control. Plus, many apps still trip on UPI remitter names (they’re inconsistent) and require bank-level access I wasn’t comfortable granting.

What I built (high level)
1. Export monthly bank statements (CSV) — most banks and fintech neo-banks let you download a CSV of transactions. If yours doesn't, export the PDF and OCR it.
2. Standardize incoming data — a short script normalizes columns (date, amount, credit/debit, description).
3. Ingest invoice metadata — I keep a tiny YAML/CSV of issued invoices: invoice_id, expected_amount, client_name, UPI_id_used, due_date.
4. Fuzzy match credits to invoices — a script matches by exact amount first, then by amount + partial remitter name, then by notes (I encourage clients to add invoice IDs in the UPI note).
5. Output a reconciliation CSV with confidence flags (high/medium/low) and a short HTML report for quick review.

Concrete tools I use
- Python (pandas + fuzzywuzzy) — easy to iterate and handle CSVs.
- A small SQLite DB to store invoice history and matches.
- OCR via Tesseract when I must extract from PDFs or screenshots.
- A Git repo to store the scripts and the monthly reconciliations — versioned and portable.

How I nudged clients into making reconciliation easy
The most effective trick: add an instruction in invoices and payment requests — “Please add invoice #INV-2026-07 in the UPI note.” About 60–70% comply. For recurring clients, I use fixed UPI remark templates and send a gentle template message. The automation handles the rest.

A typical monthly run
- Download bank CSV (2–3 minutes).
- git pull, python normalize.py, python match.py (2–5 minutes).
- Open the generated HTML report, scan low-confidence matches and resolve (10–30 minutes depending on messiness).
Total monthly time: often under 30 minutes. For a chaotic month, maybe 90 minutes.

Real tradeoffs and downsides
- No magic on ambiguous remitter names: many UPI transactions show short or different remitter names; fuzzy matching helps but isn’t perfect. Expect to manually verify about 5–10% of transactions.
- Bank CSV formats change occasionally, so normalization scripts need small maintenance.
- This setup is good for freelancers and micro-businesses; if you need GST-compliant ledgers, payroll, or multi-user audit trails, a proper accounting product is a better fit.
- Security: you’ll be handling bank statement data locally. I keep the repo private, encrypt backups, and never store full bank credentials anywhere.

Why this approach works for Indian freelancers
- UPI dominates small payments in India. Most clients can and will pay via UPI if you ask, and UPI notes are a free, human-readable way to carry invoice IDs.
- Bank CSV exports are widely supported across Indian banks and fintechs.
- The fix is low-cost: a phone, laptop and a few hours to set scripts up — unlike monthly SaaS subscriptions that add up.

Tips to make it robust
- Enforce an invoice note format: a short token like INV-123. It's easy for clients to type and simple to parse.
- Keep invoice amounts unique where possible (e.g., add a ₹1 or ₹5 cent adjustment in the amount) to increase exact-match confidence.
- Run reconciliation weekly for higher-stress months; small batches are easier than end-of-month chaos.
- Archive reconciled months and keep a changelog of any manual overrides.

If you want to try it
Start by exporting last month’s bank CSV and building a two-column CSV of your invoices (invoice_id, amount). Write a tiny script that finds exact amount matches and marks them; the clarity of seeing matched vs unmatched immediately pays for the effort.

Wrapping up
Automation doesn’t have to be flashy or expensive. For me, automating UPI reconciliation reclaimed hours of weekend time and removed the mental overhead of wondering whether a client had paid. It won’t fix every ambiguous remitter name or missing note, but it surfaces the real exceptions you should care about — and leaves the boring, repetitive matching to a script.

If you want, I can share a stripped-down example script and a sample CSV layout to get you started — tell me what bank you use and whether you store invoices in Google Sheets or locally.