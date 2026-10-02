import type { HeroId } from "./content";
import type { Phase } from "./simulation";

export type AudioScene = {
  phase: Phase | "menu";
  wave: number;
  hero: HeroId;
  danger: boolean;
};
/** Original procedural score and layered effects; also supports OfflineAudioContext for audition exports. */
export class AudioMixer {
  readonly master: DynamicsCompressorNode;
  readonly effects: GainNode;
  readonly music: GainNode;
  private noise: AudioBuffer;
  private voices = new Set<AudioScheduledSourceNode>();
  private musicVoices = new Set<AudioScheduledSourceNode>();
  private last = new Map<string, number>();
  private scene: AudioScene = {
    phase: "menu",
    wave: 1,
    hero: "gunner",
    danger: false,
  };
  private nextBeat = 0;
  private beat = 0;
  private playing = false;
  private musicVolume = 0.42;
  private effectsVolume = 0.75;
  constructor(
    readonly ctx: BaseAudioContext,
    readonly voiceLimit = 96,
  ) {
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -16;
    this.master.ratio.value = 5;
    this.master.attack.value = 0.003;
    this.master.release.value = 0.18;
    this.master.connect(ctx.destination);
    this.effects = ctx.createGain();
    this.effects.gain.value = this.effectsVolume;
    this.effects.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 3200;
    warmth.Q.value = 0.5;
    this.music.connect(warmth);
    warmth.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 7411;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
  }
  configure(
    sound: boolean,
    music: boolean,
    sfxVolume = 0.75,
    musicVolume = 0.42,
  ) {
    this.effectsVolume = sound ? sfxVolume : 0;
    this.musicVolume = music ? musicVolume : 0;
    this.effects.gain.setTargetAtTime(
      this.effectsVolume,
      this.ctx.currentTime,
      0.03,
    );
    if (!music) this.stopMusic();
  }
  private track(source: AudioScheduledSourceNode, music: boolean) {
    this.voices.add(source);
    if (music) this.musicVoices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      this.musicVoices.delete(source);
      source.disconnect();
    };
  }
  private tone(
    f: number,
    at: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    end = f,
    music = false,
  ) {
    if (this.voices.size >= this.voiceLimit) return;
    const source = this.ctx.createOscillator(),
      envelope = this.ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(f, at);
    source.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      at + duration,
    );
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(envelope);
    envelope.connect(music ? this.music : this.effects);
    this.track(source, music);
    source.onended = () => {
      this.voices.delete(source);
      this.musicVoices.delete(source);
      source.disconnect();
      envelope.disconnect();
    };
    source.start(at);
    source.stop(at + duration + 0.02);
  }
  private hiss(
    at: number,
    duration: number,
    gain: number,
    freq: number,
    music = false,
  ) {
    if (this.voices.size >= this.voiceLimit) return;
    const source = this.ctx.createBufferSource(),
      filter = this.ctx.createBiquadFilter(),
      envelope = this.ctx.createGain();
    source.buffer = this.noise;
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    envelope.gain.setValueAtTime(gain, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(music ? this.music : this.effects);
    this.track(source, music);
    source.onended = () => {
      this.voices.delete(source);
      this.musicVoices.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    source.start(at, 0);
    source.stop(at + duration);
  }
  play(kind: string, at = this.ctx.currentTime) {
    if (!this.effectsVolume) return;
    const [verb, hero = "gunner"] = kind.split(":");
    const gap =
      verb === "hit"
        ? 0.08
        : verb === "kill"
          ? 0.12
          : verb === "turret"
            ? 0.1
            : verb === "attack"
              ? 0.09
              : 0.03;
    if (at - (this.last.get(verb) ?? -100) < gap) return;
    this.last.set(verb, at);
    const tone = (
      f: number,
      d: number,
      g: number,
      type: OscillatorType = "sine",
      end = f,
      delay = 0,
    ) => this.tone(f, at + delay, d, g, type, end);
    const noise = (d: number, g: number, f: number, delay = 0) =>
      this.hiss(at + delay, d, g, f);
    if (verb === "attack" || verb === "turret") {
      if (hero === "frost" && verb !== "turret") {
        tone(1700, 0.13, 0.055, "sine", 600);
        tone(2400, 0.18, 0.025, "triangle", 1200, 0.025);
        noise(0.09, 0.1, 4500);
      } else if (hero === "knight" || hero === "reaper") {
        noise(0.17, 0.26, hero === "knight" ? 1300 : 2700);
        tone(hero === "knight" ? 230 : 420, 0.12, 0.09, "triangle", 65);
      } else {
        noise(0.065, 0.38, 1800);
        tone(verb === "turret" ? 180 : 260, 0.095, 0.13, "triangle", 45);
        tone(950, 0.035, 0.045, "square", 280);
      }
    } else if (verb === "hit") {
      noise(0.05, 0.11, 1400);
      tone(180, 0.06, 0.04, "triangle", 70);
    } else if (verb === "kill") {
      tone(340, 0.11, 0.04, "triangle", 90);
      noise(0.09, 0.08, 750);
    } else if (verb === "hurt") {
      tone(90, 0.28, 0.2, "sawtooth", 35);
      noise(0.18, 0.27, 550);
      this.duck(at);
    } else if (verb === "core") {
      noise(0.25, 0.21, hero === "frost" ? 5000 : 1600);
      tone(hero === "reaper" ? 300 : 450, 0.23, 0.1, "triangle", 1600);
    } else if (verb === "skill" || verb === "ultimate") {
      const strong = verb === "ultimate",
        base =
          hero === "frost"
            ? 660
            : hero === "engineer"
              ? 220
              : hero === "reaper"
                ? 130
                : 330;
      noise(
        strong ? 0.6 : 0.3,
        strong ? 0.4 : 0.22,
        hero === "frost" ? 5000 : 950,
      );
      for (let i = 0; i < (strong ? 6 : 3); i++)
        tone(
          base * Math.pow(2, i / 4),
          0.32,
          strong ? 0.1 : 0.07,
          "triangle",
          base * 0.7,
          i * 0.055,
        );
      tone(100, strong ? 0.8 : 0.25, strong ? 0.23 : 0.1, "sine", 30);
      if (strong) this.duck(at);
    } else if (verb === "parry") {
      tone(1500, 0.48, 0.13, "sine", 850);
      tone(2100, 0.4, 0.08, "triangle", 1200);
      noise(0.16, 0.3, 3000);
    } else if (verb === "warning") {
      tone(220, 0.35, 0.1, "triangle", 180);
      tone(220, 0.35, 0.08, "triangle", 180, 0.4);
    } else if (verb === "lost") {
      tone(220, 0.6, 0.12, "triangle", 80);
      tone(130, 0.9, 0.09, "sine", 45, 0.3);
    } else if (verb === "won") {
      for (const [i, n] of [523, 659, 784, 1046].entries())
        tone(n, 0.7, 0.08, "triangle", n, i * 0.15);
    } else {
      for (let i = 0; i < 3; i++)
        tone([523, 659, 784][i], 0.24, 0.065, "sine", undefined, i * 0.07);
    }
  }
  private duck(at: number) {
    this.music.gain.cancelScheduledValues(at);
    this.music.gain.setValueAtTime(this.musicVolume * 0.35, at);
    this.music.gain.setTargetAtTime(this.musicVolume, at + 0.22, 0.12);
  }
  private stopMusic() {
    this.playing = false;
    this.music.gain.cancelScheduledValues(this.ctx.currentTime);
    this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.025);
    for (const voice of this.musicVoices) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.musicVoices.clear();
  }
  update(scene: AudioScene, now = this.ctx.currentTime) {
    const active = scene.phase === "battle" && this.musicVolume > 0;
    if (
      scene.phase !== this.scene.phase &&
      (scene.phase === "won" || scene.phase === "lost")
    )
      this.play(scene.phase, now);
    if (!active) {
      if (this.playing) this.stopMusic();
      this.scene = scene;
      return;
    }
    if (!this.playing) {
      this.playing = true;
      this.nextBeat = now + 0.03;
      this.beat = 0;
      this.music.gain.setTargetAtTime(this.musicVolume, now, 0.15);
    }
    this.scene = scene;
    if (this.nextBeat < now - 0.2) this.nextBeat = now;
    while (this.nextBeat < now + 0.14) {
      this.score(this.nextBeat, this.beat++);
      this.nextBeat +=
        60 / (scene.wave === 8 ? 132 : scene.wave >= 4 ? 120 : 108) / 4;
    }
  }
  private score(at: number, step: number) {
    const boss = this.scene.wave === 8,
      intensity = boss || this.scene.wave >= 4 || this.scene.danger;
    const bar = Math.floor(step / 16) % 4,
      p = step % 16,
      root = [45, 41, 48, 43][bar];
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    // A minor / F / C / G: original arpeggio motif with restrained pad and driving bass.
    if (p === 0) {
      for (const n of [root + 12, root + (bar === 0 ? 15 : 16), root + 19])
        this.tone(hz(n), at, 1.6, 0.018, "sine", hz(n), true);
    }
    if (p % 4 === 0) {
      this.tone(hz(root), at, 0.3, 0.12, "triangle", hz(root), true);
      this.tone(130, at, 0.16, 0.15, "sine", 38, true);
    }
    if (p === 4 || p === 12) {
      this.hiss(at, 0.1, 0.12, 1700, true);
      this.tone(170, at, 0.09, 0.06, "triangle", 65, true);
    }
    if (p % 2 === 0) this.hiss(at, 0.025, 0.045, intensity ? 7500 : 5800, true);
    const motif = [0, 7, 12, 10, 7, 3, 7, 2];
    if (p % (intensity ? 2 : 4) === 0) {
      const note = root + 24 + motif[Math.floor(p / 2)];
      this.tone(hz(note), at, 0.27, 0.035, "triangle", hz(note), true);
      this.tone(hz(note), at + 0.14, 0.18, 0.01, "sine", hz(note), true);
    }
    if (boss && p % 2 === 1)
      this.tone(
        hz(root + 12 + (p % 4 === 1 ? 0 : 7)),
        at,
        0.13,
        0.036,
        "sawtooth",
        hz(root + 12),
        true,
      );
  }
  stats() {
    return {
      voices: this.voices.size,
      musicVoices: this.musicVoices.size,
      playing: this.playing,
      beat: this.beat,
      effectsVolume: this.effectsVolume,
      musicVolume: this.musicVolume,
    };
  }
}
let context: AudioContext | undefined;
let mixer: AudioMixer | undefined;
let settings = {
  sound: true,
  music: true,
  effectsVolume: 0.75,
  musicVolume: 0.42,
};
export function configureAudio(
  sound: boolean,
  music: boolean,
  effectsVolume: number,
  musicVolume: number,
) {
  settings = { sound, music, effectsVolume, musicVolume };
  mixer?.configure(sound, music, effectsVolume, musicVolume);
}
export function unlockAudio() {
  context ??= new AudioContext();
  mixer ??= new AudioMixer(context);
  mixer.configure(
    settings.sound,
    settings.music,
    settings.effectsVolume,
    settings.musicVolume,
  );
  void context.resume();
}
export function sound(kind: string) {
  if (context?.state === "running") mixer?.play(kind);
}
export function updateAudio(scene: AudioScene) {
  if (context?.state === "running") mixer?.update(scene);
}
export function audioStats() {
  return { state: context?.state ?? "locked", ...mixer?.stats() };
}
