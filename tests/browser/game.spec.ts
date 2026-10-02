import { test, expect } from "@playwright/test";
test("menu, both heroes, skills, pause, upgrade, shop, boss and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "进入竞技场" })).toBeVisible();
  await page.waitForSelector("canvas");
  await page.screenshot({ path: "evidence/01-menu.png" });
  await page.getByRole("button", { name: "进入竞技场" }).click();
  await page.waitForTimeout(1200);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "evidence/02-battle.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "继续战斗" })).toBeVisible();
  const before = await page.evaluate(() => (window as any).__rift.sim.time);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__rift.sim.time)).toBe(
    before,
  );
  await page.getByRole("button", { name: "继续战斗" }).click();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.xp = s.nextXp;
    s.step(1 / 60);
  });
  await expect(page.getByText("选择一项强化")).toBeVisible();
  await page.screenshot({ path: "evidence/03-upgrade.png" });
  await page.locator(".choice").first().click();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.time = 0.001;
    s.step(1 / 60);
    s.coins = 100;
  });
  await expect(page.getByText("为下一波做好准备")).toBeVisible();
  await page.screenshot({ path: "evidence/04-shop.png" });
  await page.locator(".choice").first().click();
  await page.getByRole("button", { name: "第 2 波" }).click();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.wave = 8;
    s.bossSpawned = false;
    s.step(1 / 60);
    s.enemies.find((e: any) => e.type === 4).cool = 0;
    s.step(1 / 60);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "evidence/05-boss.png" });
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.hit(
      s.enemies.find((e: any) => e.type === 4),
      100000,
    );
    s.step(1 / 60);
  });
  await expect(page.getByText("你活到了最后。")).toBeVisible();
  await page.screenshot({ path: "evidence/06-victory.png" });
  await page.getByRole("button", { name: "返回英雄选择" }).click();
  await page.getByRole("button", { name: /灰烬守望/ }).click();
  await page.getByRole("button", { name: "进入竞技场" }).click();
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyE");
  expect(await page.evaluate(() => (window as any).__rift.sim.hero)).toBe(
    "knight",
  );
  await page.screenshot({ path: "evidence/07-knight.png" });
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.p.hp = 0;
    s.step(1 / 60);
  });
  await expect(page.getByText("这一次，到此为止。")).toBeVisible();
  await page.getByRole("button", { name: "再战一局" }).click();
  expect(await page.evaluate(() => (window as any).__rift.sim.phase)).toBe(
    "battle",
  );
  expect(errors).toEqual([]);
});
test("small viewport menu and corrupt save", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("rift-survivors-v1", "broken"),
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "进入竞技场" })).toBeVisible();
  await page.screenshot({
    path: "evidence/08-mobile-menu.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
