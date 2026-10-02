import { it, expect } from "vitest";
import { Simulation } from "../src/game/simulation";
import { type HeroId, specials } from "../src/game/content";

function arena(hero: HeroId) {
  const s = new Simulation(hero, 42);
  s.spawnTimer = s.attackTimer = 100;
  s.invuln = 100;
  s.p.crit = 0;
  return s;
}
function enemy(s: Simulation, x: number, y = 325) {
  const e = s.spawn(0);
  e.x = x;
  e.y = y;
  e.hp = e.maxHp = 10000;
  e.cool = 100;
  return e;
}

it("ice chain jumps between enemies without hitting distant targets", () => {
  const s = arena("frost");
  const a = enemy(s, 620),
    b = enemy(s, 770),
    c = enemy(s, 910),
    outside = enemy(s, 1000, 80);
  s.attack();
  expect(a.hp).toBe(9982);
  expect(b.hp).toBeCloseTo(9985.6);
  expect(c.hp).toBeCloseTo(9988.48);
  expect(outside.hp).toBe(10000);
  expect(a.stun).toBeGreaterThan(0);
});
it("ice fields deal periodic damage and expire; ice ultimate freezes", () => {
  const s = arena("frost"),
    e = enemy(s, 620);
  s.action("skill");
  expect(s.zones).toHaveLength(1);
  s.step(0.1);
  expect(e.hp).toBeLessThan(10000);
  const hp = e.hp;
  s.step(0.1);
  expect(e.hp).toBe(hp);
  s.action("ultimate");
  expect(e.stun).toBe(2.5);
  for (let i = 0; i < 62; i++) s.step(0.1);
  expect(s.zones).toHaveLength(0);
});
it("turrets shoot, enforce the cap, swap with their owner and expire", () => {
  const s = arena("engineer");
  enemy(s, 750);
  for (let i = 0; i < 5; i++) {
    s.skillCd = 0;
    s.action("skill");
  }
  expect(s.turrets).toHaveLength(3);
  s.step(0.1);
  expect(s.shots.length).toBe(3);
  const t = s.turrets.at(-1)!;
  t.x = 200;
  t.y = 200;
  s.action("core");
  expect(s.p.x).toBe(200);
  expect(t.x).toBe(550);
  for (const t of s.turrets) t.ttl = 0.01;
  s.step(0.1);
  expect(s.turrets).toHaveLength(0);
});
it("army overload increases turret fire frequency and assembly increases the cap", () => {
  const s = arena("engineer");
  enemy(s, 750);
  s.special.add("assembly");
  s.addTurret(400, 325);
  s.action("ultimate");
  expect(s.turrets).toHaveLength(4);
  expect(s.overload).toBe(7);
  s.step(0.1);
  expect(s.turrets.every((t) => t.cool < 0.4)).toBe(true);
});
it("blood ultimate requires resource, consumes it and heals only on hits", () => {
  const s = arena("reaper");
  s.p.hp = 40;
  expect(s.action("ultimate")).toBe(false);
  expect(s.ultCd).toBe(0);
  const e = enemy(s, 620);
  s.attack();
  expect(s.blood).toBe(16);
  s.blood = 70;
  expect(s.action("ultimate")).toBe(true);
  expect(s.blood).toBe(0);
  expect(e.hp).toBeLessThan(10000 - 23);
  expect(s.p.hp).toBe(46);
  const empty = arena("reaper");
  empty.p.hp = 40;
  empty.blood = 60;
  empty.action("ultimate");
  expect(empty.p.hp).toBe(40);
});
it("blood dash hits its path while excluding off-path enemies", () => {
  const s = arena("reaper"),
    on = enemy(s, 620),
    off = enemy(s, 620, 450);
  s.action("core");
  expect(on.hp).toBeCloseTo(10000 - 23 * 1.8);
  expect(off.hp).toBe(10000);
  expect(s.p.x).toBe(690);
  expect(s.action("core")).toBe(false);
});
it.each(["frost", "engineer", "reaper"] as const)(
  "%s pause freezes systems and only offers its own exclusive upgrades",
  (hero) => {
    const s = arena(hero);
    s.action("skill");
    s.pause();
    const snapshot = JSON.stringify({
      zones: s.zones,
      turrets: s.turrets,
      blood: s.blood,
      cool: s.skillCd,
    });
    s.step(1);
    expect(
      JSON.stringify({
        zones: s.zones,
        turrets: s.turrets,
        blood: s.blood,
        cool: s.skillCd,
      }),
    ).toBe(snapshot);
    expect(s.action("core")).toBe(false);
    s.resume();
    s.openUpgrade();
    const generic = new Set([
      "damage",
      "attack",
      "health",
      "speed",
      "pickup",
      "crit",
      "armor",
      "haste",
    ]);
    expect(
      s.choices.every(
        (c) => generic.has(c.id) || specials[hero].some((h) => h.id === c.id),
      ),
    ).toBe(true);
  },
);
