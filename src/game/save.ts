export type Save = {
  version: 1;
  bestWave: number;
  bestKills: number;
  wins: number;
  sound: boolean;
  music: boolean;
  effectsVolume: number;
  musicVolume: number;
  reduceMotion: boolean;
};
export const defaultSave: Save = {
  version: 1,
  bestWave: 0,
  bestKills: 0,
  wins: 0,
  sound: true,
  music: true,
  effectsVolume: 0.75,
  musicVolume: 0.42,
  reduceMotion: false,
};
export function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem("rift-survivors-v1") || "null");
    if (s?.version === 1)
      return {
        ...defaultSave,
        bestWave: typeof s.bestWave === "number" ? s.bestWave : 0,
        bestKills: typeof s.bestKills === "number" ? s.bestKills : 0,
        wins: typeof s.wins === "number" ? s.wins : 0,
        sound: typeof s.sound === "boolean" ? s.sound : true,
        music: typeof s.music === "boolean" ? s.music : true,
        effectsVolume:
          typeof s.effectsVolume === "number" &&
          Number.isFinite(s.effectsVolume)
            ? Math.max(0, Math.min(1, s.effectsVolume))
            : 0.75,
        musicVolume:
          typeof s.musicVolume === "number" && Number.isFinite(s.musicVolume)
            ? Math.max(0, Math.min(1, s.musicVolume))
            : 0.42,
        reduceMotion: !!s.reduceMotion,
      };
  } catch {}
  return { ...defaultSave };
}
export function writeSave(s: Save) {
  try {
    localStorage.setItem("rift-survivors-v1", JSON.stringify(s));
  } catch {}
}
