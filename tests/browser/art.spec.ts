import { test, expect } from "@playwright/test";

test("animated art advances, pauses, respects reduced motion and gallery loads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const hero of ["gunner", "knight", "engineer"]) {
    await page.evaluate((hero) => {
      const api = (window as any).__rift;
      const s = api.start(hero);
      s.invuln = 100;
      s.attackTimer = 100;
      s.spawnTimer = 100;
      for (let type = 0; type < 5; type++) {
        const e = s.spawn(type);
        e.x = 80 + type * 90;
        e.y = 120;
        e.hp = e.maxHp = 100000;
        e.cool = 100;
      }
    }, hero);
    await page.waitForFunction(
      () => !!(window as any).__rift.artSnapshot().hero,
    );
    await page.keyboard.down("KeyD");
    const samples: any[] = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(80);
      samples.push(
        await page.evaluate(() => (window as any).__rift.artSnapshot()),
      );
    }
    await page.keyboard.up("KeyD");
    expect(new Set(samples.map((s) => s.hero.frame)).size).toBeGreaterThan(1);
    expect(samples.at(-1).hero.texture).toBe(`hero-${hero}-run`);
    for (let i = 0; i < 5; i++) {
      expect(
        new Set(samples.map((s) => s.enemies[i].frame)).size,
      ).toBeGreaterThan(1);
      expect(samples.at(-1).enemies[i].texture).toBe(`enemy-${i}-run`);
    }
    await page.keyboard.press("Escape", { delay: 40 });
    await page.waitForFunction(
      () => (window as any).__rift.sim.phase === "paused",
    );
    await page.waitForTimeout(100);
    const paused = await page.evaluate(() =>
      (window as any).__rift.artSnapshot(),
    );
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() => (window as any).__rift.artSnapshot()),
    ).toEqual(paused);
  }
  await page.evaluate(() =>
    localStorage.setItem(
      "rift-survivors-v1",
      JSON.stringify({ version: 1, reduceMotion: true, sound: false }),
    ),
  );
  await page.reload();
  await page.evaluate(() => {
    const s = (window as any).__rift.start("gunner");
    s.spawnTimer = 100;
    s.attackTimer = 100;
    const e = s.spawn(4);
    e.x = 100;
    e.y = 150;
    e.cool = 100;
  });
  // Reload starts Phaser asset loading again; wait for the scene before input.
  await page.waitForFunction(
    () => (window as any).__rift.artSnapshot().hero?.texture === "hero-gunner",
  );
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  const still = await page.evaluate(() => (window as any).__rift.artSnapshot());
  expect(Number(still.hero.frame)).toBe(0);
  expect(still.enemies[0].texture).toBe("enemy-4");
  await page.keyboard.up("KeyD");
  await page.goto("/art-gallery.html");
  expect(
    await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.every(
          (img) =>
            (img as HTMLImageElement).complete &&
            (img as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  await page.screenshot({
    path: "evidence/16-art-gallery-v5.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
