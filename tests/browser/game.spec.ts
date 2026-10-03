import { test, expect } from "@playwright/test";
test("move, pause, wave-end upgrade, four-offer shop, locking, purchase and final boss", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "进入竞技场" }).click();
  await page.waitForFunction(() => !!(window as any).__rift.artSnapshot().hero);
  const before = await page.evaluate(() => (window as any).__rift.sim.p.x);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => (window as any).__rift.sim.p.x),
  ).toBeGreaterThan(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "继续战斗" })).toBeVisible();
  const time = await page.evaluate(() => (window as any).__rift.sim.time);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__rift.sim.time)).toBe(time);
  await page.getByRole("button", { name: "继续战斗" }).click();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.xp = s.nextXp;
    s.time = 0.001;
    s.step(0.02);
    s.coins = 200;
  });
  await expect(page.getByText("强化你的构筑")).toBeVisible();
  await page.locator(".choice").first().click();
  await expect(page.getByText("武装下一波")).toBeVisible();
  await expect(page.locator(".offer")).toHaveCount(4);
  await page.getByRole("button", { name: "锁定商品 1", exact: true }).click();
  const offer = await page.evaluate(
    () => (window as any).__rift.sim.offers[0].uid,
  );
  await page.getByRole("button", { name: /刷新商品/ }).click();
  expect(
    await page.evaluate(() => (window as any).__rift.sim.offers[0].uid),
  ).toBe(offer);
  await page.locator(".buy-button").first().click();
  expect(
    await page.evaluate(() => (window as any).__rift.sim.weapons.length),
  ).toBe(2);
  await page.screenshot({ path: "evidence/v08-shop.png" });
  await page.getByRole("button", { name: "第 2 波 →" }).click();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.wave = 12;
    s.bossSpawned = false;
    s.step(0.01);
  });
  await expect(page.locator(".boss")).toBeVisible();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.secondary(
      s.enemies.find((e: any) => e.type === 4),
      100000,
    );
    s.step(0.01);
  });
  await expect(page.getByText("你活到了最后。")).toBeVisible();
  await page.getByRole("button", { name: "返回英雄选择" }).click();
  await expect(page.locator(".hero-option")).toHaveCount(3);
  expect(errors).toEqual([]);
});
test("corrupt saved audio settings keeps compact menu playable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("rift-survivors-v1", "broken"),
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "进入竞技场" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
