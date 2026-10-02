const art5 = import.meta.env.BASE_URL + "assets/v5/";
const root = import.meta.env.BASE_URL + "assets/v2/";
export const manifest = {
  images: {
    "hero-gunner": root + "gunner-idle.png",
    "hero-knight": root + "knight-idle.png",
    "hero-frost": art5 + "frost-idle.png",
    "hero-engineer": art5 + "engineer-idle.png",
    "hero-reaper": art5 + "reaper-idle.png",
    "enemy-0": art5 + "enemy-husk-idle.png",
    "enemy-1": art5 + "enemy-runner-idle.png",
    "enemy-2": art5 + "enemy-archer-idle.png",
    "enemy-3": art5 + "enemy-elite-idle.png",
    "enemy-4": art5 + "enemy-boss-idle.png",
    "turret-painted": art5 + "turret.png",
    "arena-painted": root + "arena-floor.webp",
  },
  sheets: {
    "hero-gunner-run": {
      url: root + "gunner-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "hero-knight-run": {
      url: root + "knight-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "hero-frost-run": {
      url: art5 + "frost-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "hero-engineer-run": {
      url: art5 + "engineer-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "hero-reaper-run": {
      url: art5 + "reaper-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "enemy-0-run": {
      url: art5 + "enemy-husk-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "enemy-1-run": {
      url: art5 + "enemy-runner-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "enemy-2-run": {
      url: art5 + "enemy-archer-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "enemy-3-run": {
      url: art5 + "enemy-elite-run.png",
      frameWidth: 128,
      frameHeight: 128,
    },
    "enemy-4-run": {
      url: art5 + "enemy-boss-run.png",
      frameWidth: 192,
      frameHeight: 192,
    },
  },
} as const;
export const iconKeys: Record<string, string> = {
  damage: "stone",
  attack: "feather",
  health: "ruby",
  speed: "feather",
  pickup: "magnet",
  crit: "pulse",
  armor: "wall",
  haste: "recall",
  trail: "blink",
  echo: "recall",
  flow: "blink",
  execution: "parry",
  ember: "storm",
  roll: "roll",
  shatter: "frost-bolt",
  permafrost: "frost-zone",
  icewalk: "frost-step",
  assembly: "engineer-turret",
  gears: "engineer-army",
  repair: "engineer-swap",
  thirst: "reaper-drain",
  edge: "reaper-dash",
  harvest: "reaper-harvest",
  stone: "stone",
  feather: "feather",
  ruby: "ruby",
  wall: "wall",
  magnet: "magnet",
  leech: "leech",
};
export const skillIcons = {
  gunner: { core: "blink", skill: "recall", ultimate: "pulse" },
  knight: { core: "roll", skill: "parry", ultimate: "storm" },
  frost: { core: "frost-step", skill: "frost-zone", ultimate: "frost-bolt" },
  engineer: {
    core: "engineer-swap",
    skill: "engineer-turret",
    ultimate: "engineer-army",
  },
  reaper: {
    core: "reaper-dash",
    skill: "reaper-drain",
    ultimate: "reaper-harvest",
  },
} as const;
export const iconUrl = (name: string) =>
  /^(frost|engineer|reaper)-/.test(name)
    ? art5 + "icon-" + name + ".png"
    : root + "icon-" + name + ".png";
