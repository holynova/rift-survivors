import { updateAudio } from "../game/audio";
import Phaser from "phaser";
import { Simulation, W, H } from "../game/simulation";
import { heroes } from "../game/content";
import { bindings, movement } from "../game/input";
import { manifest } from "./manifest";
import { drawCombatEffect, drawWeaponShot } from "./effects";
export const runtime: {
  sim: Simulation | null;
  scene?: Arena;
  fps: number;
  stepMs: number;
  assetError: boolean;
  reduceMotion: boolean;
} = { sim: null, fps: 0, stepMs: 0, assetError: false, reduceMotion: false };
export class Arena extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  keys = new Set<string>();
  acc = 0;
  heroSprite?: Phaser.GameObjects.Sprite;
  ground!: Phaser.GameObjects.Graphics;
  ghostViews: Phaser.GameObjects.Image[] = [];
  enemyHealth = new Map<number, { hp: number; flash: number }>();
  floatTexts: Phaser.GameObjects.Text[] = [];
  enemyViews = new Map<number, Phaser.GameObjects.Sprite>();
  turretViews = new Map<number, Phaser.GameObjects.Image>();
  ambience!: Phaser.GameObjects.Graphics;
  tick = 0;
  constructor() {
    super("Arena");
  }
  preload() {
    for (const [key, path] of Object.entries(manifest.images))
      this.load.image(key, path);
    for (const [key, sheet] of Object.entries(manifest.sheets))
      this.load.spritesheet(key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    this.load.on("loaderror", () => {
      runtime.assetError = true;
    });
  }
  create() {
    runtime.scene = this;
    this.background();
    this.buildEnemies();
    this.ambience = this.add.graphics().setDepth(0.5);
    this.ground = this.add.graphics().setDepth(1);
    this.g = this.add.graphics().setDepth(40);
    const input = this.input.keyboard!;
    input.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    const keyDown = (event: KeyboardEvent) => {
      const sim = runtime.sim;
      if (!sim) return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.code,
        )
      )
        event.preventDefault();
      if (event.repeat) return;
      if (event.code === "Escape") {
        sim.phase === "paused" ? sim.resume() : sim.pause();
        this.keys.clear();
        return;
      }
      if (sim.phase !== "battle") return;
      this.keys.add(event.code);
      if (bindings[event.code]) sim.action(bindings[event.code]);
    };
    const keyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    const blur = () => {
      runtime.sim?.pause();
      updateAudio({
        phase: "paused",
        wave: runtime.sim?.wave ?? 1,
        hero: runtime.sim?.hero ?? "gunner",
        danger: false,
      });
      this.keys.clear();
    };
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("visibilitychange", visibility);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    });
  }
  background() {
    if (this.textures.exists("arena-painted")) {
      this.add
        .image(0, 0, "arena-painted")
        .setOrigin(0, 0)
        .setDisplaySize(W, H);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(0x242b2a);
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 50)
      for (let x = 0; x < W; x += 50) {
        const n = ((x * 7 + y * 13) % 17) / 17;
        g.fillStyle(n > 0.5 ? 0x28302e : 0x252d2b);
        g.fillRect(x + 1, y + 1, 48, 48);
        g.lineStyle(1, 0x303934);
        g.strokeRect(x + 1, y + 1, 48, 48);
      }
    g.lineStyle(3, 0x475044);
    g.strokeRect(14, 14, W - 28, H - 28);
    g.lineStyle(1, 0x555b46, 0.5);
    g.strokeRect(23, 23, W - 46, H - 46);
    g.lineStyle(2, 0x6b6850, 0.2);
    g.strokeCircle(W / 2, H / 2, 170);
    g.strokeCircle(W / 2, H / 2, 145);
    g.strokeCircle(W / 2, H / 2, 50);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      g.lineBetween(
        W / 2 + Math.cos(a) * 145,
        H / 2 + Math.sin(a) * 145,
        W / 2 + Math.cos(a) * 170,
        H / 2 + Math.sin(a) * 170,
      );
    }
    for (const [x, y] of [
      [42, 42],
      [W - 42, 42],
      [42, H - 42],
      [W - 42, H - 42],
    ]) {
      g.fillStyle(0xa4915d, 0.5);
      g.fillRect(x - 6, y - 6, 12, 12);
      g.lineStyle(1, 0xb9a16b, 0.5);
      g.strokeCircle(x, y, 15);
    }
    g.generateTexture("arena-floor", W, H);
    g.destroy();
    this.add.image(0, 0, "arena-floor").setOrigin(0, 0);
  }

  buildEnemies() {
    const g = this.make.graphics({ x: 0, y: 0 });
    for (let type = 0; type < 5; type++) {
      if (this.textures.exists("enemy-" + type)) continue;
      g.clear();
      const e = {
        x: 64,
        y: 64,
        r: type === 4 ? 45 : type === 3 ? 30 : 15,
        type,
      };
      g.fillStyle(0x101816, 0.45);
      g.fillEllipse(e.x, e.y + e.r * 0.85, e.r * 1.9, e.r * 0.65);
      const color = [0x9c9b76, 0xb96353, 0x739a8c, 0x9d7180, 0xb77450][e.type];
      g.fillStyle(0x151d19);
      g.fillRoundedRect(
        e.x - e.r - 2,
        e.y - e.r - 2,
        e.r * 2 + 4,
        e.r * 2 + 4,
        5,
      );
      g.fillStyle(color);
      g.fillRoundedRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, 4);
      if (e.type === 0) {
        g.fillStyle(0xcccfaa);
        g.fillRect(e.x - 10, e.y - 9, 20, 13);
        g.fillStyle(0x252e24);
        g.fillRect(e.x - 7, e.y - 5, 4, 4);
        g.fillRect(e.x + 3, e.y - 5, 4, 4);
        g.fillRect(e.x - 2, e.y + 1, 4, 3);
      }
      if (e.type === 1) {
        g.fillStyle(0xe1aa7e);
        g.fillTriangle(e.x - 9, e.y - 8, e.x + 9, e.y - 8, e.x, e.y + 5);
        g.fillStyle(0x2b211c);
        g.fillRect(e.x - 6, e.y - 5, 4, 3);
        g.fillRect(e.x + 2, e.y - 5, 4, 3);
      }
      if (e.type === 2) {
        g.lineStyle(3, 0xc0d9bd);
        g.strokeCircle(e.x, e.y, 9);
        g.lineBetween(e.x + 12, e.y - 10, e.x + 12, e.y + 10);
      }
      if (e.type >= 3) {
        g.fillStyle(0x383a35);
        g.fillRect(e.x - e.r * 0.7, e.y - e.r * 0.65, e.r * 1.4, e.r * 0.9);
        g.fillStyle(0xf4b66c);
        g.fillRect(e.x - e.r * 0.45, e.y - 5, e.r * 0.9, 6);
        g.lineStyle(4, 0xccb084);
        g.lineBetween(e.x - e.r, e.y + 10, e.x - e.r - 14, e.y - 25);
      }
      g.generateTexture("enemy-" + type, 128, 128);
    }
    g.destroy();
  }

  reset() {
    this.keys.clear();
    this.acc = 0;
    this.heroSprite?.destroy();
    this.heroSprite = undefined;
    for (const view of this.enemyViews.values()) view.destroy();
    this.enemyViews.clear();
    for (const v of this.turretViews.values()) v.destroy();
    this.turretViews.clear();
    this.enemyHealth.clear();
    for (const ghost of this.ghostViews) ghost.setVisible(false);
  }
  update(_: number, delta: number) {
    const sim = runtime.sim;
    updateAudio({
      phase: sim?.phase ?? "menu",
      wave: sim?.wave ?? 1,
      hero: sim?.hero ?? "gunner",
      danger: !!sim && (sim.time < 15 || sim.p.hp < sim.p.maxHp * 0.3),
    });
    this.tick += delta / 1000;
    runtime.fps = this.game.loop.actualFps;
    if (sim) {
      if (sim.phase === "battle") {
        const m = movement(this.keys);
        sim.setMove(m.x, m.y);
        this.acc += Math.min(delta / 1000, 0.1);
        const start = performance.now();
        while (this.acc >= 1 / 60) {
          sim.step(1 / 60);
          this.acc -= 1 / 60;
        }
        runtime.stepMs = performance.now() - start;
      } else {
        this.keys.clear();
        this.acc = 0;
      }
      this.renderSim(sim);
    } else {
      this.g.clear();
      this.ground.clear();
      this.drawAmbience(0);
      for (const v of this.turretViews.values()) v.destroy();
      this.turretViews.clear();
      for (const t of this.floatTexts) t.setVisible(false);
      for (const ghost of this.ghostViews) ghost.setVisible(false);
      this.heroSprite?.setVisible(false);
      for (const view of this.enemyViews.values()) view.destroy();
      this.enemyViews.clear();
    }
  }
  drawAmbience(time: number) {
    const g = this.ambience;
    g.clear();
    const pulse = runtime.reduceMotion
      ? 0.5
      : 0.5 + Math.sin(time * 0.65) * 0.5;
    g.lineStyle(1, 0xa69760, 0.07 + pulse * 0.035);
    g.strokeCircle(W / 2, H / 2, 145);
    for (const [x, y] of [
      [44, 44],
      [W - 44, 44],
      [44, H - 44],
      [W - 44, H - 44],
    ]) {
      for (let i = 3; i > 0; i--) {
        g.fillStyle(0xdaa753, 0.015 + (3 - i) * 0.008);
        g.fillCircle(x, y, 18 + i * 12 + pulse * 3);
      }
      g.lineStyle(1, 0xddbd79, 0.3);
      g.strokeCircle(x, y, 12);
      g.fillStyle(0xffd38a, 0.35 + pulse * 0.1);
      g.fillCircle(x, y, 3);
      if (!runtime.reduceMotion)
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.2 + i / 3) % 1;
          g.fillStyle(0xf5bd69, (1 - t) * 0.4);
          g.fillCircle(x + Math.sin(i * 2 + time) * 9, y - 7 - t * 25, 1.2);
        }
    }
  }
  renderSim(sim: Simulation) {
    this.drawAmbience(sim.elapsed);
    const g = this.g;
    g.clear();
    const floor = this.ground;
    floor.clear();
    for (const ghost of this.ghostViews) ghost.setVisible(false);
    let ghostIndex = 0;
    for (const d of sim.dangers) {
      const progress = 1 - d.ttl / 1.1;
      floor.fillStyle(0xe75c3c, 0.13 + progress * 0.12);
      floor.fillCircle(d.x, d.y, d.r);
      floor.lineStyle(4, 0xffb18a, 0.95);
      floor.strokeCircle(d.x, d.y, d.r);
      floor.lineStyle(2, 0xe86948, 0.8);
      floor.strokeCircle(d.x, d.y, d.r - 7);
      floor.lineStyle(3, 0xffd6a3, 0.9);
      floor.beginPath();
      floor.arc(
        d.x,
        d.y,
        d.r - 3,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
      );
      floor.strokePath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        floor.lineBetween(
          d.x + Math.cos(a) * (d.r - 13),
          d.y + Math.sin(a) * (d.r - 13),
          d.x + Math.cos(a) * (d.r - 5),
          d.y + Math.sin(a) * (d.r - 5),
        );
      }
      floor.lineStyle(2, 0xffc5a0, 0.9);
      floor.lineBetween(d.x - 10, d.y, d.x + 10, d.y);
      floor.lineBetween(d.x, d.y - 10, d.x, d.y + 10);
    }
    for (const z of sim.zones) {
      floor.fillStyle(0x73c9f1, 0.09);
      floor.fillCircle(z.x, z.y, z.r);
      floor.lineStyle(2, 0x9fe5ff, 0.6);
      floor.strokeCircle(z.x, z.y, z.r);
      floor.lineStyle(1, 0xb9eeff, 0.35);
      for (let i = 0; i < 6; i++) {
        const a =
          (i * Math.PI) / 3 + (runtime.reduceMotion ? 0 : sim.elapsed * 0.1);
        floor.lineBetween(
          z.x + Math.cos(a) * 25,
          z.y + Math.sin(a) * 25,
          z.x + Math.cos(a) * z.r * 0.85,
          z.y + Math.sin(a) * z.r * 0.85,
        );
      }
      floor.lineStyle(3, 0xd1f4ff, 0.7);
      floor.beginPath();
      floor.arc(
        z.x,
        z.y,
        z.r - 5,
        -Math.PI / 2,
        -Math.PI / 2 +
          Math.min(1, z.ttl / (sim.special.has("permafrost") ? 9 : 6)) *
            Math.PI *
            2,
      );
      floor.strokePath();
    }
    const activeTurrets = new Set<number>();
    for (const t of sim.turrets) {
      activeTurrets.add(t.id);
      floor.fillStyle(0x101310, 0.4);
      floor.fillEllipse(t.x, t.y + 14, 40, 15);
      let view = this.turretViews.get(t.id);
      if (!view) {
        view = this.add.image(t.x, t.y, "turret-painted");
        this.turretViews.set(t.id, view);
      }
      const recoil = runtime.reduceMotion ? 0 : Math.max(0, t.cool - 0.6) * 5;
      view
        .setDisplaySize(58, 58)
        .setPosition(t.x - Math.cos(t.angle) * recoil, t.y - 4)
        .setDepth(20 + t.y / 1000)
        .setFlipX(Math.cos(t.angle) < 0);
      if (sim.overload > 0) {
        g.lineStyle(2, 0xffba5e, 0.7);
        g.strokeCircle(t.x, t.y, 28);
        floor.fillStyle(0xf6ac49, 0.08);
        floor.fillCircle(t.x, t.y, 32);
      }
      g.fillStyle(0x131a13);
      g.fillRect(t.x - 18, t.y + 25, 36, 3);
      g.fillStyle(0xd0bd76);
      g.fillRect(t.x - 18, t.y + 25, 36 * Math.min(1, t.ttl / 14), 3);
    }
    for (const [id, v] of this.turretViews)
      if (!activeTurrets.has(id)) {
        v.destroy();
        this.turretViews.delete(id);
      }
    for (const gem of sim.gems) {
      g.fillStyle(0x83bca0);
      g.fillPoints(
        [
          { x: gem.x, y: gem.y - 5 },
          { x: gem.x + 4, y: gem.y },
          { x: gem.x, y: gem.y + 5 },
          { x: gem.x - 4, y: gem.y },
        ],
        true,
      );
    }
    const alive = new Set<number>();
    for (const e of sim.enemies) {
      alive.add(e.id);
      let view = this.enemyViews.get(e.id);
      if (!view) {
        view = this.add.sprite(e.x, e.y, "enemy-" + e.type).setOrigin(0.5, 1);
        this.enemyViews.set(e.id, view);
      }
      const size = [56, 54, 56, 96, 144][e.type];
      const runKey = "enemy-" + e.type + "-run";
      const archerStill =
        e.type === 2 &&
        Math.hypot(e.x - sim.p.x, e.y - sim.p.y) >= 180 &&
        Math.hypot(e.x - sim.p.x, e.y - sim.p.y) < 260;
      const animated =
        this.textures.exists(runKey) &&
        !runtime.reduceMotion &&
        e.stun <= 0 &&
        !archerStill;
      const frame = animated
        ? Math.floor(
            sim.elapsed * (e.type === 1 ? 12 : e.type >= 3 ? 5 : 8) + e.id,
          ) % 4
        : 0;
      view
        .setTexture(
          animated ? runKey : "enemy-" + e.type,
          animated ? frame : undefined,
        )
        .setDisplaySize(size, size)
        .setPosition(e.x, e.y + e.r * 0.7)
        .setDepth(20 + e.y / 1000)
        .setFlipX(e.x > sim.p.x);
      if (e.stun > 0) {
        floor.lineStyle(1.5, 0xa6dce5, 0.7);
        floor.strokeEllipse(e.x, e.y + e.r * 0.7, e.r * 2.1, e.r * 0.8);
      }
      const health = this.enemyHealth.get(e.id);
      if (!health) this.enemyHealth.set(e.id, { hp: e.hp, flash: 0 });
      else {
        if (e.hp < health.hp) health.flash = sim.elapsed + 0.09;
        health.hp = e.hp;
        view.setAlpha(sim.elapsed < health.flash ? 0.78 : 1);
      }
      floor.fillStyle(0x101310, 0.36);
      floor.fillEllipse(e.x, e.y + e.r * 0.7, e.r * 2, e.r * 0.8);
      if (e.hp < e.maxHp || e.type >= 3) {
        g.fillStyle(0x1a241b);
        g.fillRect(e.x - e.r, e.y + e.r * 0.7 - size - 6, e.r * 2, 4);
        g.fillStyle(e.type >= 3 ? 0xeac37b : 0xd4c186);
        g.fillRect(
          e.x - e.r,
          e.y + e.r * 0.7 - size - 6,
          e.r * 2 * Math.max(0, e.hp / e.maxHp),
          4,
        );
      }
    }
    for (const [id, view] of this.enemyViews)
      if (!alive.has(id)) {
        view.destroy();
        this.enemyViews.delete(id);
        this.enemyHealth.delete(id);
      }
    for (const shot of sim.shots) drawWeaponShot(g, shot, sim.elapsed);
    floor.fillStyle(0x0b130f, 0.46);
    floor.fillEllipse(sim.p.x, sim.p.y + 25, 44, 15);
    const moving = !!(sim.move.x || sim.move.y),
      runKey = "hero-" + sim.hero + "-run",
      idleKey = "hero-" + sim.hero;
    const key = moving && this.textures.exists(runKey) ? runKey : idleKey;
    const frame =
      moving && key === runKey && !runtime.reduceMotion
        ? Math.floor(
            sim.elapsed *
              (sim.hero === "reaper" ? 12 : sim.hero === "engineer" ? 8 : 9),
          ) % 6
        : 0;
    if (this.textures.exists(key)) {
      if (!this.heroSprite) this.heroSprite = this.add.sprite(0, 0, key);
      const dash = sim.fx.find((f) => f.kind === "dash");
      const rotation =
        !runtime.reduceMotion && sim.hero === "knight" && dash
          ? (1 - dash.ttl / dash.max) *
            Math.PI *
            2 *
            (sim.facing.x < 0 ? -1 : 1)
          : 0;
      const breathe = runtime.reduceMotion
        ? 0
        : moving && key === idleKey
          ? Math.sin(sim.elapsed * 11) * 1.2
          : moving
            ? 0
            : Math.sin(sim.elapsed * 3) * 0.5;
      const recoil = !runtime.reduceMotion
        ? sim.fx.find((f) => f.kind === "muzzle" || f.kind === "slash")
        : undefined;
      const kick = recoil ? (3 * recoil.ttl) / recoil.max : 0;
      this.heroSprite
        .setTexture(key, key === runKey ? frame : undefined)
        .setVisible(true)
        .setDisplaySize(84, 84)
        .setOrigin(0.5, rotation ? 0.5 : 1)
        .setPosition(
          sim.p.x - Math.cos(recoil?.angle || 0) * kick,
          sim.p.y +
            (rotation ? -7 : 25) +
            breathe -
            Math.sin(recoil?.angle || 0) * kick,
        )
        .setDepth(20 + sim.p.y / 1000)
        .setFlipX(sim.facing.x < 0)
        .setRotation(rotation)
        .setAlpha(
          sim.invuln > 0
            ? 0.65 + 0.35 * Math.abs(Math.sin(sim.elapsed * 25))
            : 1,
        );
    } else {
      g.fillStyle(heroes[sim.hero].color);
      g.fillCircle(sim.p.x, sim.p.y, 17);
    }
    if (sim.parry > 0) {
      g.lineStyle(5, 0xf5d49a);
      g.strokeCircle(sim.p.x, sim.p.y, 34);
    }
    if (sim.hero === "knight") {
      g.fillStyle(0x17211b);
      g.fillRect(sim.p.x - 23, sim.p.y + 30, 46, 3);
      g.fillStyle(0xb6c777);
      g.fillRect(sim.p.x - 23, sim.p.y + 30, (46 * sim.p.stamina) / 100, 3);
    }
    for (const t of this.floatTexts) t.setVisible(false);
    let index = 0;
    for (const f of sim.fx) {
      const alpha = f.ttl / f.max;
      if (f.text) {
        let t = this.floatTexts[index];
        if (!t) {
          t = this.add
            .text(0, 0, "", {
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#efd8a4",
              stroke: "#18231f",
              strokeThickness: 3,
            })
            .setDepth(60);
          this.floatTexts.push(t);
        }
        t.setText(f.text)
          .setPosition(f.x, f.y - (1 - alpha) * 25)
          .setAlpha(alpha)
          .setVisible(true);
        index++;
      } else {
        if (f.kind === "dash" && !runtime.reduceMotion) {
          const ex = f.endX ?? f.x + Math.cos(f.angle || 0) * 95;
          const ey = f.endY ?? f.y + Math.sin(f.angle || 0) * 95;
          for (let i = 0; i < 5 && ghostIndex < 16; i++) {
            let ghost = this.ghostViews[ghostIndex];
            if (!ghost) {
              ghost = this.add.image(0, 0, "hero-" + sim.hero);
              this.ghostViews.push(ghost);
            }
            ghost
              .setTexture("hero-" + sim.hero)
              .setDisplaySize(84, 84)
              .setOrigin(0.5, 1)
              .setPosition(
                f.x + ((ex - f.x) * i) / 5,
                f.y + ((ey - f.y) * i) / 5 + 25,
              )
              .setFlipX(Math.cos(f.angle || 0) < 0)
              .setTint(f.color)
              .setAlpha(alpha * (0.08 + i * 0.035))
              .setDepth(19)
              .setVisible(true);
            ghostIndex++;
          }
        }
        drawCombatEffect(g, floor, f, runtime.reduceMotion);
      }
    }
  }
}
export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type:
      new URLSearchParams(location.search).get("renderer") === "webgl"
        ? Phaser.WEBGL
        : Phaser.CANVAS,
    fps: { target: 60, smoothStep: false },
    width: W,
    height: H,
    parent,
    backgroundColor: "#242b2a",
    scale: { mode: Phaser.Scale.NONE },
    scene: Arena,
    render: { antialias: true },
    audio: { noAudio: true },
  });
}
