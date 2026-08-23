// Real starter pack has no description field, so titles are built entirely
// from structured fields (CVSS band + KEV flag + product name) — no
// keyword-guessing about attack type, so nothing is invented.

function severityWord(cvss) {
  if (cvss >= 9) return "critical";
  if (cvss >= 7) return "high";
  if (cvss >= 4) return "medium";
  return "low";
}

function toBool(v) {
  return v === true || v === "True" || v === "true";
}

function buildTitle(row, org) {
  const cvss = parseFloat(row.cvss_base_score) || 0;
  const kev = toBool(row.cisa_kev);
  const word = severityWord(cvss);
  const exploited = kev ? " and is being actively exploited" : "";
  return `${row.product_name} has a ${word}-severity vulnerability${exploited}.`;
}

// A distinct "potential impact" statement, separate from the title, built
// only from CVSS band + KEV status (no attack-type guessing, since the
// real data has no description field to draw from).
function buildImpact(row) {
  const cvss = parseFloat(row.cvss_base_score) || 0;
  const kev = toBool(row.cisa_kev);
  if (kev) {
    return "Attackers are already exploiting this flaw in the wild, so any organisation running this product is at immediate risk of compromise.";
  }
  if (cvss >= 9) {
    return "A successful exploit could fully compromise this system, even though no confirmed real-world attacks have been recorded yet.";
  }
  if (cvss >= 7) {
    return "A successful exploit could seriously disrupt or damage this system.";
  }
  if (cvss >= 4) {
    return "A successful exploit could cause limited disruption or partial data exposure.";
  }
  return "The technical impact of a successful exploit is limited on its own.";
}

// Deterministic next-step lookup — never a generated/invented remediation claim.
function nextStepFor(row, priority) {
  const kev = toBool(row.cisa_kev);
  if (kev) {
    return "Patch immediately — this CVE is on CISA's Known Exploited Vulnerabilities list.";
  }
  if (priority === "URGENT" || priority === "HIGH") {
    return "Prioritize this in your next patch cycle and review the vendor advisory.";
  }
  if (priority === "MEDIUM") {
    return "Schedule for an upcoming maintenance window.";
  }
  return "Monitor for changes; no immediate action required.";
}

function buildResultCard(row, org, matchResult, scored, confidence) {
  return {
    cve_id: row.cve_id,
    priority: scored.priority,
    score: scored.score,
    title: buildTitle(row, org),
    potential_impact: buildImpact(row),
    matched_context: {
      product: row.product_name,
      organisation: org.name,
      sector: org.sector,
      risk_appetite: org.risk_appetite,
    },
    why_it_matters: scored.breakdown,
    match_reason: matchResult.reason,
    next_step: nextStepFor(row, scored.priority),
    confidence,
    source: {
      name: "NVD / CISA KEV / FIRST EPSS",
      cvss: row.cvss_base_score,
      in_kev: row.cisa_kev,
      epss: row.first_epss,
      // The real starter pack has no reference_url column, but CVE IDs map
      // predictably to NVD's detail page — a real, working link, not an
      // invented one. Publication/snapshot dates genuinely aren't in the
      // data, so they're left out rather than faked.
      url: `https://nvd.nist.gov/vuln/detail/${row.cve_id}`,
    },
  };
}

module.exports = { buildResultCard, buildTitle, nextStepFor };
