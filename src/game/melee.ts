/** Shared weapon geometry: simulation contact and Phaser sprite use the same pose. */
export type MeleeSwing = {
  uid: number;
  id: string;
  age: number;
  duration: number;
  angle: number;
  reach: number;
  damage: number;
  critical: boolean;
  seen: Set<number>;
  pause: number;
  sounded: boolean;
};
export function meleePose(s: MeleeSwing, x: number, y: number, age = s.age) {
  const p = Math.min(1, age / s.duration),
    thrust = s.id === "dagger" || s.id === "spear";
  const active = p >= 0.24 && p <= 0.68;
  const t = Math.max(0, Math.min(1, (p - 0.24) / 0.44));
  const angle = thrust ? s.angle : s.angle - 1.15 + t * 2.3;
  const length =
    s.id === "spear"
      ? 105
      : s.id === "dagger"
        ? 42
        : s.id === "hammer"
          ? 58
          : 76;
  const travel =
    p < 0.24
      ? 27 - p * 25
      : p <= 0.68
        ? 27 + (s.reach - 27) * Math.sin((t * Math.PI) / 2)
        : 27 + (s.reach - 27) * (1 - (p - 0.68) / 0.32);
  const tip = thrust ? travel : s.reach;
  const base = Math.max(18, tip - length);
  return {
    active,
    angle,
    x1: x + Math.cos(angle) * base,
    y1: y + Math.sin(angle) * base,
    x2: x + Math.cos(angle) * tip,
    y2: y + Math.sin(angle) * tip,
    width: s.id === "hammer" ? 15 : s.id === "scythe" ? 10 : 5,
    p,
  };
}
export function segmentContact(
  x: number,
  y: number,
  pose: ReturnType<typeof meleePose>,
) {
  const dx = pose.x2 - pose.x1,
    dy = pose.y2 - pose.y1;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((x - pose.x1) * dx + (y - pose.y1) * dy) /
        Math.max(1, dx * dx + dy * dy),
    ),
  );
  const cx = pose.x1 + t * dx,
    cy = pose.y1 + t * dy;
  return { x: cx, y: cy, distance: Math.hypot(x - cx, y - cy) };
}
