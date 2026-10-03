import { it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { BuildSimulation } from "../src/game/build-simulation";
import { buildHeroes, weaponById } from "../src/game/build-content";
import type { HeroId } from "../src/game/content";
it("deterministic no-cheat movement/shop bots exercise multi-wave builds within entity budgets", () => {
  const reports = [];
  for (const hero of ["gunner", "knight", "engineer"] as HeroId[])
    for (const seed of [42, 197]) {
      const s = new BuildSimulation(hero, seed);
      let frames = 0,
        peak = 0;
      const purchases: string[] = [],
        waves = [];
      let waveKills = 0;
      while (frames++ < 60 * 1000 && !["won", "lost"].includes(s.phase)) {
        if (s.phase === "upgrade") {
          const favored = [
            "armor",
            "maxHp",
            "regen",
            hero === "knight"
              ? "melee"
              : hero === "engineer"
                ? "engineering"
                : "ranged",
            "damage",
            "attack",
          ];
          const choice = [...s.choices].sort((a, b) => {
            const ai = favored.indexOf(a.id),
              bi = favored.indexOf(b.id);
            return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
          })[0];
          s.choose(choice.id);
          continue;
        }
        if (s.phase === "shop") {
          waves.push({
            wave: s.wave,
            kills: s.kills - waveKills,
            coins: s.coins,
            hp: Math.round(s.p.hp),
            weapons: s.weapons.map((w) => `${w.id}:${w.tier}`),
          });
          waveKills = s.kills;
          for (let round = 0; round < 4; round++) {
            for (const w of [...s.weapons])
              if (s.mergeable(w.uid)) s.merge(w.uid);
            for (let i = 0; i < 4; i++) {
              const o = s.offers[i];
              if (!o) continue;
              const preferred =
                o.kind === "item"
                  ? [
                      "plate",
                      "heart",
                      "sap",
                      "boots",
                      "siege",
                      "shatter",
                      "coldcrit",
                      "shards",
                      "overheal",
                      "basket",
                      "gear",
                      "ammo",
                      "medal",
                    ].includes(o.id)
                  : s.weapons.length < 4 ||
                    buildHeroes[hero].start.includes(o.id) ||
                    s.weapons.some((w) => w.id === o.id && w.tier === o.tier);
              if (preferred && s.canBuy(i)) {
                purchases.push(o.id);
                s.buy(i);
              }
            }
            if (s.coins < s.rerollPrice + 22) break;
            s.reroll();
          }
          s.nextWave();
          continue;
        }
        // Seek materials when safe, avoid nearby contact, and circle the arena otherwise.
        const nearby = s.enemies.filter(
          (e) => Math.hypot(e.x - s.p.x, e.y - s.p.y) < 120,
        );
        let dx = 0,
          dy = 0;
        if (nearby.length) {
          for (const e of nearby) {
            const d = Math.hypot(e.x - s.p.x, e.y - s.p.y) || 1;
            dx += (s.p.x - e.x) / (d * d);
            dy += (s.p.y - e.y) / (d * d);
          }
          if (s.p.x < 90) dx += 0.08;
          if (s.p.x > 1010) dx -= 0.08;
          if (s.p.y < 90) dy += 0.08;
          if (s.p.y > 560) dy -= 0.08;
        } else {
          const gem = [...s.gems].sort(
            (a, b) =>
              Math.hypot(a.x - s.p.x, a.y - s.p.y) -
              Math.hypot(b.x - s.p.x, b.y - s.p.y),
          )[0];
          const angle = s.elapsed * 0.35;
          dx = (gem?.x ?? 550 + 350 * Math.cos(angle)) - s.p.x;
          dy = (gem?.y ?? 325 + 200 * Math.sin(angle)) - s.p.y;
        }
        s.setMove(dx, dy);
        s.step(1 / 60);
        peak = Math.max(peak, s.enemies.length);
        expect(s.shots.length).toBeLessThanOrEqual(600);
        expect(s.weapons.length).toBeLessThanOrEqual(6);
        expect(Number.isFinite(s.p.hp)).toBe(true);
      }
      reports.push({
        hero,
        seed,
        phase: s.phase,
        wave: s.wave,
        elapsed: Math.round(s.elapsed),
        kills: s.kills,
        peakEnemies: peak,
        purchases,
        waves,
      });
    }
  mkdirSync("evidence", { recursive: true });
  writeFileSync(
    "evidence/v08-build-bots.json",
    JSON.stringify(
      {
        note: "Rule/economy smoke only; bots do not establish human balance or fun.",
        reports,
      },
      null,
      2,
    ),
  );
  expect(reports.every((r) => r.purchases.length > 0)).toBe(true);
  console.log(
    JSON.stringify(
      reports.map(({ hero, seed, phase, wave, kills, peakEnemies }) => ({
        hero,
        seed,
        phase,
        wave,
        kills,
        peakEnemies,
      })),
    ),
  );
}, 30000);
