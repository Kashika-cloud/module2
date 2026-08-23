// Real starter-pack schema has no versions — matching is purely on
// product_name against each organisation's critical_products list.

const STATUS = {
  INCLUDE: "INCLUDE",
  EXCLUDE_NOT_CRITICAL: "EXCLUDE_NOT_CRITICAL",
};

function normaliseProduct(name) {
  return String(name || "").trim().toLowerCase();
}

// Runs one CVE-product row against one organisation profile.
// Never silently drops a row — always tags it with a reason.
function matchRow(org, row) {
  const rowProduct = normaliseProduct(row.product_name);
  const isCritical = org.critical_products.some((p) => normaliseProduct(p) === rowProduct);

  if (!isCritical) {
    return {
      status: STATUS.EXCLUDE_NOT_CRITICAL,
      reason: `${row.product_name} is not on ${org.name}'s critical product list.`,
    };
  }

  return {
    status: STATUS.INCLUDE,
    reason: `${row.product_name} is listed as a critical product for ${org.name}.`,
  };
}

function matchAll(org, rows) {
  return rows.map((row) => ({ row, match: matchRow(org, row) }));
}

module.exports = { STATUS, matchRow, matchAll };
