/* ==========================================================
   NEBULACRAFT — app.js
   All stellar objects rendered with scientifically accurate
   palettes — NO user colour input for generators.
   ========================================================== */

/* ----------------------------------------------------------
   CONSTANTS & STATE
   ---------------------------------------------------------- */
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "aoû",
  "sep",
  "oct",
  "nov",
  "déc",
];
const PAGE_META = {
  dashboard: { icon: "⬡", title: "Base d'opérations" },
  schedule: { icon: "◎", title: "Planning orbital" },
  emotes: { icon: "✦", title: "Emotes stellaires" },
  badges: { icon: "◈", title: "Badges de rang" },
  points: { icon: "◆", title: "Énergie de chaîne" },
};
const DEFAULT_IDEAS = [
  { ico: "🎵", txt: "Choisir la prochaine musique", used: false },
  { ico: "🎮", txt: "Choisir le prochain jeu", used: false },
  { ico: "🌌", txt: "Nommer une étoile du stream", used: false },
  { ico: "🚀", txt: "Lancer un défi impossible", used: false },
  { ico: "💫", txt: "Accent cosmique imposé", used: false },
  { ico: "⏸️", txt: "Pause de 5 minutes", used: false },
  { ico: "🌠", txt: "Screen de gameplay partagé", used: false },
  { ico: "☄️", txt: "Raid surprise", used: false },
  { ico: "📡", txt: "Message TTS en direct", used: false },
  { ico: "🔭", txt: "Build aléatoire imposé", used: false },
];

let currentTheme = "dark",
  weekOffset = 0,
  streams = [],
  idCtr = 1;
let selColor = "#8b5cf6",
  scSelColor = "#8b5cf6";
let settings = { times: true, notes: true };
let shortcuts = [
  { name: "Valorant", color: "#ef4444" },
  { name: "Just Chatting", color: "#8b5cf6" },
  { name: "Minecraft", color: "#10b981" },
  { name: "IRL", color: "#f59e0b" },
  { name: "Fortnite", color: "#06b6d4" },
  { name: "Tournoi", color: "#ec4899" },
];
let emotes = [],
  emoteFilter = "all";
let badgeTiers = [];
let rewards = [],
  rewardColor = "#8b5cf6";
let ideas = [...DEFAULT_IDEAS],
  cpIconDataURL = null;
let selectedEmoteObj = "pillars_of_creation";
let selectedBadgeObj = "mars";
let selectedCpObj = "cp_supernova";

/* ----------------------------------------------------------
   LOW-LEVEL CANVAS UTILS
   ---------------------------------------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
};
const lighten = (hex, a) => {
  const [r, g, b] = hx(hex);
  return `rgba(${~~(r + (255 - r) * a)},${~~(g + (255 - g) * a)},${~~(b + (255 - b) * a)},1)`;
};
function hx(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
const C = (r, g, b, a = 1) => `rgba(${r},${g},${b},${a})`;
function mk(sz) {
  const c = document.createElement("canvas");
  c.width = c.height = sz;
  return c;
}
function prng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function rgrad(ctx, cx, cy, r0, r1, stops) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}
function lgrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}
// clip to circle helper
function clipCirc(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}
// scatter stars
function scatter(ctx, sz, n, maxR, maxA, rng) {
  for (let i = 0; i < n; i++) {
    const x = rng() * sz,
      y = rng() * sz;
    const hue =
      rng() < 0.5 ? 215 + rng() * 35 : rng() < 0.6 ? 45 + rng() * 20 : 0;
    ctx.fillStyle = `hsla(${hue},70%,95%,${maxA * (0.3 + rng() * 0.7)})`;
    ctx.beginPath();
    ctx.arc(x, y, rng() * maxR, 0, Math.PI * 2);
    ctx.fill();
  }
}
// diffraction spike
function spike(ctx, x, y, len, alpha) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 0.6;
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  });
}
// label at bottom
function label(ctx, text, sz, color) {
  if (!text) return;
  const t = (text.length > 7 ? text.slice(0, 7) : text).toUpperCase();
  const fs = clamp(Math.floor(sz * 0.1), 7, 14);
  ctx.save();
  ctx.font = `600 ${fs}px 'Space Grotesk',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,.95)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(t, sz / 2, sz - 3);
  ctx.restore();
}
// noise: layered sine (no deps)
function noise(x, y, s = 1) {
  return (
    0.5 +
    0.3 * Math.sin(x * 1.8 + s) +
    0.2 * Math.sin(y * 2.3 + s * 0.7) +
    0.15 * Math.sin((x + y) * 1.5 + s * 1.3) -
    0.1
  );
}

/* =============================================================
   ███  EMOTE RENDERERS — 8 real celestial objects  ███
   Each function draws a 112px canvas (will be scaled down).
   All palettes are taken directly from real imagery.
   ============================================================= */

/* ── 1. PILLARS OF CREATION (Eagle Nebula, M16) ──────────────
   Webb MIRI image palette:
   Dusty pillars: tan/beige (dust heated by starlight)
   Background nebula: vivid cyan-teal (OIII) + rose (Hα)
   Hot star edges: bright yellow-white ionisation fronts
   Background: deep burgundy/black
   ──────────────────────────────────────────────────────────── */
function drawPillars(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 37 + sz);
  clipCirc(ctx, cx, cy, r);
  // Background: deep burgundy-black like Webb's infrared bg
  ctx.fillStyle = "#0a0205";
  ctx.fillRect(0, 0, sz, sz);
  // Distant nebula haze — teal-cyan (OIII)
  const bgG = rgrad(ctx, cx * 0.4, cy * 0.3, 0, sz * 0.95, [
    [0, C(30, 100, 140, 0.18)],
    [0.5, C(20, 60, 90, 0.08)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, sz, sz);
  // Hα glow — rose-red throughout
  const haG = rgrad(ctx, cx * 1.2, cy * 0.7, 0, sz * 0.8, [
    [0, C(180, 40, 80, 0.14)],
    [0.5, C(140, 30, 60, 0.06)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = haG;
  ctx.fillRect(0, 0, sz, sz);
  // Stars — blue-white
  scatter(ctx, sz, 20, 0.7, 0.5, rng);
  // PILLARS — 3 tall brownish dust columns
  const pillars = [
    {
      x: cx * 0.55,
      topY: cy * 0.12,
      botY: cy * 1.82,
      w: cx * 0.22,
      tilt: -0.04,
    },
    { x: cx * 1.02, topY: cy * 0.28, botY: cy * 1.9, w: cx * 0.17, tilt: 0.06 },
    { x: cx * 1.42, topY: cy * 0.5, botY: cy * 1.88, w: cx * 0.12, tilt: 0.02 },
  ];
  pillars.forEach(({ x, topY, botY, w, tilt }) => {
    const h = botY - topY;
    // Pillar body — dust tan/brown gradient
    const pg = lgrad(ctx, x - w, 0, x + w, 0, [
      [0, "rgba(0,0,0,0)"],
      [0.15, C(110, 75, 45, 0.9)],
      [0.45, C(140, 95, 55, 1)],
      [0.6, C(90, 60, 35, 0.95)],
      [0.85, C(60, 40, 20, 0.8)],
      [1, "rgba(0,0,0,0)"],
    ]);
    const cx2 = x + tilt * h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, topY);
    ctx.bezierCurveTo(
      x - w * 0.7,
      topY + h * 0.25,
      x + tilt * h * 0.25 - w * 0.8,
      topY + h * 0.6,
      cx2 - w * 1.0,
      botY,
    );
    ctx.lineTo(cx2 + w * 1.0, botY);
    ctx.bezierCurveTo(
      x + tilt * h * 0.25 + w * 0.8,
      topY + h * 0.6,
      x + w * 0.7,
      topY + h * 0.25,
      x + w * 0.6,
      topY,
    );
    ctx.closePath();
    ctx.fillStyle = pg;
    ctx.fill();
    // Ionisation rim — bright yellow-white on left edge (starlight)
    const irmG = lgrad(ctx, x - w * 0.8, 0, x - w * 0.3, 0, [
      [0, C(255, 230, 150, 0.65)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = irmG;
    ctx.fill();
    // EGGs (evaporating gaseous globules) — bright knots at top
    const eg = rgrad(ctx, x, topY + sz * 0.04, 0, sz * 0.06, [
      [0, C(255, 240, 200, 0.9)],
      [0.4, C(220, 180, 100, 0.4)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(x, topY + sz * 0.04, sz * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  label(ctx, lbl, sz, "rgba(200,230,255,.85)");
  return c;
}

/* ── 2. CRAB NEBULA (Pulsar wind nebula, M1) ─────────────────
   Hubble palette:
   Core: bright white-blue pulsar
   Inner torus: synchrotron blue-white
   Outer filaments: Hα deep red/orange wisps
   ──────────────────────────────────────────────────────────── */
function drawCrabNebula(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 41 + sz * 3);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#010108";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 18, 0.55, 0.4, rng);
  // Outer halo — red-orange Hα filaments (ragged ellipse)
  const outerG = rgrad(ctx, cx, cy, r * 0.35, r * 0.92, [
    [0, "rgba(0,0,0,0)"],
    [0.4, C(160, 50, 20, 0.15)],
    [0.75, C(200, 70, 25, 0.3)],
    [0.95, C(180, 55, 18, 0.15)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = outerG;
  ctx.fillRect(0, 0, sz, sz);
  // Filament wisps — random tangled strands
  for (let f = 0; f < 22; f++) {
    const ang = rng() * Math.PI * 2;
    const d = r * (0.35 + rng() * 0.5);
    const x1 = cx + Math.cos(ang) * d,
      y1 = cy + Math.sin(ang) * d;
    const x2 = cx + Math.cos(ang + rng() * 0.8 - 0.4) * d * (1 + rng() * 0.35),
      y2 = cy + Math.sin(ang + rng() * 0.8 - 0.4) * d * (1 + rng() * 0.35);
    const col =
      rng() < 0.6
        ? C(220, 80, 30, 0.45 + rng() * 0.3)
        : C(255, 140, 60, 0.3 + rng() * 0.3);
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.5 + rng();
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(
      cx + (rng() - 0.5) * sz * 0.4,
      cy + (rng() - 0.5) * sz * 0.4,
      x2,
      y2,
    );
    ctx.stroke();
  }
  // Synchrotron torus — blue-white inner glow
  const synG = rgrad(ctx, cx, cy, 0, r * 0.45, [
    [0, "rgba(0,0,0,0)"],
    [0.25, C(80, 140, 255, 0.12)],
    [0.6, C(100, 160, 255, 0.25)],
    [0.85, C(120, 180, 255, 0.15)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = synG;
  ctx.fillRect(0, 0, sz, sz);
  // Pulsar jets
  const jetAngle = -Math.PI / 5;
  [1, -1].forEach((dir) => {
    const jg = lgrad(
      ctx,
      cx,
      cy,
      cx + Math.cos(jetAngle) * dir * r * 0.78,
      cy + Math.sin(jetAngle) * dir * r * 0.78,
      [
        [0, "rgba(200,230,255,.85)"],
        [0.5, C(140, 190, 255, 0.4)],
        [1, "rgba(0,0,0,0)"],
      ],
    );
    ctx.strokeStyle = jg;
    ctx.lineWidth = clamp(sz * 0.04, 1, 5);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(jetAngle) * dir * r * 0.75,
      cy + Math.sin(jetAngle) * dir * r * 0.75,
    );
    ctx.stroke();
  });
  // Pulsar core
  const psrG = rgrad(ctx, cx, cy, 0, r * 0.1, [
    [0, "rgba(255,255,255,1)"],
    [0.4, "rgba(200,220,255,.8)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = psrG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  spike(ctx, cx, cy, r * 0.25, 0.35);
  ctx.restore();
  label(ctx, lbl, sz, "rgba(180,210,255,.85)");
  return c;
}

/* ── 3. BLACK HOLE M87 ────────────────────────────────────────
   EHT image + NASA simulation palette:
   Accretion disk: orange-gold Doppler asymmetry
   Photon ring: thin bright ring
   Shadow: absolute black
   One-sided jet: cyan-blue plasma
   ──────────────────────────────────────────────────────────── */
function drawBlackHoleM87(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#000003";
  ctx.fillRect(0, 0, sz, sz);
  const rng = prng(lbl.length * 53 + sz);
  scatter(ctx, sz, 14, 0.45, 0.3, rng);
  // Disk — far side (behind BH) red-dimmer
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.3);
  for (let rs = r * 0.82; rs >= r * 0.36; rs -= sz * 0.007) {
    const t = (rs - r * 0.36) / (r * 0.82 - r * 0.36);
    ctx.strokeStyle = C(
      clamp(200 - t * 100, 80, 200),
      clamp(80 - t * 50, 20, 80),
      clamp(20 - t * 10, 5, 20),
      clamp(0.75 - t * 0.55, 0.05, 0.75),
    );
    ctx.lineWidth = sz * 0.008;
    ctx.beginPath();
    ctx.arc(0, 0, rs, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Shadow
  ctx.fillStyle = rgrad(ctx, cx, cy, 0, r * 0.37, [
    [0, "rgba(0,0,0,1)"],
    [0.92, "rgba(0,0,0,1)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.37, 0, Math.PI * 2);
  ctx.fill();
  // Near side disk — hot orange-white Doppler boosted
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.3);
  for (let rs = r * 0.36; rs <= r * 0.82; rs += sz * 0.007) {
    const t = (rs - r * 0.36) / (r * 0.82 - r * 0.36);
    ctx.strokeStyle = C(
      clamp(255 - t * 40, 200, 255),
      clamp(200 - t * 140, 50, 200),
      clamp(80 - t * 60, 5, 80),
      clamp(0.9 - t * 0.6, 0.08, 0.9),
    );
    ctx.lineWidth = sz * 0.011;
    ctx.beginPath();
    ctx.arc(0, 0, rs, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  // Photon ring — thin gold
  ctx.strokeStyle = "rgba(255,200,80,.8)";
  ctx.lineWidth = clamp(sz * 0.018, 1, 3);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,130,.3)";
  ctx.lineWidth = clamp(sz * 0.008, 0.5, 2);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.43, 0, Math.PI * 2);
  ctx.stroke();
  // Relativistic jet (M87-style, one-sided, cyan-blue)
  const jg = lgrad(ctx, cx, cy, cx - r * 0.62, cy - r * 0.82, [
    [0, C(100, 200, 255, 0.8)],
    [0.5, C(60, 150, 255, 0.35)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.strokeStyle = jg;
  ctx.lineWidth = clamp(sz * 0.06, 1, 7);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.04);
  ctx.lineTo(cx - r * 0.58, cy - r * 0.78);
  ctx.stroke();
  ctx.restore();
  label(ctx, lbl, sz, "rgba(255,200,80,.9)");
  return c;
}

/* ── 4. MILKY WAY (core, ground-based) ───────────────────────
   Core: concentrated yellow-orange bulge (old stars)
   Disk: blue-white arm dust lanes, HII pink knots
   Dark dust lane across the bulge
   ──────────────────────────────────────────────────────────── */
function drawMilkyWay(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 61 + sz * 2);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#020210";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 60, 0.55, 0.4, rng);
  // Milky Way band — horizontal soft glow
  const bandG = lgrad(ctx, 0, cy - r * 0.18, 0, cy + r * 0.18, [
    [0, "rgba(0,0,0,0)"],
    [0.3, C(160, 130, 80, 0.15)],
    [0.5, C(180, 150, 90, 0.25)],
    [0.7, C(160, 130, 80, 0.15)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = bandG;
  ctx.fillRect(0, 0, sz, sz);
  // Spiral arms — thin blue-white band extending across
  for (let arm = 0; arm < 3; arm++) {
    const dy = (arm - 0.5) * r * 0.25;
    const armG = lgrad(ctx, 0, cy + dy, sz, cy + dy + r * 0.04, [
      [0, "rgba(0,0,0,0)"],
      [0.2, C(140, 160, 220, 0.2)],
      [0.5, C(160, 180, 240, 0.35)],
      [0.8, C(140, 160, 220, 0.2)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = armG;
    ctx.fillRect(0, 0, sz, sz);
  }
  // HII regions — pink knots
  for (let h = 0; h < 8; h++) {
    const hx = cx + (rng() - 0.5) * r * 0.9,
      hy = cy + (rng() - 0.5) * r * 0.3;
    const hr = r * (0.03 + rng() * 0.04);
    const hg = rgrad(ctx, hx, hy, 0, hr, [
      [0, C(255, 120, 160, 0.8)],
      [0.5, C(200, 80, 120, 0.3)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Galactic centre bulge — warm yellow-orange
  const bulgeG = rgrad(ctx, cx, cy, 0, r * 0.32, [
    [0, C(255, 240, 180, 1)],
    [0.3, C(240, 200, 100, 0.9)],
    [0.65, C(180, 130, 50, 0.5)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = bulgeG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // Dark dust lane
  const dlG = lgrad(
    ctx,
    cx - r * 0.4,
    cy - r * 0.04,
    cx + r * 0.3,
    cy + r * 0.05,
    [
      [0, "rgba(0,0,0,0)"],
      [0.35, "rgba(0,0,0,.45)"],
      [0.65, "rgba(0,0,0,.38)"],
      [1, "rgba(0,0,0,0)"],
    ],
  );
  ctx.fillStyle = dlG;
  ctx.fillRect(0, 0, sz, sz);
  ctx.restore();
  label(ctx, lbl, sz, "rgba(255,230,150,.9)");
  return c;
}

/* ── 5. CASSIOPEIA A (Supernova remnant) ─────────────────────
   Chandra X-ray + Webb palette:
   Outer shock: bright orange-gold filaments
   Interior: teal-green (silicon, argon lines)
   Iron blobs: vivid orange knots
   Central neutron star: hard blue-white dot
   ──────────────────────────────────────────────────────────── */
function drawCassiopeiaA(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 71 + sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#010108";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 15, 0.4, 0.3, rng);
  // Interior thermal X-ray glow — teal
  const intG = rgrad(ctx, cx, cy, 0, r * 0.72, [
    [0, "rgba(0,0,0,0)"],
    [0.35, C(20, 90, 80, 0.1)],
    [0.65, C(30, 110, 100, 0.18)],
    [0.88, C(20, 80, 70, 0.08)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = intG;
  ctx.fillRect(0, 0, sz, sz);
  // Shell knots — ragged forward shock
  for (let k = 0; k < 36; k++) {
    const ang = (k / 36) * Math.PI * 2;
    const dr = r * (rng() < 0.25 ? 0.82 : 0.72 + rng() * 0.14);
    const bx = cx + Math.cos(ang) * dr,
      by = cy + Math.sin(ang) * dr;
    const br = r * (0.04 + rng() * 0.06);
    const phase = rng();
    const [kr, kg, kb] =
      phase < 0.4
        ? [255, clamp(100 + phase * 80, 80, 180), 20]
        : phase < 0.7
          ? [
              30,
              clamp(160 + phase * 60, 140, 220),
              clamp(120 + phase * 40, 100, 180),
            ]
          : [255, clamp(140 + phase * 60, 120, 200), 40];
    const sg = rgrad(ctx, bx, by, 0, br, [
      [0, C(kr, kg, kb, 0.85)],
      [0.5, C(kr, kg, kb, 0.35)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  // Iron knots — vivid orange blobs
  for (let i = 0; i < 6; i++) {
    const ang = rng() * Math.PI * 2,
      d = r * (0.45 + rng() * 0.25);
    const ix = cx + Math.cos(ang) * d,
      iy = cy + Math.sin(ang) * d;
    const ig = rgrad(ctx, ix, iy, 0, r * 0.08, [
      [0, C(255, 160, 30, 0.9)],
      [0.5, C(255, 120, 20, 0.4)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(ix, iy, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // Central neutron star
  const nsG = rgrad(ctx, cx, cy, 0, r * 0.08, [
    [0, "rgba(220,240,255,1)"],
    [0.5, "rgba(150,200,255,.5)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = nsG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  spike(ctx, cx, cy, r * 0.2, 0.3);
  ctx.restore();
  label(ctx, lbl, sz, "rgba(255,200,80,.9)");
  return c;
}

/* ── 6. AURORA BOREALIS ──────────────────────────────────────
   Real aurora photo palette:
   OIII green: dominant 557.7 nm emission (most common)
   Hα pink-red: lower altitude
   Ionospheric blue: high altitude N2+
   Stars visible through curtains
   ──────────────────────────────────────────────────────────── */
function drawAurora(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 83 + sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#020515";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 60, 0.55, 0.6, rng);
  // Curtains — vertical sinuous bands, OIII green dominant
  const curtainColors = [
    [0, 210, 80],
    [0, 180, 100],
    [200, 50, 160],
    [255, 80, 50],
    [50, 130, 255],
  ];
  for (let b = 0; b < 7; b++) {
    const bx = sz * (b / 7) + rng() * sz * 0.12 - sz * 0.06;
    const bw = sz * (0.04 + rng() * 0.08);
    const col = curtainColors[b % curtainColors.length];
    const alpha = 0.18 + rng() * 0.28;
    // Build wavy path
    const pts = [];
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const py = (s / steps) * sz;
      const px = bx + Math.sin(s * 0.6 + rng() * 1.2) * bw * 1.2;
      pts.push([px, py]);
    }
    const ag = lgrad(ctx, 0, sz * 0.05, 0, sz * 0.85, [
      [0, C(...col, alpha * 0.2)],
      [0.1, C(...col, alpha * 0.9)],
      [0.55, C(...col, alpha * 0.7)],
      [0.85, C(...col, alpha * 0.3)],
      [1, C(...col, 0)],
    ]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0] - bw, pts[0][1]);
    pts.forEach(([px, py]) => ctx.lineTo(px + bw * 0.6, py));
    pts
      .slice()
      .reverse()
      .forEach(([px, py]) => ctx.lineTo(px - bw * 0.6, py));
    ctx.closePath();
    ctx.fillStyle = ag;
    ctx.fill();
  }
  // Ground — dark silhouette of horizon
  const grG = lgrad(ctx, 0, sz * 0.68, 0, sz, [
    [0, "rgba(0,0,0,0)"],
    [0.2, "rgba(0,5,15,.6)"],
    [1, "rgba(0,3,10,.95)"],
  ]);
  ctx.fillStyle = grG;
  ctx.fillRect(0, 0, sz, sz);
  // Faint star reflections
  for (let i = 0; i < 5; i++) {
    const sx = rng() * sz,
      sy = sz * 0.75 + rng() * sz * 0.15;
    ctx.fillStyle = `rgba(200,230,255,${0.1 + rng() * 0.12})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rng() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  label(ctx, lbl, sz, "rgba(100,255,150,.9)");
  return c;
}

/* ── 7. OMEGA CENTAURI (Globular cluster) ────────────────────
   Hubble palette:
   Core: concentrated yellow-white (old, metal-rich stars)
   Red giants: scattered orange-red bright stars
   Blue stragglers: hot blue-white
   Halo: faint, resolved stars, bluish
   ──────────────────────────────────────────────────────────── */
function drawOmegaCentauri(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 97 + sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#01010a";
  ctx.fillRect(0, 0, sz, sz);
  // Core diffuse glow
  const cG = rgrad(ctx, cx, cy, 0, r * 0.4, [
    [0, C(255, 245, 200, 0.5)],
    [0.4, C(240, 210, 130, 0.22)],
    [0.75, C(180, 150, 80, 0.08)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = cG;
  ctx.fillRect(0, 0, sz, sz);
  // King profile star placement
  const N = sz > 60 ? 400 : 180;
  for (let i = 0; i < N; i++) {
    // Rejection sampling for King profile
    let dist,
      angle,
      attempt = 0,
      rr,
      th;
    do {
      rr = rng() * r * 0.96;
      th = rng() * Math.PI * 2;
      dist = rr;
      attempt++;
    } while (
      rng() > 1 / (1 + Math.pow(dist / (r * 0.12), 1.8)) &&
      attempt < 14
    );
    const x = cx + Math.cos(th) * dist,
      y = cy + Math.sin(th) * dist;
    const pop = rng();
    let [sr, sg2, sb, sR, sa] = [];
    if (pop < 0.12) {
      sr = 160;
      sg2 = 200;
      sb = 255;
      sR = 0.6 + rng() * 0.7;
      sa = 0.7 + rng() * 0.3;
    } // Blue stragglers
    else if (pop < 0.2) {
      sr = 255;
      sg2 = 100;
      sb = 60;
      sR = 0.7 + rng() * 0.8;
      sa = 0.6 + rng() * 0.4;
    } // Red giants
    else if (pop < 0.55) {
      sr = 255;
      sg2 = 250;
      sb = 220;
      sR = 0.3 + rng() * 0.5;
      sa = 0.5 + rng() * 0.4;
    } // Main sequence
    else {
      sr = 255;
      sg2 = 230;
      sb = 160;
      sR = 0.2 + rng() * 0.4;
      sa = 0.3 + rng() * 0.5;
    } // Sub-giants
    if (sR > 0.6 && i % 6 === 0) {
      const sg3 = rgrad(ctx, x, y, 0, sR * 4, [
        [0, C(sr, sg2, sb, sa * 0.35)],
        [1, "rgba(0,0,0,0)"],
      ]);
      ctx.fillStyle = sg3;
      ctx.beginPath();
      ctx.arc(x, y, sR * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C(sr, sg2, sb, sa);
    ctx.beginPath();
    ctx.arc(x, y, sR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  label(ctx, lbl, sz, "rgba(255,235,160,.9)");
  return c;
}

/* ── 8. RING NEBULA (Planetary nebula M57) ───────────────────
   Hubble + Webb palette:
   Outer shell: red-orange Hα
   Middle shell: yellow-green sulphur (SII)
   Inner ring: OIII cyan-teal (hot gas)
   Core: tiny blue-white white dwarf
   ──────────────────────────────────────────────────────────── */
function drawRingNebula(sz, lbl) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  const rng = prng(lbl.length * 103 + sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#01010c";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 20, 0.5, 0.3, rng);
  // Outer Hα shell — tilted ellipse, red-orange
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.scale(1, 0.78);
  const outerG = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r * 0.88);
  outerG.addColorStop(0, "rgba(0,0,0,0)");
  outerG.addColorStop(0.4, C(160, 40, 20, 0.18));
  outerG.addColorStop(0.75, C(200, 60, 25, 0.38));
  outerG.addColorStop(0.92, C(180, 50, 18, 0.18));
  outerG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outerG;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // SII ring — yellow-green, slightly smaller
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.1);
  ctx.scale(1, 0.72);
  const siiG = ctx.createRadialGradient(0, 0, r * 0.38, 0, 0, r * 0.68);
  siiG.addColorStop(0, "rgba(0,0,0,0)");
  siiG.addColorStop(0.4, C(160, 200, 40, 0.12));
  siiG.addColorStop(0.72, C(180, 220, 50, 0.32));
  siiG.addColorStop(0.9, C(160, 200, 40, 0.12));
  siiG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = siiG;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // OIII inner ring — teal-cyan
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.68);
  const oiiiG = ctx.createRadialGradient(0, 0, r * 0.22, 0, 0, r * 0.5);
  oiiiG.addColorStop(0, "rgba(0,0,0,0)");
  oiiiG.addColorStop(0.3, C(20, 150, 170, 0.2));
  oiiiG.addColorStop(0.68, C(30, 180, 200, 0.5));
  oiiiG.addColorStop(0.88, C(20, 150, 170, 0.22));
  oiiiG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = oiiiG;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Interior — very faint glow
  const intG = rgrad(ctx, cx, cy, 0, r * 0.3, [
    [0, "rgba(0,0,0,0)"],
    [0.4, C(40, 80, 100, 0.05)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = intG;
  ctx.fillRect(0, 0, sz, sz);
  // White dwarf
  const wdG = rgrad(ctx, cx, cy, 0, r * 0.07, [
    [0, "rgba(220,240,255,1)"],
    [0.4, "rgba(180,210,255,.8)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = wdG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, lbl, sz, "rgba(150,230,240,.9)");
  return c;
}

/* =============================================================
   ███  BADGE RENDERERS — 7 real solar system/stellar objects ███
   ============================================================= */

/* ── MARS ─────────────────────────────────────────────────────
   Reddish-orange iron oxide surface, polar ice cap,
   Valles Marineris scar, thin blueish atmosphere limb
   ──────────────────────────────────────────────────────────── */
function drawMars(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    pr = sz * 0.44;
  ctx.clearRect(0, 0, sz, sz);
  const rng = prng(sz * 7);
  // Sphere gradient
  const sg = rgrad(ctx, cx * 0.65, cy * 0.58, 0, pr * 1.6, [
    [0, C(230, 150, 100, 1)],
    [0.35, C(210, 110, 70, 1)],
    [0.65, C(185, 80, 50, 1)],
    [0.88, C(140, 55, 35, 1)],
    [1, C(80, 30, 18, 1)],
  ]);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  // Surface features
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  // Valles Marineris — dark diagonal rift
  ctx.strokeStyle = "rgba(80,30,15,.55)";
  ctx.lineWidth = clamp(sz * 0.04, 1, 5);
  ctx.beginPath();
  ctx.moveTo(cx - pr * 0.7, cy + pr * 0.1);
  ctx.quadraticCurveTo(cx, cy + pr * 0.05, cx + pr * 0.7, cy + pr * 0.2);
  ctx.stroke();
  // Volcanic highlands — darker patches
  for (let v = 0; v < 3; v++) {
    const vx = cx + (rng() - 0.5) * pr * 1.2,
      vy = cy + (rng() - 0.5) * pr * 0.9;
    ctx.fillStyle = C(160, 70, 40, 0.25);
    ctx.beginPath();
    ctx.arc(vx, vy, pr * (0.12 + rng() * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  // Polar cap — white-ish
  const polG = rgrad(ctx, cx + pr * 0.1, cy - pr * 0.78, 0, pr * 0.32, [
    [0, "rgba(230,240,255,.85)"],
    [0.5, "rgba(200,220,240,.4)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = polG;
  ctx.beginPath();
  ctx.arc(cx + pr * 0.1, cy - pr * 0.78, pr * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Atmosphere limb glow
  const atmG = rgrad(ctx, cx, cy, pr * 0.9, pr * 1.05, [
    [0, "rgba(0,0,0,0)"],
    [0.5, C(160, 100, 80, 0.2)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = atmG;
  ctx.fillRect(0, 0, sz, sz);
  // Specular
  ctx.fillStyle = "rgba(255,200,180,.1)";
  ctx.beginPath();
  ctx.ellipse(cx * 0.72, cy * 0.7, pr * 0.35, pr * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/* ── JUPITER ──────────────────────────────────────────────────
   Iconic cloud bands: creamy belts + brown zones + red GRS
   ──────────────────────────────────────────────────────────── */
function drawJupiter(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    pr = sz * 0.45;
  ctx.clearRect(0, 0, sz, sz);
  // Base: warm cream
  const base = rgrad(ctx, cx * 0.62, cy * 0.58, 0, pr * 1.6, [
    [0, C(240, 220, 180, 1)],
    [0.5, C(210, 185, 140, 1)],
    [0.82, C(175, 145, 100, 1)],
    [1, C(120, 95, 65, 1)],
  ]);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  // Cloud bands — dark brown/orange alternating with cream
  const bands = [
    { y: -0.78, h: 0.07, col: C(160, 100, 60, 0.6) },
    { y: -0.62, h: 0.05, col: C(190, 130, 80, 0.5) },
    { y: -0.48, h: 0.09, col: C(145, 85, 50, 0.65) },
    { y: -0.3, h: 0.06, col: C(180, 110, 65, 0.45) },
    { y: -0.16, h: 0.12, col: C(155, 95, 55, 0.7) },
    { y: 0.0, h: 0.08, col: C(170, 105, 60, 0.5) },
    { y: 0.15, h: 0.1, col: C(150, 90, 52, 0.65) },
    { y: 0.32, h: 0.07, col: C(185, 115, 68, 0.45) },
    { y: 0.46, h: 0.1, col: C(148, 88, 50, 0.7) },
    { y: 0.62, h: 0.06, col: C(175, 108, 62, 0.5) },
    { y: 0.74, h: 0.08, col: C(152, 92, 54, 0.55) },
  ];
  bands.forEach(({ y, h, col }) => {
    const bg = ctx.createLinearGradient(
      0,
      cy + y * pr - h * pr * 0.5,
      0,
      cy + y * pr + h * pr * 0.5,
    );
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(0.45, col);
    bg.addColorStop(0.55, col);
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(cx - pr, cy + y * pr - h * pr, pr * 2, h * pr * 2);
  });
  // Great Red Spot — oval, red-orange
  ctx.save();
  ctx.translate(cx + pr * 0.2, cy + pr * 0.18);
  ctx.scale(1, 0.55);
  const grsG = rgrad(ctx, 0, -pr * 0.04, 0, pr * 0.2, [
    [0, C(210, 80, 40, 0.85)],
    [0.5, C(190, 70, 35, 0.65)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = grsG;
  ctx.beginPath();
  ctx.arc(0, 0, pr * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Limb gradient
  const lmb = rgrad(ctx, cx, cy, pr * 0.88, pr * 1.0, [
    [0, "rgba(0,0,0,0)"],
    [0.5, "rgba(0,0,0,.4)"],
    [1, "rgba(0,0,0,.7)"],
  ]);
  ctx.fillStyle = lmb;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  // Specular
  ctx.fillStyle = "rgba(255,250,220,.08)";
  ctx.beginPath();
  ctx.ellipse(cx * 0.7, cy * 0.68, pr * 0.3, pr * 0.14, -0.35, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/* ── SATURN ────────────────────────────────────────────────── */
function drawSaturn(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2;
  ctx.clearRect(0, 0, sz, sz);
  const pr = sz * 0.3;
  // Planet sphere
  const sg = rgrad(ctx, cx * 0.65, cy * 0.6, 0, pr * 1.5, [
    [0, C(245, 230, 190, 1)],
    [0.4, C(220, 200, 155, 1)],
    [0.7, C(190, 165, 115, 1)],
    [1, C(140, 115, 75, 1)],
  ]);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  // Subtle bands
  [
    { y: -0.55, h: 0.08, a: 0.25 },
    { y: -0.3, h: 0.1, a: 0.2 },
    { y: 0, h: 0.12, a: 0.28 },
    { y: 0.32, h: 0.09, a: 0.2 },
    { y: 0.55, h: 0.07, a: 0.22 },
  ].forEach(({ y, h, a }) => {
    ctx.fillStyle = C(165, 125, 75, a);
    const bg = ctx.createLinearGradient(
      0,
      cy + y * pr - h * pr,
      0,
      cy + y * pr + h * pr,
    );
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(0.5, C(160, 120, 70, a));
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(cx - pr, cy + y * pr - h * pr, pr * 2, h * pr * 2);
  });
  ctx.restore();
  // Ring system — drawn in two passes (behind + in front)
  const drawRingHalf = (top) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.3);
    [
      { r: pr * 2.15, w: sz * 0.035, c: C(200, 180, 140, 0.28) },
      { r: pr * 1.88, w: sz * 0.055, c: C(215, 195, 152, 0.42) },
      { r: pr * 1.65, w: sz * 0.05, c: C(200, 178, 138, 0.38) },
      { r: pr * 1.45, w: sz * 0.035, c: C(185, 165, 125, 0.32) },
      { r: pr * 1.3, w: sz * 0.025, c: C(170, 150, 110, 0.22) },
      { r: pr * 1.22, w: sz * 0.018, c: C(160, 140, 100, 0.15) },
    ].forEach(({ r: rr, w, c: col }) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 0, rr, top ? Math.PI : 0, top ? Math.PI * 2 : Math.PI);
      ctx.stroke();
    });
    ctx.restore();
  };
  drawRingHalf(true); // far
  // Re-draw planet on top
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(cx, cy, pr * 0.99, 0, Math.PI * 2);
  ctx.fill();
  // Limb
  const lmb = rgrad(ctx, cx, cy, pr * 0.88, pr * 1.0, [
    [0, "rgba(0,0,0,0)"],
    [0.6, "rgba(0,0,0,.35)"],
    [1, "rgba(0,0,0,.6)"],
  ]);
  ctx.fillStyle = lmb;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  drawRingHalf(false); // near
  // Specular
  ctx.fillStyle = "rgba(255,250,220,.07)";
  ctx.beginPath();
  ctx.ellipse(cx * 0.75, cy * 0.7, pr * 0.28, pr * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/* ── NEUTRON STAR ─────────────────────────────────────────────
   Hot blue-white photosphere, X-ray hot-spots, magnetic poles
   ──────────────────────────────────────────────────────────── */
function drawNeutronStar(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.93;
  ctx.clearRect(0, 0, sz, sz);
  const rng = prng(sz * 11);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#000410";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 20, 0.5, 0.35, rng);
  // Hot magnetosphere — layered blue-purple glow
  const atmG = rgrad(ctx, cx, cy, 0, r, [
    [0, "rgba(0,0,0,0)"],
    [0.5, C(30, 50, 180, 0.08)],
    [0.78, C(50, 80, 220, 0.2)],
    [0.92, C(80, 120, 255, 0.15)],
    [1, C(100, 140, 255, 0.08)],
  ]);
  ctx.fillStyle = atmG;
  ctx.fillRect(0, 0, sz, sz);
  // Surface — small, incredibly dense, blue-white
  const surfG = rgrad(ctx, cx * 0.7, cy * 0.7, 0, r * 0.28, [
    [0, "rgba(255,255,255,1)"],
    [0.2, C(200, 220, 255, 1)],
    [0.5, C(140, 170, 255, 1)],
    [0.8, C(80, 110, 220, 1)],
    [1, C(40, 60, 160, 1)],
  ]);
  ctx.fillStyle = surfG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Magnetic pole hot-spots — X-ray bright patches
  const poles = [
    [cx, cy - r * 0.22],
    [cx, cy + r * 0.22],
  ];
  poles.forEach(([px, py]) => {
    const hg = rgrad(ctx, px, py, 0, r * 0.1, [
      [0, "rgba(200,230,255,.9)"],
      [0.5, "rgba(120,180,255,.4)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(px, py, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  // Emission jets along magnetic axis
  [1, -1].forEach((dir) => {
    const jg = lgrad(ctx, cx, cy, cx, cy + dir * r * 0.92, [
      [0, C(180, 210, 255, 0.7)],
      [0.5, C(100, 150, 255, 0.3)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.strokeStyle = jg;
    ctx.lineWidth = clamp(sz * 0.035, 1, 4);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy + dir * r * 0.28);
    ctx.lineTo(cx, cy + dir * r * 0.9);
    ctx.stroke();
  });
  spike(ctx, cx, cy, r * 0.5, 0.5);
  ctx.restore();
  return c;
}

/* ── BLACK HOLE (badge compact) ────────────────────────────── */
function drawBlackHoleBadge(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.9;
  ctx.clearRect(0, 0, sz, sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#000003";
  ctx.fillRect(0, 0, sz, sz);
  const rng = prng(sz * 13);
  scatter(ctx, sz, 10, 0.4, 0.25, rng);
  // Accretion disk — compact version
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.28);
  for (let rs = r * 0.82; rs >= r * 0.36; rs -= sz * 0.009) {
    const t = (rs - r * 0.36) / (r * 0.82 - r * 0.36);
    ctx.strokeStyle = C(
      clamp(200 - t * 90, 80, 200),
      clamp(75 - t * 45, 20, 75),
      15,
      clamp(0.7 - t * 0.5, 0.04, 0.7),
    );
    ctx.lineWidth = sz * 0.01;
    ctx.beginPath();
    ctx.arc(0, 0, rs, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  for (let rs = r * 0.36; rs <= r * 0.82; rs += sz * 0.009) {
    const t = (rs - r * 0.36) / (r * 0.82 - r * 0.36);
    ctx.strokeStyle = C(
      clamp(255 - t * 35, 200, 255),
      clamp(195 - t * 130, 50, 195),
      clamp(75 - t * 55, 5, 75),
      clamp(0.88 - t * 0.6, 0.06, 0.88),
    );
    ctx.lineWidth = sz * 0.012;
    ctx.beginPath();
    ctx.arc(0, 0, rs, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = rgrad(ctx, cx, cy, 0, r * 0.36, [
    [0, "rgba(0,0,0,1)"],
    [0.9, "rgba(0,0,0,1)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.37, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,80,.75)";
  ctx.lineWidth = clamp(sz * 0.015, 1, 2.5);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return c;
}

/* ── MOON ────────────────────────────────────────────────────
   Real Apollo-era palette: grey basalt mare, highland grey-white,
   crater rims, terminator shadow
   ──────────────────────────────────────────────────────────── */
function drawMoon(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    pr = sz * 0.44;
  ctx.clearRect(0, 0, sz, sz);
  const rng = prng(sz * 17);
  // Surface — grey highland
  const sG = rgrad(ctx, cx * 0.65, cy * 0.62, 0, pr * 1.5, [
    [0, C(200, 200, 205, 1)],
    [0.45, C(175, 175, 182, 1)],
    [0.75, C(145, 145, 152, 1)],
    [1, C(90, 90, 96, 1)],
  ]);
  ctx.fillStyle = sG;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  // Mare (dark basalt plains)
  const mares = [
    { x: 0.1, y: -0.2, r: 0.35, a: 0.42 },
    { x: -0.25, y: 0.15, r: 0.28, a: 0.35 },
    { x: 0.35, y: 0.3, r: 0.22, a: 0.38 },
    { x: -0.05, y: 0.4, r: 0.2, a: 0.3 },
  ];
  mares.forEach(({ x, y, r, a }) => {
    const mx = cx + x * pr,
      my = cy + y * pr;
    const mG = rgrad(ctx, mx, my, 0, r * pr, [
      [0, C(100, 100, 105, a)],
      [0.6, C(110, 110, 115, a * 0.7)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = mG;
    ctx.beginPath();
    ctx.arc(mx, my, r * pr, 0, Math.PI * 2);
    ctx.fill();
  });
  // Craters
  for (let k = 0; k < 12; k++) {
    const crx = cx + (rng() - 0.5) * pr * 1.6,
      cry = cy + (rng() - 0.5) * pr * 1.6;
    const crr = pr * (0.03 + rng() * 0.1);
    ctx.strokeStyle = C(120, 120, 125, 0.5);
    ctx.lineWidth = clamp(sz * 0.012, 0.5, 2);
    ctx.beginPath();
    ctx.arc(crx, cry, crr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C(95, 95, 100, 0.2);
    ctx.fill();
  }
  ctx.restore();
  // Terminator
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  const tG = lgrad(ctx, cx - pr * 0.15, 0, cx + pr * 0.4, 0, [
    [0, "rgba(0,0,0,0)"],
    [0.5, "rgba(0,0,0,.45)"],
    [1, "rgba(0,0,0,.82)"],
  ]);
  ctx.fillStyle = tG;
  ctx.fillRect(0, 0, sz, sz);
  ctx.restore();
  // Atmosphere limb (almost none)
  const lmb = rgrad(ctx, cx, cy, pr * 0.9, pr * 1.03, [
    [0, "rgba(0,0,0,0)"],
    [0.5, "rgba(150,160,180,.08)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = lmb;
  ctx.fillRect(0, 0, sz, sz);
  return c;
}

/* ── SUN ────────────────────────────────────────────────────
   SDO/AIA palette (304 Å orange, 171 Å gold):
   Photosphere: granulation texture, orange-yellow-white
   Prominences: ejecting loops on limb
   Sunspots: dark umbra + lighter penumbra
   ──────────────────────────────────────────────────────────── */
function drawSun(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    pr = sz * 0.43;
  ctx.clearRect(0, 0, sz, sz);
  const rng = prng(sz * 19);
  // Photosphere — radial orange-white-yellow
  const sG = rgrad(ctx, cx * 0.7, cy * 0.65, 0, pr * 1.5, [
    [0, "rgba(255,255,230,1)"],
    [0.2, C(255, 250, 180, 1)],
    [0.5, C(255, 200, 60, 1)],
    [0.8, C(240, 140, 20, 1)],
    [1, C(200, 90, 10, 1)],
  ]);
  ctx.fillStyle = sG;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  // Granulation — convection cells (tiny speckles)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.clip();
  for (let g = 0; g < 60; g++) {
    const gx = cx + (rng() - 0.5) * pr * 2,
      gy = cy + (rng() - 0.5) * pr * 2;
    const gr2 = pr * (0.03 + rng() * 0.06);
    ctx.fillStyle = C(255, 220, 100, 0.08 + rng() * 0.1);
    ctx.beginPath();
    ctx.arc(gx, gy, gr2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sunspots — 2–3 dark umbra with penumbra
  for (let s = 0; s < 3; s++) {
    const sx = cx + (rng() - 0.5) * pr * 0.9,
      sy = cy + (rng() - 0.5) * pr * 0.9;
    const sr = pr * (0.05 + rng() * 0.07);
    // Penumbra
    ctx.fillStyle = C(160, 80, 15, 0.6);
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Umbra
    ctx.fillStyle = C(60, 25, 5, 0.85);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Prominence loops on limb
  for (let p = 0; p < 3; p++) {
    const ang = ((p * 0.9 + 0.4) * Math.PI * 2) / 3;
    const bx = cx + Math.cos(ang) * pr * 0.92,
      by = cy + Math.sin(ang) * pr * 0.92;
    const ht = pr * (0.18 + rng() * 0.15);
    const pgG = lgrad(
      ctx,
      bx,
      by,
      bx + Math.cos(ang) * ht,
      by + Math.sin(ang) * ht,
      [
        [0, C(255, 100, 30, 0.7)],
        [0.4, C(255, 60, 10, 0.5)],
        [1, "rgba(0,0,0,0)"],
      ],
    );
    ctx.strokeStyle = pgG;
    ctx.lineWidth = clamp(sz * 0.035, 1, 4);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(
      bx + Math.cos(ang + Math.PI / 2) * ht * 0.8,
      by + Math.sin(ang + Math.PI / 2) * ht * 0.8,
      bx + Math.cos(ang) * ht,
      by + Math.sin(ang) * ht,
    );
    ctx.stroke();
  }
  // Outer corona
  const coroG = rgrad(ctx, cx, cy, pr * 0.95, pr * 1.35, [
    [0, "rgba(0,0,0,0)"],
    [0.3, C(255, 160, 30, 0.1)],
    [0.7, C(255, 120, 20, 0.05)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = coroG;
  ctx.fillRect(0, 0, sz, sz);
  // Limb darkening
  const ldG = rgrad(ctx, cx, cy, pr * 0.6, pr, [
    [0, "rgba(0,0,0,0)"],
    [0.5, "rgba(0,0,0,.08)"],
    [1, "rgba(0,0,0,.5)"],
  ]);
  ctx.fillStyle = ldG;
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/* =============================================================
   ███  CHANNEL POINTS ICON RENDERERS — 5 objects  ███
   ============================================================= */

/* Supernova — expanding shell, bright core */
function cpSupernova(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.9;
  ctx.clearRect(0, 0, sz, sz);
  const rng = prng(sz * 23);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#010108";
  ctx.fillRect(0, 0, sz, sz);
  scatter(ctx, sz, 15, 0.4, 0.3, rng);
  // Expanding shell — ragged, orange-gold
  for (let k = 0; k < 28; k++) {
    const ang = (k / 28) * Math.PI * 2;
    const dr = r * (0.62 + rng() * 0.2);
    const bx = cx + Math.cos(ang) * dr,
      by = cy + Math.sin(ang) * dr;
    const phase = rng();
    const [kr, kg, kb] =
      phase < 0.5
        ? [255, clamp(150 + phase * 80, 120, 220), 30]
        : [255, clamp(80 + phase * 60, 60, 130), 20];
    const sg = rgrad(ctx, bx, by, 0, r * 0.1, [
      [0, C(kr, kg, kb, 0.85)],
      [0.5, C(kr, kg, kb, 0.3)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rays
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rg = lgrad(
      ctx,
      cx,
      cy,
      cx + Math.cos(a) * r * 0.82,
      cy + Math.sin(a) * r * 0.82,
      [
        [0, C(255, 200, 60, 0.65)],
        [0.6, C(255, 140, 30, 0.2)],
        [1, "rgba(0,0,0,0)"],
      ],
    );
    ctx.strokeStyle = rg;
    ctx.lineWidth = 1 + rng();
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.08, cy + Math.sin(a) * r * 0.08);
    ctx.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
    ctx.stroke();
  }
  const cG = rgrad(ctx, cx, cy, 0, r * 0.2, [
    [0, "rgba(255,255,220,.95)"],
    [0.4, C(255, 220, 120, 0.7)],
    [0.8, C(255, 150, 50, 0.2)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = cG;
  ctx.fillRect(0, 0, sz, sz);
  spike(ctx, cx, cy, r * 0.45, 0.5);
  ctx.restore();
  return c;
}

/* Pulsar — periodic beacon */
function cpPulsar(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.9;
  ctx.clearRect(0, 0, sz, sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#010210";
  ctx.fillRect(0, 0, sz, sz);
  const rng = prng(sz * 29);
  scatter(ctx, sz, 18, 0.5, 0.35, rng);
  // Torus
  const jA = Math.PI / 3;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(jA);
  ctx.scale(1, 0.22);
  const tG = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 0.85);
  tG.addColorStop(0, "rgba(0,0,0,0)");
  tG.addColorStop(0.5, C(60, 140, 255, 0.2));
  tG.addColorStop(0.82, C(80, 170, 255, 0.38));
  tG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tG;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Jets
  [1, -1].forEach((d) => {
    const jg = lgrad(
      ctx,
      cx,
      cy,
      cx + Math.cos(jA + Math.PI / 2) * d * r * 0.82,
      cy + Math.sin(jA + Math.PI / 2) * d * r * 0.82,
      [
        [0, "rgba(180,220,255,.9)"],
        [0.5, C(100, 170, 255, 0.4)],
        [1, "rgba(0,0,0,0)"],
      ],
    );
    ctx.strokeStyle = jg;
    ctx.lineWidth = clamp(sz * 0.042, 1, 5);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(jA + Math.PI / 2) * d * r * 0.08,
      cy + Math.sin(jA + Math.PI / 2) * d * r * 0.08,
    );
    ctx.lineTo(
      cx + Math.cos(jA + Math.PI / 2) * d * r * 0.8,
      cy + Math.sin(jA + Math.PI / 2) * d * r * 0.8,
    );
    ctx.stroke();
  });
  const cG = rgrad(ctx, cx, cy, 0, r * 0.1, [
    [0, "rgba(255,255,255,1)"],
    [0.4, "rgba(200,220,255,.8)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = cG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  spike(ctx, cx, cy, r * 0.28, 0.45);
  ctx.restore();
  return c;
}

/* Nebula cloud */
function cpNebulaCloud(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  ctx.clearRect(0, 0, sz, sz);
  ctx.drawImage(drawPillars(sz, ""), 0, 0);
  return c;
}

/* Comet */
function cpComet(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.9;
  ctx.clearRect(0, 0, sz, sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#020313";
  ctx.fillRect(0, 0, sz, sz);
  const rng = prng(sz * 31);
  scatter(ctx, sz, 22, 0.5, 0.4, rng);
  // Dust tail
  const dtG = lgrad(ctx, cx * 0.18, cy * 0.22, cx * 0.82, cy * 0.82, [
    [0, "rgba(0,0,0,0)"],
    [0.4, C(200, 180, 140, 0.15)],
    [1, C(230, 210, 170, 0.55)],
  ]);
  ctx.fillStyle = dtG;
  ctx.beginPath();
  ctx.moveTo(cx * 0.18, cy * 0.25);
  ctx.lineTo(cx * 0.32, cy * 0.1);
  ctx.lineTo(cx * 0.86, cy * 0.88);
  ctx.lineTo(cx * 0.72, cy * 0.96);
  ctx.closePath();
  ctx.fill();
  // Ion tail
  const itG = lgrad(ctx, cx * 0.28, cy * 0.08, cx * 0.84, cy * 0.52, [
    [0, "rgba(0,0,0,0)"],
    [0.5, C(100, 180, 255, 0.22)],
    [1, C(120, 200, 255, 0.5)],
  ]);
  ctx.strokeStyle = itG;
  ctx.lineWidth = clamp(sz * 0.04, 1, 5);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx * 0.28, cy * 0.1);
  ctx.lineTo(cx * 0.82, cy * 0.52);
  ctx.stroke();
  // Coma + nucleus
  const comaG = rgrad(ctx, cx * 0.8, cy * 0.78, 0, r * 0.22, [
    [0, C(255, 245, 220, 0.9)],
    [0.4, C(230, 220, 190, 0.5)],
    [0.75, C(200, 190, 160, 0.15)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = comaG;
  ctx.beginPath();
  ctx.arc(cx * 0.8, cy * 0.78, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,240,.95)";
  ctx.beginPath();
  ctx.arc(cx * 0.8, cy * 0.78, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

/* Magnetar — highly magnetised neutron star with flares */
function cpMagnetar(sz) {
  const c = mk(sz),
    ctx = c.getContext("2d");
  const cx = sz / 2,
    cy = sz / 2,
    r = cx * 0.9;
  ctx.clearRect(0, 0, sz, sz);
  clipCirc(ctx, cx, cy, r);
  ctx.fillStyle = "#020110";
  ctx.fillRect(0, 0, sz, sz);
  const rng = prng(sz * 37);
  scatter(ctx, sz, 18, 0.4, 0.3, rng);
  // Magnetic field lines
  const nFieldLines = 6;
  for (let fl = 0; fl < nFieldLines; fl++) {
    const a = (fl / nFieldLines) * Math.PI * 2;
    const lg = lgrad(
      ctx,
      cx,
      cy,
      cx + Math.cos(a) * r * 0.88,
      cy + Math.sin(a) * r * 0.88,
      [
        [0, C(160, 80, 255, 0.7)],
        [0.5, C(120, 50, 220, 0.35)],
        [1, "rgba(0,0,0,0)"],
      ],
    );
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1);
    const midX = cx + Math.cos(a + Math.PI / 6) * r * 0.55,
      midY = cy + Math.sin(a + Math.PI / 6) * r * 0.55;
    ctx.quadraticCurveTo(
      midX,
      midY,
      cx + Math.cos(a) * r * 0.85,
      cy + Math.sin(a) * r * 0.85,
    );
    ctx.stroke();
  }
  // X-ray burst flares
  for (let b = 0; b < 4; b++) {
    const ba = (b / 4) * Math.PI * 2 + Math.PI / 8;
    const bd = r * (0.68 + rng() * 0.18);
    const bx2 = cx + Math.cos(ba) * bd,
      by2 = cy + Math.sin(ba) * bd;
    const bg = rgrad(ctx, bx2, by2, 0, r * 0.15, [
      [0, C(180, 120, 255, 0.9)],
      [0.4, C(100, 60, 200, 0.4)],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx2, by2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // Core
  const cG = rgrad(ctx, cx, cy, 0, r * 0.12, [
    [0, "rgba(255,255,255,1)"],
    [0.3, C(200, 160, 255, 0.9)],
    [0.6, C(120, 80, 255, 0.5)],
    [1, "rgba(0,0,0,0)"],
  ]);
  ctx.fillStyle = cG;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  spike(ctx, cx, cy, r * 0.35, 0.45);
  ctx.restore();
  return c;
}

/* =============================================================
   DISPATCHER MAPS
   ============================================================= */
const EMOTE_FNS = {
  pillars_of_creation: drawPillars,
  crab_nebula: drawCrabNebula,
  black_hole_m87: drawBlackHoleM87,
  milky_way: drawMilkyWay,
  cassiopeia_a: drawCassiopeiaA,
  aurora_borealis: drawAurora,
  omega_centauri: drawOmegaCentauri,
  ring_nebula: drawRingNebula,
};
const BADGE_FNS = {
  mars: (sz) => drawMars(sz),
  jupiter: (sz) => drawJupiter(sz),
  saturn: (sz) => drawSaturn(sz),
  neutron_star: (sz) => drawNeutronStar(sz),
  black_hole_badge: (sz) => drawBlackHoleBadge(sz),
  moon_badge: (sz) => drawMoon(sz),
  sun: (sz) => drawSun(sz),
};
const CP_FNS = {
  cp_supernova: (sz) => cpSupernova(sz),
  cp_pulsar: (sz) => cpPulsar(sz),
  cp_nebula_cloud: (sz) => cpNebulaCloud(sz),
  cp_comet: (sz) => cpComet(sz),
  cp_magnetar: (sz) => cpMagnetar(sz),
};

/* =============================================================
   OBJECT PICKERS — render thumbnails and handle selection
   ============================================================= */
function renderObjectPicker(pickerId, fns, defaultKey, onSelect) {
  const container = document.getElementById(pickerId);
  if (!container) return;
  const items = container.querySelectorAll(".obj-item");
  items.forEach((item) => {
    const val = item.dataset.val;
    const canvas = item.querySelector(".obj-thumb");
    if (canvas && fns[val]) {
      try {
        const rendered = fns[val](40, "");
        canvas.getContext("2d").drawImage(rendered, 0, 0, 40, 40);
      } catch (e) {
        console.warn("thumb err", val, e);
      }
    }
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      onSelect(val);
    });
  });
}

/* =============================================================
   STARFIELD BACKGROUND
   ============================================================= */
(() => {
  const cv = document.getElementById("starfield");
  const ct = cv.getContext("2d");
  let stars = [],
    nebs = [],
    W,
    H;
  const resize = () => {
    W = cv.width = window.innerWidth;
    H = cv.height = window.innerHeight;
    stars = [];
    const n = Math.floor((W * H) / 2000);
    for (let i = 0; i < n; i++) {
      const mag = Math.random(),
        isBright = mag < 0.04,
        isMid = mag < 0.18;
      const hue =
        Math.random() < 0.5
          ? 215 + Math.random() * 35
          : Math.random() < 0.6
            ? 45 + Math.random() * 20
            : 0;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: isBright
          ? 1.4 + Math.random()
          : isMid
            ? 0.5 + Math.random() * 0.4
            : 0.12 + Math.random() * 0.28,
        base: isBright
          ? 0.8 + Math.random() * 0.2
          : isMid
            ? 0.25 + Math.random() * 0.4
            : 0.08 + Math.random() * 0.2,
        spd: 3e-4 + Math.random() * 7e-4,
        phase: Math.random() * Math.PI * 2,
        hue,
        sat: isBright ? 90 : 60,
        diff: isBright,
      });
    }
    nebs = [];
    const pals = [
      [
        [200, 60, 220],
        [80, 140, 255],
        [255, 80, 120],
      ],
      [
        [255, 120, 50],
        [200, 80, 220],
        [80, 200, 255],
      ],
      [
        [60, 200, 255],
        [180, 60, 255],
        [255, 200, 60],
      ],
    ];
    for (let i = 0; i < 5; i++) {
      const pal = pals[i % 3];
      nebs.push({
        x: Math.random() * W,
        y: Math.random() * H,
        rx: 180 + Math.random() * 300,
        ry: 80 + Math.random() * 200,
        rot: Math.random() * Math.PI,
        alpha: 0.016 + Math.random() * 0.03,
        cols: pal,
      });
    }
  };
  let t = 0;
  const draw = () => {
    ct.clearRect(0, 0, W, H);
    t += 0.004;
    nebs.forEach((n) => {
      ct.save();
      ct.translate(n.x, n.y);
      ct.rotate(n.rot);
      n.cols.forEach(([r, g, b], ci) => {
        const off = ci * 0.3;
        const gr = ct.createRadialGradient(
          off * 40,
          off * 25,
          0,
          0,
          0,
          Math.max(n.rx, n.ry),
        );
        gr.addColorStop(0, C(r, g, b, n.alpha * 1.4));
        gr.addColorStop(0.5, C(r, g, b, n.alpha * 0.5));
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ct.save();
        ct.scale(1, n.ry / n.rx);
        ct.fillStyle = gr;
        ct.beginPath();
        ct.arc(0, 0, n.rx, 0, Math.PI * 2);
        ct.fill();
        ct.restore();
      });
      ct.restore();
    });
    stars.forEach((s) => {
      const blink = s.base * (0.65 + 0.35 * Math.sin(t / s.spd + s.phase));
      ct.fillStyle = `hsla(${s.hue},${s.sat}%,92%,${blink})`;
      ct.beginPath();
      ct.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ct.fill();
      if (s.diff) {
        ct.strokeStyle = `hsla(${s.hue},${s.sat}%,95%,${blink * 0.45})`;
        ct.lineWidth = 0.5;
        [0, Math.PI / 2].forEach((a) => {
          [1, -1].forEach((d) => {
            ct.beginPath();
            ct.moveTo(
              s.x + Math.cos(a) * d * s.r * 2,
              s.y + Math.sin(a) * d * s.r * 2,
            );
            ct.lineTo(
              s.x + Math.cos(a) * d * s.r * 9,
              s.y + Math.sin(a) * d * s.r * 9,
            );
            ct.stroke();
          });
        });
      }
    });
    requestAnimationFrame(draw);
  };
  window.addEventListener("resize", resize);
  resize();
  draw();
})();

/* =============================================================
   THEME / PAGE ROUTING / DASHBOARD
   ============================================================= */
function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  document.getElementById("theme-btn").textContent =
    currentTheme === "dark" ? "☀" : "☾";
  localStorage.setItem("tk_theme", currentTheme);
}
function onChannelInput() {
  updateChannelDisplay(document.getElementById("channel-name").value.trim());
}
function _setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function updateChannelDisplay(name) {
  _setTxt("hero-channel-name", (name || "Votre Chaîne").toUpperCase());
  _setTxt("hero-url-slug", name || "—");
  _setTxt("dash-channel", name ? `— ${name}` : "à bord de NebulaCraft");
}
function switchPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document
    .querySelectorAll(".nav-item[data-page]")
    .forEach((n) => n.classList.toggle("active", n.dataset.page === name));
  _setTxt("page-icon", PAGE_META[name]?.icon || "");
  _setTxt("page-title", PAGE_META[name]?.title || "");
  if (name === "dashboard") updateDashboard();
  if (name === "schedule") renderGrid();
}
document
  .querySelectorAll(".nav-item[data-page]")
  .forEach((n) =>
    n.addEventListener("click", () => switchPage(n.dataset.page)),
  );
function updateDashboard() {
  const name = document.getElementById("channel-name").value.trim();
  updateChannelDisplay(name);
  const ws = streams.filter((s) => s.week === weekOffset);
  const emDone = emotes.filter((e) => e.status === "done").length;
  _setTxt("d-streams", ws.length);
  _setTxt("d-emotes", emotes.length);
  _setTxt("d-badges", badgeTiers.length);
  _setTxt("d-rewards", rewards.length);
  _setTxt(
    "hero-tag-streams",
    `${ws.length} stream${ws.length !== 1 ? "s" : ""}/sem`,
  );
  _setTxt(
    "hero-tag-emotes",
    `${emotes.length} emote${emotes.length !== 1 ? "s" : ""}`,
  );
  _setTxt(
    "hero-tag-rewards",
    `${rewards.length} récompense${rewards.length !== 1 ? "s" : ""}`,
  );
  const sp = Math.min(100, ws.length * 14),
    ep = emotes.length ? Math.round((emDone / emotes.length) * 100) : 0,
    bp = Math.min(100, badgeTiers.length * 20),
    rp = Math.min(100, rewards.length * 14);
  document.getElementById("db-streams").style.width = sp + "%";
  document.getElementById("db-emotes").style.width = ep + "%";
  document.getElementById("db-badges").style.width = bp + "%";
  document.getElementById("db-rewards").style.width = rp + "%";
  document.getElementById("dash-progress").innerHTML = `
    <div class="mission-row" style="--bar-color:var(--nebula-purple)"><div class="mission-label"><span class="mission-lbl">Emotes terminées</span><span class="mission-val">${emDone}/${emotes.length}</span></div><div class="mission-bar-bg"><div class="mission-bar-fill" style="width:${ep}%;--bar-color:var(--nebula-purple)"></div></div></div>
    <div class="mission-row" style="--bar-color:var(--nebula-gold)"><div class="mission-label"><span class="mission-lbl">Badges générés</span><span class="mission-val">${badgeTiers.length} paliers</span></div><div class="mission-bar-bg"><div class="mission-bar-fill" style="width:${bp}%;--bar-color:var(--nebula-gold)"></div></div></div>
    <div class="mission-row" style="--bar-color:var(--nebula-teal)"><div class="mission-label"><span class="mission-lbl">Récompenses</span><span class="mission-val">${rewards.length}</span></div><div class="mission-bar-bg"><div class="mission-bar-fill" style="width:${rp}%;--bar-color:var(--nebula-teal)"></div></div></div>
    <div class="mission-row" style="--bar-color:var(--nebula-pink)"><div class="mission-label"><span class="mission-lbl">Sessions planifiées</span><span class="mission-val">${ws.length}/7</span></div><div class="mission-bar-bg"><div class="mission-bar-fill" style="width:${sp}%;--bar-color:var(--nebula-pink)"></div></div></div>`;
}

/* =============================================================
   SCHEDULE
   ============================================================= */
function getWeekDates(off = 0) {
  const now = new Date(),
    dow = now.getDay(),
    diff = dow === 0 ? -6 : 1 - dow,
    mon = new Date(now);
  mon.setDate(now.getDate() + diff + off * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}
const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
let toastTmr;
function toast(msg, color = "#8b5cf6") {
  clearTimeout(toastTmr);
  document.getElementById("toast-msg").textContent = msg;
  document.getElementById("toast-dot").style.background = color;
  document.getElementById("toast").classList.add("show");
  toastTmr = setTimeout(
    () => document.getElementById("toast").classList.remove("show"),
    2700,
  );
}
const openModal = (id) => document.getElementById(id).classList.add("open");
const closeModal = (id) => document.getElementById(id).classList.remove("open");
function renderGrid() {
  const dates = getWeekDates(weekOffset),
    todayS = new Date().toDateString();
  const cv = document.getElementById("schedule-canvas");
  cv.innerHTML = "";
  document.getElementById("week-range").textContent =
    `${fmtDate(dates[0])} — ${fmtDate(dates[6])} ${dates[6].getFullYear()}`;
  document.getElementById("week-label").textContent = fmtDate(dates[0]);
  dates.forEach((date, idx) => {
    const ws = streams.filter((s) => s.day === idx && s.week === weekOffset);
    const col = document.createElement("div");
    col.className =
      "day-col" + (date.toDateString() === todayS ? " is-today" : "");
    col.innerHTML = `<div class="day-head"><div class="day-name">${DAYS_SHORT[idx]}</div><div class="day-num">${date.getDate()}</div></div><div class="day-body">${ws.map((s) => `<div class="stream-card" style="background:${s.color};border-left-color:${lighten(s.color, 0.4)};"><div class="sc-inner"><div class="sc-game">${esc(s.game)}</div>${settings.times ? `<div class="sc-time"><span>${s.start}</span><span class="sc-sep">›</span><span>${s.end}</span></div>` : ""} ${settings.notes && s.note ? `<div class="sc-note">${esc(s.note)}</div>` : ""}</div><button class="sc-del" onclick="event.stopPropagation();deleteStream(${s.id})">✕</button></div>`).join("")}<button class="day-add" onclick="openStreamModal(${idx})"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 1v8M1 5h8"/></svg>Mission</button></div>`;
    cv.appendChild(col);
  });
  updateStats();
  document
    .querySelector('[data-page="schedule"]')
    .classList.toggle(
      "has-pip",
      streams.filter((s) => s.week === weekOffset).length > 0,
    );
}
function updateStats() {
  const ws = streams.filter((s) => s.week === weekOffset);
  let m = 0;
  const days = new Set(),
    cnt = {};
  ws.forEach((s) => {
    const [sh, sm] = s.start.split(":").map(Number),
      [eh, em] = s.end.split(":").map(Number);
    const d = eh * 60 + em - (sh * 60 + sm);
    m += d > 0 ? d : d + 1440;
    days.add(s.day);
    cnt[s.game] = (cnt[s.game] || 0) + 1;
  });
  const h = Math.floor(m / 60),
    mi = m % 60;
  document.getElementById("s-count").textContent = ws.length;
  document.getElementById("s-hours").textContent =
    mi > 0 ? `${h}h${mi}` : `${h}h`;
  document.getElementById("s-days").textContent = `${days.size}/7`;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("s-top").textContent = top ? top[0] : "—";
}
function addStream() {
  let game = document.getElementById("f-game").value;
  if (game === "__custom")
    game = document.getElementById("f-custom").value.trim();
  if (!game) {
    toast("Sélectionne un jeu !", "#ef4444");
    return;
  }
  streams.push({
    id: idCtr++,
    game,
    day: parseInt(document.getElementById("f-day").value),
    start: document.getElementById("f-start").value,
    end: document.getElementById("f-end").value,
    color: selColor,
    note: document.getElementById("f-note").value.trim(),
    week: weekOffset,
  });
  renderGrid();
  saveAll();
  toast(`Mission "${game}" lancée !`, selColor);
  document.getElementById("f-note").value = "";
}
function deleteStream(id) {
  streams = streams.filter((s) => s.id !== id);
  renderGrid();
  saveAll();
  toast("Mission annulée", "#ef4444");
}
function openStreamModal(idx) {
  document.getElementById("m-day").value = idx;
  document.getElementById("m-game").value = "";
  document.getElementById("m-note").value = "";
  openModal("stream-modal");
  setTimeout(() => document.getElementById("m-game").focus(), 60);
}
function confirmStreamModal() {
  const game = document.getElementById("m-game").value.trim();
  if (!game) {
    toast("Saisis un jeu !", "#ef4444");
    return;
  }
  streams.push({
    id: idCtr++,
    game,
    day: parseInt(document.getElementById("m-day").value),
    start: document.getElementById("m-start").value,
    end: document.getElementById("m-end").value,
    color: selColor,
    note: document.getElementById("m-note").value.trim(),
    week: weekOffset,
  });
  closeModal("stream-modal");
  renderGrid();
  saveAll();
  toast(`"${game}" ajouté !`, selColor);
}
function shiftWeek(dir) {
  weekOffset += dir;
  renderGrid();
}
function toggleSetting(key) {
  settings[key] = !settings[key];
  document.getElementById("tog-" + key).classList.toggle("on", settings[key]);
  renderGrid();
  saveAll();
}
function quickSet(game, color) {
  selColor = color;
  document
    .querySelectorAll("#color-row .swatch")
    .forEach((s) => s.classList.toggle("active", s.dataset.c === color));
  const sel = document.getElementById("f-game");
  let found = false;
  for (let o of sel.options) {
    if (o.value === game) {
      sel.value = game;
      found = true;
      break;
    }
  }
  if (!found) {
    sel.value = "__custom";
    document.getElementById("custom-wrap").style.display = "block";
    document.getElementById("f-custom").value = game;
  }
  toast(`${game} sélectionné`, color);
}
function renderShortcuts() {
  document.getElementById("quick-list").innerHTML = shortcuts
    .map(
      (s, i) =>
        `<div class="quick-item" onclick="quickSet('${esc(s.name)}','${s.color}')"><div class="quick-dot" style="background:${s.color};box-shadow:0 0 5px ${s.color};"></div><span class="quick-name">${esc(s.name)}</span><button class="quick-del" onclick="event.stopPropagation();deleteShortcut(${i})">✕</button></div>`,
    )
    .join("");
}
function deleteShortcut(i) {
  shortcuts.splice(i, 1);
  renderShortcuts();
  saveAll();
  toast("Accès supprimé", "#ef4444");
}
function updateScPreview() {
  document.getElementById("sc-prev-name").textContent =
    document.getElementById("sc-name").value.trim() || "Aperçu...";
}
function confirmShortcut() {
  const name = document.getElementById("sc-name").value.trim();
  if (!name) {
    toast("Saisis un nom !", "#ef4444");
    return;
  }
  shortcuts.push({ name, color: scSelColor });
  renderShortcuts();
  closeModal("shortcut-modal");
  saveAll();
  toast(`"${name}" ajouté !`, scSelColor);
}
function loadDemo() {
  streams = [
    {
      id: idCtr++,
      game: "Valorant",
      day: 0,
      start: "20:00",
      end: "23:00",
      color: "#ef4444",
      note: "Ranked",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "Just Chatting",
      day: 1,
      start: "19:00",
      end: "21:00",
      color: "#8b5cf6",
      note: "Q&A",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "Minecraft",
      day: 2,
      start: "21:00",
      end: "00:00",
      color: "#10b981",
      note: "SMP",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "Elden Ring",
      day: 3,
      start: "20:30",
      end: "23:30",
      color: "#f59e0b",
      note: "NG+",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "Valorant",
      day: 4,
      start: "20:00",
      end: "23:00",
      color: "#ef4444",
      note: "Tournoi",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "IRL",
      day: 5,
      start: "15:00",
      end: "18:00",
      color: "#06b6d4",
      note: "Sortie",
      week: weekOffset,
    },
    {
      id: idCtr++,
      game: "Minecraft",
      day: 6,
      start: "14:00",
      end: "18:00",
      color: "#10b981",
      note: "Build",
      week: weekOffset,
    },
  ];
  renderGrid();
  saveAll();
  toast("Planning démo chargé !", "#8b5cf6");
}
function clearAll() {
  if (!confirm("Effacer toutes les missions ?")) return;
  streams = [];
  renderGrid();
  saveAll();
  toast("Planning effacé", "#ef4444");
}

/* =============================================================
   EMOTES
   ============================================================= */
function generateEmote() {
  const name = document.getElementById("e-name").value.trim();
  if (!name) {
    toast("Saisis un nom !", "#ef4444");
    return;
  }
  const tier = document.getElementById("e-tier").value;
  const fn = EMOTE_FNS[selectedEmoteObj] || drawPillars;
  const canvasData = [112, 56, 28].map((sz) =>
    fn(sz, name).toDataURL("image/png"),
  );
  emotes.push({
    id: idCtr++,
    name,
    obj: selectedEmoteObj,
    tier,
    status: "done",
    imgData: canvasData[0],
    canvasData,
  });
  renderEmotes();
  saveAll();
  toast(`"${name}" générée !`, "#8b5cf6");
  document.getElementById("e-name").value = "";
}
function uploadEmote(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const name =
    document.getElementById("e-name").value.trim() ||
    file.name.replace(/\.[^.]+$/, "");
  const tier = document.getElementById("e-tier").value;
  const reader = new FileReader();
  reader.onload = (e) => {
    emotes.push({
      id: idCtr++,
      name,
      obj: "upload",
      tier,
      status: "todo",
      imgData: e.target.result,
      canvasData: [e.target.result],
    });
    renderEmotes();
    saveAll();
    toast(`"${name}" importée !`, "#06b6d4");
  };
  reader.readAsDataURL(file);
  ev.target.value = "";
}
function deleteEmote(id) {
  emotes = emotes.filter((e) => e.id !== id);
  renderEmotes();
  saveAll();
  toast("Emote supprimée", "#ef4444");
}
function cycleEmoteStatus(id) {
  const e = emotes.find((em) => em.id === id);
  if (!e) return;
  e.status = { todo: "review", review: "done", done: "todo" }[e.status];
  renderEmotes();
  saveAll();
}
function dlCanvas(url, fn) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fn;
  a.click();
}
function filterEmotes(f, btn) {
  emoteFilter = f;
  document
    .querySelectorAll("#emote-filters .filter-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderEmotes();
}
const TIER_LBL = {
  sub1: "Sub T1",
  sub2: "Sub T2",
  sub3: "Sub T3",
  bit: "Bits",
  free: "Gratuite",
};
const STS_LBL = { todo: "À créer", review: "En révision", done: "Terminée" };
const STS_CLS = {
  todo: "status-todo",
  review: "status-review",
  done: "status-done",
};
function renderEmotes() {
  const grid = document.getElementById("emote-grid");
  const list =
    emoteFilter === "all"
      ? emotes
      : emotes.filter((e) => e.status === emoteFilter);
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="es-icon">✦</div><p>${emotes.length ? "Aucune emote dans ce filtre." : "Générez votre première emote stellaire."}</p></div>`;
    return;
  }
  grid.innerHTML = list
    .map(
      (e) =>
        `<div class="emote-card"><div class="emote-preview"><img src="${e.imgData}" alt="${esc(e.name)}"><button class="card-del" onclick="deleteEmote(${e.id})">✕</button></div><div class="emote-info"><div class="emote-name">${esc(e.name)}</div><div class="emote-meta">${TIER_LBL[e.tier] || e.tier}</div><span class="emote-status ${STS_CLS[e.status]}" onclick="cycleEmoteStatus(${e.id})">${STS_LBL[e.status]}</span><div class="emote-dl">${e.canvasData
          .map((d, i) => {
            const sizes = [112, 56, 28];
            return `<button class="btn-dl" onclick="dlCanvas('${d}','${esc(e.name)}_${sizes[i]}px.png')">${sizes[i]}</button>`;
          })
          .join("")}</div></div></div>`,
    )
    .join("");
}

/* =============================================================
   BADGES
   ============================================================= */
function generateBadgeTier() {
  const name = document.getElementById("b-name").value.trim();
  if (!name) {
    toast("Saisis un nom !", "#ef4444");
    return;
  }
  const cond = document.getElementById("b-cond").value.trim();
  const fn = BADGE_FNS[selectedBadgeObj] || drawMars;
  const imgData = Object.fromEntries(
    [72, 36, 18].map((sz) => [sz, fn(sz).toDataURL("image/png")]),
  );
  badgeTiers.push({ id: idCtr++, name, cond, obj: selectedBadgeObj, imgData });
  renderBadges();
  saveAll();
  toast(`"${name}" généré !`, "#f59e0b");
  document.getElementById("b-name").value = "";
  document.getElementById("b-cond").value = "";
}
function deleteBadgeTier(id) {
  badgeTiers = badgeTiers.filter((t) => t.id !== id);
  renderBadges();
  saveAll();
  toast("Palier supprimé", "#ef4444");
}
function downloadAllBadge(id) {
  const t = badgeTiers.find((t) => t.id === id);
  if (!t) return;
  [72, 36, 18].forEach((sz, i) =>
    setTimeout(
      () => dlCanvas(t.imgData[sz], `${t.name}_badge_${sz}px.png`),
      i * 100,
    ),
  );
  toast("Téléchargement des 3 formats !", "#f59e0b");
}
function renderBadges() {
  const container = document.getElementById("badge-tiers");
  if (!badgeTiers.length) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">◈</div><p>Aucun palier.<br>Générez votre premier badge.</p></div>`;
    return;
  }
  container.innerHTML = badgeTiers
    .map(
      (tier) =>
        `<div class="badge-tier"><div class="badge-tier-head"><div><div class="badge-tier-title">${esc(tier.name)}</div>${tier.cond ? `<div class="badge-tier-sub">${esc(tier.cond)}</div>` : ""}</div><div style="display:flex;gap:8px;"><button class="btn btn-cosmos btn-sm" onclick="downloadAllBadge(${tier.id})">↓ Tout</button><button class="btn btn-danger btn-sm" onclick="deleteBadgeTier(${tier.id})">✕</button></div></div><div class="badge-sizes">${[72, 36, 18].map((sz) => `<div class="badge-size-col"><div class="badge-size-label">${sz}×${sz}</div><div class="badge-preview-wrap" style="width:${Math.max(sz, 44)}px;height:${Math.max(sz, 44)}px;"><img src="${tier.imgData[sz]}" width="${sz}" height="${sz}" style="image-rendering:pixelated;display:block;"></div><div class="badge-dl-row"><button class="btn-dl" onclick="dlCanvas('${tier.imgData[sz]}','${esc(tier.name)}_${sz}px.png')">↓</button></div></div>`).join("")}<div style="flex:1;padding-left:16px;font-size:11px;color:var(--txt-2);line-height:2;font-family:var(--fb);"><strong style="color:var(--txt);font-family:var(--fd);font-size:10px;">OBJET :</strong> ${(tier.obj || "").replace(/_/g, " ")}<br>${[72, 36, 18].map((sz) => `<span style="color:var(--nebula-green);">✓ ${sz}px</span>`).join("<br>")}</div></div></div>`,
    )
    .join("");
}

/* =============================================================
   CHANNEL POINTS
   ============================================================= */
function generateCpIcon() {
  const fn = CP_FNS[selectedCpObj] || cpSupernova;
  cpIconDataURL = fn(72).toDataURL("image/png");
  document.getElementById("cp-icon-preview").innerHTML =
    `<img src="${cpIconDataURL}" alt="icon">`;
  saveAll();
  toast("Icône générée !", "#06b6d4");
}
function handleCpIcon(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    cpIconDataURL = ev.target.result;
    document.getElementById("cp-icon-preview").innerHTML =
      `<img src="${cpIconDataURL}" alt="icon">`;
    saveAll();
    toast("Icône importée !", "#06b6d4");
  };
  reader.readAsDataURL(file);
}
function addReward() {
  const name = document.getElementById("r-name").value.trim();
  if (!name) {
    toast("Saisis un nom !", "#ef4444");
    return;
  }
  rewards.push({
    id: idCtr++,
    name,
    desc: document.getElementById("r-desc").value.trim(),
    cost: parseInt(document.getElementById("r-cost").value) || 100,
    icon: document.getElementById("r-icon").value || "💫",
    color: rewardColor,
    active: true,
  });
  renderRewards();
  saveAll();
  toast(`"${name}" ajouté !`, rewardColor);
  ["r-name", "r-desc", "r-cost", "r-icon"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
}
function deleteReward(id) {
  rewards = rewards.filter((r) => r.id !== id);
  renderRewards();
  saveAll();
  toast("Récompense supprimée", "#ef4444");
}
function toggleReward(id) {
  const r = rewards.find((r) => r.id === id);
  if (r) {
    r.active = !r.active;
    renderRewards();
    saveAll();
  }
}
function renderRewards() {
  const grid = document.getElementById("reward-grid");
  if (!rewards.length) {
    grid.innerHTML = `<div class="empty-state"><div class="es-icon">◆</div><p>Aucune récompense.</p></div>`;
    return;
  }
  grid.innerHTML = rewards
    .map(
      (r) =>
        `<div class="reward-card" style="opacity:${r.active ? 1 : 0.5};"><div class="reward-card-top" style="background:${r.color};"></div><div class="reward-card-body"><div class="reward-icon">${r.icon}</div><div class="reward-name">${esc(r.name)}</div>${r.desc ? `<div class="reward-desc">${esc(r.desc)}</div>` : ""}<div class="reward-cost"><span style="color:${r.color}">◆</span>${r.cost.toLocaleString()}</div></div><div class="reward-footer"><span class="reward-status" style="color:${r.active ? "var(--nebula-green)" : "var(--txt-3)"};" onclick="toggleReward(${r.id})">${r.active ? "● Actif" : "○ Inactif"}</span><button class="reward-del" onclick="deleteReward(${r.id})">✕</button></div></div>`,
    )
    .join("");
}
function renderIdeas() {
  document.getElementById("ideas-list").innerHTML = ideas
    .map(
      (idea, i) =>
        `<div class="idea-item ${idea.used ? "used" : ""}" onclick="useIdea(${i})"><span class="idea-ico">${idea.ico}</span><span class="idea-text">${esc(idea.txt)}</span><span style="font-size:10px;color:${idea.used ? "var(--nebula-green)" : "var(--txt-3)"};">${idea.used ? "✓" : "+"}</span></div>`,
    )
    .join("");
}
function useIdea(i) {
  const idea = ideas[i];
  document.getElementById("r-name").value = idea.txt;
  document.getElementById("r-icon").value = idea.ico;
  idea.used = true;
  renderIdeas();
  document.getElementById("r-name").focus();
  toast("Idée transmise !", "#06b6d4");
}
function confirmIdea() {
  const ico = document.getElementById("idea-ico").value || "💫",
    txt = document.getElementById("idea-txt").value.trim();
  if (!txt) {
    toast("Saisis une idée !", "#ef4444");
    return;
  }
  ideas.push({ ico, txt, used: false });
  renderIdeas();
  closeModal("idea-modal");
  saveAll();
  toast("Idée ajoutée !", "#06b6d4");
}

/* =============================================================
   EXPORT SCHEDULE
   ============================================================= */
function buildExportDOM() {
  const dates = getWeekDates(weekOffset),
    todayS = new Date().toDateString();
  const channel =
    document.getElementById("channel-name").value || "NebulaCraft";
  let daysHTML = "";
  dates.forEach((date, idx) => {
    const ws = streams.filter((s) => s.day === idx && s.week === weekOffset);
    const isToday = date.toDateString() === todayS ? " is-today" : "";
    const slotsHTML = ws.length
      ? ws
          .map(
            (s) =>
              `<div class="ex-slot" style="background:${s.color};border-left-color:${lighten(s.color, 0.4)};"><div class="ex-slot-inner"><div class="ex-game">${esc(s.game)}</div><div class="ex-time">${s.start} › ${s.end}</div>${s.note ? `<div class="ex-note">${esc(s.note)}</div>` : ""}</div></div>`,
          )
          .join("")
      : '<div class="ex-empty">— Repos —</div>';
    daysHTML += `<div class="ex-day${isToday}"><div class="ex-day-head"><div class="ex-day-name">${DAYS_SHORT[idx]}</div><div class="ex-day-num">${date.getDate()}</div></div><div class="ex-slots">${slotsHTML}</div></div>`;
  });
  document.getElementById("export-target").innerHTML =
    `<div class="ex-header"><div class="ex-logo">${esc(channel.toUpperCase())}</div><div class="ex-week">ORBITE DU ${fmtDate(dates[0]).toUpperCase()} AU ${fmtDate(dates[6]).toUpperCase()} ${dates[6].getFullYear()}</div></div><div class="ex-grid">${daysHTML}</div><div class="ex-footer">NEBULACRAFT · PLANNING ORBITAL</div>`;
}
async function exportPNG() {
  buildExportDOM();
  await new Promise((r) => setTimeout(r, 150));
  try {
    const canvas = await html2canvas(document.getElementById("export-target"), {
      scale: 2,
      backgroundColor: "#05060f",
      useCORS: true,
      logging: false,
    });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${document.getElementById("channel-name").value || "planning"}-orbit.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("PNG exporté !", "#06b6d4");
    }, "image/png");
  } catch (e) {
    toast("Erreur PNG", "#ef4444");
  }
}
async function exportPDF() {
  buildExportDOM();
  await new Promise((r) => setTimeout(r, 150));
  try {
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(document.getElementById("export-target"), {
      scale: 2,
      backgroundColor: "#05060f",
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.93);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pW = pdf.internal.pageSize.getWidth(),
      pH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pW / canvas.width, pH / canvas.height);
    const w = canvas.width * ratio,
      h = canvas.height * ratio;
    pdf.addImage(imgData, "JPEG", (pW - w) / 2, (pH - h) / 2, w, h);
    pdf.save(
      `${document.getElementById("channel-name").value || "planning"}-orbit.pdf`,
    );
    toast("PDF exporté !", "#ec4899");
  } catch (e) {
    toast("Erreur PDF", "#ef4444");
    console.error(e);
  }
}

/* =============================================================
   PERSIST
   ============================================================= */
function saveAll() {
  try {
    localStorage.setItem("tk_streams", JSON.stringify(streams));
    localStorage.setItem("tk_idctr", idCtr);
    localStorage.setItem(
      "tk_channel",
      document.getElementById("channel-name").value,
    );
    localStorage.setItem("tk_settings", JSON.stringify(settings));
    localStorage.setItem("tk_shortcuts", JSON.stringify(shortcuts));
    localStorage.setItem(
      "tk_emotes",
      JSON.stringify(
        emotes.map((e) => ({
          ...e,
          imgData: e.imgData?.slice(0, 80000) || null,
          canvasData: e.canvasData?.map((d) => d?.slice(0, 80000)) || [],
        })),
      ),
    );
    localStorage.setItem(
      "tk_badges",
      JSON.stringify(
        badgeTiers.map((t) => ({
          ...t,
          imgData: Object.fromEntries(
            Object.entries(t.imgData || {}).map(([k, v]) => [
              k,
              v?.slice(0, 50000) || null,
            ]),
          ),
        })),
      ),
    );
    localStorage.setItem("tk_rewards", JSON.stringify(rewards));
    localStorage.setItem("tk_ideas", JSON.stringify(ideas));
    localStorage.setItem(
      "tk_cpicon",
      cpIconDataURL ? cpIconDataURL.slice(0, 80000) : "",
    );
    localStorage.setItem("tk_theme", currentTheme);
    toast("Transmission enregistrée ✓", "#10b981");
  } catch (e) {
    toast("Erreur sauvegarde", "#f59e0b");
  }
}
function loadAll() {
  try {
    const s = localStorage.getItem("tk_streams");
    if (s) streams = JSON.parse(s);
    const ic = localStorage.getItem("tk_idctr");
    if (ic) idCtr = parseInt(ic);
    const ch = localStorage.getItem("tk_channel");
    if (ch) {
      document.getElementById("channel-name").value = ch;
      updateChannelDisplay(ch);
    }
    const st = localStorage.getItem("tk_settings");
    if (st) {
      settings = { ...settings, ...JSON.parse(st) };
      document
        .getElementById("tog-times")
        .classList.toggle("on", settings.times);
      document
        .getElementById("tog-notes")
        .classList.toggle("on", settings.notes);
    }
    const sc = localStorage.getItem("tk_shortcuts");
    if (sc) shortcuts = JSON.parse(sc);
    const em = localStorage.getItem("tk_emotes");
    if (em) emotes = JSON.parse(em);
    const bg = localStorage.getItem("tk_badges");
    if (bg) badgeTiers = JSON.parse(bg);
    const rw = localStorage.getItem("tk_rewards");
    if (rw) rewards = JSON.parse(rw);
    const id2 = localStorage.getItem("tk_ideas");
    if (id2) ideas = JSON.parse(id2);
    const cp = localStorage.getItem("tk_cpicon");
    if (cp) {
      cpIconDataURL = cp;
      document.getElementById("cp-icon-preview").innerHTML =
        `<img src="${cp}" alt="icon">`;
    }
    const th = localStorage.getItem("tk_theme");
    if (th && th !== currentTheme) {
      currentTheme = th;
      document.documentElement.setAttribute("data-theme", currentTheme);
      document.getElementById("theme-btn").textContent =
        currentTheme === "dark" ? "☀" : "☾";
    }
  } catch (e) {
    console.warn("Load error", e);
  }
}

/* =============================================================
   SWATCH / FORM BINDINGS
   ============================================================= */
function bindSwatches(rowId, setFn) {
  const el = document.getElementById(rowId);
  if (!el) return;
  el.addEventListener("click", function (e) {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    setFn(sw.dataset.c);
    el.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
    sw.classList.add("active");
  });
}
bindSwatches("color-row", (c) => {
  selColor = c;
});
bindSwatches("reward-color-row", (c) => {
  rewardColor = c;
});
bindSwatches("sc-color-row", (c) => {
  scSelColor = c;
  document.getElementById("sc-prev-dot").style.background = c;
});
document.getElementById("f-game").addEventListener("change", function () {
  document.getElementById("custom-wrap").style.display =
    this.value === "__custom" ? "block" : "none";
});

/* =============================================================
   KEYBOARD
   ============================================================= */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    ["stream-modal", "shortcut-modal", "idea-modal"].forEach((id) =>
      closeModal(id),
    );
  if (
    e.key === "Enter" &&
    document.getElementById("stream-modal").classList.contains("open")
  )
    confirmStreamModal();
  if (
    e.key === "Enter" &&
    document.getElementById("shortcut-modal").classList.contains("open")
  )
    confirmShortcut();
  if (
    e.key === "Enter" &&
    document.getElementById("idea-modal").classList.contains("open")
  )
    confirmIdea();
});
["stream-modal", "shortcut-modal", "idea-modal"].forEach((id) =>
  document.getElementById(id).addEventListener("click", function (e) {
    if (e.target === this) closeModal(id);
  }),
);
document
  .getElementById("channel-name")
  .addEventListener("input", onChannelInput);

/* =============================================================
   INIT
   ============================================================= */
loadAll();

// Init object pickers with live thumbnails
renderObjectPicker(
  "emote-picker",
  Object.fromEntries(
    Object.entries(EMOTE_FNS).map(([k, fn]) => [
      k,
      (sz, lbl) => fn(sz, lbl || ""),
    ]),
  ),
  "pillars_of_creation",
  (val) => {
    selectedEmoteObj = val;
  },
);
renderObjectPicker(
  "badge-picker",
  Object.fromEntries(
    Object.entries(BADGE_FNS).map(([k, fn]) => [k, (sz) => fn(sz)]),
  ),
  "mars",
  (val) => {
    selectedBadgeObj = val;
  },
);
renderObjectPicker(
  "cp-picker",
  Object.fromEntries(
    Object.entries(CP_FNS).map(([k, fn]) => [k, (sz) => fn(sz)]),
  ),
  "cp_supernova",
  (val) => {
    selectedCpObj = val;
  },
);

renderShortcuts();
renderGrid();
renderEmotes();
renderBadges();
renderRewards();
renderIdeas();
updateDashboard();
