import { describe, it, expect } from "vitest";
import {
  Simulation,
  Random,
  damageAfterArmor,
  W,
} from "../src/game/simulation";
describe("simulation rules", () => {
  it("seed produces reproducible enemy stream", () => {
    const a = new Simulation("gunner", 22),
      b = new Simulation("gunner", 22);
    for (let i = 0; i < 10; i++) {
      a.spawn();
      b.spawn();
    }
    expect(a.enemies).toEqual(b.enemies);
    expect(new Random(1).next()).toBe(new Random(1).next());
  });
  it("movement respects world bounds and normalizes diagonal", () => {
    const s = new Simulation("gunner");
    s.setMove(1, 1);
    expect(Math.hypot(s.move.x, s.move.y)).toBeCloseTo(1);
    s.p.x = W - 21;
    s.step(1);
    expect(s.p.x).toBe(W - 20);
  });
  it("pausing freezes simulation and clears movement", () => {
    const s = new Simulation("gunner");
    s.setMove(1, 0);
    s.skillCd = 5;
    s.pause();
    s.step(10);
    expect(s.time).toBe(45);
    expect(s.skillCd).toBe(5);
    expect(s.move.x).toBe(0);
    expect(s.action("ultimate")).toBe(false);
  });
  it("three blink charges recharge one at a time", () => {
    const s = new Simulation("gunner");
    expect(s.action("core")).toBe(true);
    s.action("core");
    s.action("core");
    expect(s.action("core")).toBe(false);
    s.step(3);
    expect(s.charges).toBe(1);
  });
  it("rolling requires stamina and grants next attack critical", () => {
    const s = new Simulation("knight");
    s.p.stamina = 20;
    expect(s.action("core")).toBe(false);
    s.p.stamina = 100;
    expect(s.action("core")).toBe(true);
    expect(s.p.stamina).toBe(75);
    expect(s.invuln).toBe(0.4);
    expect(s.rollCrit).toBe(true);
  });
  it("parry only causes execution when hit within window", () => {
    const s = new Simulation("knight");
    const e = s.spawn(0);
    e.x = s.p.x + 30;
    e.y = s.p.y;
    e.hp = e.maxHp = 200;
    s.action("skill");
    expect(e.hp).toBe(200);
    s.hurt(30);
    expect(s.p.hp).toBe(150);
    expect(e.hp).toBeLessThan(200);
    expect(s.parry).toBe(0);
  });
  it("expired parry takes damage, armor never removes all damage", () => {
    const s = new Simulation("knight");
    s.action("skill");
    s.step(0.36);
    s.hurt(10);
    expect(s.p.hp).toBe(140);
    expect(damageAfterArmor(5, 9)).toBe(2);
  });
  it("recall restores prior position and health without lowering health", () => {
    const s = new Simulation("gunner");
    s.history = [{ t: 0, x: 100, y: 100, hp: 80 }];
    s.p.hp = 20;
    s.p.x = 500;
    s.action("skill");
    expect(s.p.x).toBe(100);
    expect(s.p.hp).toBe(80);
    s.skillCd = 0;
    s.p.hp = 90;
    s.action("skill");
    expect(s.p.hp).toBe(90);
  });
  it("wave settles gems, queues upgrade, then opens shop", () => {
    const s = new Simulation("gunner");
    s.time = 0.01;
    s.gems = [{ id: 1, x: 0, y: 0, value: 20 }];
    s.step(0.02);
    expect(s.phase).toBe("upgrade");
    s.choose(s.choices[0].id);
    expect(s.phase).toBe("shop");
    expect(s.enemies.length).toBe(0);
    s.nextWave();
    expect(s.wave).toBe(2);
    expect(s.time).toBe(45);
  });
  it("purchase checks balance and prevents double payment", () => {
    const s = new Simulation("gunner");
    s.openShop();
    const p = s.shop[0].price;
    expect(s.buy(0)).toBe(false);
    s.coins = 100;
    expect(s.buy(0)).toBe(true);
    expect(s.coins).toBe(100 - p);
    expect(s.buy(0)).toBe(false);
    expect(s.coins).toBe(100 - p);
  });
  it("full health cannot buy heal", () => {
    const s = new Simulation("knight");
    s.coins = 100;
    s.openShop();
    expect(s.heal()).toBe(false);
    expect(s.coins).toBe(100);
    s.p.hp = 50;
    expect(s.heal()).toBe(true);
    expect(s.p.hp).toBe(95);
  });
  it("final wave does not end until boss dies", () => {
    const s = new Simulation("gunner");
    s.wave = 8;
    s.time = 0.01;
    s.step(0.02);
    expect(s.phase).toBe("battle");
    const boss = s.enemies.find((e) => e.type === 4)!;
    s.hit(boss, 100000);
    s.step(0.02);
    expect(s.phase).toBe("won");
  });
  it("zero hp leads to defeat", () => {
    const s = new Simulation("gunner");
    s.p.hp = 0;
    s.step(1 / 60);
    expect(s.phase).toBe("lost");
  });
  it("crowded ultimate retains its signature effect within the visual budget", () => {
    const s = new Simulation("gunner");
    s.invuln = 100;
    s.spawnTimer = s.attackTimer = 100;
    for (let i = 0; i < 100; i++) s.spawn();
    for (const e of s.enemies) {
      e.x = 650;
      e.y = 325;
      e.hp = e.maxHp = 100000;
    }
    const before = s.enemies[0].hp;
    expect(s.action("ultimate")).toBe(true);
    expect(s.enemies[0].hp).toBe(before - s.p.damage * 9);
    s.step(1 / 60);
    expect(s.fx.length).toBeLessThanOrEqual(180);
    expect(s.fx.some((f) => f.kind === "pulse")).toBe(true);
  });
});
