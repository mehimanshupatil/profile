---
title: "The conservative ESOP math I use before accepting any offer"
pubDate: 2026-08-31
description: "A simple, reproducible way I convert paper‑value ESOP grants into a cash equivalent so I can compare offers and negotiate with real numbers."
author: "Devika Iyer"
image:
  url: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden table, a hand writing on a notepad, and a cup of coffee"
  caption: "Photo by Priscilla Du Preez on Unsplash"
  creditUrl: "https://unsplash.com/@priscilladupreez"
tags: ["personal-finance", "esops", "career"]
---

The offer came in on a Tuesday evening while I was eating maggi on my terrace in Pune. The email subject read: "Compensation details — offer letter attached." Base ₹9 lakh, ESOP grant (paper value) ₹18 lakh over 4 years. My brain did two things at once: calculate rent vs. dream, and immediately distrust that "₹18 lakh" number.

If you work in product/startup land in India, you've seen this: a big, shiny ESOP number that looks like free money. It isn't. Paper value hides strike price, vesting cliffs, exercise windows, taxes on exercise, dilution, and the two things that actually matter — company exit size and whether it will happen. I stopped treating the grant like a bonus and started treating it like illiquid, probabilistic deferred pay. I needed a quick rule to turn those letters into a single cash-equivalent number I could compare against offers and live by when negotiating.

What paper value hides

Paper value = (current fair value − strike) × number of options. It feels real because the math gives a big number. But:

- Vesting time matters. Four years is long when you have rent and a SIP.
- Liquidity events are not guaranteed. Many startups fail or limp along.
- Taxes hit at exercise (treated as salary/perquisite) and again on sale (capital gains).
- Dilution and future rounds can halve or quarter your share of the cake.

So decisions based on paper value are optimistic by design. I needed a conservative, repeatable method that matched my risk tolerance and my need for cash now.

My three‑number ESOP rule (how I convert to cash equivalent)

I use a simple heuristic that reduces the ESOP line item to a single number I can put next to base salary:

1) Classify the company stage (pre-seed/seed, growth, late-stage/PE-ready) and pick a realizability multiplier:
   - Pre-seed/seed: 5%
   - Series A / early growth: 15%
   - Growth / scaling with revenue: 30%

   Why? Exit probability rises with traction and revenues. These are blunt but honest.

2) Discount for vesting time at a conservative rate (I use 8% annual). This accounts for the time value of money and the fact that deferred pay is worth less to me today.

3) Subtract a rough tax/transaction buffer (I use 25%) to account for exercise tax, capital gains, legal fees, and sale friction — ESOPs often feel smaller after taxes and admin.

Formula (single line):
expected_cash_equivalent = paper_value × realizability_multiplier × (1 / (1 + 0.08) ^ years_to_full_vest) × (1 − 0.25)

Concrete example I ran that night
Offer: 20,000 options, strike ₹10, FMV ₹100 → paper value = (100 − 10) × 20,000 = ₹1,800,000.
Company stage: Series A → multiplier 15% → expected = ₹270,000.
Vesting: 4 years → discount factor = 1.08^4 ≈ 1.36 → discounted = ₹270,000 / 1.36 ≈ ₹198,500.
Tax buffer 25% → cash equivalent ≈ ₹150,000.

So the "₹18 lakh" line becomes roughly ₹1.5 lakh of cash-equivalent value to me. That made it trivial to compare offers: ₹9 lakh base + ₹1.5 lakh ESOP equiv = ₹10.5 lakh total versus a straight ₹11.5 lakh base somewhere else. The numbers are ugly but honest — and negotiable.

Why I like this rule
- Fast: I can run this in two minutes on my phone and stop fantasising about IPO yachts.
- Negotiable: numbers are defensible. I can say, "I value the ESOP at ₹1.5 lakh in present terms; can we bridge the ₹1 lakh cash gap?"
- Sleep-friendly: I stopped waking up imagining exits. If my calculation changes materially, I revisit (new funding round, revenue proof, etc.).

A failure that actually taught me the habit

I learned the hard way to be conservative. In 2018 I accepted an ESOP-heavy comp at an early-stage firm because I loved the product and wanted skin in the game. I convinced myself that "paper will turn into cash." Two years in, the startup pivoted, fired half the engineering team, and the promised secondary never happened. That grant became effectively worthless. I kept telling myself "wait one more round" and lost years of marketable salary increases.

The other failure was the time I exercised early at a discount, paid a perquisite tax because I thought liquidity was near, and then the company took longer to exit. My capital was tied up, I paid tax on phantom gains, and I had no way to sell. Both events taught me to put realistic probabilities and time-value discounts on ESOPs up front.

Tradeoffs and limits

This is a heuristic, not a valuation model. If you have inside knowledge — solid revenue numbers, committed term sheets, or a trustworthy cap table — your multiplier should be higher. If you have an offer with immediate cash shortfall (e.g., you need to move cities, pay rent), lean on cash. My rule is intentionally conservative; it biases towards cash and liquidity because that's what keeps me productive and sane.

Also: I ignore potential upside asymmetry. If the company is very late-stage and the potential upside is huge, you might value it differently. And taxes vary by exercise method (ESOP exercise routes, tender offers, etc.). Consult a CA for complex situations.

What I actually walk away with

ESOPs are not salary; they are optional deferred, illiquid compensation with a probability distribution. I turned the shiny number into a single cash-equivalent so I could compare, negotiate, and sleep. My takeaway: convert fantasy into a number. If the cash-equivalent doesn't meet your financial needs, ask for more cash, a higher joining bonus, or better vesting. That single step stopped me getting emotionally attached to paper value and made every job decision clearer.