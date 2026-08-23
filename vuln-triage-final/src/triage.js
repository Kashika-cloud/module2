const { matchAll, STATUS } = require("./matching");
const { scoreItem, confidenceFor } = require("./scoring");
const { buildResultCard } = require("./explain");

// Runs the full pipeline for one organisation. Returns:
//  - top5: ranked, explained result cards for critical-product matches
//  - excludedCount: how many rows were excluded (not a critical product)
//  - negativeTest: the highest-CVSS excluded item — proves this isn't just
//    severity sorting (Section 4's mandatory test)
function runTriage(org, rows) {
  const matched = matchAll(org, rows);

  const candidates = [];
  const excluded = [];

  for (const { row, match } of matched) {
    if (match.status === STATUS.INCLUDE) {
      const scored = scoreItem(row, org);
      const confidence = confidenceFor(row, match);
      candidates.push({ row, match, scored, confidence });
    } else {
      excluded.push({ row, match });
    }
  }

  candidates.sort((a, b) => b.scored.score - a.scored.score);

  const top5 = candidates
    .slice(0, 5)
    .map(({ row, match, scored, confidence }) => buildResultCard(row, org, match, scored, confidence));

  const negativeTestPool = excluded
    .filter(({ row }) => parseFloat(row.cvss_base_score) >= 9.0)
    .sort((a, b) => parseFloat(b.row.cvss_base_score) - parseFloat(a.row.cvss_base_score));

  const negativeTest = negativeTestPool.length
    ? {
        cve_id: negativeTestPool[0].row.cve_id,
        cvss_score: negativeTestPool[0].row.cvss_base_score,
        product: negativeTestPool[0].row.product_name,
        reason_excluded: negativeTestPool[0].match.reason,
      }
    : null;

  return {
    organisation: { org_id: org.org_id, name: org.name, sector: org.sector, risk_appetite: org.risk_appetite },
    top5,
    excludedCount: excluded.length,
    negativeTest,
  };
}

module.exports = { runTriage };
