const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

function loadVulnerabilities(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function loadProfiles(jsonPath) {
  const raw = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(raw).organizations;
}

function loadAll(dataDir = path.join(__dirname, "..", "data")) {
  const rows = loadVulnerabilities(path.join(dataDir, "vulnerabilities.csv"));
  const profiles = loadProfiles(path.join(dataDir, "profiles.json"));
  return { rows, profiles };
}

module.exports = { loadVulnerabilities, loadProfiles, loadAll };
