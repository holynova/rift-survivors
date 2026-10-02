import {
  heroes,
  waves,
  balance,
  upgrades,
  specials,
  relics,
  type HeroId,
  type Choice,
} from "./content";
export const W = 1100,
  H = 650;
export type Phase = "battle" | "upgrade" | "shop" | "paused" | "won" | "lost";
export type Action = "core" | "skill" | "ultimate";
export type Enemy = {
  id: number;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  type: number;
  cool: number;
  stun: number;
};
export type Shot = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  hostile: boolean;
  color?: number;
  ttl: number;
};
export type Gem = { id: number; x: number; y: number; value: number };
export type FxKind =
  | "ring"
  | "slash"
  | "burst"
  | "dash"
  | "hit"
  | "shield"
  | "muzzle"
  | "recall"
  | "pulse"
  | "storm"
  | "parry"
  | "impact"
  | "ice"
  | "chain"
  | "blood"
  | "gear";
export type Fx = {
  x: number;
  y: number;
  r: number;
  color: number;
  ttl: number;
  max: number;
  text?: string;
  kind?: FxKind;
  angle?: number;
  endX?: number;
  endY?: number;
};
export type Danger = {
  x: number;
  y: number;
  r: number;
  ttl: number;
  damage: number;
};
export class Random {
  constructor(public seed: number) {}
  next() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
export function damageAfterArmor(damage: number, armor: number) {
  return Math.max(1, Math.round(Math.max(damage * 0.4, damage - armor)));
}
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export class Simulation {
  rng: Random;
  phase: Phase = "battle";
  wave = 1;
  time = 45;
  elapsed = 0;
  kills = 0;
  coins = 0;
  level = 1;
  xp = 0;
  nextXp = 16;
  p: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    speed: number;
    damage: number;
    interval: number;
    range: number;
    armor: number;
    crit: number;
    pickup: number;
    stamina: number;
  };
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  gems: Gem[] = [];
  fx: Fx[] = [];
  dangers: Danger[] = [];
  zones: { x: number; y: number; r: number; ttl: number; tick: number }[] = [];
  turrets: {
    id: number;
    x: number;
    y: number;
    ttl: number;
    cool: number;
    angle: number;
  }[] = [];
  blood = 0;
  overload = 0;
  choices: Choice[] = [];
  shop: typeof relics = [];
  bought = new Set<number>();
  inventory: Record<string, number> = {};
  coreCd = 0;
  skillCd = 0;
  ultCd = 0;
  charges = 3;
  chargeTimer = 0;
  invuln = 0;
  parry = 0;
  echo = 0;
  haste = 1;
  attackTimer = 0;
  spawnTimer = 0.7;
  facing = { x: 1, y: 0 };
  move = { x: 0, y: 0 };
  history: { t: number; x: number; y: number; hp: number }[] = [];
  special = new Set<string>();
  rollCrit = false;
  hitCount = 0;
  pendingShop = false;
  bossSpawned = false;
  reinforcements = false;
  healed = false;
  rerolls = 0;
  id = 1;
  events: string[] = [];
  lastMessage = "";
  sound?: (kind: string, placement?: { x: number; y: number }) => void;
  constructor(
    public hero: HeroId,
    seed = Date.now(),
  ) {
    this.rng = new Random(seed);
    const h = heroes[hero];
    this.p = {
      x: W / 2,
      y: H / 2,
      hp: h.hp,
      maxHp: h.hp,
      speed: h.speed,
      damage: h.damage,
      interval: h.interval,
      range: h.range,
      armor: 0,
      crit: 0.08,
      pickup: 75,
      stamina: 100,
    };
  }
  msg(s: string) {
    this.lastMessage = s;
    this.events.push(s);
    if (this.events.length > 5) this.events.shift();
  }
  setMove(x: number, y: number) {
    const len = Math.hypot(x, y);
    this.move = len ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }
  pause() {
    if (this.phase === "battle") {
      this.phase = "paused";
      this.setMove(0, 0);
    }
  }
  resume() {
    if (this.phase === "paused") this.phase = "battle";
  }
  step(dt: number) {
    if (this.phase !== "battle") return;
    this.elapsed += dt;
    this.time = Math.max(0, this.time - dt);
    for (const k of [
      "coreCd",
      "skillCd",
      "ultCd",
      "invuln",
      "parry",
      "echo",
      "overload",
    ] as const)
      this[k] = Math.max(0, this[k] - dt);
    if (this.hero === "gunner" && this.charges < 3) {
      this.chargeTimer += dt;
      if (this.chargeTimer >= 3 * this.haste) {
        this.charges++;
        this.chargeTimer = 0;
      }
    }
    this.p.stamina = Math.min(100, this.p.stamina + 28 * dt);
    this.p.x = clamp(this.p.x + this.move.x * this.p.speed * dt, 20, W - 20);
    this.p.y = clamp(this.p.y + this.move.y * this.p.speed * dt, 20, H - 20);
    if (this.move.x || this.move.y) this.facing = { ...this.move };
    this.history.push({
      t: this.elapsed,
      x: this.p.x,
      y: this.p.y,
      hp: this.p.hp,
    });
    while (this.history.length && this.history[0].t < this.elapsed - 2.1)
      this.history.shift();
    const encounter = waves[this.wave - 1];
    if (!this.bossSpawned) {
      if (this.wave === 8) this.spawn(4);
      for (let i = 0; i < encounter.elites; i++) this.spawn(3);
      this.bossSpawned = true;
      if (this.wave >= 4) {
        this.msg(this.wave === 8 ? "裂隙领主降临" : "精英：深渊守卫");
        this.sound?.("warning");
      }
    }
    if (this.time < 15 && !this.reinforcements) {
      this.reinforcements = true;
      this.msg("末段怪潮 · 保持移动");
      if (this.wave === 8) this.spawn(3);
      this.sound?.("warning");
    }
    this.spawnTimer -= dt;
    if (
      (this.time > 0 || this.wave === 8) &&
      this.spawnTimer <= 0 &&
      this.enemies.length < 300
    ) {
      const group = this.time < 15 && this.wave >= 5 ? 2 : 1;
      for (let i = 0; i < group && this.enemies.length < 300; i++) this.spawn();
      this.spawnTimer = encounter.spawn * (this.time < 15 ? 0.8 : 1);
    }
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.attack();
      this.attackTimer = Math.max(
        0.08,
        this.p.interval * (this.echo > 0 ? 0.5 : 1),
      );
    }
    this.tickHeroSystems(dt);
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue;
      e.stun = Math.max(0, e.stun - dt);
      if (e.stun > 0) continue;
      const dx = this.p.x - e.x,
        dy = this.p.y - e.y,
        dist = Math.hypot(dx, dy) || 1;
      let speed = balance.baseEnemySpeed[e.type] * encounter.speed;
      if (e.type === 2 && dist < 260) speed = dist < 180 ? -35 : 0;
      if (this.zones.some((z) => Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r))
        speed *= 0.45;
      e.x = clamp(e.x + (dx / dist) * speed * dt, e.r + 12, W - e.r - 12);
      e.y = clamp(e.y + (dy / dist) * speed * dt, e.r + 12, H - e.r - 12);
      e.cool -= dt;
      if (e.type === 2 && e.cool <= 0) {
        this.projectile(
          e.x,
          e.y,
          dx / dist,
          dy / dist,
          11 + this.wave * 1.4,
          200 + this.wave * 10,
          true,
        );
        e.cool = Math.max(1.4, 2.8 - this.wave * 0.14);
      }
      if (e.type >= 3 && e.cool <= 0) {
        this.dangers.push({
          x: this.p.x,
          y: this.p.y,
          r: e.type === 4 ? 100 : 70,
          ttl: e.type === 4 && e.hp < e.maxHp / 2 ? 0.85 : 1.1,
          damage: e.type === 4 ? 38 : 26,
        });
        if (e.type === 4) {
          const spokes = e.hp < e.maxHp / 2 ? 18 : 12;
          for (let i = 0; i < spokes; i++) {
            const a = (i * Math.PI * 2) / spokes;
            this.projectile(e.x, e.y, Math.cos(a), Math.sin(a), 24, 210, true);
          }
        }
        e.cool = e.hp < e.maxHp / 2 ? 1.8 : 3.2;
      }
      if (dist < e.r + 16)
        this.hurt(
          (e.type >= 3 ? 25 : e.type === 1 ? 11 : 9) * (1 + this.wave * 0.13),
        );
    }
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.ttl -= dt;
      if (s.hostile) {
        if (Math.hypot(s.x - this.p.x, s.y - this.p.y) < 21) {
          this.hurt(s.damage);
          s.ttl = 0;
        }
      } else {
        for (const e of this.enemies)
          if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r + 5) {
            this.hit(e, s.damage);
            s.ttl = 0;
            break;
          }
      }
    }
    this.shots = this.shots.filter(
      (s) =>
        s.ttl > 0 && s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20,
    );
    for (const d of this.dangers) {
      d.ttl -= dt;
      if (d.ttl <= 0) {
        this.effect(d.x, d.y, d.r, 0xef6751, 0.45, undefined, "impact");
        this.sound?.("enemy-impact", { x: d.x, y: d.y });
        if (Math.hypot(this.p.x - d.x, this.p.y - d.y) < d.r + 16)
          this.hurt(d.damage);
      }
    }
    this.dangers = this.dangers.filter((d) => d.ttl > 0);
    for (const g of this.gems) {
      const dx = this.p.x - g.x,
        dy = this.p.y - g.y,
        dist = Math.hypot(dx, dy);
      if (dist < this.p.pickup) {
        g.x += dx * dt * 9;
        g.y += dy * dt * 9;
      }
      if (dist < 22) {
        this.xp += g.value;
        g.value = 0;
      }
    }
    this.gems = this.gems.filter((g) => g.value > 0);
    for (const f of this.fx) f.ttl -= dt;
    const activeFx = this.fx.filter((f) => f.ttl > 0);
    const importantFx = activeFx
      .filter((f) => !f.text && f.kind !== "hit" && f.kind !== "muzzle")
      .slice(-24);
    const accents = activeFx
      .filter((f) => f.text || f.kind === "hit" || f.kind === "muzzle")
      .slice(-(180 - importantFx.length));
    this.fx = [...importantFx, ...accents];
    if (this.phase !== "battle") return;
    if (this.p.hp <= 0) {
      this.phase = "lost";
      this.msg("火种熄灭");
      return;
    }
    if (
      this.wave === 8 &&
      this.bossSpawned &&
      !this.enemies.some((e) => e.type === 4)
    ) {
      this.phase = "won";
      this.msg("裂隙已封印");
      return;
    }
    if (this.time <= 0 && this.wave !== 8) {
      this.xp += this.gems.reduce((a, g) => a + g.value, 0);
      this.gems = [];
      this.enemies = [];
      this.shots = [];
      this.dangers = [];
      this.zones = [];
      this.turrets = [];
      this.pendingShop = true;
    }
    if (this.xp >= this.nextXp) this.openUpgrade();
    else if (this.pendingShop) this.openShop();
  }
  spawn(type?: number) {
    const side = Math.floor(this.rng.next() * 4),
      pos = this.rng.next();
    const encounter = waves[this.wave - 1];
    const roll = this.rng.next();
    type ??=
      roll < encounter.archers
        ? 2
        : roll < encounter.archers + encounter.runners
          ? 1
          : 0;
    const hp = Math.round(balance.baseEnemyHp[type] * encounter.health);
    const radius = type === 4 ? 45 : type === 3 ? 30 : 15;
    const margin = radius + 12;
    const e: Enemy = {
      id: this.id++,
      x:
        side === 0
          ? margin
          : side === 1
            ? W - margin
            : clamp(pos * W, margin, W - margin),
      y:
        side === 2
          ? margin
          : side === 3
            ? H - margin
            : clamp(pos * H, margin, H - margin),
      r: radius,
      hp,
      maxHp: hp,
      type,
      cool: 2,
      stun: 0,
    };
    this.enemies.push(e);
    return e;
  }
  projectile(
    x: number,
    y: number,
    dx: number,
    dy: number,
    damage: number,
    speed: number,
    hostile = false,
    color?: number,
  ) {
    if (this.shots.length >= 600) return;
    this.shots.push({
      id: this.id++,
      x,
      y,
      vx: dx * speed,
      vy: dy * speed,
      damage,
      hostile,
      color,
      ttl: 3,
    });
  }
  attack() {
    const list = this.enemies
      .filter(
        (e) =>
          e.hp > 0 && Math.hypot(e.x - this.p.x, e.y - this.p.y) < this.p.range,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.p.x, a.y - this.p.y) -
          Math.hypot(b.x - this.p.x, b.y - this.p.y),
      );
    if (!list.length) return;
    if (this.hero === "knight" && this.p.stamina < 8) return;
    const e = list[0],
      angle = Math.atan2(e.y - this.p.y, e.x - this.p.x);
    this.facing = { x: Math.cos(angle), y: Math.sin(angle) };
    const moving = !!(this.move.x || this.move.y),
      crit =
        this.rollCrit ||
        this.rng.next() <
          this.p.crit +
            (this.hero === "gunner" && moving
              ? 0.1 + (this.special.has("flow") ? 0.15 : 0)
              : 0);
    const dmg =
      this.p.damage *
      (crit ? 2 : 1) *
      (this.hero === "reaper" && this.special.has("edge") && this.blood >= 60
        ? 1.3
        : 1);
    this.rollCrit = false;
    if (this.hero === "frost") {
      let previous = { x: this.p.x, y: this.p.y };
      const targets = [e];
      while (targets.length < (this.special.has("shatter") ? 5 : 3)) {
        const last = targets[targets.length - 1];
        const next = this.enemies
          .filter(
            (t) =>
              t.hp > 0 &&
              !targets.includes(t) &&
              Math.hypot(t.x - last.x, t.y - last.y) < 170,
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - last.x, a.y - last.y) -
              Math.hypot(b.x - last.x, b.y - last.y),
          )[0];
        if (!next) break;
        targets.push(next);
      }
      for (const [i, target] of targets.entries()) {
        this.effect(
          previous.x,
          previous.y,
          20,
          heroes.frost.color,
          0.28,
          undefined,
          "chain",
        );
        Object.assign(this.fx[this.fx.length - 1], {
          endX: target.x,
          endY: target.y,
        });
        this.hit(target, dmg * Math.pow(0.8, i));
        target.stun = Math.max(target.stun, 0.2);
        previous = { x: target.x, y: target.y };
      }
      this.sound?.("attack:" + this.hero, { x: this.p.x, y: this.p.y });
      return;
    }
    if (this.hero === "gunner" || this.hero === "engineer") {
      this.effect(
        this.p.x,
        this.p.y,
        28,
        heroes[this.hero].color,
        0.13,
        undefined,
        "muzzle",
        angle,
      );
      for (const offset of this.hero === "gunner" ? [-5, 5] : [0])
        this.projectile(
          this.p.x - Math.sin(angle) * offset,
          this.p.y + Math.cos(angle) * offset,
          Math.cos(angle),
          Math.sin(angle),
          dmg * (this.hero === "gunner" ? 0.55 : 1),
          550,
          false,
          heroes[this.hero].color,
        );
    } else {
      if (this.hero === "knight") this.p.stamina -= 8;
      for (const target of list) {
        const a = Math.atan2(target.y - this.p.y, target.x - this.p.x);
        if (Math.cos(a - angle) > 0.4) this.hit(target, dmg);
      }
      this.effect(
        this.p.x + this.facing.x * 35,
        this.p.y + this.facing.y * 35,
        65,
        heroes[this.hero].color,
        0.18,
        undefined,
        "slash",
        angle,
      );
      if (this.hero === "reaper") this.blood = Math.min(100, this.blood + 16);
      this.hitCount++;
      if (this.special.has("ember") && this.hitCount % 3 === 0)
        this.aoe(this.p.x, this.p.y, 140, this.p.damage * 1.4, 0xea754d);
    }
    this.sound?.("attack:" + this.hero, { x: this.p.x, y: this.p.y });
  }
  hit(e: Enemy, dmg: number) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    this.sound?.("hit:" + (e.type >= 3 ? "metal" : "flesh"), {
      x: e.x,
      y: e.y,
    });
    this.effect(
      e.x,
      e.y,
      18,
      heroes[this.hero].color,
      0.2,
      undefined,
      "hit",
      Math.atan2(e.y - this.p.y, e.x - this.p.x),
    );
    this.effect(e.x, e.y - 20, 1, 0xf2d7a3, 0.6, String(Math.round(dmg)));
    const dx = e.x - this.p.x,
      dy = e.y - this.p.y,
      d = Math.hypot(dx, dy) || 1;
    e.x = clamp(e.x + (dx / d) * 5, e.r + 12, W - e.r - 12);
    e.y = clamp(e.y + (dy / d) * 5, e.r + 12, H - e.r - 12);
    if (e.hp <= 0) {
      this.kills++;
      if (this.hero === "reaper") this.blood = Math.min(100, this.blood + 10);
      this.coins += e.type >= 3 ? 30 : 1;
      this.gems.push({
        id: this.id++,
        x: e.x,
        y: e.y,
        value: e.type >= 3 ? 18 : 3,
      });
      this.effect(e.x, e.y, e.r + 10, 0x8da778, 0.22, undefined, "hit");
      if (this.inventory.leech)
        this.p.hp = Math.min(
          this.p.maxHp,
          this.p.hp + Math.min(1.4, this.inventory.leech * 0.35),
        );
      this.enemies = this.enemies.filter((x) => x.id !== e.id);
      this.sound?.("kill", { x: e.x, y: e.y });
    }
  }
  hurt(amount: number) {
    if (this.invuln > 0 || this.phase !== "battle") return;
    if (this.parry > 0) {
      this.parry = 0;
      this.invuln = 0.6;
      this.aoe(
        this.p.x,
        this.p.y,
        this.special.has("execution") ? 220 : 145,
        this.p.damage * (this.special.has("execution") ? 7 : 5),
        0xf7d488,
        "parry",
      );
      this.msg("弹反成功 · 处决");
      this.sound?.("parry");
      return;
    }
    this.p.hp = Math.max(0, this.p.hp - damageAfterArmor(amount, this.p.armor));
    this.invuln = 0.6;
    this.effect(this.p.x, this.p.y, 28, 0xe65f54, 0.25, undefined, "hit");
    this.sound?.("hurt");
  }
  aoe(
    x: number,
    y: number,
    r: number,
    damage: number,
    color: number = heroes[this.hero].color,
    kind: FxKind = "burst",
  ) {
    this.effect(
      x,
      y,
      r,
      color,
      kind === "pulse" || kind === "storm" ? 0.95 : 0.5,
      undefined,
      kind,
    );
    for (const e of [...this.enemies])
      if (Math.hypot(x - e.x, y - e.y) < r + e.r) {
        this.hit(e, damage);
        e.stun = 0.5;
      }
  }
  effect(
    x: number,
    y: number,
    r: number,
    color: number,
    ttl: number,
    text?: string,
    kind: FxKind = "ring",
    angle = 0,
  ) {
    this.fx.push({ x, y, r, color, ttl, max: ttl, text, kind, angle });
  }
  action(action: Action) {
    if (this.phase !== "battle") return false;
    if (this.hero !== "gunner" && this.hero !== "knight")
      return this.newHeroAction(action);
    if (action === "core") {
      if (this.hero === "gunner") {
        if (this.charges <= 0) return false;
        this.charges--;
        this.invuln = 0.25;
      } else {
        const cost = this.special.has("roll") ? 15 : 25;
        if (this.coreCd > 0 || this.p.stamina < cost) return false;
        this.p.stamina -= cost;
        this.coreCd = 0.65 * this.haste;
        this.invuln = 0.4;
        this.rollCrit = true;
      }
      const x = this.p.x,
        y = this.p.y,
        dir = this.move.x || this.move.y ? this.move : this.facing,
        dist = this.hero === "gunner" ? 115 : 95;
      this.p.x = clamp(x + dir.x * dist, 20, W - 20);
      this.p.y = clamp(y + dir.y * dist, 20, H - 20);
      this.effect(
        x,
        y,
        25,
        heroes[this.hero].color,
        0.35,
        undefined,
        "dash",
        Math.atan2(dir.y, dir.x),
      );
      Object.assign(this.fx[this.fx.length - 1], {
        endX: this.p.x,
        endY: this.p.y,
      });
      if (this.special.has("trail")) {
        for (let i = 0; i < 5; i++)
          this.aoe(
            x + ((this.p.x - x) * i) / 4,
            y + ((this.p.y - y) * i) / 4,
            35,
            this.p.damage * 0.6,
          );
      }
    } else if (action === "skill") {
      if (this.skillCd > 0) return false;
      if (this.hero === "gunner") {
        this.skillCd = 12 * this.haste;
        const past = this.history[0];
        if (past) {
          this.p.x = past.x;
          this.p.y = past.y;
          this.p.hp = Math.min(this.p.maxHp, Math.max(this.p.hp, past.hp));
        }
        this.invuln = 0.5;
        if (this.special.has("echo")) this.echo = 5;
        this.effect(this.p.x, this.p.y, 85, 0x65c9bf, 0.9, undefined, "recall");
        this.msg("时间回溯");
      } else {
        this.skillCd = 4 * this.haste;
        this.parry = 0.35;
        this.effect(
          this.p.x,
          this.p.y,
          65,
          0xf7d488,
          0.35,
          undefined,
          "shield",
        );
      }
    } else {
      if (this.ultCd > 0) return false;
      this.ultCd = (this.hero === "gunner" ? 20 : 18) * this.haste;
      this.aoe(
        this.p.x,
        this.p.y,
        this.hero === "gunner" ? 240 : 200,
        this.p.damage * 9,
        heroes[this.hero].color,
        this.hero === "gunner" ? "pulse" : "storm",
      );
      this.invuln = 1;
      this.msg(heroes[this.hero].ultimate);
    }
    this.sound?.(action + ":" + this.hero);
    return true;
  }

  addZone(x: number, y: number) {
    this.zones.push({
      x,
      y,
      r: this.special.has("permafrost") ? 145 : 120,
      ttl: this.special.has("permafrost") ? 9 : 6,
      tick: 0,
    });
    this.zones = this.zones.slice(-3);
  }
  addTurret(x: number, y: number, ttl = 14) {
    this.turrets.push({
      id: this.id++,
      x: clamp(x, 30, W - 30),
      y: clamp(y, 30, H - 30),
      ttl,
      cool: 0,
      angle: 0,
    });
    this.turrets = this.turrets.slice(-(this.special.has("assembly") ? 4 : 3));
    this.effect(x, y, 38, heroes.engineer.color, 0.5, undefined, "gear");
  }
  tickHeroSystems(dt: number) {
    for (const z of this.zones) {
      z.ttl -= dt;
      z.tick -= dt;
      if (z.ttl > 0 && z.tick <= 0) {
        z.tick = 0.65;
        for (const e of [...this.enemies])
          if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r)
            this.hit(e, this.p.damage * 0.55);
      }
    }
    this.zones = this.zones.filter((z) => z.ttl > 0);
    for (const t of this.turrets) {
      t.ttl -= dt;
      t.cool -= dt;
      if (t.ttl <= 0 || t.cool > 0) continue;
      const e = this.enemies
        .filter((e) => e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) < 420)
        .sort(
          (a, b) =>
            Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y),
        )[0];
      if (!e) continue;
      t.angle = Math.atan2(e.y - t.y, e.x - t.x);
      this.projectile(
        t.x,
        t.y,
        Math.cos(t.angle),
        Math.sin(t.angle),
        this.p.damage * 0.75,
        450,
        false,
        0xfbd17c,
      );
      this.effect(t.x, t.y, 18, 0xfbd17c, 0.12, undefined, "muzzle", t.angle);
      this.sound?.("turret", { x: t.x, y: t.y });
      t.cool =
        0.8 *
        (this.special.has("gears") ? 0.75 : 1) *
        (this.overload > 0 ? 0.45 : 1);
    }
    this.turrets = this.turrets.filter((t) => t.ttl > 0);
  }
  newHeroAction(action: Action) {
    const color = heroes[this.hero].color;
    if (action === "core") {
      if (this.coreCd > 0) return false;
      this.coreCd = (this.hero === "reaper" ? 2.2 : 3) * this.haste;
      const x = this.p.x,
        y = this.p.y,
        dir = this.move.x || this.move.y ? this.move : this.facing;
      const turret =
        this.hero === "engineer"
          ? this.turrets[this.turrets.length - 1]
          : undefined;
      if (turret) {
        this.p.x = turret.x;
        this.p.y = turret.y;
        turret.x = x;
        turret.y = y;
      } else {
        const dist = this.hero === "reaper" ? 140 : 110;
        this.p.x = clamp(x + dir.x * dist, 20, W - 20);
        this.p.y = clamp(y + dir.y * dist, 20, H - 20);
      }
      this.invuln = 0.3;
      this.effect(
        x,
        y,
        25,
        color,
        0.4,
        undefined,
        "dash",
        Math.atan2(this.p.y - y, this.p.x - x),
      );
      Object.assign(this.fx[this.fx.length - 1], {
        endX: this.p.x,
        endY: this.p.y,
      });
      if (this.hero === "frost") {
        this.aoe(this.p.x, this.p.y, 80, this.p.damage, color, "ice");
        if (this.special.has("icewalk")) this.addZone(this.p.x, this.p.y);
      }
      if (this.hero === "reaper") {
        const dx = this.p.x - x,
          dy = this.p.y - y,
          len = dx * dx + dy * dy;
        for (const e of [...this.enemies]) {
          const t = len
            ? clamp(((e.x - x) * dx + (e.y - y) * dy) / len, 0, 1)
            : 0;
          if (Math.hypot(e.x - x - dx * t, e.y - y - dy * t) < 35 + e.r)
            this.hit(e, this.p.damage * 1.8);
        }
      }
    } else if (action === "skill") {
      if (this.skillCd > 0) return false;
      if (this.hero === "frost") {
        this.skillCd = 8 * this.haste;
        const target = this.enemies
          .filter((e) => e.hp > 0)
          .sort(
            (a, b) =>
              Math.hypot(a.x - this.p.x, a.y - this.p.y) -
              Math.hypot(b.x - this.p.x, b.y - this.p.y),
          )[0];
        const within =
          target && Math.hypot(target.x - this.p.x, target.y - this.p.y) < 450;
        this.addZone(
          within ? target.x : this.p.x,
          within ? target.y : this.p.y,
        );
      } else if (this.hero === "engineer") {
        this.skillCd = 4 * this.haste;
        this.addTurret(this.p.x, this.p.y);
        if (this.special.has("repair"))
          this.p.hp = Math.min(this.p.maxHp, this.p.hp + 8);
      } else {
        this.skillCd = 7 * this.haste;
        const hits = this.enemies.filter(
          (e) => Math.hypot(e.x - this.p.x, e.y - this.p.y) < 135 + e.r,
        ).length;
        this.aoe(this.p.x, this.p.y, 135, this.p.damage * 2.4, color, "blood");
        this.p.hp = Math.min(
          this.p.maxHp,
          this.p.hp +
            Math.min(24, hits * 4) * (this.special.has("thirst") ? 1.5 : 1),
        );
      }
    } else {
      if (this.ultCd > 0) return false;
      if (
        this.hero === "reaper" &&
        this.blood < (this.special.has("harvest") ? 40 : 60)
      ) {
        this.msg("血能不足 · 命中敌人积累血能");
        return false;
      }
      this.ultCd =
        (this.hero === "engineer" ? 22 : this.hero === "frost" ? 20 : 16) *
        this.haste;
      if (this.hero === "frost") {
        this.aoe(this.p.x, this.p.y, 300, this.p.damage * 6, color, "ice");
        for (const e of this.enemies)
          if (Math.hypot(e.x - this.p.x, e.y - this.p.y) < 300 + e.r)
            e.stun = Math.max(e.stun, 2.5);
      } else if (this.hero === "engineer") {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          this.addTurret(
            this.p.x + Math.cos(a) * 65,
            this.p.y + Math.sin(a) * 65,
            12,
          );
        }
        this.overload = 7;
        for (const t of this.turrets) t.cool = 0;
        this.effect(this.p.x, this.p.y, 150, color, 0.9, undefined, "gear");
      } else {
        const stored = this.blood;
        this.blood = 0;
        const hits = this.enemies.filter(
          (e) => Math.hypot(e.x - this.p.x, e.y - this.p.y) < 190 + e.r,
        ).length;
        this.aoe(
          this.p.x,
          this.p.y,
          190,
          this.p.damage * (5 + stored / 20),
          color,
          "blood",
        );
        this.p.hp = Math.min(this.p.maxHp, this.p.hp + Math.min(40, hits * 6));
      }
      this.invuln = 0.6;
      this.msg(heroes[this.hero].ultimate);
    }
    this.sound?.(action + ":" + this.hero);
    return true;
  }
  openUpgrade() {
    this.phase = "upgrade";
    this.setMove(0, 0);
    this.choices = this.shuffle([
      ...upgrades,
      ...specials[this.hero].filter((s) => !this.special.has(s.id)),
    ]).slice(0, 3);
  }
  shuffle<T>(items: T[]) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  choose(id: string) {
    if (this.phase !== "upgrade" || !this.choices.some((c) => c.id === id))
      return false;
    this.xp -= this.nextXp;
    this.level++;
    this.nextXp = 12 + this.level * 9;
    switch (id) {
      case "damage":
        this.p.damage *= 1.14;
        break;
      case "attack":
        this.p.interval = Math.max(0.1, this.p.interval * 0.9);
        break;
      case "health":
        this.p.maxHp += 25;
        this.p.hp = Math.min(this.p.maxHp, this.p.hp + 25);
        break;
      case "speed":
        this.p.speed = Math.min(360, this.p.speed * 1.12);
        break;
      case "pickup":
        this.p.pickup += 35;
        break;
      case "crit":
        this.p.crit = Math.min(0.8, this.p.crit + 0.1);
        break;
      case "armor":
        this.p.armor = Math.min(balance.maxArmor, this.p.armor + 2);
        break;
      case "haste":
        this.haste = Math.max(0.4, this.haste * 0.88);
        break;
      default:
        this.special.add(id);
        if (id === "flow") this.p.speed = Math.min(360, this.p.speed * 1.08);
    }
    this.inventory[id] = (this.inventory[id] || 0) + 1;
    this.msg("获得强化");
    this.sound?.("buy");
    this.phase = "battle";
    if (this.xp >= this.nextXp) this.openUpgrade();
    else if (this.pendingShop) this.openShop();
    return true;
  }
  openShop() {
    this.phase = "shop";
    this.setMove(0, 0);
    this.shop = this.shuffle(relics).slice(0, 3);
    this.bought.clear();
  }
  buy(index: number) {
    const r = this.shop[index];
    if (
      this.phase !== "shop" ||
      !r ||
      this.bought.has(index) ||
      this.coins < r.price
    )
      return false;
    this.coins -= r.price;
    this.bought.add(index);
    this.inventory[r.id] = (this.inventory[r.id] || 0) + 1;
    switch (r.id) {
      case "stone":
        this.p.damage *= 1.12;
        break;
      case "feather":
        this.p.interval = Math.max(0.1, this.p.interval * 0.9);
        break;
      case "ruby":
        this.p.maxHp += 20;
        this.p.hp = Math.min(this.p.maxHp, this.p.hp + 20);
        break;
      case "wall":
        this.p.armor = Math.min(balance.maxArmor, this.p.armor + 3);
        break;
      case "magnet":
        this.p.pickup += 50;
        break;
    }
    this.sound?.("buy");
    return true;
  }
  heal() {
    if (
      this.phase !== "shop" ||
      this.healed ||
      this.coins < balance.healPrice ||
      this.p.hp >= this.p.maxHp
    )
      return false;
    this.coins -= balance.healPrice;
    this.healed = true;
    this.p.hp = Math.min(
      this.p.maxHp,
      this.p.hp + this.p.maxHp * balance.healFraction,
    );
    return true;
  }
  reroll() {
    if (this.phase !== "shop" || this.coins < 8 + this.rerolls * 4)
      return false;
    this.coins -= 8 + this.rerolls * 4;
    this.rerolls++;
    this.openShop();
    return true;
  }
  nextWave() {
    if (this.phase !== "shop") return;
    this.wave++;
    this.reinforcements = false;
    this.healed = false;
    this.rerolls = 0;
    this.time = 45;
    this.pendingShop = false;
    this.bossSpawned = false;
    this.phase = "battle";
    this.spawnTimer = 0.7;
    this.invuln = 1;
    this.msg("第 " + this.wave + " 波");
  }
}
