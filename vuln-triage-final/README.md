# Personalised Vulnerability Triage

Turns an organisation's critical-product list + a public vulnerability snapshot into a ranked,
explainable top 5 — with visible reasons, confidence, and one safe next step per item.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000. Pick an organisation from the dropdown and click **Run Triage**.

`data/vulnerabilities.csv`, `data/profiles.json`, and `data/gold_set.csv` are the actual
organiser-issued starter pack.

## Data schema (as issued, not as originally briefed)

**`vulnerabilities.csv`**: `cve_id, product_name, cvss_base_score, cisa_kev, first_epss` —
no vendor field, no versions, no description text. 540 rows across 6 products.

**`profiles.json`**: an `organizations[]` array. Each org has `org_id`, `name`, `sector`,
`risk_appetite`, a `weight_modifiers` object (`cvss_weight`, `cisa_kev_weight`,
`first_epss_weight`, summing to 1.0), and a `critical_products[]` list of plain product-name
strings — no version info, no separate exposure/importance fields.

This is a simpler, flatter schema than the brief's Appendix A describes — no version ranges, no
"NEEDS VERIFICATION" case. Matching is a straightforward name lookup; the interesting logic is
entirely in the scoring weights.

## Architecture

```
data/vulnerabilities.csv, profiles.json   (real starter pack)
        |
src/loadData.js        -> loads both into memory at startup
        |
src/matching.js         -> product_name in org.critical_products? INCLUDE : EXCLUDE (+reason)
        |
src/scoring.js           -> org's own weight_modifiers -> weighted score (0-100) + breakdown
        |
src/explain.js             -> plain-language title, next step, confidence (template-based)
        |
src/triage.js                -> orchestrates the above, picks the negative-test example
        |
src/server.js                  -> Express API (GET /api/profiles, GET/POST /api/triage)
        |
public/*                          -> static frontend (vanilla JS, no build step)
```

## Matching logic

`product_name` (case/whitespace-normalised) is checked against the organisation's
`critical_products[]`. A match is a critical asset for that org, so it's included; anything not
on the list is excluded with the reason recorded (nothing is silently dropped — you can see the
`excludedCount` in every response).

## Scoring — each organisation's own weights drive the score

```
score = (cvss_weight * cvss_base_score/10
       + cisa_kev_weight * (1 if in KEV else 0)
       + first_epss_weight * epss_score) * 100
```

The weights come straight from `profiles.json`, so risk appetite is baked into the ranking
without any hardcoded logic: the zero-tolerance utility weights CVSS heavily (0.5), the
high-appetite startup weights EPSS heavily (0.6), the risk-averse bank weights KEV heavily
(0.45). Every card shows the exact point contribution of each signal.

**Validated against `gold_set.csv`:** running this formula on the five gold-set CVEs with the
bank's and startup's weights reproduces the practitioner rankings almost exactly — bank order
came out 1,3,2,4,5 vs. practitioner 1,2,3,4,5 (only one adjacent pair swapped), startup order
came out 2,1,3,4,5 vs. practitioner 1,2,3,4,5 (same). Good enough to trust without hand-tuning.

Priority bands: >=75 URGENT, >=50 HIGH, >=25 MEDIUM, else LOW.

## Negative test

The pipeline automatically finds the highest-CVSS **excluded** item for each org (shown in the
orange banner) — e.g. a CVSS 10.0 "Embedded IoT Gateway" flaw is correctly excluded for the
bank, because that product isn't on the bank's critical list, regardless of severity.

## Explanation layer

No description field exists in the real data, so titles are built from a fixed template using
only CVSS severity band (critical/high/medium/low) and the KEV flag — never an invented attack
scenario. Next steps come from a small deterministic lookup keyed on KEV status and priority
band.

## Assumptions & limitations

- No version data exists in the real starter pack, so there's no "installed version out of
  range" exclusion case — only "not a critical product for this organisation."
- `critical_products` is the only signal of what an org runs; a product not listed there is
  treated as not applicable to that org, since the data gives no broader inventory.
- Confidence is High for every match, since the real data has no missing/blank fields (verified
  directly against all 540 rows).
- The starter pack has no `reference_url`, `published_date`, or snapshot date. Each card links
  to `https://nvd.nist.gov/vuln/detail/{cve_id}` — a real, working NVD page, not a fabricated
  link — but publication/snapshot dates genuinely aren't available and are left out rather than
  invented.
- No authentication, persistence, or deployment — matches the brief's MVP scope.

## Demo script (3 minutes)

1. Problem: small orgs can't tell which of hundreds of public CVEs affect the specific products
   they run.
2. Approach: match against the org's critical-product list -> score with that org's own
   cvss/kev/epss weights -> explain in plain language.
3. Live demo: run Global Retail Bank, then Agile Cloud Tech Startup -- completely different top
   5, because both the matched products and the scoring weights differ by org.
4. Negative test: point at the orange banner -- a CVSS 10.0 item correctly excluded because the
   organisation doesn't run that product.
5. Limitation: with no version data, the system can't distinguish "vulnerable version installed"
   from "any version of this product" -- it flags the whole product as relevant once it's on the
   critical list.
