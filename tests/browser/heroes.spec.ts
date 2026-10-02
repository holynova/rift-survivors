import { test, expect } from "@playwright/test";

test("new roster, role mechanics, skills, pause and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto("/");
  await expect(page.locator(".hero-option")).toHaveCount(5);
  await page.screenshot({ path: "evidence/13-five-heroes.png" });
  for (const [id, name] of [
    ["frost", "极寒织法者"],
    ["engineer", "铜芯造物师"],
    ["reaper", "猩红追猎者"],
  ]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.getByRole("button", { name: "进入竞技场" }).click();
    await expect(page.getByRole("button", { name: "Ⅱ 暂停" })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__rift.sim.hero)).toBe(id);
    // Durable enemies let all new mechanics be captured without skipping battle phases.
    await page.evaluate(() => {
      const s = (window as any).__rift.sim;
      s.spawnTimer = 100;
      for (let i = 0; i < 8; i++) {
        const e = s.spawn();
        const a = (i * Math.PI) / 4;
        e.x = s.p.x + Math.cos(a) * 90;
        e.y = s.p.y + Math.sin(a) * 90;
        e.hp = e.maxHp = 10000;
        e.cool = 100;
      }
    });
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(250);
    if (id === "frost")
      expect(
        await page.evaluate(() => (window as any).__rift.sim.zones.length),
      ).toBe(1);
    if (id === "engineer")
      expect(
        await page.evaluate(() => (window as any).__rift.sim.turrets.length),
      ).toBe(1);
    if (id === "reaper")
      await page.waitForFunction(() => (window as any).__rift.sim.blood >= 60);
    await page.keyboard.press("KeyQ");
    await page.waitForTimeout(130);
    await page.screenshot({ path: `evidence/14-${id}-skills.png` });
    await page.keyboard.press("Space", { delay: 40 });
    await page.waitForFunction(() => (window as any).__rift.sim.coreCd > 0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "继续战斗" })).toBeVisible();
    await page.getByRole("button", { name: "返回英雄选择" }).click();
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
