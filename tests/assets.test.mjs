import { it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { audioSamples, musicTracks } from "../src/game/audio-bank";
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


it('new painted build icons and original score loops are all shipped',async()=>{
  const {weapons,items,iconFor,itemIconFor}=await import('../src/game/build-content');
  for(const url of [...weapons.map(w=>iconFor(w.id)),...items.map(i=>itemIconFor(i.id))]){
    const data=fs.readFileSync(path.join(process.cwd(),'public',url.replace(/^\/+/,'')));
    expect(data.subarray(1,4).toString()).toBe('PNG');
    expect(data.readUInt32BE(16)).toBe(128);expect(data.readUInt32BE(20)).toBe(128);
  }
  for(const url of Object.values(musicTracks)){
    const data=fs.readFileSync(path.join(process.cwd(),'public',url));expect(data.subarray(4,8).toString()).toBe('ftyp');expect(data.length).toBeGreaterThan(100000);
  }
});
