import { it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { audioSamples } from "../src/game/audio-bank";
import { manifest, iconKeys, iconUrl } from "../src/phaser/manifest";
it("every runtime texture and UI icon resolves to a shipped file", () => {
  const urls = [
    ...Object.values(manifest.images),
    ...Object.values(manifest.sheets).map((s) => s.url),
    ...Object.values(iconKeys).map(iconUrl),
  ];
  for (const url of urls) {
    const file = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
    expect(fs.existsSync(file), url).toBe(true);
    expect(fs.statSync(file).size, url).toBeGreaterThan(0);
  }
});

it("every audio sample resolves to a nonempty shipped WAV", () => {
  for (const url of Object.values(audioSamples)) {
    const file = path.join(process.cwd(), "public", url);
    expect(fs.existsSync(file), url).toBe(true);
    expect(fs.statSync(file).size, url).toBeGreaterThan(44);
  }
});
