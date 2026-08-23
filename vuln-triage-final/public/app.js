const tabsEl = document.getElementById("profile-tabs");
const runBtn = document.getElementById("run-btn");
const resultsEl = document.getElementById("results");
const negTestEl = document.getElementById("negative-test");
const statTotal = document.getElementById("stat-total");
const statShown = document.getElementById("stat-shown");
const statExcluded = document.getElementById("stat-excluded");
const feedStatus = document.getElementById("feed-status");

let profiles = [];
let activeOrgId = null;

function countUp(el, to, duration = 700) {
  const from = 0;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateGauge(gaugeEl, score, color, lightColor) {
  const start = performance.now();
  const duration = 900;
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const pct = score * eased;
    gaugeEl.style.background = `conic-gradient(from -90deg, ${lightColor} 0%, ${color} ${pct}%, var(--panel-raised) ${pct}%)`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const PRIORITY_COLOR = {
  URGENT: "var(--urgent)",
  HIGH: "var(--high)",
  MEDIUM: "var(--medium)",
  LOW: "var(--low)",
};
const PRIORITY_HEX = {
  URGENT: "#E5484D",
  HIGH: "#F5A524",
  MEDIUM: "#4A9EDB",
  LOW: "#64748B",
};
const PRIORITY_LIGHT = {
  URGENT: "#FF9B9B",
  HIGH: "#FFD98A",
  MEDIUM: "#9BD4FF",
  LOW: "#AEB9C9",
};
const PRIORITY_GLOW = {
  URGENT: "rgba(229,72,77,0.45)",
  HIGH: "rgba(245,165,36,0.4)",
  MEDIUM: "rgba(74,158,219,0.4)",
  LOW: "rgba(100,116,139,0.35)",
};
// Each organisation gets its own accent identity — color here means
// "whose data this is," layered on top of priority color meaning "how
// severe this item is." Unknown orgs (e.g. judges' Profile D) fall back
// to the default cyan accent gracefully.
const ORG_ACCENT = {
  "ORG-001": "#6366F1", // Global Retail Bank — indigo
  "ORG-002": "#D946EF", // Agile Cloud Tech Startup — fuchsia
  "ORG-003": "#F59E0B", // Municipal Utility Provider — amber
};
function accentFor(orgId) {
  return ORG_ACCENT[orgId] || "#22D3C7";
}
function setActiveAccent(orgId) {
  document.documentElement.style.setProperty("--active-accent", accentFor(orgId));
}

// ---------- Animated network background ----------
(function initNetworkBackground() {
  const canvas = document.getElementById("net-bg");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, points;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  function makePoints() {
    const count = Math.min(70, Math.floor((w * h) / 22000));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const p of points) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          ctx.strokeStyle = `rgba(34, 211, 199, ${0.14 * (1 - dist / 140)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }
    for (const p of points) {
      ctx.fillStyle = "rgba(34, 211, 199, 0.55)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  resize();
  makePoints();
  window.addEventListener("resize", () => { resize(); makePoints(); });
  frame();
})();

// ---------- Scrolling threat ticker (real data) ----------
async function loadTicker() {
  try {
    const res = await fetch("/api/ticker");
    const items = await res.json();
    const track = document.getElementById("ticker-track");
    const html = items
      .map(
        (i) => `
        <span class="ticker-item">
          <span class="t-cve">${i.cve_id}</span>
          <span class="t-sep">·</span>
          <span>${i.product}</span>
          <span class="t-sep">·</span>
          <span class="t-cvss">CVSS ${i.cvss}</span>
          ${i.kev ? '<span class="t-kev">KEV</span>' : ""}
        </span>`
      )
      .join('<span class="t-sep">◆</span>');
    // duplicate content so the marquee loops seamlessly
    track.innerHTML = html + '<span class="t-sep">◆</span>' + html;
  } catch (e) { /* ticker is decorative — fail silently */ }
}

// ---------- Rotating status log ----------
const STATUS_MESSAGES = [
  "Cross-referencing NVD, CISA KEV and FIRST EPSS…",
  "Applying organisation-specific risk weights…",
  "Ranking candidates by composite score…",
  "Verifying negative-test exclusions…",
  "Rendering explainable result cards…",
  "Matching product_name against critical assets…",
];
(function rotateStatusLog() {
  const el = document.getElementById("status-log");
  let i = 0;
  setInterval(() => {
    i = (i + 1) % STATUS_MESSAGES.length;
    el.classList.remove("fade");
    void el.offsetWidth;
    el.textContent = STATUS_MESSAGES[i];
    el.classList.add("fade");
  }, 2600);
})();

async function loadProfiles() {
  const res = await fetch("/api/profiles");
  profiles = await res.json();
  tabsEl.innerHTML = profiles
    .map((p, i) => `<button class="tab${i === 0 ? " active" : ""}" data-org="${p.org_id}">${p.name}</button>`)
    .join("");
  activeOrgId = profiles[0].org_id;
  setActiveAccent(activeOrgId);

  tabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabsEl.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeOrgId = btn.dataset.org;
      setActiveAccent(activeOrgId);
      runTriage();
    });
  });
}

function renderNegativeTest(neg) {
  if (!neg) {
    negTestEl.classList.add("hidden");
    return;
  }
  negTestEl.classList.remove("hidden");
  negTestEl.innerHTML = `
    <span class="vlog-icon">⚠</span>
    <div>
      <span class="vlog-title">Verification log — high severity, correctly withheld</span>
      <div class="vlog-body">
        <code>${neg.cve_id}</code> scores CVSS ${neg.cvss_score}, but was excluded from this feed: ${neg.reason_excluded}
      </div>
    </div>
  `;
}

function renderCard(item, index) {
  const color = PRIORITY_HEX[item.priority] || PRIORITY_HEX.LOW;
  const maxRef = 60;

  const whyRows = item.why_it_matters
    .map(
      (w) => `
      <div class="why-row">
        <span class="why-label">${w.label}</span>
        <span class="why-bar-track"><span class="why-bar-fill" data-target="${Math.min(100, (w.points / maxRef) * 100)}" style="background:${color}"></span></span>
        <span class="why-points">+${w.points}</span>
      </div>`
    )
    .join("");

  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--card-accent", color);
  card.style.setProperty("--card-glow", PRIORITY_GLOW[item.priority] || PRIORITY_GLOW.LOW);
  card.style.animationDelay = `${index * 90}ms`;
  card.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge" data-score="${item.score}" data-color="${color}" data-light="${PRIORITY_LIGHT[item.priority] || PRIORITY_LIGHT.LOW}">
        <span class="gauge-score">0</span>
      </div>
      <span class="gauge-max">/ 100</span>
    </div>
    <div class="card-body">
      <div class="priority-row">
        <span class="priority-tag ${item.priority}">${item.priority}</span>
        <span class="cve-id">${item.cve_id}</span>
      </div>
      <h3>${item.title}</h3>
      <div class="impact-line"><strong>Potential impact —</strong> ${item.potential_impact}</div>
      <div class="meta-strip">
        <span>${item.matched_context.product}</span>
        <span>${item.matched_context.organisation}</span>
        <span>${item.matched_context.sector}</span>
        <span>${item.matched_context.risk_appetite} risk</span>
      </div>
      <div class="why-panel">
        <div class="why-title">Why it matters</div>
        ${whyRows}
      </div>
      <div class="next-step-pill"><span class="ns-icon">▸</span> ${item.next_step}</div>
      <div class="footer-strip">
        <span>confidence: ${item.confidence.level.toLowerCase()} · CVSS ${item.source.cvss} · KEV ${item.source.in_kev} · EPSS ${item.source.epss}</span>
        <a href="${item.source.url}" target="_blank" rel="noopener">view source ↗</a>
      </div>
    </div>
  `;
  return card;
}

async function runTriage() {
  runBtn.classList.add("loading");
  feedStatus.textContent = "scanning…";
  resultsEl.innerHTML = "";

  const res = await fetch(`/api/triage/${activeOrgId}`);
  const data = await res.json();

  runBtn.classList.remove("loading");
  feedStatus.textContent = `${data.top5.length + data.excludedCount} records loaded`;

  countUp(statTotal, data.top5.length + data.excludedCount);
  countUp(statShown, data.top5.length);
  countUp(statExcluded, data.excludedCount);

  renderNegativeTest(data.negativeTest);

  data.top5.forEach((item, i) => {
    resultsEl.appendChild(renderCard(item, i));
  });

  // Trigger gauge + bar animations after DOM insertion
  requestAnimationFrame(() => {
    document.querySelectorAll(".gauge").forEach((g) => {
      const score = parseFloat(g.dataset.score);
      const color = g.dataset.color;
      const light = g.dataset.light;
      animateGauge(g, score, color, light);
      const scoreEl = g.querySelector(".gauge-score");
      countUp(scoreEl, score, 900);
    });
    document.querySelectorAll(".why-bar-fill").forEach((bar) => {
      const target = bar.dataset.target;
      setTimeout(() => { bar.style.width = target + "%"; }, 150);
    });
  });
}

loadProfiles().then(runTriage);
loadTicker();
