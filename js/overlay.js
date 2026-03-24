/* ==========================================================
   NEBULACRAFT — overlay.js
   Live canvas overlay editor for Twitch streaming
   6 cosmic templates × 6 overlay types
   All renders are 1920×1080, exported as PNG
   ========================================================== */

/* ----------------------------------------------------------
   STATE
   ---------------------------------------------------------- */
const OV = {
  template: "nebula_stream",
  type: "full",
  accentColor: "#8b5cf6",
  channel: "",
  tagline: "Exploring the cosmos",
  msg: "Retour dans 5 min…",
  game: "",
  elements: {
    webcam: true,
    chat: true,
    alerts: true,
    bar: false,
    fx: true,
    logo: true,
  },
  animating: true,
  t: 0, // animation time
  fps: 0,
  lastFrame: 0,
  frameCount: 0,
  lastFpsTs: 0,
  raf: null,
  lastRafTs: 0,
  selectedLayer: null,
};

/* Canvas dimensions */
const OV_W = 1920;
const OV_H = 1080;

/* ----------------------------------------------------------
   UTILS
   ---------------------------------------------------------- */
const OVC = (r, g, b, a = 1) => `rgba(${r},${g},${b},${a})`;
const OVclamp = (v, a, b) => Math.max(a, Math.min(b, v));
function OVhxRGB(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
function OVhexAlpha(hex, a) {
  const [r, g, b] = OVhxRGB(hex);
  return OVC(r, g, b, a);
}
function OVprng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function OVlerp(a, b, t) {
  return a + (b - a) * t;
}

/* ----------------------------------------------------------
   LAYER DEFINITIONS — per template×type combo
   ---------------------------------------------------------- */

/* Each layer: { id, name, icon, hidden, draw(ctx, W, H, ov, t) } */

function buildLayers(template, type, ov) {
  const layers = [];

  // ── LAYER: Background ──────────────────────────────────
  layers.push({
    id: "bg",
    name: "Fond cosmique",
    icon: "🌌",
    draw: (ctx, W, H) => drawBackground(ctx, W, H, template, ov),
  });

  // ── LAYER: Particles / FX ─────────────────────────────
  if (ov.elements.fx) {
    layers.push({
      id: "fx",
      name: "Particules FX",
      icon: "✦",
      draw: (ctx, W, H, t) => drawParticles(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Decorative frame / border ──────────────────
  if (type === "full" || type === "webcam") {
    layers.push({
      id: "frame",
      name: "Cadre décoratif",
      icon: "▣",
      draw: (ctx, W, H, t) => drawFrame(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Webcam box ─────────────────────────────────
  if (ov.elements.webcam && (type === "full" || type === "webcam")) {
    layers.push({
      id: "webcam",
      name: "Zone webcam",
      icon: "📷",
      draw: (ctx, W, H, t) => drawWebcamBox(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Game area label ─────────────────────────────
  if (type === "full") {
    layers.push({
      id: "game",
      name: "Zone de jeu",
      icon: "🎮",
      draw: (ctx, W, H) => drawGameLabel(ctx, W, H, template, ov),
    });
  }

  // ── LAYER: Chat box ────────────────────────────────────
  if (ov.elements.chat && (type === "full" || type === "panel")) {
    layers.push({
      id: "chat",
      name: "Chat",
      icon: "💬",
      draw: (ctx, W, H, t) => drawChatBox(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Alert zone ──────────────────────────────────
  if (ov.elements.alerts && type === "full") {
    layers.push({
      id: "alerts",
      name: "Zone alertes",
      icon: "🔔",
      draw: (ctx, W, H, t) => drawAlertZone(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Progress bar ────────────────────────────────
  if (ov.elements.bar) {
    layers.push({
      id: "bar",
      name: "Barre sub-goal",
      icon: "📊",
      draw: (ctx, W, H, t) => drawSubBar(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Channel info / HUD ─────────────────────────
  if (ov.elements.logo) {
    layers.push({
      id: "hud",
      name: "Logo & Chaîne",
      icon: "🔭",
      draw: (ctx, W, H, t) => drawHUD(ctx, W, H, template, ov, t),
    });
  }

  // ── LAYER: Scene-specific overlay ─────────────────────
  if (type !== "full") {
    layers.push({
      id: "scene",
      name: "Scène " + type,
      icon: "▶",
      draw: (ctx, W, H, t) => drawScene(ctx, W, H, template, type, ov, t),
    });
  }

  return layers;
}

/* ----------------------------------------------------------
   BACKGROUND RENDERERS — per template
   ---------------------------------------------------------- */

function drawBackground(ctx, W, H, template, ov) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);

  if (template === "nebula_stream") {
    // Deep space — deep navy, nebula clouds, star field
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#030210");
    bg.addColorStop(0.5, "#05030e");
    bg.addColorStop(1, "#020108");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Nebula mass — large off-centre
    const ng = ctx.createRadialGradient(
      W * 0.22,
      H * 0.35,
      0,
      W * 0.22,
      H * 0.35,
      W * 0.55,
    );
    ng.addColorStop(0, OVC(ar, ag, ab, 0.14));
    ng.addColorStop(0.5, OVC(ar, ag, ab, 0.06));
    ng.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H);
    const ng2 = ctx.createRadialGradient(
      W * 0.75,
      H * 0.65,
      0,
      W * 0.75,
      H * 0.65,
      W * 0.4,
    );
    ng2.addColorStop(
      0,
      OVC(
        OVclamp(ar * 0.4 + 20, 0, 255),
        OVclamp(ag * 0.3 + 80, 0, 255),
        OVclamp(ab * 0.5 + 120, 0, 255),
        0.1,
      ),
    );
    ng2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ng2;
    ctx.fillRect(0, 0, W, H);
    _ovStars(ctx, W, H, "nebula", 1);
  } else if (template === "deep_space") {
    // Pure black, very sparse stars, a single dramatic Hubble-like nebula
    ctx.fillStyle = "#000005";
    ctx.fillRect(0, 0, W, H);
    const dg = ctx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      0,
      W * 0.5,
      H * 0.5,
      W * 0.65,
    );
    dg.addColorStop(0, OVC(ar, ag, ab, 0.08));
    dg.addColorStop(
      0.4,
      OVC(
        OVclamp(ar * 0.3 + 50, 0, 255),
        OVclamp(ag * 0.2 + 30, 0, 255),
        OVclamp(ab * 0.4 + 80, 0, 255),
        0.04,
      ),
    );
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, W, H);
    _ovStars(ctx, W, H, "deep", 1);
  } else if (template === "pulsar_hud") {
    // ── PULSAR HUD BACKGROUND ──────────────────────────────
    ctx.fillStyle = "#000d1a";
    ctx.fillRect(0, 0, W, H);
    const hor = H * 0.55;



    // Central reactor glow
    const cg = ctx.createRadialGradient(
      W * 0.5,
      hor,
      0,
      W * 0.5,
      hor,
      W * 0.45,
    );
    cg.addColorStop(0, OVC(ar, ag, ab, 0.18));
    cg.addColorStop(0.3, OVC(ar, ag, ab, 0.07));
    cg.addColorStop(
      0.7,
      OVC(
        OVclamp(ar * 0.3, 0, 255),
        OVclamp(ag * 0.3 + 80, 0, 255),
        OVclamp(ab * 0.3 + 120, 0, 255),
        0.04,
      ),
    );
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);
    // Horizon glow line supprimée
    // Side panel glows
    [0, 1].forEach((si) => {
      const lg = ctx.createLinearGradient(
        si === 0 ? 0 : W,
        0,
        si === 0 ? 180 : W - 180,
        0,
      );
      lg.addColorStop(0, OVC(ar, ag, ab, 0.12));
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(si === 0 ? 0 : W - 180, 0, 180, H);
    });
    _ovStars(ctx, W, H, "sparse", 0.65);
  } else if (template === "aurora_chill") {
    // Deep dark sky, vivid aurora curtains
    ctx.fillStyle = "#020610";
    ctx.fillRect(0, 0, W, H);
    const aColors = [
      [0, 210, 80],
      [50, 130, 255],
      [180, 40, 160],
      [255, 80, 50],
    ];
    for (let b = 0; b < 8; b++) {
      const bx = (b / 8) * W + OVprng(b * 17)() * W * 0.08 - W * 0.04;
      const bw = W * (0.03 + OVprng(b * 23)() * 0.06);
      const col = aColors[b % aColors.length];
      const ag2 = ctx.createLinearGradient(0, 0, 0, H);
      ag2.addColorStop(0, OVC(...col, 0));
      ag2.addColorStop(0.12, OVC(...col, 0.35 + OVprng(b * 31)() * 0.25));
      ag2.addColorStop(0.6, OVC(...col, 0.2));
      ag2.addColorStop(1, OVC(...col, 0));
      const pts = [];
      for (let s = 0; s <= 16; s++) {
        const py = (s / 16) * H;
        pts.push([bx + Math.sin(s * 0.7) * bw * 1.5, py]);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0] - bw, 0);
      pts.forEach(([x, y]) => ctx.lineTo(x + bw * 0.7, y));
      pts
        .slice()
        .reverse()
        .forEach(([x, y]) => ctx.lineTo(x - bw * 0.7, y));
      ctx.closePath();
      ctx.fillStyle = ag2;
      ctx.fill();
    }
    _ovStars(ctx, W, H, "sparse", 0.55);
    // Horizon silhouette
    const hg = ctx.createLinearGradient(0, H * 0.72, 0, H);
    hg.addColorStop(0, "rgba(0,0,0,0)");
    hg.addColorStop(1, "rgba(0,4,12,.9)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);
  } else if (template === "blackhole_minimal") {
    // Pure black, single dramatic accretion disk far right
    ctx.fillStyle = "#000003";
    ctx.fillRect(0, 0, W, H);
    _ovStars(ctx, W, H, "sparse", 0.5);
    // Large accretion disk — right side
    const bx = W * 0.78,
      by = H * 0.5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1, 0.28);
    for (let rs = H * 0.42; rs >= H * 0.18; rs -= 3) {
      const t = (rs - H * 0.18) / (H * 0.42 - H * 0.18);
      ctx.strokeStyle = OVC(
        OVclamp(200 - t * 90, 80, 200),
        OVclamp(75 - t * 45, 20, 75),
        15,
        OVclamp(0.5 - t * 0.4, 0.03, 0.5),
      );
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, rs, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    for (let rs = H * 0.18; rs <= H * 0.42; rs += 3) {
      const t = (rs - H * 0.18) / (H * 0.42 - H * 0.18);
      ctx.strokeStyle = OVC(
        OVclamp(255 - t * 35, 200, 255),
        OVclamp(195 - t * 130, 50, 195),
        OVclamp(75 - t * 55, 5, 75),
        OVclamp(0.7 - t * 0.5, 0.04, 0.7),
      );
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, rs, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    // Shadow
    ctx.fillStyle = ctx.createRadialGradient(bx, by, 0, bx, by, H * 0.22);
    const sg2 = ctx.createRadialGradient(bx, by, 0, bx, by, H * 0.22);
    sg2.addColorStop(0, "rgba(0,0,0,1)");
    sg2.addColorStop(0.9, "rgba(0,0,0,1)");
    sg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.arc(bx, by, H * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Photon ring
    ctx.strokeStyle = "rgba(255,200,80,.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, H * 0.23, 0, Math.PI * 2);
    ctx.stroke();
  } else if (template === "supernova_alert") {
    // Orange-gold-red expanding shell feel
    ctx.fillStyle = "#050103";
    ctx.fillRect(0, 0, W, H);
    const sg = ctx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      0,
      W * 0.5,
      H * 0.5,
      W * 0.55,
    );
    sg.addColorStop(0, OVC(120, 40, 10, 0.12));
    sg.addColorStop(0.4, OVC(180, 70, 20, 0.06));
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    // Expanding shell rings
    [0.38, 0.52, 0.66, 0.78].forEach((r, i) => {
      ctx.strokeStyle = OVC(
        255,
        OVclamp(140 - i * 30, 60, 140),
        20,
        OVclamp(0.12 - i * 0.02, 0.02, 0.12),
      );
      ctx.lineWidth = 6 - i;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.5, (W * r) / 2, 0, Math.PI * 2);
      ctx.stroke();
    });
    _ovStars(ctx, W, H, "sparse", 0.45);
  }
}

/* Background star field helper */
const _starCache = {};
function _ovStars(ctx, W, H, density, scale) {
  const key = `${W}x${H}x${density}`;
  if (!_starCache[key]) {
    const n = density === "deep" ? 2800 : density === "sparse" ? 800 : 1600;
    _starCache[key] = Array.from({ length: n }, (_, i) => {
      const r = OVprng(i * 37 + 31);
      const hue = r() < 0.5 ? 215 + r() * 35 : r() < 0.6 ? 45 + r() * 20 : 0;
      return {
        x: r() * W,
        y: r() * H,
        sz:
          r() < 0.03
            ? 1.6 + r()
            : r() < 0.15
              ? 0.6 + r() * 0.5
              : 0.12 + r() * 0.28,
        alpha: 0.1 + r() * 0.7,
        hue,
      };
    });
  }
  _starCache[key].forEach((s) => {
    ctx.fillStyle = `hsla(${s.hue},70%,92%,${s.alpha * scale})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ----------------------------------------------------------
   PARTICLE FX — animated per template
   ---------------------------------------------------------- */
function drawParticles(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  const rng = OVprng(42);

  if (template === "nebula_stream" || template === "deep_space") {
    // Drifting cosmic dust motes
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.5;
      const r2 = OVprng(seed);
      const x = (r2() * W + t * 8 * (r2() * 0.5 + 0.1)) % W;
      const y = r2() * H - ((t * 5 * (r2() * 0.3 + 0.05)) % H);
      const sz = r2() * 0.8 + 0.2;
      const pulse = 0.3 + 0.3 * Math.sin(t * 0.8 + i);
      ctx.fillStyle = OVC(ar, ag, ab, pulse * (0.1 + r2() * 0.15));
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (template === "pulsar_hud") {
    // ── PULSAR HUD PARTICLES ───────────────────────────────


    // 3. Radar sweep — rotating sector from VP
    const vpx = W * 0.5,
      vpy = H * 0.5; // centré sur l'écran
    const radarAngle = t * 0.4; // pas de modulo — rotation continue sans saut
    const radarLen = Math.max(W, H); // traverse tout l'écran comme à l'origine
    ctx.save();
    // Traînée lumineuse derrière la ligne
    const sweepW = 0.4;
    for (let s = 0; s < 10; s++) {
      const a = radarAngle - (s * sweepW) / 10;
      const alpha = OVclamp(((10 - s) / 10) * 0.15, 0, 0.18);
      ctx.beginPath();
      ctx.moveTo(vpx, vpy);
      ctx.arc(vpx, vpy, radarLen, a, a + sweepW / 10);
      ctx.closePath();
      ctx.fillStyle = OVC(ar, ag, ab, alpha);
      ctx.fill();
    }
    // Ligne principale — fait le tour complet
    ctx.strokeStyle = OVC(ar, ag, ab, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vpx, vpy);
    ctx.lineTo(
      vpx + Math.cos(radarAngle) * radarLen,
      vpy + Math.sin(radarAngle) * radarLen,
    );
    ctx.stroke();
    ctx.restore();

    // 4. Floating data readout particles — HUD blip dots
    for (let i = 0; i < 18; i++) {
      const r2 = OVprng(i * 113 + 7);
      const bx = r2() * W,
        by = r2() * H;
      const bpulse = Math.sin(t * 1.5 + i * 0.8);
      if (bpulse > 0.5) {
        ctx.fillStyle = OVC(ar, ag, ab, 0.5);
        ctx.fillRect(bx, by, 2, 2);
        // Tiny crosshair
        ctx.strokeStyle = OVC(ar, ag, ab, 0.25);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by + 1);
        ctx.lineTo(bx + 7, by + 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 1, by - 5);
        ctx.lineTo(bx + 1, by + 7);
        ctx.stroke();
      }
    }

    // 5. Corner circuit traces — animated
    [
      [20, 20, 1, 1],
      [W - 20, 20, -1, 1],
      [20, H - 20, 1, -1],
      [W - 20, H - 20, -1, -1],
    ].forEach(([cx2, cy2, dx, dy], idx) => {
      const prog = (t * 0.3 + idx * 0.25) % 1;
      const traceLen = 120 + idx * 15;
      const tp = prog * traceLen * 2;
      ctx.strokeStyle = OVC(ar, ag, ab, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (tp < traceLen) {
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx2 + dx * tp, cy2);
      } else {
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx2 + dx * traceLen, cy2);
        ctx.moveTo(cx2 + dx * traceLen, cy2);
        ctx.lineTo(cx2 + dx * traceLen, cy2 + dy * (tp - traceLen));
      }
      ctx.stroke();
    });
  } else if (template === "aurora_chill") {
    // Gentle shimmer
    for (let i = 0; i < 30; i++) {
      const r2 = OVprng(i * 71);
      const x = r2() * W,
        y = r2() * H * 0.7;
      const pulse = 0.1 + 0.15 * Math.sin(t * 0.5 + i * 1.2);
      ctx.fillStyle = `rgba(120,255,160,${pulse * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + r2(), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (template === "supernova_alert") {
    // Sparks radiating from centre
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + t * 0.3;
      const d = 80 + ((t * 30 + i * 40) % 400);
      const sx = W * 0.5 + Math.cos(angle) * d,
        sy = H * 0.5 + Math.sin(angle) * d;
      const alpha = OVclamp(1 - d / 400, 0.0, 0.5);
      ctx.fillStyle = OVC(255, OVclamp(150 + i * 5, 100, 220), 20, alpha * 0.4);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + alpha * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ----------------------------------------------------------
   FRAME / DECORATIVE BORDERS
   ---------------------------------------------------------- */
function drawFrame(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  const lw = 3;

  if (template === "pulsar_hud") {
    // ── PULSAR HUD FRAME ──────────────────────────────────
    const [ar, ag, ab] = OVhxRGB(ac);
    const gAlpha = 0.18 + 0.08 * Math.sin(t * 2);
    const br = 60; // bracket length

    // Outer hairline border
    ctx.strokeStyle = OVC(ar, ag, ab, 0.15);
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Top & bottom full-width accent lines
    [0, H].forEach((y, i) => {
      const lg = ctx.createLinearGradient(0, y, W, y);
      lg.addColorStop(0, "rgba(0,0,0,0)");
      lg.addColorStop(0.15, OVC(ar, ag, ab, 0.6));
      lg.addColorStop(0.5, OVC(ar, ag, ab, 0.9));
      lg.addColorStop(0.85, OVC(ar, ag, ab, 0.6));
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = lg;
      ctx.lineWidth = i === 0 ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y === 0 ? 2 : H - 2);
      ctx.lineTo(W, y === 0 ? 2 : H - 2);
      ctx.stroke();
    });

    // Corner L-brackets with inner double line
    const corners = [
      [0, 0, 1, 1],
      [W, 0, -1, 1],
      [0, H, 1, -1],
      [W, H, -1, -1],
    ];
    corners.forEach(([cx2, cy2, dx, dy]) => {
      // Glow bloom
      const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 160);
      g.addColorStop(0, OVC(ar, ag, ab, gAlpha));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx2 - 130, cy2 - 130, 260, 260);
      // Outer bracket
      ctx.strokeStyle = OVC(ar, ag, ab, 0.9);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * br, cy2);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(cx2, cy2 + dy * br);
      ctx.stroke();
      // Inner bracket (offset 6px)
      ctx.strokeStyle = OVC(ar, ag, ab, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * (br - 14), cy2 + dy * 6);
      ctx.lineTo(cx2 + dx * 6, cy2 + dy * 6);
      ctx.lineTo(cx2 + dx * 6, cy2 + dy * (br - 14));
      ctx.stroke();
      // Corner dot
      ctx.fillStyle = OVC(ar, ag, ab, 1);
      ctx.beginPath();
      ctx.arc(cx2 + dx * 4, cy2 + dy * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mid-edge tick marks
    [
      [W / 2, 0, 0, 1],
      [W / 2, H, 0, -1],
      [0, H / 2, 1, 0],
      [W, H / 2, -1, 0],
    ].forEach(([mx, my, dx, dy]) => {
      ctx.strokeStyle = OVC(ar, ag, ab, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + dx * 24, my + dy * 24);
      ctx.stroke();
      ctx.strokeStyle = OVC(ar, ag, ab, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx + dx * 28, my + dy * 28);
      ctx.lineTo(mx + dx * 38, my + dy * 38);
      ctx.stroke();
    });
    return;
  }
  if (template === "nebula_stream" || template === "deep_space") {
    // Thin gradient border
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, OVC(ar, ag, ab, 0.4));
    grad.addColorStop(0.5, OVC(ar, ag, ab, 0.1));
    grad.addColorStop(1, OVC(ar, ag, ab, 0.4));
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.strokeRect(lw / 2, lw / 2, W - lw, H - lw);
    return;
  }
  if (template === "blackhole_minimal") {
    // Thin white hairline
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    return;
  }
  if (template === "aurora_chill") {
    // Soft top/bottom glow bar
    ["top", "bot"].forEach((pos) => {
      const g = ctx.createLinearGradient(
        0,
        pos === "top" ? 0 : H - 8,
        0,
        pos === "top" ? 8 : H,
      );
      g.addColorStop(0, OVC(ar, ag, ab, 0.45));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, pos === "top" ? 0 : H - 8, W, 8);
    });
    return;
  }
  if (template === "supernova_alert") {
    // Animated expanding ring border
    const pulse = 0.06 + 0.04 * Math.sin(t * 1.5);
    ctx.strokeStyle = OVC(
      255,
      OVclamp(150 + Math.sin(t) * 0.3, 100, 200),
      20,
      pulse,
    );
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    return;
  }
}

/* ----------------------------------------------------------
   WEBCAM BOX
   ---------------------------------------------------------- */
function drawWebcamBox(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);

  if (template === "pulsar_hud") {
    // ── PULSAR HUD WEBCAM — sci-fi targeting reticle frame ─
    const wx = 50,
      wy = H - 370,
      ww = 440,
      wh = 310;
    // Glassmorphism dark bg
    ctx.fillStyle = "rgba(0,8,22,.72)";
    _rrect(ctx, wx, wy, ww, wh, 4);
    ctx.fill();
    // Subtle inner grid
    ctx.strokeStyle = OVC(ar, ag, ab, 0.04);
    ctx.lineWidth = 0.5;
    for (let gx = wx + 40; gx < wx + ww; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, wy);
      ctx.lineTo(gx, wy + wh);
      ctx.stroke();
    }
    for (let gy = wy + 40; gy < wy + wh; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(wx, gy);
      ctx.lineTo(wx + ww, gy);
      ctx.stroke();
    }
    // Outer border
    ctx.strokeStyle = OVC(ar, ag, ab, 0.4);
    ctx.lineWidth = 1;
    _rrect(ctx, wx, wy, ww, wh, 4);
    ctx.stroke();
    // Bright top accent line
    const topG = ctx.createLinearGradient(wx, wy, wx + ww, wy);
    topG.addColorStop(0, "rgba(0,0,0,0)");
    topG.addColorStop(0.3, OVC(ar, ag, ab, 0.9));
    topG.addColorStop(0.7, OVC(ar, ag, ab, 0.9));
    topG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = topG;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + ww, wy);
    ctx.stroke();
    // Corner targeting brackets — larger, prominent
    const clen = 30;
    [
      [wx, wy, 1, 1],
      [wx + ww, wy, -1, 1],
      [wx, wy + wh, 1, -1],
      [wx + ww, wy + wh, -1, -1],
    ].forEach(([cx2, cy2, dx, dy]) => {
      ctx.strokeStyle = OVC(ar, ag, ab, 0.95);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * clen, cy2);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(cx2, cy2 + dy * clen);
      ctx.stroke();
      ctx.strokeStyle = OVC(ar, ag, ab, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * (clen + 8), cy2 + dy * 6);
      ctx.lineTo(cx2 + dx * (clen + 18), cy2 + dy * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * 6, cy2 + dy * (clen + 8));
      ctx.lineTo(cx2 + dx * 6, cy2 + dy * (clen + 18));
      ctx.stroke();
    });
    // Centre crosshair reticle
    const rcx = wx + ww / 2,
      rcy = wy + wh / 2;
    const rAlpha = 0.2 + 0.1 * Math.sin(t * 2);
    // Outer circle
    ctx.strokeStyle = OVC(ar, ag, ab, rAlpha * 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rcx, rcy, wh * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = OVC(ar, ag, ab, rAlpha * 0.4);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(rcx, rcy, wh * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    // Cross lines
    ctx.strokeStyle = OVC(ar, ag, ab, rAlpha * 0.6);
    ctx.lineWidth = 1;
    [0, Math.PI / 2].forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(rcx + Math.cos(a) * 22, rcy + Math.sin(a) * 22);
      ctx.lineTo(rcx + Math.cos(a) * wh * 0.28, rcy + Math.sin(a) * wh * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rcx - Math.cos(a) * 22, rcy - Math.sin(a) * 22);
      ctx.lineTo(rcx - Math.cos(a) * wh * 0.28, rcy - Math.sin(a) * wh * 0.28);
      ctx.stroke();
    });
    // Top-left status bar
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    ctx.fillStyle = OVC(ar, ag, ab, pulse);
    ctx.beginPath();
    ctx.arc(wx + 14, wy + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    // Glow on dot
    const dg = ctx.createRadialGradient(
      wx + 14,
      wy + 14,
      0,
      wx + 14,
      wy + 14,
      12,
    );
    dg.addColorStop(0, OVC(ar, ag, ab, 0.4));
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(wx + 14, wy + 14, 12, 0, Math.PI * 2);
    ctx.fill();
    // Header label
    ctx.font = `700 11px 'Orbitron',sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = OVC(ar, ag, ab, 0.85);
    ctx.fillText("CAM · FEED", wx + 26, wy + 14);
    ctx.textAlign = "right";
    ctx.fillStyle = OVC(ar, ag, ab, 0.4);
    ctx.fillText("720p · LIVE", wx + ww - 10, wy + 14);
    return;
  }

  // Standard webcam box for other templates
  const wx = 50,
    wy = H - 340,
    ww = 400,
    wh = 300;
  ctx.fillStyle = "rgba(0,0,0,.45)";
  _rrect(ctx, wx, wy, ww, wh, 12);
  ctx.fill();
  ctx.strokeStyle = OVhexAlpha(ac, 0.6);
  ctx.lineWidth = 2;
  _rrect(ctx, wx, wy, ww, wh, 12);
  ctx.stroke();
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.5);
  ctx.fillStyle = OVC(ar, ag, ab, pulse * 0.8);
  ctx.beginPath();
  ctx.arc(wx + 16, wy + 16, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 18px 'Orbitron',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = OVhexAlpha(ac, 0.25);
  ctx.fillText("WEBCAM", wx + ww / 2, wy + wh / 2);
  const cmarks = [
    [wx, wy],
    [wx + ww, wy],
    [wx, wy + wh],
    [wx + ww, wy + wh],
  ];
  ctx.strokeStyle = OVhexAlpha(ac, 0.8);
  ctx.lineWidth = 2;
  cmarks.forEach(([cx2, cy2], i) => {
    const dx = i % 2 === 0 ? 1 : -1,
      dy = i < 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx2 + dx * 20, cy2);
    ctx.lineTo(cx2, cy2);
    ctx.lineTo(cx2, cy2 + dy * 20);
    ctx.stroke();
  });
}

/* ----------------------------------------------------------
   GAME AREA LABEL
   ---------------------------------------------------------- */
function drawGameLabel(ctx, W, H, template, ov) {
  const ac = ov.accentColor;
  if (!ov.game) return;
  // Game name in top-right area
  ctx.font = `700 22px 'Orbitron',sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = OVhexAlpha(ac, 0.9);
  ctx.fillText(ov.game.toUpperCase(), W - 50, 50);
  // Underline
  const tw = ctx.measureText(ov.game.toUpperCase()).width;
  const g = ctx.createLinearGradient(W - 50 - tw, 72, W - 50, 72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, OVhexAlpha(ac, 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(W - 50 - tw, 72, tw, 2);
}

/* ----------------------------------------------------------
   CHAT BOX
   ---------------------------------------------------------- */
const _fakeChat = [
  { user: "NebulaBro", col: "#a78bfa", msg: "Hype!!" },
  { user: "AstroFan", col: "#06b6d4", msg: "Belle game !" },
  { user: "StarGazer", col: "#f59e0b", msg: "PogChamp" },
  { user: "CosmicLurker", col: "#10b981", msg: "GG WP" },
  { user: "NovaCat", col: "#ec4899", msg: "Trop fort 😄" },
  { user: "OrbitX", col: "#8b5cf6", msg: "Les mains 🔥" },
];
function drawChatBox(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  // Bottom right, 340×280
  const cx2 = W - 380,
    cy2 = H - 320,
    cw = 340,
    ch = 280;
  // BG
  ctx.fillStyle = "rgba(0,0,0,.5)";
  if (template === "pulsar_hud") ctx.fillStyle = "rgba(0,8,25,.65)";
  _rrect(ctx, cx2, cy2, cw, ch, 10);
  ctx.fill();
  // Top bar
  const tbG = ctx.createLinearGradient(cx2, cy2, cx2 + cw, cy2);
  tbG.addColorStop(0, OVC(ar, ag, ab, 0.4));
  tbG.addColorStop(1, OVC(ar, ag, ab, 0.1));
  ctx.fillStyle = tbG;
  _rrect(ctx, cx2, cy2, cw, 28, 10, true);
  ctx.fill();
  ctx.font = `700 13px 'Orbitron',sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText("CHAT", cx2 + 12, cy2 + 14);
  // Border
  ctx.strokeStyle = OVhexAlpha(ac, 0.4);
  ctx.lineWidth = 1.5;
  _rrect(ctx, cx2, cy2, cw, ch, 10);
  ctx.stroke();
  // Messages — cycle through fake chat
  const visibleN = 6;
  ctx.font = `500 15px 'Space Grotesk',sans-serif`;
  ctx.textBaseline = "middle";
  for (let i = 0; i < visibleN; i++) {
    const msgIdx = (Math.floor(t * 0.3) + i) % _fakeChat.length;
    const msg = _fakeChat[msgIdx];
    const ly = cy2 + 38 + i * 36;
    ctx.textAlign = "left";
    ctx.fillStyle = msg.col;
    ctx.fillText(msg.user + ":", cx2 + 10, ly);
    const nw = ctx.measureText(msg.user + ": ").width;
    ctx.fillStyle = "rgba(220,220,240,.8)";
    ctx.fillText(msg.msg.slice(0, 28), cx2 + 12 + nw, ly);
  }
}

/* ----------------------------------------------------------
   ALERT ZONE
   ---------------------------------------------------------- */
function drawAlertZone(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  // Top-centre alert bar — pulsing when "active"
  const ax = W / 2,
    ay = 60,
    aw = 620,
    ah = 72;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = OVC(ar, ag, ab, pulse * 0.08);
  _rrect(ctx, ax - aw / 2, ay - ah / 2, aw, ah, 36);
  ctx.fill();
  ctx.strokeStyle = OVhexAlpha(ac, pulse * 0.4);
  ctx.lineWidth = 1.5;
  _rrect(ctx, ax - aw / 2, ay - ah / 2, aw, ah, 36);
  ctx.stroke();
  // Label
  ctx.font = `700 20px 'Orbitron',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = OVhexAlpha(ac, 0.6);
  ctx.fillText("ZONE ALERTES", ax, ay);
}

/* ----------------------------------------------------------
   SUB GOAL BAR
   ---------------------------------------------------------- */
function drawSubBar(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  const bx = 40,
    by = H - 50,
    bw = W - 80,
    bh = 18;
  const progress = 0.3 + 0.1 * Math.sin(t * 0.4);
  // Track
  _rrect(ctx, bx, by, bw, bh, 9);
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fill();
  // Fill
  _rrect(ctx, bx, by, bw * progress, bh, 9);
  const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  fg.addColorStop(0, OVhexAlpha(ac, 0.8));
  fg.addColorStop(1, OVC(ar, ag, ab, 0.4));
  ctx.fillStyle = fg;
  ctx.fill();
  // Glow
  ctx.shadowColor = ac;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = OVhexAlpha(ac, 0.5);
  ctx.lineWidth = 1;
  _rrect(ctx, bx, by, bw * progress, bh, 9);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Label
  ctx.font = `600 13px 'Orbitron',sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.fillText("SUB GOAL", bx + 8, by + bh / 2);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(progress * 100)}/100`, bx + bw - 8, by + bh / 2);
}

/* ----------------------------------------------------------
   HUD (channel logo + name)
   ---------------------------------------------------------- */
function drawHUD(ctx, W, H, template, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  const name = ov.channel || "NebulaCraft";
  const tagline = ov.tagline || "";

  if (template === "pulsar_hud") {
    // ── PULSAR HUD — Top-left multi-row data block ─────────
    const bx = 50,
      by = 22;

    // Background panel — dark frosted
    const panW = 520,
      panH = 80;
    ctx.fillStyle = "rgba(0,8,22,.7)";
    _rrect(ctx, bx - 10, by - 6, panW, panH, 4);
    ctx.fill();
    // Left accent bar
    const barG = ctx.createLinearGradient(
      bx - 10,
      by - 6,
      bx - 10,
      by + panH - 6,
    );
    barG.addColorStop(0, OVC(ar, ag, ab, 1));
    barG.addColorStop(0.5, OVC(ar, ag, ab, 0.4));
    barG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = barG;
    ctx.fillRect(bx - 10, by - 6, 3, panH);
    // Top separator line
    const sepG = ctx.createLinearGradient(bx - 10, by - 6, bx + panW, by - 6);
    sepG.addColorStop(0, OVC(ar, ag, ab, 0.8));
    sepG.addColorStop(0.5, OVC(ar, ag, ab, 0.2));
    sepG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = sepG;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by - 6);
    ctx.lineTo(bx + panW, by - 6);
    ctx.stroke();

    // Channel name — large Orbitron
    ctx.font = `800 40px 'Orbitron',sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,.97)";
    ctx.fillText(name.toUpperCase(), bx, by);
    // Tagline
    if (tagline) {
      ctx.font = `400 15px 'Space Grotesk',sans-serif`;
      ctx.fillStyle = OVC(ar, ag, ab, 0.75);
      ctx.fillText(tagline, bx, by + 45);
    }

    // Right-side status indicators
    const statusX = bx + panW - 14;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    // Live dot
    ctx.fillStyle = OVC(255, 60, 60, pulse);
    ctx.beginPath();
    ctx.arc(statusX, by + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 11px 'Orbitron',sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,80,80,.9)";
    ctx.fillText("LIVE", statusX - 12, by + 16);

    // Game label
    if (ov.game) {
      ctx.fillStyle = OVC(ar, ag, ab, 0.5);
      ctx.fillRect(statusX - 70, by + 30, 70, 1);
      ctx.font = `600 12px 'Orbitron',sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillStyle = OVC(ar, ag, ab, 0.65);
      ctx.fillText(ov.game.toUpperCase(), statusX, by + 34);
    }

    // Bottom data row — three small stat boxes
    const rowY = by + panH + 10;
    const stats = [
      { lbl: "SIGNAL", val: "█████▒▒▒" },
      { lbl: "VIEWERS", val: "—" },
      { lbl: "UPTIME", val: "00:00:00" },
    ];
    stats.forEach((s, i) => {
      const sx = bx + i * 155;
      ctx.fillStyle = "rgba(0,8,22,.6)";
      _rrect(ctx, sx, rowY, 142, 36, 3);
      ctx.fill();
      ctx.strokeStyle = OVC(ar, ag, ab, 0.2);
      ctx.lineWidth = 1;
      _rrect(ctx, sx, rowY, 142, 36, 3);
      ctx.stroke();
      ctx.font = `500 9px 'Orbitron',sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = OVC(ar, ag, ab, 0.55);
      ctx.fillText(s.lbl, sx + 8, rowY + 6);
      ctx.font = `700 14px 'Orbitron',sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillText(s.val, sx + 8, rowY + 33);
    });
    return;
  }

  // Default HUD (other templates)
  const bx = 50,
    by = 40;
  const lr = 30,
    lx = bx + lr,
    ly = by + lr;
  const pulse = 0.8 + 0.2 * Math.sin(t * 1.5);
  const gG = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 2.5);
  gG.addColorStop(0, OVC(ar, ag, ab, pulse * 0.3));
  gG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gG;
  ctx.beginPath();
  ctx.arc(lx, ly, lr * 2.5, 0, Math.PI * 2);
  ctx.fill();
  const cG = ctx.createRadialGradient(
    lx - lr * 0.25,
    ly - lr * 0.2,
    0,
    lx,
    ly,
    lr,
  );
  cG.addColorStop(
    0,
    OVC(
      Math.min(255, ar + 60),
      Math.min(255, ag + 60),
      Math.min(255, ab + 60),
      1,
    ),
  );
  cG.addColorStop(0.6, OVC(ar, ag, ab, 1));
  cG.addColorStop(
    1,
    OVC(Math.max(0, ar - 50), Math.max(0, ag - 50), Math.max(0, ab - 50), 1),
  );
  ctx.fillStyle = cG;
  ctx.beginPath();
  ctx.arc(lx, ly, lr, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(lx, ly);
  ctx.scale(1, 0.3);
  ctx.strokeStyle = OVhexAlpha(ac, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, lr * 1.55, 0, Math.PI * 2);
  ctx.stroke();
  const dot_a = t * 0.8 - Math.PI / 2; // 12h au départ
  ctx.fillStyle = OVhexAlpha(ac, 1);
  ctx.beginPath();
  ctx.arc(
    Math.cos(dot_a) * lr * 1.55,
    Math.sin(dot_a) * lr * 1.55,
    4,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  ctx.font = `800 36px 'Orbitron',sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.fillText(name.toUpperCase(), bx + lr * 2 + 20, ly - 8);
  if (tagline) {
    ctx.font = `500 18px 'Space Grotesk',sans-serif`;
    ctx.fillStyle = OVhexAlpha(ac, 0.75);
    ctx.fillText(tagline, bx + lr * 2 + 20, ly + 20);
  }
  const sl_y = by + lr * 2 + 20,
    sl_len = 320;
  const slG = ctx.createLinearGradient(bx, sl_y, bx + sl_len, sl_y);
  slG.addColorStop(0, OVhexAlpha(ac, 0.8));
  slG.addColorStop(0.6, OVhexAlpha(ac, 0.3));
  slG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.strokeStyle = slG;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, sl_y);
  ctx.lineTo(bx + sl_len, sl_y);
  ctx.stroke();
}

/* ----------------------------------------------------------
   SCENE — specific visuals per overlay type
   ---------------------------------------------------------- */
function drawScene(ctx, W, H, template, type, ov, t) {
  const ac = ov.accentColor;
  const [ar, ag, ab] = OVhxRGB(ac);
  const cx = W / 2,
    cy = H / 2;
  const msg = ov.msg || "";
  const name = (ov.channel || "NebulaCraft").toUpperCase();

  /* ============================================================
     PULSAR HUD — bespoke scene for every type
     ============================================================ */
  if (template === "pulsar_hud") {
    // ── shared HUD helpers ──────────────────────────────────
    // Draw a data panel with header + content
    const _hudPanel = (px, py, pw, ph, title, r = 4) => {
      ctx.fillStyle = "rgba(0,8,22,.78)";
      _rrect(ctx, px, py, pw, ph, r);
      ctx.fill();
      // Header bar gradient
      const hg = ctx.createLinearGradient(px, py, px + pw, py);
      hg.addColorStop(0, OVC(ar, ag, ab, 0.5));
      hg.addColorStop(0.6, OVC(ar, ag, ab, 0.15));
      hg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hg;
      _rrect(ctx, px, py, pw, 28, r, true);
      ctx.fill();
      // Border
      ctx.strokeStyle = OVC(ar, ag, ab, 0.3);
      ctx.lineWidth = 1;
      _rrect(ctx, px, py, pw, ph, r);
      ctx.stroke();
      // Top accent line
      const tg = ctx.createLinearGradient(px, py, px + pw, py);
      tg.addColorStop(0, OVC(ar, ag, ab, 0.9));
      tg.addColorStop(0.5, OVC(ar, ag, ab, 0.4));
      tg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = tg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + pw, py);
      ctx.stroke();
      // Title
      ctx.font = `700 11px 'Orbitron',sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = OVC(ar, ag, ab, 0.9);
      ctx.fillText(title, px + 10, py + 14);
    };

    // ── Glitch text effect helper ────────────────────────────
    const _glitchText = (text, x, y, size, alpha = 1) => {
      const glitch = Math.sin(t * 12) > 0.95;
      if (glitch) {
        ctx.fillStyle = OVC(ar, ag, ab, alpha * 0.5);
        ctx.fillText(text, x + OVprng(t | 0)() * 6 - 3, y);
      }
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText(text, x, y);
    };

    // ── Animated circle rings helper ─────────────────────────
    const _hudRings = (rx, ry, rings) => {
      rings.forEach(({ r, alpha, speed, dash }) => {
        const a = (alpha || 0.3) * (0.7 + 0.3 * Math.sin(t * (speed || 1)));
        ctx.strokeStyle = OVC(ar, ag, ab, a);
        ctx.lineWidth = 1;
        if (dash) {
          ctx.setLineDash(dash);
          ctx.lineDashOffset = t * (speed || 1) * 20;
        }
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    };

    // ── Corner data readout ───────────────────────────────────
    const _cornerData = (lines, x, y, align = "left") => {
      ctx.font = `500 11px 'Orbitron',sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      lines.forEach((l, i) => {
        ctx.fillStyle =
          i % 2 === 0 ? OVC(ar, ag, ab, 0.5) : "rgba(255,255,255,.7)";
        ctx.fillText(l, x, y + i * 16);
      });
    };

    if (type === "starting") {
      // ── STARTING SOON ─────────────────────────────────────
      // Cercles fixes (petits)
      _hudRings(cx, cy, [
        { r: 180, alpha: 0.28, speed: 0.8 },
        { r: 100, alpha: 0.35, speed: 1.2 },
      ]);

      // Arc principal — cercle plein qui tourne (utilise lineDashOffset pour simuler la rotation)
      const arcAngle = t * 0.5; // vitesse de rotation
      const arcRadius = 240;
      const circumference = 2 * Math.PI * arcRadius;
      ctx.strokeStyle = OVC(ar, ag, ab, 0.6);
      ctx.lineWidth = 2;
      ctx.setLineDash([circumference * 0.75, circumference * 0.25]); // 3/4 plein, 1/4 vide
      ctx.lineDashOffset = -arcAngle * arcRadius + circumference * 0.75; // rotation via offset
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arc secondaire — sens inverse, plus fin
      const arc2Angle = -t * 0.3;
      const arc2Radius = 280;
      const circ2 = 2 * Math.PI * arc2Radius;
      ctx.strokeStyle = OVC(ar, ag, ab, 0.25);
      ctx.lineWidth = 1;
      ctx.setLineDash([circ2 * 0.6, circ2 * 0.4]);
      ctx.lineDashOffset = -arc2Angle * arc2Radius + circ2 * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, arc2Radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cross-hair lines
      const chAlpha = 0.15 + 0.05 * Math.sin(t * 2);
      ctx.strokeStyle = OVC(ar, ag, ab, chAlpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();

      // Central glow
      const cgG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160);
      cgG.addColorStop(0, OVC(ar, ag, ab, 0.14));
      cgG.addColorStop(0.5, OVC(ar, ag, ab, 0.05));
      cgG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cgG;
      ctx.fillRect(0, 0, W, H);

      // Main text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // "INITIALISATION" label above
      ctx.font = `600 14px 'Orbitron',sans-serif`;
      ctx.fillStyle = OVC(ar, ag, ab, 0.6);
      ctx.fillText("INITIALISATION DU SIGNAL", cx, cy - 110);
      ctx.strokeStyle = OVC(ar, ag, ab, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 180, cy - 98);
      ctx.lineTo(cx + 180, cy - 98);
      ctx.stroke();

      // "BIENTÔT" main title — large
      ctx.font = `900 96px 'Orbitron',sans-serif`;
      // Shadow glow layers
      for (let g = 3; g > 0; g--) {
        ctx.fillStyle = OVC(ar, ag, ab, 0.04 * g);
        ctx.fillText("BIENTÔT", cx + g, cy - 28 + g);
        ctx.fillText("BIENTÔT", cx - g, cy - 28 - g);
      }
      _glitchText("BIENTÔT", cx, cy - 28);
      // "EN DIRECT" subtitle
      ctx.font = `400 28px 'Orbitron',sans-serif`;
      ctx.fillStyle = OVC(ar, ag, ab, 0.85);
      ctx.fillText("EN DIRECT", cx, cy + 42);

      // Channel name below separator
      ctx.strokeStyle = OVC(ar, ag, ab, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 220, cy + 72);
      ctx.lineTo(cx + 220, cy + 72);
      ctx.stroke();
      ctx.font = `600 22px 'Space Grotesk',sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillText(name, cx, cy + 80);
      if (msg) {
        ctx.font = `400 16px 'Space Grotesk',sans-serif`;
        ctx.fillStyle = OVC(ar, ag, ab, 0.55);
        ctx.fillText(msg, cx, cy + 112);
      }


    } else if (type === "brb") {
      // ── BRB ───────────────────────────────────────────────
      // Radar sweep as main visual
      const vpx = cx,
        vpy = cy;
      const radarR = 320;
      // Background circle
      _hudRings(vpx, vpy, [
        { r: radarR, alpha: 0.15, speed: 0.2 },
        { r: radarR * 0.66, alpha: 0.12, speed: 0.3, dash: [6, 6] },
        { r: radarR * 0.33, alpha: 0.1, speed: 0.4 },
      ]);
      // Radar spokes
      for (let s = 0; s < 8; s++) {
        const sa = (s / 8) * Math.PI * 2;
        ctx.strokeStyle = OVC(ar, ag, ab, 0.06);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vpx, vpy);
        ctx.lineTo(vpx + Math.cos(sa) * radarR, vpy + Math.sin(sa) * radarR);
        ctx.stroke();
      }
      // Sweep
      const sweep = (t * 0.5) % (Math.PI * 2);
      for (let s = 0; s < 10; s++) {
        const a = sweep - s * 0.15;
        const sAlpha = OVclamp(((10 - s) / 10) * 0.25, 0, 0.3);
        ctx.beginPath();
        ctx.moveTo(vpx, vpy);
        ctx.arc(vpx, vpy, radarR, a, a + 0.15);
        ctx.closePath();
        ctx.fillStyle = OVC(ar, ag, ab, sAlpha);
        ctx.fill();
      }
      ctx.strokeStyle = OVC(ar, ag, ab, 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(vpx, vpy);
      ctx.lineTo(
        vpx + Math.cos(sweep) * radarR,
        vpy + Math.sin(sweep) * radarR,
      );
      ctx.stroke();

      // Blip dots orbiting
      for (let b = 0; b < 5; b++) {
        const ba = (b / 5) * Math.PI * 2 + t * 0.2;
        const bd = radarR * (0.25 + b * 0.14);
        const bx2 = vpx + Math.cos(ba) * bd,
          by2 = vpy + Math.sin(ba) * bd;
        ctx.fillStyle = OVC(ar, ag, ab, 0.8);
        ctx.beginPath();
        ctx.arc(bx2, by2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = OVC(ar, ag, ab, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx2, by2, 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Central BRB text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 120px 'Orbitron',sans-serif`;
      const tp = 0.85 + 0.15 * Math.sin(t * 2.5);
      for (let g = 4; g > 0; g--) {
        ctx.fillStyle = OVC(ar, ag, ab, 0.03 * g);
        ctx.fillText("BRB", cx + g, cy);
      }
      ctx.fillStyle = `rgba(255,255,255,${tp})`;
      ctx.fillText("BRB", cx, cy);
      // Sub-label
      ctx.font = `500 18px 'Space Grotesk',sans-serif`;
      ctx.fillStyle = OVC(ar, ag, ab, 0.65);
      ctx.fillText(msg || "SIGNAL EN PAUSE — RETOUR IMMINENT", cx, cy + 70);

      // Data panels bottom corners
      _hudPanel(40, H - 90, 300, 70, "STATUT SYSTÈME");
      ctx.font = `600 12px 'Orbitron',sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText("EN ATTENTE ████████", 52, H - 60);
      _hudPanel(W - 340, H - 90, 300, 70, "SIGNAL");
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText("▓▓▓▓▓▓▓░░░  68%", W - 328, H - 60);
    } else if (type === "ending") {
      // ── ENDING ────────────────────────────────────────────
      // Expanding rings — post-stream burst
      for (let i = 0; i < 6; i++) {
        const rr = 80 + i * 60 + ((t * 25) % 60);
        const ra = OVclamp(1 - rr / 500, 0.0, 0.4);
        ctx.strokeStyle = OVC(ar, ag, ab, ra);
        ctx.lineWidth = 2 - i * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Data stream particles flying outward
      for (let p = 0; p < 30; p++) {
        const r2 = OVprng(p * 77);
        const pAngle = r2() * Math.PI * 2;
        const pDist = (t * 80 + p * 20) % 600;
        const px2 = cx + Math.cos(pAngle) * pDist;
        const py2 = cy + Math.sin(pAngle) * pDist;
        const pAlpha = OVclamp(1 - pDist / 600, 0.0, 0.6);
        ctx.fillStyle = OVC(ar, ag, ab, pAlpha);
        ctx.fillRect(px2, py2, 2, 2);
      }

      // Main text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Big "MERCI" with glow layers
      ctx.font = `900 110px 'Orbitron',sans-serif`;
      for (let g = 5; g > 0; g--) {
        ctx.fillStyle = OVC(ar, ag, ab, 0.025 * g);
        ctx.fillText("MERCI", cx, cy - 30);
      }
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillText("MERCI", cx, cy - 30);
      // Subtitle
      ctx.font = `400 24px 'Orbitron',sans-serif`;
      ctx.fillStyle = OVC(ar, ag, ab, 0.8);
      ctx.fillText("DÉCONNEXION DU SIGNAL", cx, cy + 40);
      // Channel
      ctx.strokeStyle = OVC(ar, ag, ab, 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 200, cy + 68);
      ctx.lineTo(cx + 200, cy + 68);
      ctx.stroke();
      ctx.font = `600 20px 'Space Grotesk',sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.fillText(name, cx, cy + 75);
      if (msg) {
        ctx.font = `400 15px 'Space Grotesk',sans-serif`;
        ctx.fillStyle = OVC(ar, ag, ab, 0.5);
        ctx.fillText(msg, cx, cy + 104);
      }

      // Countdown-style bar — "session ended"
      const bpx = cx - 360,
        bpy = H - 80,
        bpw = 720,
        bph = 20;
      ctx.fillStyle = "rgba(0,8,22,.7)";
      _rrect(ctx, bpx, bpy, bpw, bph, 10);
      ctx.fill();
      const prog = OVclamp((t % 8) / 8, 0, 1);
      _rrect(ctx, bpx, bpy, bpw * prog, bph, 10);
      const fg = ctx.createLinearGradient(bpx, 0, bpx + bpw, 0);
      fg.addColorStop(0, OVC(ar, ag, ab, 0.9));
      fg.addColorStop(1, OVC(ar, ag, ab, 0.3));
      ctx.fillStyle = fg;
      ctx.fill();
      ctx.strokeStyle = OVC(ar, ag, ab, 0.25);
      ctx.lineWidth = 1;
      _rrect(ctx, bpx, bpy, bpw, bph, 10);
      ctx.stroke();
      ctx.font = `600 11px 'Orbitron',sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.fillText("FIN DE SESSION · FERMETURE DU FLUX", cx, H - 90);
    } else if (type === "webcam") {
      // ── WEBCAM FULLSCREEN ─────────────────────────────────
      // Large targeting frame — centre
      const wx = W * 0.08,
        wy = H * 0.06,
        ww = W * 0.84,
        wh = H * 0.82;
      // Glass bg
      ctx.fillStyle = "rgba(0,8,22,.55)";
      _rrect(ctx, wx, wy, ww, wh, 6);
      ctx.fill();
      // Inner grid
      ctx.strokeStyle = OVC(ar, ag, ab, 0.03);
      ctx.lineWidth = 0.5;
      for (let gx = wx + 60; gx < wx + ww; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, wy);
        ctx.lineTo(gx, wy + wh);
        ctx.stroke();
      }
      for (let gy = wy + 60; gy < wy + wh; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(wx, gy);
        ctx.lineTo(wx + ww, gy);
        ctx.stroke();
      }
      // Border
      ctx.strokeStyle = OVC(ar, ag, ab, 0.35);
      ctx.lineWidth = 1;
      _rrect(ctx, wx, wy, ww, wh, 6);
      ctx.stroke();
      // Top bar
      const tpG = ctx.createLinearGradient(wx, wy, wx + ww, wy);
      tpG.addColorStop(0, OVC(ar, ag, ab, 0.7));
      tpG.addColorStop(0.5, OVC(ar, ag, ab, 0.2));
      tpG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = tpG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + ww, wy);
      ctx.stroke();
      // Big corner brackets
      const blen = 70;
      [
        [wx, wy, 1, 1],
        [wx + ww, wy, -1, 1],
        [wx, wy + wh, 1, -1],
        [wx + ww, wy + wh, -1, -1],
      ].forEach(([cx2, cy2, dx, dy]) => {
        // Glow
        const bg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 100);
        bg.addColorStop(0, OVC(ar, ag, ab, 0.15));
        bg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bg;
        ctx.fillRect(cx2 - 80, cy2 - 80, 160, 160);
        // Bracket
        ctx.strokeStyle = OVC(ar, ag, ab, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx2 + dx * blen, cy2);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx2, cy2 + dy * blen);
        ctx.stroke();
        // Inner
        ctx.strokeStyle = OVC(ar, ag, ab, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx2 + dx * (blen - 20), cy2 + dy * 8);
        ctx.lineTo(cx2 + dx * 8, cy2 + dy * 8);
        ctx.lineTo(cx2 + dx * 8, cy2 + dy * (blen - 20));
        ctx.stroke();
      });
      // Centre reticle
      const rcx = wx + ww / 2,
        rcy = wy + wh / 2;
      _hudRings(rcx, rcy, [
        { r: wh * 0.18, alpha: 0.1, speed: 0.3, dash: [6, 4] },
        { r: wh * 0.09, alpha: 0.15, speed: 0.6 },
      ]);
      [0, Math.PI / 2].forEach((a) => {
        ctx.strokeStyle = OVC(ar, ag, ab, 0.12);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rcx + Math.cos(a) * 30, rcy + Math.sin(a) * 30);
        ctx.lineTo(
          rcx + Math.cos(a) * wh * 0.18,
          rcy + Math.sin(a) * wh * 0.18,
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rcx - Math.cos(a) * 30, rcy - Math.sin(a) * 30);
        ctx.lineTo(
          rcx - Math.cos(a) * wh * 0.18,
          rcy - Math.sin(a) * wh * 0.18,
        );
        ctx.stroke();
      });
      // Status bar top
      const pulse = 0.7 + 0.3 * Math.sin(t * 3);
      ctx.fillStyle = OVC(255, 60, 60, pulse);
      ctx.beginPath();
      ctx.arc(wx + 18, wy + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 12px 'Orbitron',sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,80,80,.9)";
      ctx.fillText("REC", wx + 30, wy + 18);
      ctx.fillStyle = OVC(ar, ag, ab, 0.7);
      ctx.fillText("·  " + name, wx + 60, wy + 18);
      ctx.textAlign = "right";
      ctx.fillStyle = OVC(ar, ag, ab, 0.4);
      ctx.fillText("1080p · 60fps", wx + ww - 14, wy + 18);
    } else if (type === "panel") {
      // ── INFO PANEL ────────────────────────────────────────
      // Main panel
      const px = W * 0.05,
        py = H * 0.08,
        pw = W * 0.9,
        ph = H * 0.78;
      ctx.fillStyle = "rgba(0,8,22,.72)";
      _rrect(ctx, px, py, pw, ph, 6);
      ctx.fill();
      // Header
      const hpG = ctx.createLinearGradient(px, py, px + pw, py);
      hpG.addColorStop(0, OVC(ar, ag, ab, 0.45));
      hpG.addColorStop(0.5, OVC(ar, ag, ab, 0.1));
      hpG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hpG;
      _rrect(ctx, px, py, pw, 52, 6, true);
      ctx.fill();
      ctx.strokeStyle = OVC(ar, ag, ab, 0.3);
      ctx.lineWidth = 1;
      _rrect(ctx, px, py, pw, ph, 6);
      ctx.stroke();
      // Header top line
      const htG = ctx.createLinearGradient(px, py, px + pw, py);
      htG.addColorStop(0, OVC(ar, ag, ab, 1));
      htG.addColorStop(0.6, OVC(ar, ag, ab, 0.3));
      htG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = htG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + pw, py);
      ctx.stroke();
      // Left accent bar
      const labG = ctx.createLinearGradient(px, py, px, py + ph);
      labG.addColorStop(0, OVC(ar, ag, ab, 1));
      labG.addColorStop(0.5, OVC(ar, ag, ab, 0.2));
      labG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = labG;
      ctx.fillRect(px, py, 3, ph);
      // Header title
      ctx.font = `800 28px 'Orbitron',sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillText(name, px + 20, py + 26);
      if (ov.game) {
        ctx.fillStyle = OVC(ar, ag, ab, 0.7);
        ctx.font = `500 18px 'Orbitron',sans-serif`;
        ctx.fillText(
          "·  " + ov.game.toUpperCase(),
          px + 20 + ctx.measureText(name).width + 10,
          py + 26,
        );
      }

      // Body — tagline centred
      ctx.font = `400 24px 'Space Grotesk',sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(200,220,255,.75)";
      ctx.fillText(ov.tagline || "", cx, py + ph / 2);

      // Bottom data row
      const dataY = py + ph - 50;
      ctx.strokeStyle = OVC(ar, ag, ab, 0.15);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 10, dataY);
      ctx.lineTo(px + pw - 10, dataY);
      ctx.stroke();
      const fields = [
        ["CHAÎNE", name],
        ["JEU", ov.game || "—"],
        ["STATUT", "OFFLINE"],
        ["SIGNAL", "██████░░"],
      ];
      fields.forEach(([k, v], i) => {
        const fx = px + 30 + i * (pw / 4);
        ctx.font = `500 10px 'Orbitron',sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = OVC(ar, ag, ab, 0.5);
        ctx.fillText(k, fx, dataY + 8);
        ctx.font = `700 14px 'Orbitron',sans-serif`;
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.fillText(v, fx, py + ph - 6);
      });
      // Decorative rings top-right
      _hudRings(px + pw - 80, py + ph * 0.4, [
        { r: 60, alpha: 0.06, speed: 0.2, dash: [6, 6] },
        { r: 35, alpha: 0.1, speed: 0.4 },
        { r: 12, alpha: 0.3, speed: 1 },
      ]);
    }
    return; // end pulsar_hud
  }

  /* ============================================================
     ALL OTHER TEMPLATES — original scenes
     ============================================================ */
  if (type === "starting") {
    _drawCentredCard(ctx, W, H, ac, t);
    ctx.font = `800 82px 'Orbitron',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText("BIENTÔT EN DIRECT", cx, cy - 60);
    ctx.font = `500 30px 'Space Grotesk',sans-serif`;
    ctx.fillStyle = OVhexAlpha(ac, 0.8);
    ctx.fillText(ov.channel ? ov.channel.toUpperCase() : "", cx, cy + 10);
    if (msg) {
      ctx.font = `400 24px 'Space Grotesk',sans-serif`;
      ctx.fillStyle = "rgba(180,180,220,.7)";
      ctx.fillText(msg, cx, cy + 55);
    }
    const rPulse = 0.4 + 0.3 * Math.sin(t * 1.2);
    ctx.strokeStyle = OVhexAlpha(ac, rPulse);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 220 + Math.sin(t * 0.6) * 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = OVhexAlpha(ac, rPulse * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 260 + Math.sin(t * 0.4 + 1) * 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "brb") {
    _drawCentredCard(ctx, W, H, ac, t);
    ctx.font = `800 100px 'Orbitron',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tp = 0.8 + 0.2 * Math.sin(t * 2.5);
    ctx.fillStyle = `rgba(255,255,255,${tp})`;
    ctx.fillText("BRB", cx, cy - 40);
    ctx.font = `500 28px 'Space Grotesk',sans-serif`;
    ctx.fillStyle = OVhexAlpha(ac, 0.75);
    ctx.fillText(msg || "Retour dans quelques instants…", cx, cy + 30);
    for (let i = 0; i < 3; i++) {
      const oa = t * 0.6 + (i / 3) * Math.PI * 2;
      const od = 180 + i * 55;
      const ox2 = cx + Math.cos(oa) * od,
        oy2 = cy + Math.sin(oa) * od * 0.35;
      const sizes = [18, 12, 9];
      const cGp = ctx.createRadialGradient(
        ox2 - sizes[i] * 0.3,
        oy2 - sizes[i] * 0.3,
        0,
        ox2,
        oy2,
        sizes[i],
      );
      cGp.addColorStop(
        0,
        OVC(
          Math.min(255, ar + 80),
          Math.min(255, ag + 80),
          Math.min(255, ab + 80),
          1,
        ),
      );
      cGp.addColorStop(
        1,
        OVC(
          Math.max(0, ar - 40),
          Math.max(0, ag - 40),
          Math.max(0, ab - 40),
          1,
        ),
      );
      ctx.fillStyle = cGp;
      ctx.beginPath();
      ctx.arc(ox2, oy2, sizes[i], 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === "ending") {
    _drawCentredCard(ctx, W, H, ac, t);
    ctx.font = `800 88px 'Orbitron',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText("MERCI !", cx, cy - 50);
    ctx.font = `600 32px 'Space Grotesk',sans-serif`;
    ctx.fillStyle = OVhexAlpha(ac, 0.8);
    ctx.fillText(ov.channel ? ov.channel.toUpperCase() : "", cx, cy + 10);
    ctx.font = `400 22px 'Space Grotesk',sans-serif`;
    ctx.fillStyle = "rgba(180,180,220,.7)";
    ctx.fillText(msg || "À bientôt dans le cosmos 🚀", cx, cy + 55);
    for (let i = 0; i < 8; i++) {
      const sAngle = (i / 8) * Math.PI * 2 + t * 0.2;
      const sd = 250 + Math.sin(t * 0.5 + i) * 60;
      const sx2 = cx + Math.cos(sAngle) * sd,
        sy2 = cy + Math.sin(sAngle) * sd * 0.6;
      const sg2 = ctx.createLinearGradient(
        sx2,
        sy2,
        sx2 - Math.cos(sAngle) * 40,
        sy2 - Math.sin(sAngle) * 40,
      );
      sg2.addColorStop(0, OVhexAlpha(ac, 0.7));
      sg2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = sg2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx2, sy2);
      ctx.lineTo(sx2 - Math.cos(sAngle) * 40, sy2 - Math.sin(sAngle) * 40);
      ctx.stroke();
    }
  } else if (type === "webcam") {
    const wx = W * 0.1,
      wy = H * 0.08,
      ww = W * 0.8,
      wh = H * 0.78;
    ctx.fillStyle = "rgba(0,0,0,.4)";
    _rrect(ctx, wx, wy, ww, wh, 20);
    ctx.fill();
    ctx.strokeStyle = OVhexAlpha(ac, 0.55);
    ctx.lineWidth = 2;
    _rrect(ctx, wx, wy, ww, wh, 20);
    ctx.stroke();
    const blen = 50;
    [
      [wx, wy, 1, 1],
      [wx + ww, wy, -1, 1],
      [wx, wy + wh, 1, -1],
      [wx + ww, wy + wh, -1, -1],
    ].forEach(([bx2, by2, dx, dy]) => {
      ctx.strokeStyle = OVhexAlpha(ac, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx2 + dx * blen, by2);
      ctx.lineTo(bx2, by2);
      ctx.lineTo(bx2, by2 + dy * blen);
      ctx.stroke();
    });
    ctx.font = `500 20px 'Space Grotesk',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = OVhexAlpha(ac, 0.25);
    ctx.fillText("WEBCAM", W / 2, H / 2);
  } else if (type === "panel") {
    const px = W * 0.06,
      py = H * 0.12,
      pw = W * 0.88,
      ph = H * 0.76;
    ctx.fillStyle = "rgba(0,0,0,.45)";
    _rrect(ctx, px, py, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = OVhexAlpha(ac, 0.35);
    ctx.lineWidth = 2;
    _rrect(ctx, px, py, pw, ph, 16);
    ctx.stroke();
    const tbGp = ctx.createLinearGradient(px, py, px + pw, py);
    tbGp.addColorStop(0, OVhexAlpha(ac, 0.4));
    tbGp.addColorStop(1, OVhexAlpha(ac, 0.05));
    ctx.fillStyle = tbGp;
    _rrect(ctx, px, py, pw, 50, 16, true);
    ctx.fill();
    ctx.font = `700 24px 'Orbitron',sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(
      (ov.channel || "CHAÎNE").toUpperCase() +
        "  ·  " +
        (ov.game || "").toUpperCase(),
      px + 20,
      py + 25,
    );
    ctx.font = `400 22px 'Space Grotesk',sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(200,200,230,.7)";
    ctx.fillText(ov.tagline || "", W / 2, py + ph / 2);
  }
}

/* Centred card helper for BRB/Starting/Ending */
function _drawCentredCard(ctx, W, H, ac, t) {
  const cx = W / 2,
    cy = H / 2;
  const [ar, ag, ab] = OVhxRGB(ac);
  // Subtle card bg
  const cG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 400);
  cG.addColorStop(0, OVC(ar, ag, ab, 0.12));
  cG.addColorStop(0.5, OVC(ar, ag, ab, 0.04));
  cG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cG;
  ctx.fillRect(0, 0, W, H);
  // Horizontal glow line
  const hlG = ctx.createLinearGradient(cx - 500, cy + 90, cx + 500, cy + 90);
  hlG.addColorStop(0, "rgba(0,0,0,0)");
  hlG.addColorStop(0.5, OVC(ar, ag, ab, 0.35));
  hlG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hlG;
  ctx.fillRect(cx - 500, cy + 85, 1000, 4);
}

/* Rounded rect helper */
function _rrect(ctx, x, y, w, h, r, topOnly = false) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  if (topOnly) {
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
  }
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ----------------------------------------------------------
   TEMPLATE THUMBNAILS — 160×90 previews
   ---------------------------------------------------------- */
const TPL_THUMBS = [
  "nebula_stream",
  "deep_space",
  "pulsar_hud",
  "aurora_chill",
  "blackhole_minimal",
  "supernova_alert",
];

function renderTemplateThumbs() {
  TPL_THUMBS.forEach((tpl) => {
    const div = document.getElementById("tpl-thumb-" + tpl);
    if (!div) return;
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 90;
    c.style.width = "100%";
    c.style.height = "100%";
    const ctx2 = c.getContext("2d");
    ctx2.scale(160 / OV_W, 90 / OV_H);
    drawBackground(ctx2, OV_W, OV_H, tpl, OV);
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    div.innerHTML = "";
    div.appendChild(c);
  });
}

/* ----------------------------------------------------------
   MAIN RENDER LOOP
   ---------------------------------------------------------- */
let _canvas,
  _ctx,
  _layers = [];

function ovRender() {
  if (!OV.animating) {
    if (OV.raf) cancelAnimationFrame(OV.raf);
    OV.raf = null;
    return;
  }
  OV.raf = requestAnimationFrame((ts) => {
    // Delta time réel — 60fps, 120fps ou tout autre taux d'écran
    const delta = OV.lastRafTs > 0 ? Math.min((ts - OV.lastRafTs) / 1000, 0.1) : 1/60;
    OV.lastRafTs = ts;

    // Avance le temps — pas de reset, rotation continue sans saut
    OV.t += delta;

    // FPS counter
    OV.frameCount++;
    if (ts - OV.lastFpsTs > 1000) {
      OV.fps = OV.frameCount;
      OV.frameCount = 0;
      OV.lastFpsTs = ts;
      const el = document.getElementById("ov-fps");
      if (el) el.textContent = OV.fps + " FPS";
    }
    _drawAll(_canvas, _ctx, OV_W, OV_H, _layers, OV);
    ovRender();
  });
}

function _drawAll(canvas, ctx, W, H, layers, ov) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, W, H);
  layers
    .filter((l) => !l.hidden)
    .forEach((l) => {
      ctx.save();
      try {
        l.draw(ctx, W, H, ov.t);
      } catch (e) {}
      ctx.restore();
    });
}

/* ----------------------------------------------------------
   UPDATE — rebuild layers and re-render
   ---------------------------------------------------------- */
function ovUpdate() {
  // Sync text inputs
  const ch = document.getElementById("ov-channel");
  if (ch) OV.channel = ch.value;
  const tg = document.getElementById("ov-tagline");
  if (tg) OV.tagline = tg.value;
  const msg = document.getElementById("ov-msg");
  if (msg) OV.msg = msg.value;
  const gm = document.getElementById("ov-game");
  if (gm) OV.game = gm.value;
  // Rebuild layers
  _layers = buildLayers(OV.template, OV.type, OV);
  renderLayerList();
  if (!OV.animating) {
    _drawAll(_canvas, _ctx, OV_W, OV_H, _layers, OV);
  }
}

function ovToggle(key) {
  OV.elements[key] = !OV.elements[key];
  document
    .getElementById("tog-ov-" + key)
    .classList.toggle("on", OV.elements[key]);
  ovUpdate();
}

function ovToggleAnimate() {
  OV.animating = !OV.animating;
  const btn = document.getElementById("btn-anim");
  if (btn) btn.textContent = OV.animating ? "⏸ Pause" : "▶ Play";
  if (OV.animating) { OV.t = 0; OV.lastRafTs = 0; ovRender(); }
  else if (OV.raf) {
    cancelAnimationFrame(OV.raf);
    OV.raf = null;
  }
}

/* ----------------------------------------------------------
   LAYER LIST UI
   ---------------------------------------------------------- */
function renderLayerList() {
  const list = document.getElementById("ov-layer-list");
  if (!list) return;
  list.innerHTML = _layers
    .slice()
    .reverse()
    .map(
      (l) => `
    <div class="ov-layer-item ${l.hidden ? "hidden" : ""} ${OV.selectedLayer === l.id ? "selected" : ""}" onclick="ovSelectLayer('${l.id}')">
      <span class="ov-layer-icon">${l.icon}</span>
      <span class="ov-layer-name">${l.name}</span>
      <span class="ov-layer-vis" onclick="event.stopPropagation();ovHideLayer('${l.id}')">${l.hidden ? "○" : "●"}</span>
    </div>`,
    )
    .join("");
}

function ovSelectLayer(id) {
  OV.selectedLayer = id;
  renderLayerList();
}
function ovHideLayer(id) {
  const l = _layers.find((l) => l.id === id);
  if (l) l.hidden = !l.hidden;
  renderLayerList();
}

/* ----------------------------------------------------------
   EXPORT HELPERS
   ---------------------------------------------------------- */
function _getExportSettings() {
  return {
    duration: Math.PI * 2 / 0.4, // 15.708s = 1 tour complet du radar (speed 0.4)
    width: OV_W,   // toujours 1920
    height: OV_H,  // toujours 1080
    scale: 1,
    fps: 60,
    name: (OV.channel || "overlay") + "_" + OV.template + "_" + OV.type,
  };
}

function _setProgress(pct, status) {
  const bar = document.getElementById("ov-export-bar");
  const lbl = document.getElementById("ov-export-status");
  const wrap = document.getElementById("ov-export-progress");
  if (!wrap) return;
  if (pct === null) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";
  if (bar) bar.style.width = pct + "%";
  if (lbl) lbl.textContent = status || "Encodage…";
}

function _disableExportBtns(dis) {
  ["btn-gif", "btn-webm"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = dis;
      el.style.opacity = dis ? ".45" : "1";
    }
  });
}

/* render one frame into an off-screen canvas at given scale */
function _renderFrame(t_val, scale) {
  const W = Math.round(OV_W * scale),
    H = Math.round(OV_H * scale);
  const fc = document.createElement("canvas");
  fc.width = W;
  fc.height = H;
  // willReadFrequently: true — suppresses Canvas2D warning for getImageData
  const fctx = fc.getContext("2d", { willReadFrequently: true });
  fctx.scale(scale, scale);
  const layers = buildLayers(OV.template, OV.type, OV);
  const savedT = OV.t;
  OV.t = t_val;
  layers
    .filter((l) => !l.hidden)
    .forEach((l) => {
      fctx.save();
      try {
        l.draw(fctx, OV_W, OV_H, t_val);
      } catch (e) {}
      fctx.restore();
    });
  OV.t = savedT;
  return fc;
}

/* ----------------------------------------------------------
   PNG EXPORT
   ---------------------------------------------------------- */
async function ovExportPNG() {
  const { scale, name } = _getExportSettings();
  const fc = _renderFrame(OV.t, scale);
  fc.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".png";
    a.click();
    URL.revokeObjectURL(url);
    if (typeof toast === "function") toast("PNG exporté !", "#8b5cf6");
  }, "image/png");
}

/* ===========================================================
   INLINE GIF ENCODER — zero external deps, no workers
   LZW + GIF89a spec, handles palette quantisation (median cut)
   =========================================================== */

/* --- Median-cut colour quantiser → 256 colours max --- */
function _quantise(pixels, maxColors) {
  // pixels: Uint8ClampedArray RGBA
  // returns { palette: [[r,g,b],...], indices: Uint8Array }
  const n = pixels.length / 4;
  const colors = [];
  for (let i = 0; i < n; i++) {
    const r = pixels[i * 4],
      g = pixels[i * 4 + 1],
      b = pixels[i * 4 + 2],
      a = pixels[i * 4 + 3];
    if (a < 128)
      colors.push([0, 0, 0]); // treat transparent as black
    else colors.push([r, g, b]);
  }

  // Helper: fast min/max via reduce — avoids spread-operator stack overflow
  // on large buckets (1920×1080 = 2M pixels would exceed call stack).
  function _range(arr, ch) {
    let mn = 255, mx = 0;
    for (let k = 0; k < arr.length; k++) {
      const v = arr[k][ch];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return mx - mn;
  }

  // Build palette via median cut
  let buckets = [[...colors]];
  while (buckets.length < maxColors) {
    // find bucket with largest range
    let bi = 0,
      bestRange = 0;
    buckets.forEach((b, i) => {
      const rs  = _range(b, 0);
      const gs  = _range(b, 1);
      const bs2 = _range(b, 2);
      const range = Math.max(rs, gs, bs2);
      if (range > bestRange) {
        bestRange = range;
        bi = i;
      }
    });
    const bucket = buckets[bi];
    const rs  = _range(bucket, 0);
    const gs  = _range(bucket, 1);
    const bs2 = _range(bucket, 2);
    const ch = rs >= gs && rs >= bs2 ? 0 : gs >= bs2 ? 1 : 2;
    bucket.sort((a, b2) => a[ch] - b2[ch]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(bi, 1, bucket.slice(0, mid), bucket.slice(mid));
    if (bucket.length <= 1) break;
  }

  const palette = buckets.map((b) => {
    const r = Math.round(b.reduce((s, c) => s + c[0], 0) / b.length);
    const g = Math.round(b.reduce((s, c) => s + c[1], 0) / b.length);
    const bl = Math.round(b.reduce((s, c) => s + c[2], 0) / b.length);
    return [r, g, bl];
  });
  // Pad to 256
  while (palette.length < 256) palette.push([0, 0, 0]);

  // Map each pixel to nearest palette entry
  const indices = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [pr, pg, pb] = colors[i];
    let best = 0,
      bestD = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const d =
        (pr - palette[p][0]) ** 2 +
        (pg - palette[p][1]) ** 2 +
        (pb - palette[p][2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    indices[i] = best;
  }
  return { palette, indices };
}

/* --- LZW compress pixel indices --- */
function _lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  const table = new Map();
  const resetTable = () => {
    table.clear();
    for (let i = 0; i < clearCode; i++) table.set(String(i), i);
  };

  const output = [];
  let buf = 0,
    bufBits = 0;
  const writeBits = (code, bits) => {
    buf |= code << bufBits;
    bufBits += bits;
    while (bufBits >= 8) {
      output.push(buf & 0xff);
      buf >>= 8;
      bufBits -= 8;
    }
  };
  const flush = () => {
    if (bufBits > 0) output.push(buf & 0xff);
  };

  resetTable();
  writeBits(clearCode, codeSize);

  let index = String(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const next = index + "," + indices[i];
    if (table.has(next)) {
      index = next;
    } else {
      writeBits(table.get(index), codeSize);
      if (nextCode < 4096) {
        table.set(next, nextCode++);
        if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        writeBits(clearCode, codeSize);
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
        resetTable();
      }
      index = String(indices[i]);
    }
  }
  writeBits(table.get(index), codeSize);
  writeBits(eoiCode, codeSize);
  flush();
  return output;
}

/* --- Write sub-blocks (max 255 bytes each) --- */
function _subBlocks(data) {
  const out = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0); // block terminator
  return out;
}

/* --- Build GIF89a binary --- */
function _buildGIF(frames, W, H, fps) {
  const delay = Math.round(100 / fps); // in 1/100s units
  const bytes = [];
  const w = (v) => {
    bytes.push(v);
  };
  const w2 = (v) => {
    bytes.push(v & 0xff, (v >> 8) & 0xff);
  };
  const ws = (s) => {
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  };
  const wa = (a) => {
    for (let i = 0; i < a.length; i++) bytes.push(a[i]);
  };

  // Use palette from first frame
  const { palette } = frames[0];
  const palSize = Math.ceil(Math.log2(palette.length)) - 1; // palette size field

  // Header
  ws("GIF89a");
  w2(W);
  w2(H);
  // Global color table: present=1, colorRes=7, sort=0, gctSize=7 (256 colors)
  w(0xf7); // 11110111
  w(0); // background color index
  w(0); // pixel aspect ratio

  // Global Color Table (256 entries)
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = palette[i] || [0, 0, 0];
    w(r);
    w(g);
    w(b);
  }

  // Netscape Application Extension (looping)
  w(0x21);
  w(0xff);
  w(11);
  ws("NETSCAPE2.0");
  w(3);
  w(1);
  w2(0);
  w(0); // loop count 0 = infinite

  // Frames
  frames.forEach(({ indices }) => {
    // Graphic Control Extension
    w(0x21);
    w(0xf9);
    w(4);
    w(0x00); // dispose: no action
    w2(delay);
    w(0); // transparent index
    w(0); // block terminator

    // Image Descriptor
    w(0x2c);
    w2(0);
    w2(0); // left, top
    w2(W);
    w2(H);
    w(0x00); // no local color table, no interlace

    // Image Data
    const minCodeSize = Math.max(2, Math.ceil(Math.log2(256)));
    const lzw = _lzwEncode(indices, minCodeSize);
    w(minCodeSize);
    wa(_subBlocks(lzw));
  });

  // Trailer
  w(0x3b);
  return new Uint8Array(bytes);
}

/* ----------------------------------------------------------
   GIF EXPORT — pure inline, no workers, no CDN
   ---------------------------------------------------------- */
async function ovExportGIF() {
  const { name } = _getExportSettings();
  const duration = Math.PI * 2 / 0.4; // 15.708s = 1 tour complet du radar
  // GIF : résolution fixe 480p pour rapidité (le GIF 1080p serait énorme et lent)
  const GIF_SCALE = 0.25; // 1920x1080 → 480x270
  const width  = Math.round(OV_W * GIF_SCALE);
  const height = Math.round(OV_H * GIF_SCALE);
  const gifFps = 12; // 12fps = taille raisonnable, lecture fluide
  const totalFrames = Math.round(duration * gifFps);

  _disableExportBtns(true);
  _setProgress(0, "Capture des frames…");
  if (typeof toast === "function") toast("Encodage GIF…", "#f59e0b");

  const frames = [];
  const COLORS = 64;

  for (let i = 0; i < totalFrames; i++) {
    const frameT = (i / gifFps) % duration; // commence à t=0, boucle propre
    const fc = _renderFrame(frameT, GIF_SCALE);
    const fctx = fc.getContext("2d", { willReadFrequently: true });
    const imgData = fctx.getImageData(0, 0, width, height);
    const { palette, indices } = _quantise(imgData.data, COLORS);
    frames.push({ palette, indices });

    // Yield au navigateur toutes les frames pour ne pas freezer l'UI
    _setProgress(
      Math.round((i / totalFrames) * 70),
      `Frame ${i + 1}/${totalFrames}…`,
    );
    await new Promise((r) => setTimeout(r, 0));
  }

  _setProgress(75, "Encodage GIF89a…");
  await new Promise((r) => setTimeout(r, 0));

  const gifBytes = _buildGIF(frames, width, height, gifFps);
  _setProgress(98, "Finalisation…");
  await new Promise((r) => setTimeout(r, 0));

  const blob = new Blob([gifBytes], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".gif";
  a.click();
  URL.revokeObjectURL(url);

  _disableExportBtns(false);
  setTimeout(() => _setProgress(null), 2000);
  if (typeof toast === "function")
    toast(`GIF exporté ! (${Math.round(blob.size / 1024)}KB)`, "#10b981");
}

/* ----------------------------------------------------------
   WEBM EXPORT — MediaRecorder API (native, high quality)
   ---------------------------------------------------------- */
async function ovExportWebM() {
  if (!window.MediaRecorder) {
    if (typeof toast === "function")
      toast("MediaRecorder non supporté dans ce navigateur", "#ef4444");
    return;
  }

  // Durée = 1 rotation complète de l'arc principal
  const duration = Math.PI * 2 / 0.4; // 15.708s = 1 tour complet du radar
  const { width, height, scale, name } = _getExportSettings();

  // VP9 = meilleure qualité/taille, fallback VP8 puis webm générique
  const mimes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

  _disableExportBtns(true);
  _setProgress(0, "Démarrage…");
  if (typeof toast === "function") toast("Enregistrement WebM 60fps…", "#06b6d4");

  // Canvas d'enregistrement pleine résolution
  const recCanvas = document.createElement("canvas");
  recCanvas.width = width;
  recCanvas.height = height;
  const recCtx = recCanvas.getContext("2d");

  // captureStream(60) = on demande 60fps au navigateur
  const stream = recCanvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 20_000_000, // 20 Mbps — qualité maximale, pas de compression visible
  });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Rendu frame-perfect : on avance t de manière déterministe à 60fps
  // au lieu de se fier à performance.now() qui dépend du CPU
  const WEBM_FPS = 60;
  const totalFrames = Math.ceil(duration * WEBM_FPS);
  let frameIndex = 0;
  let rafId;

  const renderLoop = () => {
    if (frameIndex >= totalFrames) {
      recorder.stop();
      return;
    }

    // Temps déterministe — chaque frame avance exactement 1/60s
    const animT = frameIndex / WEBM_FPS;
    frameIndex++;

    const layers = buildLayers(OV.template, OV.type, OV);
    recCtx.clearRect(0, 0, width, height);
    recCtx.save();
    recCtx.scale(scale, scale);
    layers
      .filter((l) => !l.hidden)
      .forEach((l) => {
        recCtx.save();
        try { l.draw(recCtx, OV_W, OV_H, animT); } catch (e) {}
        recCtx.restore();
      });
    recCtx.restore();

    const pct = OVclamp((frameIndex / totalFrames) * 98, 0, 98);
    _setProgress(pct, `Frame ${frameIndex}/${totalFrames}…`);
    rafId = requestAnimationFrame(renderLoop);
  };

  recorder.onstop = () => {
    cancelAnimationFrame(rafId);
    _setProgress(99, "Finalisation…");
    const blob = new Blob(chunks, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".webm";
    a.click();
    URL.revokeObjectURL(url);
    _disableExportBtns(false);
    setTimeout(() => _setProgress(null), 2000);
    if (typeof toast === "function")
      toast(`WebM exporté ! (${Math.round(blob.size / 1024)} KB — ${WEBM_FPS}fps)`, "#10b981");
  };

  recorder.start(100);
  requestAnimationFrame(renderLoop);
}

/* ----------------------------------------------------------
   PACK PNG (all types)
   ---------------------------------------------------------- */
async function ovExportAll() {
  const types = ["full", "starting", "brb", "ending", "webcam", "panel"];
  const { scale, name: baseName } = _getExportSettings();
  _setProgress(0, "Export du pack…");
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const savedType = OV.type;
    OV.type = type;
    _layers = buildLayers(OV.template, OV.type, OV);
    const fc = _renderFrame(OV.t, scale);
    OV.type = savedType;
    _layers = buildLayers(OV.template, OV.type, OV);
    await new Promise((resolve) => {
      fc.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${OV.channel || "overlay"}_${OV.template}_${type}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(resolve, 200);
      }, "image/png");
    });
    _setProgress(Math.round(((i + 1) / types.length) * 100), `Export ${type}…`);
  }
  setTimeout(() => _setProgress(null), 1500);
  if (typeof toast === "function")
    toast("Pack complet exporté (6 PNG) !", "#10b981");
}

/* ----------------------------------------------------------
   CSS OBS
   ---------------------------------------------------------- */
function ovCopyCSS() {
  const css = `/* NebulaCraft OBS Browser Source CSS */
body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
canvas { display: block; width: 1920px; height: 1080px; }`;
  navigator.clipboard?.writeText(css).then(() => {
    if (typeof toast === "function") toast("CSS OBS copié !", "#06b6d4");
  });
}

/* ----------------------------------------------------------
   CANVAS SIZING — fit preview into the panel
   ---------------------------------------------------------- */
function ovResizeCanvas() {
  const wrap = document.querySelector(".ov-canvas-wrap");
  if (!wrap || !_canvas) return;
  const maxW = wrap.clientWidth - 32,
    maxH = wrap.clientHeight - 32;
  const scale = Math.min(maxW / OV_W, maxH / OV_H);
  _canvas.style.width = Math.round(OV_W * scale) + "px";
  _canvas.style.height = Math.round(OV_H * scale) + "px";
}

/* ----------------------------------------------------------
   PAGE ENTRY — called when overlay page becomes visible
   ---------------------------------------------------------- */
function initOverlay() {
  _canvas = document.getElementById("ov-canvas");
  if (!_canvas) return;
  _canvas.width = OV_W;
  _canvas.height = OV_H;
  _ctx = _canvas.getContext("2d");
  // Sync from main channel input
  const mainCh = document.getElementById("channel-name");
  if (mainCh && mainCh.value) OV.channel = mainCh.value;
  const ovCh = document.getElementById("ov-channel");
  if (ovCh && !ovCh.value && OV.channel) ovCh.value = OV.channel;
  ovUpdate();
  ovResizeCanvas();
  ovRender();
  renderTemplateThumbs();
}

/* Template picker */
document.querySelectorAll(".ov-tpl").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".ov-tpl")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    OV.template = btn.dataset.tpl;
    ovUpdate();
  });
});

/* Type tabs */
document.querySelectorAll(".ov-type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".ov-type-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    OV.type = tab.dataset.type;
    ovUpdate();
  });
});

/* Accent colour swatches */
document
  .getElementById("ov-color-row")
  ?.addEventListener("click", function (e) {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    OV.accentColor = sw.dataset.c;
    this.querySelectorAll(".swatch").forEach((s) =>
      s.classList.remove("active"),
    );
    sw.classList.add("active");
    ovUpdate();
  });

/* Resize observer */
window.addEventListener("resize", ovResizeCanvas);

/* PAGE_META extension for overlay */
if (typeof PAGE_META !== "undefined") {
  PAGE_META.overlay = { icon: "▣", title: "Overlays Twitch" };
}

/* Hook into switchPage */
const _origSwitchPage = typeof switchPage === "function" ? switchPage : null;
if (_origSwitchPage) {
  window.switchPage = function (name) {
    _origSwitchPage(name);
    if (name === "overlay") {
      setTimeout(() => {
        initOverlay();
        ovResizeCanvas();
      }, 80);
    } else {
      // Pause animation when leaving overlay page
      if (OV.animating && OV.raf) {
        cancelAnimationFrame(OV.raf);
        OV.raf = null;
        OV.animating = true;
      }
    }
  };
}
