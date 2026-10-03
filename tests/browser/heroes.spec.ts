import { test, expect } from "@playwright/test";
test("three role starts select different weapons and engineer auto-deploys", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [hero, weapon] of [
    ["gunner", "smg"],
    ["knight", "hammer"],
    ["engineer", "deployer"],
  ]) {
    await page
      .locator(".hero-option")
      .nth(["gunner", "knight", "engineer"].indexOf(hero))
      .click();
    await page
      .locator(".starter-options button")
      .nth(hero === "engineer" ? 0 : 1 + (hero === "knight" ? 1 : 0))
      .click();
    await page.getByRole("button", { name: "进入竞技场" }).click();
    await page.waitForFunction(() => !!(window as any).__rift.sim);
    expect(
      await page.evaluate(() => (window as any).__rift.sim.weapons[0].id),
    ).toBe(weapon);
    if (hero === "engineer")
      await page.waitForFunction(
        () => (window as any).__rift.sim.turrets.length > 0,
      );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "返回英雄选择" }).click();
  }
  expect(errors).toEqual([]);
});
