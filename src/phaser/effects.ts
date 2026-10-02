import type Phaser from "phaser";
import type { Fx, Shot } from "../game/simulation";

type Graphics = Phaser.GameObjects.Graphics;
const TAU = Math.PI * 2;
const WHITE = 0xfff3ce;

function arc(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  start: number,
  end: number,
  width: number,
  color: number,
  alpha: number,
) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.arc(x, y, Math.max(1, r), start, end);
  g.strokePath();
}
function ray(
  g: Graphics,
  x: number,
  y: number,
  a: number,
  inner: number,
  outer: number,
  width: number,
  color: number,
  alpha: number,
) {
  g.lineStyle(width, color, alpha);
  g.lineBetween(
    x + Math.cos(a) * inner,
    y + Math.sin(a) * inner,
    x + Math.cos(a) * outer,
    y + Math.sin(a) * outer,
  );
}
function glow(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha: number,
) {
  for (let i = 3; i > 0; i--) {
    g.fillStyle(color, alpha * (4 - i) * 0.025);
    g.fillCircle(x, y, (r * i) / 2);
  }
}
function sparks(
  g: Graphics,
  f: Fx,
  count: number,
  progress: number,
  alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + (f.angle || 0),
      speed = 0.45 + (i % 5) * 0.12;
    const distance = f.r * progress * speed;
    ray(
      g,
      f.x,
      f.y,
      a,
      distance,
      distance + 4 + 12 * (1 - progress),
      i % 3 === 0 ? 2.5 : 1.5,
      i % 3 === 0 ? WHITE : f.color,
      alpha,
    );
  }
}

/** Bounded immediate-mode effects. No renderer state can alter combat rules. */
export function drawWeaponShot(g: Graphics, shot: Shot, time: number) {
  const a = Math.atan2(shot.vy, shot.vx),
    color = shot.hostile ? 0xef7646 : (shot.color ?? 0x51e8db);
  const length = shot.hostile ? 14 : 26;
  ray(g, shot.x, shot.y, a, -length, 0, shot.hostile ? 8 : 7, color, 0.13);
  ray(g, shot.x, shot.y, a, -length * 0.7, 0, 3, color, 0.7);
  ray(g, shot.x, shot.y, a, -7, 2, 1.5, WHITE, 1);
  g.fillStyle(shot.hostile ? 0xffad72 : 0xe0fff8, 1);
  g.fillCircle(shot.x, shot.y, shot.hostile ? 3.5 : 2.5);
  if (shot.hostile) {
    g.lineStyle(1, 0xffb573, 0.7);
    g.strokeCircle(shot.x, shot.y, 6 + Math.sin(time * 8 + shot.id) * 0.5);
  }
}

export function drawCombatEffect(
  g: Graphics,
  floor: Graphics,
  f: Fx,
  reduceMotion: boolean,
) {
  const alpha = Math.max(0, Math.min(1, f.ttl / f.max)),
    p = 1 - alpha,
    a = f.angle || 0;
  const countScale = reduceMotion ? 0.4 : 1;
  const radius = f.r * (0.2 + 0.8 * (1 - Math.pow(alpha, 3)));
  if (f.kind === "chain") {
    const ex = f.endX ?? f.x,
      ey = f.endY ?? f.y;
    const dx = ex - f.x,
      dy = ey - f.y,
      len = Math.hypot(dx, dy) || 1;
    const points = Array.from({ length: 9 }, (_, i) => {
      const o = i === 0 || i === 8 ? 0 : (i % 2 ? 1 : -1) * 5 * alpha;
      return {
        x: f.x + (dx * i) / 8 - (dy / len) * o,
        y: f.y + (dy * i) / 8 + (dx / len) * o,
      };
    });
    g.lineStyle(8, f.color, alpha * 0.15);
    g.strokePoints(points, false);
    g.lineStyle(2, 0xe3f7ff, alpha);
    g.strokePoints(points, false);
    glow(g, ex, ey, 12, f.color, alpha);
  } else if (f.kind === "ice") {
    arc(floor, f.x, f.y, f.r, 0, TAU, 2, f.color, alpha * 0.6);
    arc(g, f.x, f.y, radius, 0, TAU, 3, 0xd5f7ff, alpha);
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12,
        r = radius * (i % 2 ? 0.75 : 1),
        x = f.x + Math.cos(a) * r,
        y = f.y + Math.sin(a) * r;
      g.fillStyle(f.color, alpha * 0.3);
      g.fillTriangle(x, y - 21 * alpha, x - 8, y + 10, x + 8, y + 10);
      g.lineStyle(1.5, 0xe7fbff, alpha);
      g.strokeTriangle(x, y - 21 * alpha, x - 8, y + 10, x + 8, y + 10);
    }
    sparks(g, f, Math.floor(24 * countScale), p, alpha);
  } else if (f.kind === "blood") {
    glow(floor, f.x, f.y, radius, f.color, alpha);
    for (let i = 0; i < 6; i++) {
      const angle = (i * TAU) / 6 + (reduceMotion ? 0 : p * 2.4);
      arc(
        g,
        f.x,
        f.y,
        radius * (0.65 + (i % 2) * 0.2),
        angle,
        angle + 0.8,
        7,
        f.color,
        alpha * 0.6,
      );
      arc(g, f.x, f.y, radius * 0.9, angle, angle + 0.6, 2, 0xffdbe9, alpha);
      ray(
        g,
        f.x,
        f.y,
        angle,
        radius * (1 - p * 0.8),
        radius,
        2,
        f.color,
        alpha,
      );
    }
    sparks(g, f, Math.floor(20 * countScale), p, alpha);
  } else if (f.kind === "gear") {
    const r = f.r * (0.6 + p * 0.4),
      rotation = reduceMotion ? 0 : p;
    arc(g, f.x, f.y, r, 0, TAU, 3, f.color, alpha);
    arc(g, f.x, f.y, r * 0.7, 0, TAU, 2, WHITE, alpha * 0.7);
    for (let i = 0; i < 12; i++)
      ray(
        g,
        f.x,
        f.y,
        (i * TAU) / 12 + rotation,
        r - 6,
        r + 6,
        5,
        f.color,
        alpha,
      );
    sparks(g, f, Math.floor(12 * countScale), p, alpha);
  } else if (f.kind === "muzzle") {
    for (const side of [-1, 1]) {
      const x = f.x - Math.sin(a) * side * 8 + Math.cos(a) * 20,
        y = f.y + Math.cos(a) * side * 8 + Math.sin(a) * 20;
      glow(g, x, y, 14, f.color, alpha);
      ray(g, x, y, a, -3, 18 * alpha + 5, 7, f.color, alpha * 0.45);
      ray(g, x, y, a, -2, 13 * alpha + 3, 3, WHITE, alpha);
      for (const o of [-0.7, 0.7])
        ray(g, x, y, a + o, 2, 10 * alpha, 2, WHITE, alpha * 0.7);
    }
  } else if (f.kind === "slash") {
    const sweep = a - 1.2 + p * 2.4;
    const tail = Math.max(a - 1.2, sweep - 1.5);
    const crescent = [];
    for (let i = 0; i <= 14; i++) {
      const angle = tail + ((sweep - tail) * i) / 14;
      crescent.push({
        x: f.x + Math.cos(angle) * f.r,
        y: f.y + Math.sin(angle) * f.r,
      });
    }
    for (let i = 14; i >= 0; i--) {
      const angle = tail + ((sweep - tail) * i) / 14;
      const taper = 0.58 + 0.4 * Math.pow(1 - i / 14, 2);
      crescent.push({
        x: f.x + Math.cos(angle) * f.r * taper,
        y: f.y + Math.sin(angle) * f.r * taper,
      });
    }
    g.fillStyle(f.color, alpha * 0.35);
    g.fillPoints(crescent, true);
    for (let i = 0; i < 4; i++)
      arc(
        g,
        f.x,
        f.y,
        f.r * (0.65 + i * 0.09),
        a - 1.2,
        sweep,
        12 - i * 2,
        f.color,
        alpha * (0.09 + i * 0.05),
      );
    arc(
      g,
      f.x,
      f.y,
      f.r * 0.94,
      Math.max(a - 1.2, sweep - 1.3),
      sweep,
      3,
      WHITE,
      alpha,
    );
    ray(g, f.x, f.y, sweep, f.r * 0.55, f.r, 3, WHITE, alpha);
    if (!reduceMotion) sparks(g, f, 7, p, alpha * 0.65);
  } else if (f.kind === "dash") {
    const ex = f.endX ?? f.x + Math.cos(a) * 95,
      ey = f.endY ?? f.y + Math.sin(a) * 95;
    const dist = Math.hypot(ex - f.x, ey - f.y);
    for (const side of [-1, 1]) {
      const offset = side * 8 * alpha;
      g.lineStyle(3, f.color, alpha * 0.65);
      g.lineBetween(
        f.x - Math.sin(a) * offset,
        f.y + Math.cos(a) * offset,
        ex - Math.sin(a) * offset,
        ey + Math.cos(a) * offset,
      );
    }
    ray(g, f.x, f.y, a, 0, dist, 10, f.color, alpha * 0.08);
    for (const [x, y] of [
      [f.x, f.y],
      [ex, ey],
    ]) {
      g.lineStyle(3, f.color, alpha);
      g.strokeEllipse(x, y, 18 + 20 * p, 48 + 12 * p);
      g.lineStyle(1, WHITE, alpha);
      g.strokeEllipse(x, y, 10 + 12 * p, 38 + 10 * p);
    }
  } else if (f.kind === "recall") {
    const r = f.r * (1 - p * 0.45);
    glow(floor, f.x, f.y, r, f.color, alpha);
    arc(g, f.x, f.y, r, 0, TAU, 3, f.color, alpha);
    arc(g, f.x, f.y, r * 0.82, 0, TAU, 1, WHITE, alpha * 0.7);
    for (let i = 0; i < 12; i++)
      ray(
        g,
        f.x,
        f.y,
        (i * TAU) / 12,
        r * 0.88,
        r * 0.98,
        i % 3 === 0 ? 3 : 1,
        f.color,
        alpha,
      );
    const turn = reduceMotion ? 0 : -p * TAU * 1.5;
    ray(g, f.x, f.y, turn - Math.PI / 2, 0, r * 0.62, 3, WHITE, alpha);
    ray(g, f.x, f.y, turn * 0.4, 0, r * 0.38, 4, f.color, alpha);
    for (let i = 0; i < 3; i++)
      arc(
        g,
        f.x,
        f.y,
        r + 12 + i * 9,
        turn + i * 2,
        turn + i * 2 + 1.2,
        2,
        f.color,
        alpha * 0.5,
      );
  } else if (f.kind === "shield") {
    const r = f.r * (0.72 + p * 0.15);
    glow(floor, f.x, f.y, r, f.color, alpha);
    const pts = Array.from({ length: 6 }, (_, i) => ({
      x: f.x + Math.cos((i * TAU) / 6 - Math.PI / 2) * r,
      y: f.y + Math.sin((i * TAU) / 6 - Math.PI / 2) * r,
    }));
    g.fillStyle(f.color, alpha * 0.08);
    g.fillPoints(pts, true);
    g.lineStyle(3, WHITE, alpha);
    g.strokePoints(pts, true);
    arc(g, f.x, f.y, r * 0.8, 0, TAU, 2, f.color, alpha);
    ray(g, f.x, f.y, -Math.PI / 2, -18, 22, 4, WHITE, alpha);
    ray(g, f.x, f.y, 0, -13, 13, 3, WHITE, alpha);
  } else if (f.kind === "pulse" || f.kind === "storm" || f.kind === "parry") {
    const storm = f.kind === "storm";
    glow(floor, f.x, f.y, radius, f.color, alpha);
    // Accurate damage-radius outline remains visible; expanding waves are decorative.
    arc(floor, f.x, f.y, f.r, 0, TAU, 1, f.color, alpha * 0.45);
    arc(g, f.x, f.y, radius, 0, TAU, 8, f.color, alpha * 0.18);
    arc(g, f.x, f.y, radius, 0, TAU, 2.5, WHITE, alpha * 0.85);
    arc(g, f.x, f.y, radius * 0.77, 0, TAU, 2, f.color, alpha * 0.7);
    sparks(g, f, Math.floor((storm ? 38 : 28) * countScale), p, alpha);
    for (let i = 0; i < (storm ? 8 : 6); i++) {
      const angle =
        (i * TAU) / (storm ? 8 : 6) +
        (reduceMotion ? 0 : p * (storm ? 3 : -0.7));
      if (storm) {
        // Tangential sword silhouettes orbit in the ember vortex.
        const cx = f.x + Math.cos(angle) * radius * 0.7,
          cy = f.y + Math.sin(angle) * radius * 0.7;
        const bladeAngle = angle + Math.PI / 2,
          dx = Math.cos(bladeAngle),
          dy = Math.sin(bladeAngle);
        const blade = [
          { x: cx + dx * 30, y: cy + dy * 30 },
          { x: cx + dx * 6 - dy * 5, y: cy + dy * 6 + dx * 5 },
          { x: cx - dx * 10 - dy * 4, y: cy - dy * 10 + dx * 4 },
          { x: cx - dx * 10 + dy * 4, y: cy - dy * 10 - dx * 4 },
          { x: cx + dx * 6 + dy * 5, y: cy + dy * 6 - dx * 5 },
        ];
        g.fillStyle(f.color, alpha * 0.55);
        g.fillPoints(blade, true);
        g.lineStyle(1.5, WHITE, alpha * 0.9);
        g.strokePoints(blade, true);
        ray(g, cx, cy, bladeAngle + Math.PI / 2, -8, 8, 3, f.color, alpha);
        ray(g, cx, cy, bladeAngle, -18, -10, 3, WHITE, alpha);
        arc(
          g,
          f.x,
          f.y,
          radius * (0.5 + (i % 3) * 0.14),
          angle,
          angle + 0.7,
          5,
          f.color,
          alpha * 0.7,
        );
        ray(g, f.x, f.y, angle, radius * 0.35, radius * 0.85, 2, WHITE, alpha);
      } else {
        arc(g, f.x, f.y, radius * 0.9, angle, angle + 0.18, 4, f.color, alpha);
        if (f.kind === "pulse") {
          const points = Array.from({ length: 7 }, (_, j) => {
            const distance = radius * (0.28 + j * 0.11),
              offset =
                j === 0 || j === 6 ? 0 : (j % 2 === 0 ? 1 : -1) * 9 * alpha;
            return {
              x: f.x + Math.cos(angle) * distance - Math.sin(angle) * offset,
              y: f.y + Math.sin(angle) * distance + Math.cos(angle) * offset,
            };
          });
          g.lineStyle(7, f.color, alpha * 0.12);
          g.strokePoints(points, false);
          g.lineStyle(1.8, 0xcffff5, alpha * 0.85);
          g.strokePoints(points, false);
        }
      }
    }
    if (f.kind === "parry") {
      for (let i = 0; i < 4; i++)
        ray(
          g,
          f.x,
          f.y,
          (i * Math.PI) / 2 + Math.PI / 4,
          15,
          radius * 0.8,
          4,
          WHITE,
          alpha,
        );
    }
    if (p < 0.25) {
      g.fillStyle(WHITE, (1 - p / 0.25) * 0.22);
      g.fillCircle(f.x, f.y, 16 + 25 * p);
    }
  } else if (f.kind === "hit") {
    glow(g, f.x, f.y, 8, f.color, alpha);
    sparks(g, f, Math.floor(8 * countScale), p, alpha);
    ray(g, f.x, f.y, a - Math.PI / 4, -9 * alpha, 9 * alpha, 2, WHITE, alpha);
    ray(g, f.x, f.y, a + Math.PI / 4, -6 * alpha, 6 * alpha, 2, WHITE, alpha);
  } else {
    const impact = f.kind === "impact";
    glow(floor, f.x, f.y, radius, f.color, alpha);
    arc(g, f.x, f.y, radius, 0, TAU, impact ? 4 : 2, f.color, alpha);
    arc(g, f.x, f.y, radius * 0.7, 0, TAU, 1, WHITE, alpha * 0.6);
    sparks(g, f, Math.floor((impact ? 18 : 12) * countScale), p, alpha * 0.8);
  }
}
