import {
  Simulation,
  W,
  H,
  damageAfterArmor,
  type Enemy,
  type Shot,
  type Action,
} from "./simulation";
import { type HeroId } from "./content";
import {
  weapons,
  weaponById,
  items,
  buildHeroes,
  buildWaves,
  waveSeconds,
  attributeChoices,
  type Stat,
  type Family,
} from "./build-content";
export type OwnedWeapon = {
  uid: number;
  id: string;
  tier: number;
  cool: number;
  angle: number;
  paid: number;
  fired: number;
};
export type Offer = {
  uid: number;
  kind: "weapon" | "item";
  id: string;
  tier: number;
  price: number;
  locked: boolean;
};
type Bullet = {
  volley?: { used: boolean };
  weapon: OwnedWeapon;
  seen: Set<number>;
  pierce: number;
  crit: boolean;
  age: number;
  returning: boolean;
  triggered: boolean;
  turret: boolean;
};
const tiers = [1, 1.55, 2.25, 3.2];
export class BuildSimulation extends Simulation {
  weapons: OwnedWeapon[] = [];
  offers: (Offer | null)[] = [];
  stats: Record<Stat, number> = {
    damage: 0,
    attack: 0,
    melee: 0,
    ranged: 0,
    elemental: 0,
    engineering: 0,
    crit: 5,
    armor: 0,
    dodge: 0,
    regen: 0.15,
    lifesteal: 0,
    harvest: 0,
    luck: 0,
    pickup: 0,
    speed: 0,
    maxHp: 0,
  };
  bullets = new Map<number, Bullet>();
  turretWeapons = new Map<number, OwnedWeapon>();
  wallTimers = new Map<number, number>();
  shield = 0;
  stationary = 0;
  coldTimer = 0;
  stealTimer = 0;
  constructor(hero: HeroId = "gunner", seed = Date.now(), starter?: string) {
    super(hero, seed);
    if (!buildHeroes[hero]) throw new Error("Unknown build hero");
    // Normalize survivability: role bonuses are explicit instead of inherited skill-era balance.
    this.p.maxHp = 80;
    this.p.hp = 80;
    this.p.speed = 205;
    this.modify(buildHeroes[hero].stats);
    this.addWeapon(
      starter && buildHeroes[hero].start.includes(starter)
        ? starter
        : buildHeroes[hero].start[0],
      1,
      0,
    );
    this.time = waveSeconds(1);
    this.msg("拾取材料，波间购入武器与道具");
  }
  get finalWave() {
    return 12;
  }
  get encounter() {
    return buildWaves[this.wave - 1];
  }
  families() {
    const result: Record<Family, number> = {
      blade: 0,
      gun: 0,
      heavy: 0,
      element: 0,
      device: 0,
    };
    for (const w of this.weapons) result[weaponById[w.id].family]++;
    return result;
  }
  value(key: Stat) {
    const f = this.families();
    return (
      this.stats[key] +
      (key === "crit"
        ? Math.floor(f.gun / 2) * 4
        : key === "dodge"
          ? Math.floor(f.blade / 2) * 3
          : key === "armor"
            ? Math.floor(f.heavy / 2)
            : key === "elemental"
              ? Math.floor(f.element / 2) * 2
              : key === "engineering"
                ? Math.floor(f.device / 2) * 3
                : 0)
    );
  }
  weaponDamage(w: Pick<OwnedWeapon, "id" | "tier">) {
    const d = weaponById[w.id];
    return Math.max(
      1,
      (d.damage * tiers[w.tier - 1] + this.value(d.group) * d.scale) *
        buildHeroes[this.hero].scale[d.group] *
        Math.max(0.1, 1 + this.stats.damage / 100),
    );
  }
  weaponInterval(w: Pick<OwnedWeapon, "id" | "tier">) {
    const d = weaponById[w.id];
    return Math.max(
      0.09,
      (d.interval * (1 - (w.tier - 1) * 0.05)) /
        (d.mode === "turret" ? 1 : Math.max(0.25, 1 + this.stats.attack / 100)),
    );
  }
  modify(mods: Partial<Record<Stat, number>>) {
    for (const [key, amount] of Object.entries(mods)) {
      this.stats[key as Stat] += amount!;
      if (key === "maxHp") {
        const old = this.p.maxHp;
        this.p.maxHp = Math.max(10, 80 + this.stats.maxHp);
        this.p.hp = Math.min(
          this.p.maxHp,
          this.p.hp + Math.max(0, this.p.maxHp - old),
        );
      }
    }
    this.p.speed = 205 * Math.max(0.45, 1 + this.stats.speed / 100);
    this.p.pickup = 75 + this.stats.pickup;
  }
  addWeapon(id: string, tier = 1, paid = weaponById[id]?.price ?? 0) {
    if (!weaponById[id] || tier < 1 || tier > 4 || this.weapons.length >= 6)
      return false;
    this.weapons.push({
      uid: this.id++,
      id,
      tier,
      cool: 0.1,
      angle: 0,
      paid,
      fired: 0,
    });
    return true;
  }
  action(_a: Action) {
    return false;
  }
  attack() {} // Each owned weapon has its own clock below.
  collectUnclaimed(value: number) {
    this.xp += value;
    this.coins += Math.floor(value * 0.8);
  }
  collectMaterial(value: number) {
    this.xp += value;
    this.coins += value;
  }
  recover(amount: number) {
    const excess = Math.max(0, this.p.hp + amount - this.p.maxHp);
    this.p.hp = Math.min(this.p.maxHp, this.p.hp + amount);
    if (this.inventory.overheal)
      this.shield = Math.min(25, this.shield + excess);
  }
  step(dt: number) {
    if (this.phase !== "battle") return;
    const wasPending = this.pendingShop;
    this.p.armor = this.value("armor");
    this.p.crit = Math.min(0.8, this.value("crit") / 100);
    this.stationary = this.move.x || this.move.y ? 0 : this.stationary + dt;
    this.coldTimer = Math.max(0, this.coldTimer - dt);
    this.stealTimer = Math.max(0, this.stealTimer - dt);
    this.recover(Math.max(0, this.stats.regen) * dt);
    for (const s of this.shots) {
      const b = this.bullets.get(s.id);
      if (!b) continue;
      b.age += dt;
      if (b.weapon.id === "boomerang" && b.age > 0.45) {
        if (!b.returning) {
          b.returning = true;
          b.seen.clear();
          b.pierce = 3;
        }
        const a = Math.atan2(this.p.y - s.y, this.p.x - s.x);
        s.vx = Math.cos(a) * 450;
        s.vy = Math.sin(a) * 450;
        if (Math.hypot(this.p.x - s.x, this.p.y - s.y) < 20) s.ttl = 0;
      }
    }
    super.step(dt);
    const ids = new Set(this.shots.map((s) => s.id));
    for (const id of this.bullets.keys())
      if (!ids.has(id)) this.bullets.delete(id);
    const enemyIds = new Set(this.enemies.map((e) => e.id));
    for (const id of this.wallTimers.keys())
      if (!enemyIds.has(id)) this.wallTimers.delete(id);
    if (!wasPending && this.pendingShop) {
      this.coins += 15 + Math.max(0, this.stats.harvest);
      this.recover(this.p.maxHp * 0.12);
      this.msg("波次完成 · 剩余材料按80%结算，恢复12%生命");
    }
  }
  tickHeroSystems(dt: number) {
    for (const w of this.weapons) {
      w.cool -= dt;
      if (w.cool > 0) continue;
      const d = weaponById[w.id];
      if (d.mode === "turret") {
        this.deploy(w);
        w.cool = this.weaponInterval(w);
        continue;
      }
      const target = this.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            Math.hypot(e.x - this.p.x, e.y - this.p.y) <= d.range + e.r,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - this.p.x, a.y - this.p.y) -
            Math.hypot(b.x - this.p.x, b.y - this.p.y),
        )[0];
      if (!target) continue;
      w.angle = Math.atan2(target.y - this.p.y, target.x - this.p.x);
      w.cool = this.weaponInterval(w);
      w.fired++;
      const critical = this.rng.next() < this.p.crit,
        damage = this.weaponDamage(w) * (critical ? 2 : 1);
      this.sound?.(
        "attack:" +
          (d.group === "melee"
            ? "knight"
            : d.group === "elemental"
              ? "frost"
              : "gunner"),
        { x: this.p.x, y: this.p.y },
      );
      if (d.mode === "melee") {
        this.effect(
          this.p.x,
          this.p.y,
          d.range,
          d.color,
          0.22,
          undefined,
          d.id === "dagger" || d.id === "spear"
            ? "thrust"
            : d.id === "hammer"
              ? "quake"
              : d.id === "scythe"
                ? "blood"
                : "slash",
          w.angle,
        );
        const targets =
          d.id === "dagger"
            ? [target]
            : this.enemies.filter((e) => {
                const a = Math.atan2(e.y - this.p.y, e.x - this.p.x) - w.angle;
                return (
                  Math.hypot(e.x - this.p.x, e.y - this.p.y) < d.range + e.r &&
                  Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <
                    (d.id === "spear" ? 0.3 : 1.3)
                );
              });
        targets.forEach((e, i) => this.strike(e, damage, w, critical, i === 0));
      } else {
        const volley = { used: false };
        for (let i = 0; i < (d.pellets ?? 1); i++) {
          const angle = w.angle + (i - ((d.pellets ?? 1) - 1) / 2) * 0.12;
          this.fire(
            w,
            this.p.x,
            this.p.y,
            angle,
            damage,
            critical,
            false,
            volley,
          );
        }
      }
    }
    for (const z of this.zones) {
      z.ttl -= dt;
      z.tick -= dt;
      if (z.tick <= 0) {
        for (const e of [...this.enemies])
          if (Math.hypot(e.x - z.x, e.y - z.y) < z.r)
            this.secondary(e, 2 + this.stats.elemental);
        z.tick = 0.5;
      }
    }
    this.zones = this.zones.filter((z) => z.ttl > 0);
    for (const t of this.turrets) {
      t.ttl -= dt;
      t.cool -= dt;
      if (t.cool > 0) continue;
      const w = this.turretWeapons.get(t.id);
      if (!w) continue;
      const target = this.enemies
        .filter((e) => Math.hypot(e.x - t.x, e.y - t.y) < 480)
        .sort(
          (a, b) =>
            Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y),
        )[0];
      if (!target) continue;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      t.cool = 0.7;
      this.fire(
        w,
        t.x,
        t.y,
        t.angle,
        this.weaponDamage(w) *
          (this.inventory.siege && this.stationary >= 0.8 ? 1.6 : 1),
        false,
        true,
      );
      this.sound?.("turret", { x: t.x, y: t.y });
    }
    this.turrets = this.turrets.filter((t) => t.ttl > 0);
    const ids = new Set(this.turrets.map((t) => t.id));
    for (const id of this.turretWeapons.keys())
      if (!ids.has(id)) this.turretWeapons.delete(id);
  }
  deploy(w: OwnedWeapon) {
    const previous = this.turrets.filter(
      (t) => this.turretWeapons.get(t.id)?.uid === w.uid,
    );
    if (previous.length >= 2) {
      const id = previous[0].id;
      this.turrets = this.turrets.filter((t) => t.id !== id);
      this.turretWeapons.delete(id);
    }
    const t = {
      id: this.id++,
      x: this.p.x,
      y: this.p.y,
      ttl: 8,
      cool: 0,
      angle: 0,
    };
    this.turrets.push(t);
    this.turretWeapons.set(t.id, w);
    this.effect(t.x, t.y, 55, weaponById[w.id].color, 0.5, undefined, "gear");
  }
  fire(
    w: OwnedWeapon,
    x: number,
    y: number,
    angle: number,
    damage: number,
    crit: boolean,
    turret = false,
    volley?: { used: boolean },
  ) {
    if (this.shots.length >= 600) return;
    const d = weaponById[w.id];
    this.projectile(
      x,
      y,
      Math.cos(angle),
      Math.sin(angle),
      damage,
      d.mode === "bomb" ? 300 : 550,
      false,
      d.color,
    );
    const s = this.shots[this.shots.length - 1];
    s.weapon = turret ? "turret" : w.id;
    s.tier = w.tier;
    s.ttl =
      d.id === "boomerang" ? 1.8 : d.range / (d.mode === "bomb" ? 300 : 550);
    this.bullets.set(s.id, {
      volley,
      weapon: w,
      seen: new Set(),
      pierce:
        (d.pierce ?? 0) +
        (d.group === "ranged" && this.inventory.pierce ? 1 : 0),
      crit,
      age: 0,
      returning: false,
      triggered: false,
      turret,
    });
    this.effect(x, y, 22, d.color, 0.12, undefined, "muzzle", angle);
  }
  canProjectileHit(s: Shot, e: Enemy) {
    return !this.bullets.get(s.id)?.seen.has(e.id);
  }
  projectileHit(s: Shot, e: Enemy) {
    const b = this.bullets.get(s.id);
    if (!b) {
      super.projectileHit(s, e);
      return;
    }
    b.seen.add(e.id);
    const d = weaponById[b.weapon.id];
    const x = e.x,
      y = e.y;
    this.strike(e, s.damage, b.weapon, b.crit, !b.triggered && !b.volley?.used);
    if (b.volley) b.volley.used = true;
    b.triggered = true;
    if (d.mode === "bomb") {
      this.effect(x, y, d.radius!, d.color, 0.55, undefined, "detonate");
      for (const other of [...this.enemies])
        if (
          other.id !== e.id &&
          Math.hypot(other.x - x, other.y - y) < d.radius! + other.r
        )
          this.secondary(other, s.damage);
      this.sound?.("bomb", { x, y });
    }
    if (d.mode === "ice") {
      e.stun = Math.max(e.stun, 0.7);
      const chain = this.enemies
        .filter((o) => o.id !== e.id && Math.hypot(o.x - x, o.y - y) < 120)
        .slice(0, 2);
      for (const o of chain) {
        this.secondary(o, s.damage * 0.55);
        o.stun = 0.5;
        this.effect(x, y, 5, d.color, 0.35, undefined, "chain", 0, o.x, o.y);
      }
    }
    if (b.pierce > 0) {
      b.pierce--;
      s.damage *= 0.8;
    } else if (d.id !== "boomerang") s.ttl = 0;
  }
  secondary(e: Enemy, damage: number) {
    if (e.hp <= 0) return;
    const killed = e.hp <= damage;
    super.hit(e, damage);
    if (killed) this.coins -= e.type >= 3 ? 30 : 1;
  }
  strike(
    e: Enemy,
    damage: number,
    w: OwnedWeapon,
    critical: boolean,
    first = true,
  ) {
    if (e.hp <= 0) return;
    const d = weaponById[w.id],
      frozen = e.stun > 0,
      x = e.x,
      y = e.y;
    this.secondary(e, damage);
    if (d.knock && e.hp > 0) {
      const a = Math.atan2(e.y - this.p.y, e.x - this.p.x);
      const nx = e.x + Math.cos(a) * d.knock,
        ny = e.y + Math.sin(a) * d.knock;
      const wall =
        nx < e.r + 12 ||
        nx > W - e.r - 12 ||
        ny < e.r + 12 ||
        ny > H - e.r - 12;
      e.x = Math.max(e.r + 12, Math.min(W - e.r - 12, nx));
      e.y = Math.max(e.r + 12, Math.min(H - e.r - 12, ny));
      if (
        wall &&
        this.inventory.wallbang &&
        (this.wallTimers.get(e.id) ?? 0) <= this.elapsed
      ) {
        this.secondary(e, damage * 0.7);
        this.wallTimers.set(e.id, this.elapsed + 0.5);
        this.effect(e.x, e.y, 55, d.color, 0.4, undefined, "impact");
      }
    }
    if (d.id === "scythe") this.recover(0.6);
    if (
      this.stealTimer <= 0 &&
      this.rng.next() < Math.min(0.6, this.stats.lifesteal / 100)
    ) {
      this.recover(1);
      this.stealTimer = 0.1;
    }
    if (critical && this.inventory.coldcrit && this.coldTimer <= 0) {
      this.coldTimer = 1;
      this.zones.push({ x, y, r: 80, ttl: 2.5, tick: 0 });
      this.effect(x, y, 80, 0x8edcf1, 0.5, undefined, "ice");
    }
    if (frozen && this.inventory.shatter) {
      e.stun = 0;
      for (const o of [...this.enemies])
        if (Math.hypot(o.x - x, o.y - y) < 90)
          this.secondary(o, 8 + this.value("elemental") * 2);
      this.effect(x, y, 90, 0x8edcf1, 0.4, undefined, "ice");
    }
    if (e.hp <= 0 && this.inventory.shards) {
      for (const o of [...this.enemies])
        if (Math.hypot(o.x - x, o.y - y) < 85) this.secondary(o, damage * 0.35);
      this.effect(x, y, 85, 0xbb81f2, 0.4, undefined, "shards");
    }
    if (first && this.inventory.ricochet) {
      const other = this.enemies.filter(
        (o) => o.id !== e.id && Math.hypot(o.x - x, o.y - y) < 180,
      )[0];
      if (other) {
        this.secondary(other, damage * 0.35);
        this.effect(
          x,
          y,
          5,
          d.color,
          0.3,
          undefined,
          "chain",
          0,
          other.x,
          other.y,
        );
      }
    }
  }
  hurt(amount: number) {
    if (this.invuln > 0 || this.phase !== "battle") return;
    if (
      this.rng.next() < Math.min(0.6, Math.max(0, this.value("dodge")) / 100)
    ) {
      this.invuln = 0.2;
      this.effect(this.p.x, this.p.y, 20, 0xbacc95, 0.3, "闪避");
      return;
    }
    const damage = damageAfterArmor(amount, this.p.armor),
      absorbed = Math.min(this.shield, damage);
    this.shield -= absorbed;
    this.p.hp = Math.max(0, this.p.hp - damage + absorbed);
    this.invuln = 0.6;
    this.effect(this.p.x, this.p.y, 28, 0xe65f54, 0.25, undefined, "hit");
    this.sound?.("hurt");
  }
  openUpgrade() {
    if (!this.pendingShop) return;
    this.phase = "upgrade";
    this.setMove(0, 0);
    this.choices = this.shuffle([...attributeChoices])
      .slice(0, 3)
      .map(([id, name, amount]) => ({
        id,
        name,
        desc: `${id} +${amount}`,
        icon: "✦",
      }));
  }
  choose(id: string) {
    if (
      this.phase !== "upgrade" ||
      !this.choices.some((c) => c.id === id) ||
      this.xp < this.nextXp
    )
      return false;
    const c = attributeChoices.find((c) => c[0] === id);
    if (!c) return false;
    this.modify({ [id]: c[2] });
    this.xp -= this.nextXp;
    this.level++;
    this.nextXp = 12 + this.level * 9;
    this.sound?.("buy");
    if (this.xp >= this.nextXp) this.openUpgrade();
    else this.openShop();
    return true;
  }
  get rerollPrice() {
    return 4 + this.wave + this.rerolls * 3;
  }
  makeOffer(index: number): Offer {
    const weapon = index < 2 || this.rng.next() < 0.2;
    let id: string,
      tier = 1,
      price: number;
    if (weapon) {
      const bias = this.weapons
        .map((w) => w.id)
        .concat(buildHeroes[this.hero].start);
      id =
        this.rng.next() < 0.5
          ? bias[Math.floor(this.rng.next() * bias.length)]
          : weapons[Math.floor(this.rng.next() * weapons.length)].id;
      const roll = this.rng.next() + Math.max(0, this.stats.luck) * 0.002;
      const maxTier = Math.min(4, 1 + Math.floor(this.wave / 3));
      tier = Math.min(
        maxTier,
        roll > 0.98 ? 4 : roll > 0.85 ? 3 : roll > 0.62 ? 2 : 1,
      );
      price = Math.ceil(
        weaponById[id].price * tiers[tier - 1] * (1 + (this.wave - 1) * 0.045),
      );
    } else {
      const pool = items.filter((i) => !i.mechanic || !this.inventory[i.id]);
      const item = pool[Math.floor(this.rng.next() * pool.length)];
      id = item.id;
      price = Math.ceil(item.price * (1 + (this.wave - 1) * 0.035));
    }
    return {
      uid: this.id++,
      kind: weapon ? "weapon" : "item",
      id,
      tier,
      price,
      locked: false,
    };
  }
  openShop() {
    this.phase = "shop";
    this.setMove(0, 0);
    this.offers = Array.from({ length: 4 }, (_, i) =>
      this.offers[i]?.locked ? this.offers[i] : this.makeOffer(i),
    );
  }
  lock(index: number) {
    if (this.phase !== "shop" || !this.offers[index]) return false;
    this.offers[index]!.locked = !this.offers[index]!.locked;
    return true;
  }
  canBuy(index: number) {
    const o = this.offers[index];
    return (
      !!o &&
      this.coins >= o.price &&
      (o.kind === "item" ||
        this.weapons.length < 6 ||
        (o.tier < 4 &&
          this.weapons.some((w) => w.id === o.id && w.tier === o.tier)))
    );
  }
  buy(index: number) {
    if (this.phase !== "shop" || !this.canBuy(index)) return false;
    const o = this.offers[index]!;
    if (o.kind === "weapon") {
      if (this.weapons.length === 6) {
        const w = this.weapons.find((w) => w.id === o.id && w.tier === o.tier)!;
        w.tier++;
        w.paid += o.price;
      } else this.addWeapon(o.id, o.tier, o.price);
    } else {
      const item = items.find((i) => i.id === o.id)!;
      this.inventory[item.id] = (this.inventory[item.id] ?? 0) + 1;
      this.modify(item.mods);
    }
    this.coins -= o.price;
    this.offers[index] = null;
    this.sound?.("buy");
    return true;
  }
  mergeable(uid: number) {
    const w = this.weapons.find((w) => w.uid === uid);
    return (
      !!w &&
      w.tier < 4 &&
      this.weapons.some(
        (o) => o.uid !== uid && o.id === w.id && o.tier === w.tier,
      )
    );
  }
  merge(uid: number) {
    if (this.phase !== "shop" || !this.mergeable(uid)) return false;
    const w = this.weapons.find((w) => w.uid === uid)!;
    const other = this.weapons.find(
      (o) => o.uid !== uid && o.id === w.id && o.tier === w.tier,
    )!;
    w.tier++;
    w.paid += other.paid;
    this.weapons = this.weapons.filter((o) => o.uid !== other.uid);
    this.sound?.("buy");
    return true;
  }
  sell(uid: number) {
    if (this.phase !== "shop" || this.weapons.length <= 1) return false;
    const w = this.weapons.find((w) => w.uid === uid);
    if (!w) return false;
    this.coins += this.sellPrice(w);
    this.weapons = this.weapons.filter((o) => o.uid !== uid);
    return true;
  }
  sellPrice(w: OwnedWeapon) {
    return Math.floor(weaponById[w.id].price * tiers[w.tier - 1] * 0.5);
  }
  reroll() {
    if (
      this.phase !== "shop" ||
      this.coins < this.rerollPrice ||
      this.offers.every((o) => o?.locked)
    )
      return false;
    this.coins -= this.rerollPrice;
    this.rerolls++;
    this.openShop();
    return true;
  }
  nextWave() {
    if (this.phase !== "shop" || this.wave >= 12) return;
    super.nextWave();
    this.time = waveSeconds(this.wave);
    this.turrets = [];
    this.turretWeapons.clear();
    this.bullets.clear();
    for (const w of this.weapons) w.cool = 0.1;
  }
}
