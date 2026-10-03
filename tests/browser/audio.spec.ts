import { test, expect } from "@playwright/test";
test("music starts on gesture, freezes in overlays and restores saved separate volume controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(
    (await page.evaluate(() => (window as any).__rift.audioStats())).state,
  ).toBe("locked");
  await page.getByRole("button", { name: "进入竞技场" }).click();
  await page.waitForTimeout(600);
  const playing = await page.evaluate(() =>
    (window as any).__rift.audioStats(),
  );
  expect(playing.state).toBe("running");
  expect(playing.samplesLoaded).toBe(25);
  expect(playing.failedSamples).toEqual([]);
  expect(playing.musicTracksLoaded).toBe(4);
  expect(playing.failedMusicTracks).toEqual([]);
  expect(playing.musicTrack).toBe("first-light");
  expect(playing.playing).toBe(true);
  expect(playing.beat).toBeGreaterThan(0);
  expect(playing.voices).toBeLessThanOrEqual(96);
  await page.keyboard.press("Escape", { delay: 40 });
  await expect(page.getByRole("button", { name: "继续战斗" })).toBeVisible();
  await page.waitForTimeout(150);
  await page.screenshot({ path: "evidence/17-audio-settings-v6.png" });
  const paused = await page.evaluate(() => (window as any).__rift.audioStats());
  expect(paused.playing).toBe(false);
  expect(paused.musicVoices).toBe(0);
  await page.getByLabel("音乐音量", { exact: true }).fill("0.2");
  await page.getByLabel("音效音量", { exact: true }).fill("0.4");
  await page.getByRole("button", { name: "继续战斗" }).click();
  await page.waitForTimeout(250);
  expect(
    (await page.evaluate(() => (window as any).__rift.audioStats()))
      .musicVolume,
  ).toBeCloseTo(0.2);
  await page.getByRole("button", { name: "关闭音效" }).click();
  await page.waitForTimeout(150);
  const muted = await page.evaluate(() => (window as any).__rift.audioStats());
  expect(muted.effectsVolume).toBe(0);
  expect(muted.playing).toBe(true);
  await page.getByRole("button", { name: "关闭音乐" }).click();
  await page.waitForTimeout(150);
  expect(
    (await page.evaluate(() => (window as any).__rift.audioStats())).playing,
  ).toBe(false);
  await page.reload();
  await expect(page.getByRole("button", { name: "打开音乐" })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rift-survivors-v1")!),
  );
  expect(saved.musicVolume).toBe(0.2);
  expect(saved.effectsVolume).toBe(0.4);
  expect(errors).toEqual([]);
});

test("score crossfades across four wave stages, final score starts at wave12", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入竞技场" }).click();
  await page.waitForFunction(
    () => (window as any).__rift.audioStats().musicTracksLoaded === 4,
  );
  for (const [wave, track] of [
    [4, "iron-march"],
    [8, "rift-storm"],
    [12, "last-guardian"],
  ] as const) {
    await page.evaluate((wave) => {
      const s = (window as any).__rift.sim;
      s.wave = wave;
      s.time = 1000;
      s.invuln = 10000;
      s.spawnTimer = 10000;
      s.bossSpawned = true;
      if (wave === 12) {
        const e = s.spawn(4);
        e.hp = e.maxHp = 1000000;
      }
    }, wave);
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__rift.audioStats().musicTrack),
      )
      .toBe(track);
    await page.waitForTimeout(850);
    const audio = await page.evaluate(() =>
      (window as any).__rift.audioStats(),
    );
    expect(audio.musicVoices).toBe(1);
    expect(audio.voices).toBeLessThanOrEqual(96);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  expect(
    (await page.evaluate(() => (window as any).__rift.audioStats()))
      .musicVoices,
  ).toBe(0);
});
