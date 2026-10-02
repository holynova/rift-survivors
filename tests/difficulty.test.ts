import { expect, it } from "vitest";
import { waves, balance } from "../src/game/content";
import { Simulation, damageAfterArmor } from "../src/game/simulation";
it("enemy health and speed rise while spawn intervals tighten through wave seven", () => {
  for (let i = 1; i < waves.length; i++) {
    expect(waves[i].health).toBeGreaterThan(waves[i - 1].health);
    expect(waves[i].speed).toBeGreaterThan(waves[i - 1].speed);
    if (i < 7) expect(waves[i].spawn).toBeLessThan(waves[i - 1].spawn);
  }
  const first = new Simulation("gunner", 42),
    last = new Simulation("gunner", 42);
  last.wave = 8;
  expect(last.spawn(0).hp).toBeGreaterThan(first.spawn(0).hp * 3);
});
it("late surge spawns pairs and final wave keeps spawning after the countdown", () => {
  const s = new Simulation("gunner", 42);
  s.wave = 6;
  s.bossSpawned = true;
  s.time = 14;
  s.invuln = 100;
  s.attackTimer = 100;
  s.spawnTimer = 0;
  s.step(1 / 60);
  expect(s.enemies).toHaveLength(2);
  expect(s.reinforcements).toBe(true);
  const boss = new Simulation("gunner", 42);
  boss.wave = 8;
  boss.time = 0;
  boss.attackTimer = 100;
  boss.invuln = 100;
  boss.step(1 / 60);
  const before = boss.enemies.length;
  boss.spawnTimer = 0;
  boss.step(1 / 60);
  expect(boss.enemies.length).toBeGreaterThan(before);
  expect(boss.phase).toBe("battle");
});
it("boss rage increases projectile density with readable telegraph", () => {
  const s = new Simulation("gunner", 42);
  s.wave = 8;
  s.bossSpawned = true;
  s.attackTimer = s.spawnTimer = 100;
  s.invuln = 100;
  const e = s.spawn(4);
  e.x = 100;
  e.y = 100;
  e.cool = 0;
  s.step(1 / 60);
  expect(s.shots).toHaveLength(12);
  s.shots = [];
  s.dangers = [];
  e.hp = e.maxHp * 0.4;
  e.cool = 0;
  s.step(1 / 60);
  expect(s.shots).toHaveLength(18);
  expect(s.dangers[0].ttl).toBeGreaterThan(0.8);
});
it("healing is once per wave, survives reroll and resets for next wave", () => {
  const s = new Simulation("knight", 42);
  s.openShop();
  s.coins = 500;
  s.p.hp = 10;
  expect(s.heal()).toBe(true);
  const hp = s.p.hp;
  expect(s.heal()).toBe(false);
  s.reroll();
  expect(s.heal()).toBe(false);
  expect(s.p.hp).toBe(hp);
  s.nextWave();
  s.openShop();
  expect(s.heal()).toBe(true);
});
it("armor cannot trivialize damage and shop armor stops at its cap", () => {
  expect(damageAfterArmor(30, 100)).toBe(12);
  const s = new Simulation("knight", 42);
  s.p.armor = 11;
  s.coins = 100;
  s.openShop();
  s.shop = [{ id: "wall", name: "wall", price: 36, desc: "", icon: "" }];
  s.buy(0);
  expect(s.p.armor).toBe(balance.maxArmor);
});
