export type HeroId = "gunner" | "knight" | "frost" | "engineer" | "reaper";
export const heroes = {
  gunner: {
    name: "时间枪手",
    tag: "闪现 · 回溯 · 双枪",
    hp: 90,
    speed: 210,
    damage: 12,
    interval: 0.32,
    range: 520,
    color: 0x65c9bf,
    core: "闪现",
    skill: "时间回溯",
    ultimate: "脉冲爆炸",
  },
  knight: {
    name: "灰烬骑士",
    tag: "精力 · 翻滚 · 弹反",
    hp: 150,
    speed: 165,
    damage: 32,
    interval: 0.8,
    range: 110,
    color: 0xefa957,
    core: "翻滚",
    skill: "盾反",
    ultimate: "灰烬风暴",
  },
  frost: {
    name: "霜环术士",
    tag: "连锁冰箭 · 减速领域 · 冰封",
    hp: 85,
    speed: 185,
    damage: 18,
    interval: 0.65,
    range: 440,
    color: 0x8cdcff,
    core: "霜步",
    skill: "寒霜领域",
    ultimate: "极寒冰封",
  },
  engineer: {
    name: "机巧召唤师",
    tag: "炮台布阵 · 换位 · 超载",
    hp: 110,
    speed: 180,
    damage: 14,
    interval: 0.65,
    range: 450,
    color: 0xc9c66d,
    core: "磁力跃迁",
    skill: "部署炮台",
    ultimate: "机械军团",
  },
  reaper: {
    name: "血刃猎手",
    tag: "血能 · 穿刺 · 吸血爆发",
    hp: 105,
    speed: 230,
    damage: 23,
    interval: 0.5,
    range: 115,
    color: 0xec648d,
    core: "血影突刺",
    skill: "汲血斩",
    ultimate: "猩红收割",
  },
} as const;
export const upgrades = [
  { id: "damage", name: "锋刃", desc: "基础伤害 +14%", icon: "✦" },
  { id: "attack", name: "疾攻", desc: "攻击间隔 −10%", icon: "»" },
  { id: "health", name: "生命之火", desc: "最大生命 +25，恢复 25", icon: "♥" },
  { id: "speed", name: "轻步", desc: "移动速度 +12%", icon: "↗" },
  { id: "pickup", name: "引力", desc: "拾取范围 +35", icon: "◎" },
  { id: "crit", name: "弱点洞悉", desc: "暴击率 +10%", icon: "⌖" },
  { id: "armor", name: "坚韧", desc: "护甲 +2（上限12）", icon: "▣" },
  { id: "haste", name: "技艺", desc: "技能冷却 −12%", icon: "◷" },
];
export const specials = {
  gunner: [
    { id: "trail", name: "闪现尾焰", desc: "闪现路径造成范围伤害", icon: "ϟ" },
    {
      id: "echo",
      name: "时间余响",
      desc: "回溯后 5 秒攻击速度翻倍",
      icon: "◴",
    },
    { id: "flow", name: "奔流", desc: "移动暴击 +15%，移速 +8%", icon: "↝" },
  ],
  knight: [
    {
      id: "execution",
      name: "处决冲击",
      desc: "弹反范围与伤害提高",
      icon: "✧",
    },
    { id: "ember", name: "余烬", desc: "每第三次斩击释放范围爆发", icon: "♨" },
    { id: "roll", name: "疾滚", desc: "翻滚精力消耗降低至 15", icon: "↻" },
  ],
  frost: [
    { id: "shatter", name: "碎冰连锁", desc: "冰箭连锁目标 +2", icon: "❄" },
    {
      id: "permafrost",
      name: "永冻领域",
      desc: "领域持续 +3 秒，范围 +25",
      icon: "❄",
    },
    { id: "icewalk", name: "霜痕", desc: "霜步在落点留下寒霜领域", icon: "❄" },
  ],
  engineer: [
    {
      id: "assembly",
      name: "扩充阵列",
      desc: "炮台上限 +1，军团也受益",
      icon: "⚙",
    },
    { id: "gears", name: "精密齿轮", desc: "炮台射击速度 +25%", icon: "⚙" },
    { id: "repair", name: "应急维修", desc: "部署炮台恢复 8 生命", icon: "⚙" },
  ],
  reaper: [
    { id: "thirst", name: "血渴", desc: "汲血斩恢复量 +50%", icon: "♦" },
    {
      id: "edge",
      name: "血锋",
      desc: "血能至少60时普通攻击伤害 +30%",
      icon: "♦",
    },
    { id: "harvest", name: "丰收", desc: "猩红收割最低血能降至40", icon: "♦" },
  ],
};
export const relics = [
  { id: "stone", name: "磨刀石", desc: "伤害 +12%", price: 28, icon: "◆" },
  { id: "feather", name: "疾风羽", desc: "攻速 +10%", price: 30, icon: "»" },
  {
    id: "ruby",
    name: "红宝石",
    desc: "生命 +20，恢复 20",
    price: 32,
    icon: "♥",
  },
  { id: "wall", name: "铁壁", desc: "护甲 +3（上限12）", price: 36, icon: "▣" },
  { id: "magnet", name: "磁石", desc: "拾取范围 +50", price: 20, icon: "◎" },
  {
    id: "leech",
    name: "吸血印",
    desc: "击杀恢复生命，每层0.35（上限1.4）",
    price: 42,
    icon: "♧",
  },
];
export type Choice = { id: string; name: string; desc: string; icon: string };

export const heroIds = Object.keys(heroes) as HeroId[];
export const heroDetails: Record<
  HeroId,
  { subtitle: string; description: string }
> = {
  gunner: {
    subtitle: "时空游侠",
    description:
      "三层闪现穿过怪潮，回溯恢复过去的状态。双枪自动攻击最近的敌人。",
  },
  knight: {
    subtitle: "灰烬守望",
    description: "消耗精力挥剑与翻滚，在受击前瞬间盾反，触发高伤害处决。",
  },
  frost: {
    subtitle: "极寒织法者",
    description:
      "冰箭连锁三个目标，寒霜领域持续伤害并减速。用霜步脱离包围，再冰封整片怪潮。",
  },
  engineer: {
    subtitle: "铜芯造物师",
    description:
      "部署最多三座炮台自动索敌，用磁力跃迁与炮台换位。机械军团补充炮台并让它们短时超载。",
  },
  reaper: {
    subtitle: "猩红追猎者",
    description:
      "双刃命中积累血能，突刺贯穿敌群。汲血斩恢复生命；至少60血能释放猩红收割，消耗血能并爆发吸血。",
  },
};

// Authoritative encounter curve. Each wave lasts 45 seconds; finale continues until victory.
export const waves = [
  { health: 1.05, speed: 0.95, spawn: 0.82, runners: 0, archers: 0, elites: 0 },
  {
    health: 1.25,
    speed: 1.02,
    spawn: 0.72,
    runners: 0.16,
    archers: 0.1,
    elites: 0,
  },
  {
    health: 1.5,
    speed: 1.09,
    spawn: 0.62,
    runners: 0.28,
    archers: 0.18,
    elites: 0,
  },
  {
    health: 1.8,
    speed: 1.17,
    spawn: 0.55,
    runners: 0.3,
    archers: 0.22,
    elites: 1,
  },
  {
    health: 2.15,
    speed: 1.25,
    spawn: 0.48,
    runners: 0.33,
    archers: 0.25,
    elites: 1,
  },
  {
    health: 2.6,
    speed: 1.32,
    spawn: 0.42,
    runners: 0.35,
    archers: 0.28,
    elites: 1,
  },
  {
    health: 3.1,
    speed: 1.38,
    spawn: 0.36,
    runners: 0.37,
    archers: 0.3,
    elites: 2,
  },
  {
    health: 3.7,
    speed: 1.44,
    spawn: 0.4,
    runners: 0.38,
    archers: 0.3,
    elites: 1,
  },
] as const;
export const balance = {
  baseEnemyHp: [30, 24, 30, 340, 1200],
  baseEnemySpeed: [64, 120, 59, 62, 54],
  healPrice: 18,
  healFraction: 0.3,
  maxArmor: 12,
} as const;
