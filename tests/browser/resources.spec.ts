import { test, expect } from "@playwright/test";
test("new inventory gallery loads all 42 painted icons and four music sources", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/build-gallery.html");
  await expect(page.locator(".card img")).toHaveCount(42);
  await expect(page.locator("audio")).toHaveCount(4);
  await expect
    .poll(() =>
      page
        .locator(".card img")
        .evaluateAll((imgs) =>
          imgs.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth === 128,
          ),
        ),
    )
    .toBe(true);
  // Use the real HTML audio element rather than assuming a nonempty file can play.
  await page
    .locator("audio")
    .first()
    .evaluate(async (el) => {
      const a = el as HTMLAudioElement;
      a.volume = 0.2;
      await a.play();
    });
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((el) => (el as HTMLAudioElement).currentTime),
    )
    .toBeGreaterThan(0.1);
  await page
    .locator("audio")
    .first()
    .evaluate((el) => (el as HTMLAudioElement).pause());
  expect(errors).toEqual([]);
});
