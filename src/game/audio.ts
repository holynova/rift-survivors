import { audioSamples, musicTracks } from "./audio-bank";
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
  private scoreBuffers = new Map<string, AudioBuffer>();
  private failedMusicTracks: string[] = [];
  private musicLoops = new Map<AudioBufferSourceNode, GainNode>();
  private musicTrack = "";
  private buffers = new Map<string, AudioBuffer>();
  private sampleLoading?: Promise<void>;
  private failedSamples: string[] = [];
  private variations = new Map<string, number>();
  private sampleVoices = new Set<AudioScheduledSourceNode>();
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
    const soften = ctx.createBiquadFilter();
    soften.type = "highshelf";
    soften.frequency.value = 3800;
    soften.gain.value = -4;
    this.effects.connect(soften);
    soften.connect(this.master);
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
  loadSamples() {
    this.sampleLoading ??= (async () => {
      const entries = [
        ...Object.entries(audioSamples).map(([key, path]) => ({
          key,
          path,
          music: false,
        })),
        ...Object.entries(musicTracks).map(([key, path]) => ({
          key,
          path,
          music: true,
        })),
      ];
      let cursor = 0;
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (cursor < entries.length) {
            const { key, path, music } = entries[cursor++];
            try {
              const response = await fetch(import.meta.env.BASE_URL + path, {
                signal: AbortSignal.timeout(8000),
              });
              if (!response.ok)
                throw new Error(`Audio HTTP ${response.status}`);
              (music ? this.scoreBuffers : this.buffers).set(
                key,
                await this.ctx.decodeAudioData(await response.arrayBuffer()),
              );
            } catch {
              (music ? this.failedMusicTracks : this.failedSamples).push(key);
            }
          }
        }),
      );
    })();
    return this.sampleLoading;
  }
  private variation(prefix: string, count = 3) {
    const index = this.variations.get(prefix) ?? 0;
    this.variations.set(prefix, index + 1);
    return {
      key: `${prefix}-${index % count}`,
      rate: 1 + [-0.035, 0.025, -0.012, 0.04][index % 4],
    };
  }
  private sample(key: string, at: number, gain: number, rate = 1, pan = 0) {
    const buffer = this.buffers.get(key);
    if (
      !buffer ||
      this.voices.size >= this.voiceLimit ||
      this.sampleVoices.size >= Math.max(48, this.voiceLimit / 2)
    )
      return;
    const source = this.ctx.createBufferSource(),
      envelope = this.ctx.createGain(),
      space = this.ctx.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    space.pan.value = Math.max(-0.45, Math.min(0.45, pan));
    const duration = buffer.duration / rate;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.002);
    envelope.gain.setValueAtTime(gain, at + Math.max(0.003, duration - 0.018));
    envelope.gain.linearRampToValueAtTime(0, at + duration);
    source.connect(envelope);
    envelope.connect(space);
    space.connect(this.effects);
    this.voices.add(source);
    this.sampleVoices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      this.sampleVoices.delete(source);
      source.disconnect();
      envelope.disconnect();
      space.disconnect();
    };
    source.start(at);
    source.stop(at + duration + 0.002);
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
  play(
    kind: string,
    at = this.ctx.currentTime,
    placement?: { x: number; y: number },
  ) {
    if (!this.effectsVolume) return;
    const [verb, hero = "gunner"] = kind.split(":");
    const gap =
      verb === "hit"
        ? 0.16
        : verb === "kill"
          ? 0.22
          : verb === "turret"
            ? 0.16
            : verb === "attack"
              ? 0.105
              : 0.05;
    if (at - (this.last.get(verb) ?? -100) < gap) return;
    this.last.set(verb, at);
    const pan = placement ? (placement.x / 1100 - 0.5) * 0.6 : 0;
    const layer = (
      key: string,
      gain: number,
      rate = 1,
      delay = 0,
      width = pan,
    ) => this.sample(key, at + delay, gain, rate, width);
    const varied = (
      prefix: string,
      gain: number,
      count = 3,
      rate = 1,
      delay = 0,
    ) => {
      const v = this.variation(prefix, count);
      layer(v.key, gain, rate * v.rate, delay);
    };
    if (verb === "swing") {
      varied(
        "cloth",
        0.2,
        2,
        hero === "hammer" ? 0.65 : hero === "dagger" ? 1.35 : 0.95,
      );
      varied("blade", 0.18, 2, hero === "hammer" ? 0.65 : 1.1);
    } else if (verb === "contact") {
      varied(
        "punch",
        hero === "hammer" ? 0.32 : 0.2,
        3,
        hero === "hammer" ? 0.7 : 1.1,
      );
      varied("metal", 0.14, 3, hero === "hammer" ? 0.72 : 1.05);
      if (hero === "hammer") varied("heavy", 0.22, 2, 0.7);
    } else if (verb === "attack" || verb === "turret") {
      if (verb === "turret" || hero === "engineer") {
        varied("gun", 0.2, 3, 1.18);
        varied("metal", 0.15, 3, 1.1, 0.015);
      } else if (hero === "gunner") {
        varied("gun", 0.37, 3, 1.05);
        varied("heavy", 0.17, 2, 0.9, 0.012);
      } else if (hero === "knight") {
        varied("blade", 0.38, 2, 0.85);
        varied("cloth", 0.18, 2, 0.85);
      } else if (hero === "reaper") {
        varied("blade", 0.32, 2, 1.18);
        varied("cloth", 0.16, 2, 1.2, 0.02);
      } else {
        varied("ice", 0.23, 3, 1.06);
        layer("energy-0", 0.06, 1.15, 0.025);
      }
    } else if (verb === "hit") {
      if (hero === "metal") varied("metal", 0.19, 3, 0.84);
      else varied("punch", 0.14, 3, 0.95);
    } else if (verb === "bomb") {
      layer("boom-0", 0.24, 1.05);
      layer("boom-1", 0.08, 1.2, 0.06);
    } else if (verb === "kill") {
      varied("heavy", 0.12, 2, 1.06);
    } else if (verb === "hurt") {
      varied("heavy", 0.48, 2, 0.76);
      layer("cloth-1", 0.15, 0.8);
      this.duck(at);
    } else if (verb === "core") {
      if (hero === "knight" || hero === "reaper") {
        varied("cloth", 0.34, 2, 0.75);
        if (hero === "reaper") varied("blade", 0.24, 2, 0.85, 0.04);
      } else if (hero === "frost") {
        layer("energy-1", 0.23, 1.2);
        varied("ice", 0.23, 3, 1.12, 0.06);
      } else {
        layer("energy-0", 0.28, 0.9);
        if (hero === "engineer") layer("gear", 0.28, 1.05, 0.06);
      }
    } else if (verb === "skill" || verb === "ultimate") {
      const strong = verb === "ultimate";
      if (hero === "frost") {
        layer("energy-1", strong ? 0.28 : 0.17, 0.8);
        varied("ice", strong ? 0.46 : 0.3, 3, 0.78, 0.05);
        if (strong) layer("ice-2", 0.25, 0.64, 0.14, -0.2);
      } else if (hero === "engineer") {
        layer("gear", 0.38, 0.9);
        varied("metal", 0.28, 3, 0.8, 0.04);
        if (strong) layer("energy-0", 0.26, 0.7, 0.12);
      } else if (hero === "knight") {
        varied("blade", strong ? 0.4 : 0.18, 2, 0.65);
        varied("metal", strong ? 0.3 : 0.38, 3, 0.72, 0.03);
      } else if (hero === "reaper") {
        varied("blade", 0.4, 2, 0.78);
        varied("heavy", strong ? 0.37 : 0.25, 2, 0.78, 0.04);
      } else {
        layer("energy-0", 0.32, strong ? 0.65 : 0.9);
        if (!strong) layer("energy-1", 0.16, 0.72, 0.12);
      }
      if (strong) {
        layer("boom-0", 0.48, 0.86, 0.015);
        layer("boom-1", 0.15, 1.05, 0.11, 0.18);
        this.duck(at);
      }
    } else if (verb === "parry") {
      layer("metal-1", 0.58, 0.78);
      layer("bell", 0.17, 1.2, 0.03);
      layer("heavy-0", 0.3, 0.76);
      this.duck(at);
    } else if (verb === "enemy-impact") {
      layer("boom-1", 0.23, 0.9);
      varied("heavy", 0.2, 2, 0.9);
    } else if (verb === "warning") {
      layer("boom-1", 0.2, 0.82);
      layer("gear", 0.25, 0.72, 0.3);
    } else if (verb === "lost") {
      layer("boom-1", 0.26, 0.64);
      layer("cloth-1", 0.18, 0.65, 0.2);
    } else if (verb === "won") {
      for (let i = 0; i < 3; i++)
        layer("bell", 0.2, [1, 1.25, 1.5][i], i * 0.22, (i - 1) * 0.12);
    } else {
      layer("coin", 0.34, 1.07);
      layer("gear", 0.13, 1.15, 0.025);
    }
  }
  private duck(at: number) {
    this.music.gain.cancelScheduledValues(at);
    this.music.gain.setTargetAtTime(this.musicVolume * 0.6, at, 0.015);
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
    this.musicLoops.clear();
    this.musicTrack = "";
  }
  private startScore(id: string, at: number) {
    if (this.musicTrack === id) return;
    const buffer = this.scoreBuffers.get(id);
    if (!buffer) return;
    for (const [source, gain] of this.musicLoops) {
      gain.gain.cancelAndHoldAtTime(at);
      gain.gain.linearRampToValueAtTime(0, at + 0.65);
      try {
        source.stop(at + 0.7);
      } catch {}
    }
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.85, at + 0.65);
    source.connect(gain);
    gain.connect(this.music);
    this.musicLoops.set(source, gain);
    this.voices.add(source);
    this.musicVoices.add(source);
    source.onended = () => {
      this.musicLoops.delete(source);
      this.voices.delete(source);
      this.musicVoices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(at);
    this.musicTrack = id;
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
    const track =
      scene.wave >= 12
        ? "last-guardian"
        : scene.wave >= 8
          ? "rift-storm"
          : scene.wave >= 4
            ? "iron-march"
            : "first-light";
    this.startScore(track, now);
    if (this.nextBeat < now - 0.2) this.nextBeat = now;
    while (this.nextBeat < now + 0.14) {
      if (!this.scoreBuffers.has(track)) this.score(this.nextBeat, this.beat);
      this.beat++;
      this.nextBeat +=
        60 /
        (scene.wave >= 12
          ? 136
          : scene.wave >= 8
            ? 128
            : scene.wave >= 4
              ? 118
              : 108) /
        4;
    }
  }
  private score(at: number, step: number) {
    const boss = this.scene.wave >= 12,
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
      sampleVoices: this.sampleVoices.size,
      samplesLoaded: this.buffers.size,
      failedSamples: [...this.failedSamples],
      musicVoices: this.musicVoices.size,
      musicTrack: this.musicTrack,
      musicTracksLoaded: this.scoreBuffers.size,
      failedMusicTracks: [...this.failedMusicTracks],
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
export async function unlockAudio() {
  context ??= new AudioContext();
  mixer ??= new AudioMixer(context);
  mixer.configure(
    settings.sound,
    settings.music,
    settings.effectsVolume,
    settings.musicVolume,
  );
  await context.resume();
  await mixer.loadSamples();
}
export function sound(kind: string, placement?: { x: number; y: number }) {
  if (context?.state === "running")
    mixer?.play(kind, context.currentTime, placement);
}
export function updateAudio(scene: AudioScene) {
  if (context?.state === "running") mixer?.update(scene);
}
export function audioStats() {
  return { state: context?.state ?? "locked", ...mixer?.stats() };
}
