import { test, expect } from "@playwright/test";
test("melee rendered pose follows contact, remains fixed while paused, without drifting", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const id of ["dagger", "spear", "hammer", "scythe"]) {
    await page.evaluate(async (id) => {
      const s = (window as any).__rift.start("knight");
      s.weapons = [];
      s.addWeapon(id);
      s.weapons[0].cool = 0;
      s.invuln = 100;
      s.spawnTimer = 100;
      s.bossSpawned = true;
      const e = s.spawn(0);
      e.x = s.p.x + (id === "dagger" ? 65 : id === "spear" ? 150 : 110);
      e.y = s.p.y;
      e.hp = e.maxHp = 10000;
      e.stun = 100;
    }, id);
    await expect
      .poll(() =>
        page.evaluate(() => !!(window as any).__rift.sim.meleeSwings.size),
      )
      .toBe(true);
    // Stop the authoritative clock at a visible contact phase for a stable screenshot.
    const pose = await page.evaluate(async () => {
      const s = (window as any).__rift.sim;
      const w = s.weapons[0],
        a = s.meleeSwings.get(w.uid);
      a.age = a.duration * 0.56;
      s.phase = "paused";
      const { meleePose } = await import("/src/game/melee.ts" as string);
      return meleePose(a, s.p.x, s.p.y);
    });
    await page.waitForTimeout(80);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__rift.artSnapshot().weapons.length,
        ),
      )
      .toBe(1);
    const v = await page.evaluate(() => {
      const v = (window as any).__rift.artSnapshot().weapons[0];
      return { x: v.x, y: v.y, rotation: v.rotation };
    });
    expect(v.x).toBeCloseTo((pose.x1 + pose.x2) / 2);
    expect(v.y).toBeCloseTo((pose.y1 + pose.y2) / 2);
    const hide = await page.addStyleTag({
      content: ".overlay{visibility:hidden!important}",
    });
    await page.screenshot({ path: `evidence/melee-${id}.png` });
    await hide.evaluate((el) => el.parentNode?.removeChild(el));
    await page.waitForTimeout(120);
    expect(
      await page.evaluate(() => {
        const v = (window as any).__rift.artSnapshot().weapons[0];
        return { x: v.x, y: v.y, rotation: v.rotation };
      }),
    ).toEqual(v);
  }
  expect(errors).toEqual([]);
});
