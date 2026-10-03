import { it, expect } from "vitest";
import { BuildSimulation } from "../src/game/build-simulation";
function arena(id: string) {
  const s = new BuildSimulation("knight", 42);
  s.weapons = [];
  s.addWeapon(id);
  s.weapons[0].cool = 0;
  s.stats.crit = 0;
  const enemy = (dx: number, dy = 0) => {
    const e = s.spawn(0);
    e.x = s.p.x + dx;
    e.y = s.p.y + dy;
    e.hp = e.maxHp = 1000;
    return e;
  };
  return { s, enemy };
}
it("windup causes no damage, contact is delayed until the blade reaches the enemy", () => {
  const { s, enemy } = arena("spear");
  const e = enemy(170);
  s.tickHeroSystems(0.001);
  expect(e.hp).toBe(1000);
  for (let i = 0; i < 10; i++) s.tickHeroSystems(0.005);
  expect(e.hp).toBe(1000);
  for (let i = 0; i < 50; i++) s.tickHeroSystems(0.005);
  expect(e.hp).toBeLessThan(1000);
});
it("spear pierces a line but cannot kill an off-axis enemy inside the old cone", () => {
  const { s, enemy } = arena("spear");
  const near = enemy(80),
    far = enemy(160),
    miss = enemy(150, 45);
  for (let i = 0; i < 80; i++) s.tickHeroSystems(0.005);
  expect(near.hp).toBeLessThan(1000);
  expect(far.hp).toBeLessThan(1000);
  expect(miss.hp).toBe(1000);
});
it("a moving target can evade the committed aim during windup", () => {
  const { s, enemy } = arena("dagger");
  const e = enemy(75);
  s.tickHeroSystems(0.001);
  e.y += 80;
  for (let i = 0; i < 70; i++) s.tickHeroSystems(0.005);
  expect(e.hp).toBe(1000);
});
it("sweeping weapons hit front targets once per swing and leave rear targets untouched", () => {
  const { s, enemy } = arena("hammer");
  const front = enemy(110),
    back = enemy(-110);
  for (let i = 0; i < 110; i++) s.tickHeroSystems(0.005);
  expect(front.hp).toBeCloseTo(1000 - s.weaponDamage(s.weapons[0]));
  expect(back.hp).toBe(1000);
});
it("short contact stop freezes the weapon without freezing other weapon clocks", () => {
  const { s, enemy } = arena("hammer");
  enemy(110);
  s.addWeapon("pistol");
  for (
    let i = 0;
    i < 100 && ![...s.meleeSwings.values()].some((x) => x.pause > 0);
    i++
  )
    s.tickHeroSystems(0.005);
  const swing = s.meleeSwings.get(s.weapons[0].uid)!;
  expect(swing.pause).toBeGreaterThan(0);
  const age = swing.age,
    cool = s.weapons[1].cool;
  s.tickHeroSystems(0.01);
  expect(swing.age).toBe(age);
  expect(s.weapons[1].cool).toBeLessThan(cool);
});

it("a hammer can connect with a monster pressed against the player without a blind inner ring", () => {
  const { s, enemy } = arena("hammer");
  const e = enemy(28);
  for (let i = 0; i < 100; i++) s.tickHeroSystems(0.005);
  expect(e.hp).toBeLessThan(1000);
});
