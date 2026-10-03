import { describe, it, expect } from "vitest";
import { BuildSimulation } from "../src/game/build-simulation";
import {
  weaponById,
  items,
  buildWaves,
  waveSeconds,
} from "../src/game/build-content";
function shop() {
  const s = new BuildSimulation("gunner", 42);
  s.coins = 1000;
  s.pendingShop = true;
  s.openShop();
  return s;
}
function target(s: BuildSimulation, x = s.p.x + 50, y = s.p.y) {
  const e = s.spawn(0);
  e.x = x;
  e.y = y;
  e.hp = e.maxHp = 1000;
  return e;
}
describe("six-weapon builds", () => {
  it("caps slots at six, combines equal tiers and leaves unequal/max tiers intact", () => {
    const s = shop();
    for (let i = 0; i < 5; i++) s.addWeapon("pistol");
    expect(s.addWeapon("ice")).toBe(false);
    const uid = s.weapons[0].uid;
    expect(s.merge(uid)).toBe(true);
    expect(s.weapons).toHaveLength(5);
    expect(s.weapons[0].tier).toBe(2);
    expect(s.merge(uid)).toBe(false);
    s.weapons[0].tier = 4;
    s.weapons[1].tier = 4;
    expect(s.merge(uid)).toBe(false);
  });
  it("can purchase a matching weapon at capacity, fails incompatible buy without charging", () => {
    const s = shop();
    for (let i = 0; i < 5; i++) s.addWeapon("pistol");
    s.offers[0] = {
      uid: 99,
      id: "pistol",
      tier: 1,
      price: 20,
      locked: true,
      kind: "weapon",
    };
    expect(s.buy(0)).toBe(true);
    expect(s.weapons).toHaveLength(6);
    expect(s.weapons[0].tier).toBe(2);
    s.offers[1] = {
      uid: 100,
      id: "ice",
      tier: 1,
      price: 20,
      locked: false,
      kind: "weapon",
    };
    const c = s.coins;
    expect(s.buy(1)).toBe(false);
    expect(s.coins).toBe(c);
  });
  it("sell frees a slot and cannot remove the last weapon", () => {
    const s = shop();
    expect(s.sell(s.weapons[0].uid)).toBe(false);
    s.addWeapon("ice");
    const c = s.coins;
    expect(s.sell(s.weapons[1].uid)).toBe(true);
    expect(s.coins).toBeGreaterThan(c);
    expect(s.sell(999)).toBe(false);
  });
  it("only related stats affect weapons, engineering ignores attack speed and tier increases output", () => {
    const s = shop();
    const pistol = { id: "pistol", tier: 1 },
      deployer = { id: "deployer", tier: 1 };
    const dmg = s.weaponDamage(pistol),
      interval = s.weaponInterval(deployer);
    s.modify({ melee: 10, engineering: 10, attack: 50 });
    expect(s.weaponDamage(pistol)).toBe(dmg);
    expect(s.weaponInterval(pistol)).toBeLessThan(weaponById.pistol.interval);
    expect(s.weaponInterval(deployer)).toBe(interval);
    expect(s.weaponDamage({ ...pistol, tier: 4 })).toBeGreaterThan(dmg * 2);
  });
  it("families grant bonuses by equipped count, merge removes one family member", () => {
    const s = shop();
    s.addWeapon("pistol");
    expect(s.value("crit")).toBe(9);
    s.merge(s.weapons[0].uid);
    expect(s.value("crit")).toBe(5);
  });
  it("starting choice is validated against role, role modifiers change output", () => {
    expect(new BuildSimulation("gunner", 1, "hammer").weapons[0].id).toBe(
      "pistol",
    );
    const g = new BuildSimulation("gunner", 1, "smg"),
      k = new BuildSimulation("knight");
    expect(g.weapons[0].id).toBe("smg");
    expect(g.weaponDamage({ id: "pistol", tier: 1 })).toBeGreaterThan(
      k.weaponDamage({ id: "pistol", tier: 1 }),
    );
  });
  it("all six weapons fire on independent clocks", () => {
    const s = new BuildSimulation("gunner");
    s.addWeapon("smg");
    s.addWeapon("crossbow");
    s.addWeapon("ice");
    s.addWeapon("bomb");
    s.addWeapon("shotgun");
    target(s, s.p.x + 100);
    for (let i = 0; i < 120; i++) s.tickHeroSystems(1 / 60);
    expect(s.weapons.every((w) => w.fired > 0)).toBe(true);
    expect(s.weapons[1].fired).toBeGreaterThan(s.weapons[2].fired);
  });
});
describe("shop economy and progression", () => {
  it("locked offers persist through refresh and next wave, refresh price escalates", () => {
    const s = shop();
    s.lock(0);
    const o = s.offers[0],
      price = s.rerollPrice;
    s.reroll();
    expect(s.offers[0]).toBe(o);
    expect(s.rerollPrice).toBe(price + 3);
    s.nextWave();
    s.pendingShop = true;
    s.openShop();
    expect(s.offers[0]).toBe(o);
    expect(s.time).toBe(waveSeconds(2));
  });
  it("material currency is earned through pickup, unclaimed payout is discounted once", () => {
    const s = new BuildSimulation();
    const e = target(s);
    s.strike(e, 10000, s.weapons[0], false);
    expect(s.coins).toBe(0);
    s.collectMaterial(3);
    expect(s.coins).toBe(3);
    s.gems = [];
    s.gems.push({ id: 900, x: 30, y: 30, value: 10 });
    s.time = 0.01;
    s.step(0.02);
    expect(s.coins).toBe(26);
    expect(s.pendingShop).toBe(true);
    const c = s.coins;
    s.step(0.1);
    expect(s.coins).toBe(c);
  });
  it("XP upgrades wait for wave end and complete before shop", () => {
    const s = new BuildSimulation();
    s.xp = s.nextXp;
    s.step(0.01);
    expect(s.phase).toBe("battle");
    s.time = 0.001;
    s.step(0.02);
    expect(s.phase).toBe("upgrade");
    expect(s.choose("invalid")).toBe(false);
    expect(s.choose(s.choices[0].id)).toBe(true);
    expect(s.phase).toBe("shop");
  });
  it("deterministic offers and luck affects tier selection", () => {
    const a = shop(),
      b = shop();
    expect(a.offers).toEqual(b.offers);
    a.wave = 9;
    a.stats.luck = 200;
    b.wave = 9;
    let tiersA = 0,
      tiersB = 0;
    for (let i = 0; i < 80; i++) {
      tiersA += a.makeOffer(0).tier;
      tiersB += b.makeOffer(0).tier;
    }
    expect(tiersA).toBeGreaterThan(tiersB);
  });
  it("has 12 increasingly pressured waves, boss only final and final victory requires killing it", () => {
    expect(buildWaves).toHaveLength(12);
    expect(buildWaves[11].health).toBeGreaterThan(buildWaves[0].health * 6);
    const s = new BuildSimulation();
    s.wave = 12;
    s.time = 0.01;
    s.invuln = 100;
    s.step(0.02);
    expect(s.enemies.some((e) => e.type === 4)).toBe(true);
    expect(s.phase).toBe("battle");
    s.secondary(
      s.enemies.find((e) => e.type === 4)!,
      100000,
    );
    s.step(0.01);
    expect(s.phase).toBe("won");
  });
});
describe("behavioral items", () => {
  it("cold critical makes a throttled zone, shatter consumes frozen status", () => {
    const s = new BuildSimulation();
    s.inventory.coldcrit = 1;
    const e = target(s);
    s.strike(e, 1, s.weapons[0], true);
    s.strike(e, 1, s.weapons[0], true);
    expect(s.zones).toHaveLength(1);
    s.inventory.shatter = 1;
    e.stun = 1;
    const hp = e.hp;
    s.strike(e, 1, s.weapons[0], false);
    expect(e.stun).toBe(0);
    expect(e.hp).toBeLessThan(hp - 1);
  });
  it("kill shards and ricochet are bounded secondary hits", () => {
    const s = new BuildSimulation();
    s.inventory.shards = 1;
    s.inventory.ricochet = 1;
    const e = target(s);
    e.hp = 1;
    const other = target(s, e.x + 20);
    s.strike(e, 10, s.weapons[0], false);
    expect(other.hp).toBeLessThan(1000);
    expect(s.kills).toBe(1);
    expect(s.coins).toBe(0);
  });
  it("overheal creates capped shield that absorbs damage", () => {
    const s = new BuildSimulation();
    s.inventory.overheal = 1;
    s.recover(100);
    expect(s.shield).toBe(25);
    const hp = s.p.hp;
    s.hurt(10);
    expect(s.p.hp).toBe(hp);
    expect(s.shield).toBe(15);
  });
  it("piercing cannot hit the same enemy twice on one pass and damage decays", () => {
    const s = new BuildSimulation();
    s.inventory.pierce = 1;
    const w = s.weapons[0];
    s.fire(w, s.p.x, s.p.y, 0, 10, false);
    const shot = s.shots[0],
      e = target(s);
    s.projectileHit(shot, e);
    expect(s.canProjectileHit(shot, e)).toBe(false);
    expect(shot.ttl).toBeGreaterThan(0);
    expect(shot.damage).toBe(8);
    const next = target(s);
    s.projectileHit(shot, next);
    expect(shot.ttl).toBe(0);
  });
  it("standstill siege increases turret shot damage and movement cancels it", () => {
    const s = new BuildSimulation("engineer");
    s.inventory.siege = 1;
    const w = s.weapons[0];
    target(s, s.p.x + 200);
    s.stationary = 1;
    s.deploy(w);
    s.tickHeroSystems(0.01);
    const d = s.shots[0].damage;
    s.stationary = 0;
    s.turrets.forEach((t) => (t.cool = 0));
    s.tickHeroSystems(0.01);
    expect(s.shots.at(-1)!.damage).toBeCloseTo(d / 1.6);
  });
  it("wall impact adds damage with a per-enemy cooldown", () => {
    const s = new BuildSimulation("knight", 1, "hammer");
    s.inventory.wallbang = 1;
    const e = target(s, 28, s.p.y);
    s.p.x = 80;
    const w = s.weapons[0];
    s.strike(e, 10, w, false);
    expect(e.hp).toBe(983);
    s.strike(e, 10, w, false);
    expect(e.hp).toBe(973);
  });
  it('a shotgun volley only ricochets on its first pellet hit',()=>{
    const s=new BuildSimulation();s.inventory.ricochet=1;const e=target(s),other=target(s,e.x+20);const volley={used:false};
    s.fire(s.weapons[0],s.p.x,s.p.y,0,10,false,false,volley);s.fire(s.weapons[0],s.p.x,s.p.y,0,10,false,false,volley);
    s.projectileHit(s.shots[0],e);s.projectileHit(s.shots[1],other);
    expect(s.fx.filter(f=>f.kind==='chain')).toHaveLength(1);
  });
  it("all 30 items have authored mods, eight provide behaviors", () => {
    expect(items).toHaveLength(30);
    expect(items.filter((i) => i.mechanic)).toHaveLength(8);
  });
});
