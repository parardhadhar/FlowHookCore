'use client';

import { useEffect, useRef } from 'react';
import './TechText.css';

const LABEL_FONT = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FALLOFF_STEPS = 8;
const SPRING = 320;
const DAMPING = 22;

const approach = (current, target, dt, speed) => {
  const diff = target - current;
  return Math.abs(diff) < 0.001 ? target : current + diff * (1 - Math.exp(-speed * dt * 60));
};

const hexToRgb = (hex) => {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return Number.isNaN(num)
    ? { r: 255, g: 255, b: 255 }
    : { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};

const noise = (seed, a, b = 0, c = 0) => {
  let h = (seed * 374761393 + a * 668265263 + b * 2147483647 + c * 1274126177) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const TechText = ({
  text = 'React Bits',
  direction = 'horizontal',
  rotated = 'none',
  fontFamily = '',
  fontWeight = 600,
  fontSize = 150,
  letterSpacing = -0.05,
  color = '#ffffff',
  accentColor = '#ffffff',
  reach = 200,
  softness = 0.7,
  dashLength = 4,
  dashGap = 2,
  strokeWidth = 1.5,
  lineStyle = 'dashed',
  reveal = 'letter',
  specks = 15,
  selection = true,
  labels = true,
  draggable = true,
  sweep = true,
  speed = 1,
  className = '',
  style = {},
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const settingsRef = useRef(null);
  const wakeRef = useRef(() => {});

  useEffect(() => {
    settingsRef.current = {
      text, direction, rotated, fontFamily, fontWeight, fontSize, letterSpacing, color, accentColor,
      reach, softness, dashLength, dashGap, strokeWidth, lineStyle, reveal,
      specks, selection, labels, draggable, sweep, speed,
    };
    wakeRef.current();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    if (!container || !canvas || !ctx || !scratchCtx) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let width = 1, height = 1, dpr = 1, raf = 0, last = performance.now();
    let visible = true, alive = true, layoutKey = '', requestedFont = '';
    let word = null, glyphs = [], presence = 0, clock = 0, pulse = 0, placed = false, dragging = -1;
    const pointer = { x: 0, y: 0, inside: false };
    const grab = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };
    const frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };

    const refreshFonts = () => { layoutKey = ''; wakeRef.current(); };
    const family = (s) => {
      if (s.fontFamily && !s.fontFamily.includes('var(')) return s.fontFamily;
      const computed = getComputedStyle(container).fontFamily;
      return computed || 'Outfit, system-ui, sans-serif';
    };
    const fontFor = (s, size) => `${s.fontWeight} ${size}px ${family(s)}`;
    const setFont = (target, s, size) => {
      target.font = fontFor(s, size);
      if ('letterSpacing' in target && s.letterSpacing) target.letterSpacing = `${s.letterSpacing * size}px`;
      target.textAlign = 'left';
      target.textBaseline = 'alphabetic';
    };

    const sprite = (s, view, glyph, stroke) => {
      const pad = Math.ceil(s.strokeWidth * 2 + 4);
      const left = glyph.box.x1 - pad, top = glyph.box.y1 - pad;
      const w = glyph.box.x2 - glyph.box.x1 + pad * 2, h = glyph.box.y2 - glyph.box.y1 + pad * 2;
      const image = document.createElement('canvas');
      image.width = Math.max(1, Math.ceil(w * dpr));
      image.height = Math.max(1, Math.ceil(h * dpr));
      const c = image.getContext('2d');
      if (!c) return { image, left, top };
      c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
      setFont(c, s, view.size);
      const baseline = glyph.baseline !== undefined ? glyph.baseline : view.baseline;
      if (stroke) {
        c.lineJoin = 'round'; c.lineWidth = s.strokeWidth * 2; c.lineCap = 'butt';
        c.strokeStyle = s.color;
        if (s.lineStyle !== 'solid') c.setLineDash([Math.max(1, s.dashLength), Math.max(1, s.dashGap)]);
        c.strokeText(glyph.char, glyph.x, baseline);
        c.setLineDash([]);
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000000';
        c.fillText(glyph.char, glyph.x, baseline);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.fillStyle = s.color;
        c.fillText(glyph.char, glyph.x, baseline);
      }
      return { image, left, top };
    };

    const ensureLayout = (s) => {
      const key = [s.text, family(s), s.fontWeight, s.fontSize, s.letterSpacing, s.color, s.dashLength, s.dashGap, s.strokeWidth, s.lineStyle, s.direction, width, height, dpr].join('|');
      if (key === layoutKey && word) return word;
      layoutKey = key;
      const wanted = fontFor(s, 64);
      if (document.fonts && wanted !== requestedFont) {
        requestedFont = wanted;
        document.fonts.load(wanted, s.text).then(refreshFonts, refreshFonts);
      }
      const probe = scratchCtx;
      const chars = Array.from(s.text);
      const isVertical = s.direction === 'vertical';

      if (isVertical) {
        const numChars = chars.length;
        const padY = Math.max(20, Math.min(36, height * 0.04));
        const availHeight = height - padY * 2;
        const maxCharWidth = width * 0.70;
        const maxCharHeight = (availHeight / numChars) * 0.85;

        // Measure with probe to find scale
        setFont(probe, s, 100);
        let maxW = 1, maxAscent = 1, maxDescent = 1;
        chars.forEach((c) => {
          const m = probe.measureText(c);
          const cw = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width || 60);
          maxW = Math.max(maxW, cw);
          maxAscent = Math.max(maxAscent, m.actualBoundingBoxAscent || 70);
          maxDescent = Math.max(maxDescent, m.actualBoundingBoxDescent || 20);
        });

        const fitScale = Math.min(
          s.fontSize / 100,
          maxCharWidth / maxW,
          maxCharHeight / (maxAscent + maxDescent)
        );
        const size = Math.max(20, Math.round(100 * fitScale));
        setFont(probe, s, size);

        const charMetrics = chars.map((c) => {
          const m = probe.measureText(c);
          return {
            char: c,
            m,
            w: (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width || size * 0.6),
            ascent: m.actualBoundingBoxAscent || (size * 0.72),
            descent: m.actualBoundingBoxDescent || (size * 0.22),
          };
        });

        const step = numChars > 1 ? availHeight / (numChars - 1) : availHeight;
        const next = {
          size,
          baseline: 0,
          left: 0,
          right: width,
          top: padY,
          bottom: height - padY,
        };
        word = next;

        const previous = glyphs;
        glyphs = [];
        charMetrics.forEach((cm, i) => {
          const cy = numChars > 1 ? padY + i * step : height / 2;
          const baseline = cy + (cm.ascent - cm.descent) / 2;
          const gx = (width - cm.w) / 2 + (cm.m.actualBoundingBoxLeft || 0);

          const base = {
            char: cm.char,
            x: gx,
            baseline,
            box: {
              x1: (width - cm.w) / 2,
              y1: cy - cm.ascent,
              x2: (width + cm.w) / 2,
              y2: cy + cm.descent,
            }
          };
          const kept = previous[glyphs.length];
          glyphs.push({
            ...base,
            offset: kept?.char === cm.char ? kept.offset : { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            outline: 0,
            index: i,
            fill: sprite(s, next, base, false),
            dashes: sprite(s, next, base, true),
          });
        });

        dragging = -1; frame.index = -1;
        return next;
      }

      // Horizontal layout (fills the 100svh strip when rotated)
      setFont(probe, s, s.fontSize);
      let m = probe.measureText(s.text);
      const inkW = Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width, 1);
      const inkH = Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || s.fontSize * 0.9, 1);
      const fit = Math.min(1,
        (width * 0.98) / inkW,
        (height * 0.88) / inkH
      );
      const size = Math.max(20, Math.round(s.fontSize * fit));
      setFont(probe, s, size);
      m = probe.measureText(s.text);
      const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const x = (width - inkWidth) / 2 + m.actualBoundingBoxLeft;
      const baseline = (height - inkHeight) / 2 + m.actualBoundingBoxAscent;
      const next = { size, baseline, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight, top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent };
      word = next;

      const previous = glyphs;
      glyphs = [];
      let prefix = '';
      chars.forEach((char, i) => {
        prefix += char;
        const own = probe.measureText(char);
        const gx = x + probe.measureText(prefix).width - own.width;
        if (!char.trim()) return;
        const base = { char, x: gx, box: { x1: gx - own.actualBoundingBoxLeft, y1: baseline - own.actualBoundingBoxAscent, x2: gx + own.actualBoundingBoxRight, y2: baseline + own.actualBoundingBoxDescent } };
        const kept = previous[glyphs.length];
        glyphs.push({ ...base, offset: kept?.char === char ? kept.offset : { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, outline: 0, index: i, fill: sprite(s, next, base, false), dashes: sprite(s, next, base, true) });
      });
      dragging = -1; frame.index = -1;
      return next;
    };

    const glyphAt = (x, y) => {
      if (!word) return -1;
      let best = -1, bestDistance = Infinity;
      glyphs.forEach((glyph, i) => {
        const x1 = glyph.box.x1 + glyph.offset.x, x2 = glyph.box.x2 + glyph.offset.x;
        const y1 = glyph.box.y1 + glyph.offset.y, y2 = glyph.box.y2 + glyph.offset.y;
        const dx = x < x1 ? x1 - x : x > x2 ? x - x2 : 0;
        const dy = y < y1 ? y1 - y : y > y2 ? y - y2 : 0;
        const d = Math.hypot(dx, dy);
        if (d < bestDistance) { bestDistance = d; best = i; }
      });
      return bestDistance < 40 ? best : -1;
    };

    const falloff = (target, cx, cy, radius, strength, softness) => {
      const inner = Math.min(1, Math.max(0, 1 - softness));
      const gradient = target.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      if (inner > 0.995) {
        gradient.addColorStop(0.995, `rgba(0, 0, 0, ${strength})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        return gradient;
      }
      for (let i = 0; i <= FALLOFF_STEPS; i++) {
        const t = i / FALLOFF_STEPS;
        const eased = t * t * (3 - 2 * t);
        gradient.addColorStop(inner + (1 - inner) * t, `rgba(0, 0, 0, ${strength * (1 - eased)})`);
      }
      return gradient;
    };

    const blit = (target, art, dx, dy, originX, originY) => {
      target.drawImage(art.image, Math.round((art.left + dx) * dpr - originX), Math.round((art.top + dy) * dpr - originY));
    };

    const drawReveal = (s) => {
      const radius = s.reach * dpr, cx = lens.x * dpr, cy = lens.y * dpr;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = falloff(ctx, cx, cy, radius, presence, s.softness);
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.globalCompositeOperation = 'source-over';
      const x0 = Math.max(0, Math.floor(cx - radius)), y0 = Math.max(0, Math.floor(cy - radius));
      const x1 = Math.min(canvas.width, Math.ceil(cx + radius)), y1 = Math.min(canvas.height, Math.ceil(cy + radius));
      if (x1 <= x0 || y1 <= y0) return;
      const w = x1 - x0, h = y1 - y0;
      if (scratch.width < w || scratch.height < h) { scratch.width = Math.max(scratch.width, w); scratch.height = Math.max(scratch.height, h); }
      scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
      scratchCtx.globalCompositeOperation = 'source-over';
      scratchCtx.clearRect(0, 0, w, h);
      for (const glyph of glyphs) blit(scratchCtx, glyph.dashes, glyph.offset.x, glyph.offset.y, x0, y0);
      scratchCtx.globalCompositeOperation = 'destination-in';
      scratchCtx.fillStyle = falloff(scratchCtx, cx - x0, cy - y0, radius, 1, s.softness);
      scratchCtx.fillRect(0, 0, w, h);
      scratchCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = presence;
      ctx.drawImage(scratch, 0, 0, w, h, x0, y0, w, h);
      ctx.globalAlpha = 1;
    };

    const crisp = (value) => (Math.round(value * dpr) + 0.5) / dpr;

    const perimeterPoint = (distance, w, h) => {
      let d = ((distance % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
      if (d < w) return [frame.x1 + d, frame.y1, 0, -1]; d -= w;
      if (d < h) return [frame.x2, frame.y1 + d, 1, 0]; d -= h;
      if (d < w) return [frame.x2 - d, frame.y2, 0, 1]; d -= w;
      return [frame.x1, frame.y2 - d, -1, 0];
    };

    const drawSpecks = (s, a) => {
      const w = frame.x2 - frame.x1, h = frame.y2 - frame.y1;
      if (w < 2 || h < 2) return;
      const perimeter = 2 * (w + h), seed = frame.index + 1, grid = 3;
      for (let k = 0; k < s.specks; k++) {
        const period = 0.5 + noise(seed, k, 11) * 1.2;
        const t = pulse / period + noise(seed, k, 17);
        const cycle = Math.floor(t), life = t - cycle;
        if (life > 0.7) continue;
        const [px, py, nx, ny] = perimeterPoint(noise(seed, k, cycle) * perimeter, w, h);
        const pick = noise(seed, k, cycle, 2);
        const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11;
        const large = size >= 8;
        const out = (large ? 9 : 4) + Math.floor(noise(seed, k, cycle, 1) * 5) * grid;
        const x = frame.x1 + Math.round((px + nx * out - frame.x1) / grid) * grid;
        const y = frame.y1 + Math.round((py + ny * out - frame.y1) / grid) * grid;
        const tone = noise(seed, k, cycle, 3);
        const blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
        const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink;
        const left = Math.round(x - size / 2), top = Math.round(y - size / 2);
        if (tone < 0.26 || (large && tone < 0.78)) {
          ctx.strokeStyle = rgba(s.accentColor, alpha); ctx.strokeRect(left + 0.5, top + 0.5, size, size);
          if (large && tone > 0.5) { ctx.fillStyle = rgba(s.accentColor, alpha); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
        } else { ctx.fillStyle = rgba(s.accentColor, alpha); ctx.fillRect(left, top, size, size); }
      }
      for (let j = 0; j < 2; j++) {
        const head = (pulse * 0.42 * s.speed + j * 0.5) * perimeter;
        for (let i = 0; i < 4; i++) {
          const [x, y] = perimeterPoint(head - i * 6, w, h);
          const sz = i === 0 ? 3 : 2;
          ctx.fillStyle = rgba(s.accentColor, a * [0.95, 0.55, 0.32, 0.16][i]);
          ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
        }
      }
    };

    const drawFrame = (s) => {
      const glyph = glyphs[frame.index];
      if (!glyph || frame.alpha < 0.01) return;
      const a = frame.alpha, x1 = crisp(frame.x1), y1 = crisp(frame.y1), x2 = crisp(frame.x2), y2 = crisp(frame.y2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
      if (moved > 1) {
        const hx = (glyph.box.x1 + glyph.box.x2) / 2, hy = (glyph.box.y1 + glyph.box.y2) / 2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + glyph.offset.x, hy + glyph.offset.y);
        ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(s.accentColor, 0.45 * a); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4); ctx.fillStyle = rgba(s.accentColor, 0.7 * a); ctx.fill();
      }
      if (s.selection) {
        ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.lineWidth = 1; ctx.strokeStyle = rgba(s.accentColor, 0.5 * a); ctx.stroke();
        ctx.beginPath();
        for (const [cx, cy] of [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
        ctx.fillStyle = rgba(s.accentColor, 0.95 * a); ctx.fill();
      }
      if (s.specks > 0) { ctx.lineWidth = 1; drawSpecks(s, a); }
      if (!s.labels) return;
      ctx.font = LABEL_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(s.accentColor, 0.62 * a);
      const label = moved > 1
        ? `${signed(Math.round(glyph.offset.x))}, ${signed(Math.round(-glyph.offset.y))}`
        : `${glyph.char}  ${Math.round(glyph.box.x2 - glyph.box.x1)} × ${Math.round(glyph.box.y2 - glyph.box.y1)}`;
      ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 7);
    };

    const tick = (now) => {
      raf = 0;
      const s = settingsRef.current;
      if (!s) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const view = ensureLayout(s);
      const isVertical = s.direction === 'vertical';
      const sweeping = s.sweep && !reducedMotion && !pointer.inside && dragging < 0;
      if (sweeping) clock += dt * s.speed;
      pulse += dt;
      let targetX = pointer.x, targetY = pointer.y;
      if (sweeping) {
        if (isVertical) {
          targetX = view.left + (view.right - view.left) * 0.5;
          targetY = view.top + (view.bottom - view.top) * (0.5 - 0.5 * Math.cos(clock * 0.5));
        } else {
          targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45));
          targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8));
        }
      }
      const active = pointer.inside || sweeping || dragging >= 0;
      if (active && !placed) { lens.x = targetX; lens.y = targetY; }
      if (active) { const lag = pointer.inside ? 0.05 : 0.22; lens.x = approach(lens.x, targetX, dt, lag); lens.y = approach(lens.y, targetY, dt, lag); }
      placed = active;
      presence = approach(presence, s.reveal === 'area' && active && dragging < 0 ? 1 : 0, dt, 0.16);

      let moving = false;
      glyphs.forEach((glyph, i) => {
        if (i === dragging) { glyph.offset.x = approach(glyph.offset.x, pointer.x - grab.x, dt, 0.03); glyph.offset.y = approach(glyph.offset.y, pointer.y - grab.y, dt, 0.03); glyph.velocity.x = 0; glyph.velocity.y = 0; moving = true; return; }
        const { offset, velocity } = glyph;
        if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) { offset.x = 0; offset.y = 0; velocity.x = 0; velocity.y = 0; return; }
        velocity.x += (-SPRING * offset.x - DAMPING * velocity.x) * dt;
        velocity.y += (-SPRING * offset.y - DAMPING * velocity.y) * dt;
        offset.x += velocity.x * dt; offset.y += velocity.y * dt; moving = true;
      });

      const focus = dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
      if (focus >= 0) {
        const glyph = glyphs[focus];
        const bx1 = glyph.box.x1 + glyph.offset.x - 6, by1 = glyph.box.y1 + glyph.offset.y - 6;
        const bx2 = glyph.box.x2 + glyph.offset.x + 6, by2 = glyph.box.y2 + glyph.offset.y + 6;
        if (frame.index < 0 || frame.alpha < 0.02) { frame.x1 = bx1; frame.y1 = by1; frame.x2 = bx2; frame.y2 = by2; }
        const glide = focus === dragging ? 0.02 : 0.08;
        frame.x1 = approach(frame.x1, bx1, dt, glide); frame.y1 = approach(frame.y1, by1, dt, glide);
        frame.x2 = approach(frame.x2, bx2, dt, glide); frame.y2 = approach(frame.y2, by2, dt, glide);
        frame.index = focus;
      }
      frame.alpha = approach(frame.alpha, focus >= 0 ? 1 : 0, dt, 0.1);

      glyphs.forEach((glyph, i) => {
        const target = s.reveal === 'letter' && i === focus && i !== dragging ? 1 : 0;
        glyph.outline = approach(glyph.outline, target, dt, 0.09);
        if (Math.abs(glyph.outline - target) > 0.002) moving = true; else glyph.outline = target;
      });

      if (s.draggable) container.style.cursor = dragging >= 0 ? 'grabbing' : focus >= 0 && pointer.inside ? 'grab' : '';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const glyph of glyphs) {
        const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
        if (moved > 1) { ctx.globalAlpha = Math.min(1, moved / 24) * 0.55; blit(ctx, glyph.dashes, 0, 0, 0, 0); ctx.globalAlpha = 1; }
      }
      for (const glyph of glyphs) {
        if (glyph.outline < 0.999) { ctx.globalAlpha = 1 - glyph.outline; blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0); }
        if (glyph.outline > 0.001) { ctx.globalAlpha = glyph.outline; blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0); }
        ctx.globalAlpha = 1;
      }
      if (presence > 0.001) drawReveal(s);
      drawFrame(s);

      const settling = moving || Math.abs(presence - (s.reveal === 'area' && active && dragging < 0 ? 1 : 0)) > 0.002 || (frame.alpha > 0.01 && frame.alpha < 0.99);
      if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
    };

    const wake = () => { if (raf || !visible || !alive) return; last = performance.now(); raf = requestAnimationFrame(tick); };
    wakeRef.current = wake;

    const resize = () => {
      width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      layoutKey = ''; wake();
    };

    const locate = (e) => {
      const rect = container.getBoundingClientRect();
      const s = settingsRef.current;
      if (s?.rotated === 'vertical-up') {
        pointer.x = rect.bottom - e.clientY;
        pointer.y = e.clientX - rect.left;
      } else {
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
      }
    };
    const onMove = (e) => { locate(e); pointer.inside = true; wake(); };
    const onLeave = () => { if (dragging >= 0) return; pointer.inside = false; wake(); };
    const onDown = (e) => {
      locate(e); pointer.inside = true;
      const s = settingsRef.current;
      if (s?.draggable && (e.pointerType !== 'mouse' || e.button === 0)) {
        const index = glyphAt(pointer.x, pointer.y);
        if (index >= 0) { dragging = index; grab.x = pointer.x - glyphs[index].offset.x; grab.y = pointer.y - glyphs[index].offset.y; container.setPointerCapture?.(e.pointerId); }
      }
      wake();
    };
    const onUp = (e) => {
      if (dragging >= 0) {
        dragging = -1; container.releasePointerCapture?.(e.pointerId);
        const rect = container.getBoundingClientRect();
        pointer.inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      }
      wake();
    };

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerenter', onMove, { passive: true });
    container.addEventListener('pointerdown', onDown, { passive: true });
    container.addEventListener('pointerup', onUp, { passive: true });
    container.addEventListener('pointercancel', onUp, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
    intersectionObserver.observe(container);
    if (document.fonts) document.fonts.ready.then(refreshFonts, refreshFonts);
    resize();

    return () => {
      alive = false; cancelAnimationFrame(raf); wakeRef.current = () => {};
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerenter', onMove);
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onUp);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className={`tech-text ${className}`.trim()} style={style} role="img" aria-label={text}>
      <canvas ref={canvasRef} className="tech-text-canvas" />
    </div>
  );
};

export default TechText;
