import { test, expect } from "@playwright/test";

// Verify actual bounds, not just hidden scrollbars: all content must fit.
test("menus, combat and dialogs fit the first screen and resize live", async ({
  page,
}) => {
  const sizes = [
    [1440, 900],
    [1366, 768],
    [1280, 600],
    [1024, 768],
    [800, 500],
    [390, 844],
    [375, 667],
    [844, 390],
  ];
  await page.goto("/");
  async function assertFits() {
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const elements = Array.from(
            document.querySelectorAll(
              ".masthead, .game-shell, footer, .menu > *, .hero-option, .hero-detail, .start, .hud-left, .hud-right, .wave, .hero-resource, .abilities, .dialog, .choice, .shop-actions, .mobile-note",
            ),
          );
          return elements
            .filter((el) => {
              if (!el.getClientRects().length) return false;
              const r = el.getBoundingClientRect();
              return (
                r.left < -1 ||
                r.top < -1 ||
                r.right > innerWidth + 1 ||
                r.bottom > innerHeight + 1 ||
                el.scrollHeight > el.clientHeight + 2
              );
            })
            .map((el) => el.className);
        }),
      )
      .toEqual([]);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    }));
    expect(overflow).toEqual({ x: false, y: false });
  }
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await assertFits();
    await page.getByRole("button", { name: /血刃猎手/ }).click();
    await assertFits();
  }
  await page.getByRole("button", { name: /进入竞技场/ }).click();
  await expect(page.getByRole("button", { name: "Ⅱ 暂停" })).toBeVisible();
  await page.evaluate(() => {
    const s = (window as any).__rift.sim;
    s.invuln = 10000;
    s.spawnTimer = 10000;
    s.attackTimer = 10000;
  });
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      (window as any).__rift.sim.phase = "battle";
    });
    await expect(page.locator(".abilities")).toBeVisible();
    await assertFits();
    for (const phase of ["paused", "upgrade", "shop", "won", "lost"]) {
      await page.evaluate((phase) => {
        const s = (window as any).__rift.sim;
        if (phase === "upgrade") s.openUpgrade();
        if (phase === "shop") s.openShop();
        s.phase = phase;
      }, phase);
      await expect(page.locator(".overlay")).toHaveAttribute(
        "data-phase",
        phase,
      );
      await expect(page.locator(".dialog")).toBeVisible();
      await assertFits();
    }
  }
});
