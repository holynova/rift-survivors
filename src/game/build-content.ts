import type { HeroId } from "./content";
export type Group = "melee" | "ranged" | "elemental" | "engineering";
export type Family = "blade" | "gun" | "heavy" | "element" | "device";
export type Stat =
  | "damage"
  | "attack"
  | Group
  | "crit"
  | "armor"
  | "dodge"
  | "regen"
  | "lifesteal"
  | "harvest"
  | "luck"
  | "pickup"
  | "speed"
  | "maxHp";
export const statNames: Record<Stat, string> = {
  damage: "伤害%",
  attack: "攻速%",
  melee: "近战",
  ranged: "远程",
  elemental: "元素",
  engineering: "工程",
  crit: "暴击%",
  armor: "护甲",
  dodge: "闪避%",
  regen: "每秒恢复",
  lifesteal: "吸血%",
  harvest: "每波收获",
  luck: "幸运",
  pickup: "拾取范围",
  speed: "移速%",
  maxHp: "生命",
};
export type WeaponDef = {
  id: string;
  name: string;
  group: Group;
  family: Family;
  damage: number;
  interval: number;
  range: number;
  price: number;
  color: number;
  description: string;
  mode: "melee" | "bullet" | "ice" | "bomb" | "turret";
  pellets?: number;
  pierce?: number;
  radius?: number;
  knock?: number;
  scale: number;
};
export const weapons: WeaponDef[] = [
  {
    id: "dagger",
    name: "疾影匕首",
    group: "melee",
    family: "blade",
    damage: 9,
    interval: 0.35,
    range: 95,
    price: 18,
    color: 0xd2ddb0,
    description: "快速单体刺击；适合暴击与吸血",
    mode: "melee",
    scale: 0.7,
  },
  {
    id: "spear",
    name: "守卫长矛",
    group: "melee",
    family: "blade",
    damage: 17,
    interval: 0.9,
    range: 185,
    price: 24,
    color: 0xe2ce9d,
    description: "窄角度长距离贯穿斩击",
    mode: "melee",
    scale: 1.1,
    knock: 14,
  },
  {
    id: "hammer",
    name: "裂岩重锤",
    group: "melee",
    family: "heavy",
    damage: 28,
    interval: 1.5,
    range: 130,
    price: 30,
    color: 0xebae6a,
    description: "广角重击与强力击退",
    mode: "melee",
    scale: 1.6,
    knock: 42,
  },
  {
    id: "boomerang",
    name: "回旋刃",
    group: "melee",
    family: "blade",
    damage: 13,
    interval: 1.1,
    range: 400,
    price: 28,
    color: 0xbacc95,
    description: "去程与回程均可命中，穿过敌群",
    mode: "bullet",
    scale: 0.9,
    pierce: 3,
  },
  {
    id: "pistol",
    name: "游侠手枪",
    group: "ranged",
    family: "gun",
    damage: 13,
    interval: 0.75,
    range: 520,
    price: 20,
    color: 0x8dccbd,
    description: "稳定单发，远程属性收益高",
    mode: "bullet",
    scale: 1,
  },
  {
    id: "smg",
    name: "连发枪",
    group: "ranged",
    family: "gun",
    damage: 5,
    interval: 0.2,
    range: 390,
    price: 30,
    color: 0x75cdbf,
    description: "低伤高频，适合命中触发",
    mode: "bullet",
    scale: 0.4,
  },
  {
    id: "shotgun",
    name: "碎星霰弹",
    group: "ranged",
    family: "gun",
    damage: 8,
    interval: 1.3,
    range: 310,
    price: 30,
    color: 0xe7c277,
    description: "五发扇形散射，近距离集中命中",
    mode: "bullet",
    scale: 0.5,
    pellets: 5,
  },
  {
    id: "crossbow",
    name: "穿透弩",
    group: "ranged",
    family: "gun",
    damage: 21,
    interval: 1.25,
    range: 650,
    price: 32,
    color: 0xb7cca0,
    description: "贯穿三目标；适合引怪排成直线",
    mode: "bullet",
    scale: 1.3,
    pierce: 2,
  },
  {
    id: "ice",
    name: "冰晶杖",
    group: "elemental",
    family: "element",
    damage: 14,
    interval: 1,
    range: 450,
    price: 28,
    color: 0x8edcf1,
    description: "冻结目标并向近邻传导寒霜",
    mode: "ice",
    scale: 1.2,
  },
  {
    id: "bomb",
    name: "爆破器",
    group: "elemental",
    family: "heavy",
    damage: 25,
    interval: 1.8,
    range: 420,
    price: 35,
    color: 0xf6a675,
    description: "命中爆炸；范围清理密集怪群",
    mode: "bomb",
    scale: 1.4,
    radius: 90,
  },
  {
    id: "scythe",
    name: "汲血镰",
    group: "melee",
    family: "blade",
    damage: 18,
    interval: 1.2,
    range: 135,
    price: 32,
    color: 0xe890a5,
    description: "广角收割，命中额外恢复生命",
    mode: "melee",
    scale: 1.1,
  },
  {
    id: "deployer",
    name: "哨戒部署器",
    group: "engineering",
    family: "device",
    damage: 12,
    interval: 4.5,
    range: 480,
    price: 32,
    color: 0xe9cc81,
    description: "周期布置炮台；仅受工程和伤害加成",
    mode: "turret",
    scale: 1.4,
  },
];
export const weaponById = Object.fromEntries(
  weapons.map((w) => [w.id, w]),
) as Record<string, WeaponDef>;
export const familyNames: Record<Family, string> = {
  blade: "刃器",
  gun: "枪械",
  heavy: "重装",
  element: "元素",
  device: "装置",
};
export const familyBenefits: Record<Family, string> = {
  blade: "每2把 +3%闪避",
  gun: "每2把 +4%暴击",
  heavy: "每2把 +1护甲",
  element: "每2把 +2元素",
  device: "每2把 +3工程",
};
export const roster: HeroId[] = ["gunner", "knight", "engineer"];
export const buildHeroes: Record<
  string,
  {
    description: string;
    start: string[];
    scale: Record<Group, number>;
    stats: Partial<Record<Stat, number>>;
  }
> = {
  gunner: {
    description:
      "远程武器收益 +30%，近战收益 −40%。从精准射击到六枪弹幕，装备决定你的打法。",
    start: ["pistol", "smg", "crossbow"],
    scale: { melee: 0.6, ranged: 1.3, elemental: 1, engineering: 0.8 },
    stats: { speed: 5 },
  },
  knight: {
    description:
      "近战收益 +30%，初始护甲 +3；远程收益 −40%。长矛控距、重锤推墙或快速吸血。",
    start: ["spear", "dagger", "hammer"],
    scale: { melee: 1.3, ranged: 0.6, elemental: 0.8, engineering: 0.8 },
    stats: { armor: 3, maxHp: 15 },
  },
  engineer: {
    description:
      "工程收益 +40%，普通武器收益 −25%。装置提供阵地火力；可混搭防身武器。",
    start: ["deployer", "pistol", "bomb"],
    scale: { melee: 0.75, ranged: 0.75, elemental: 0.9, engineering: 1.4 },
    stats: { engineering: 4, harvest: 5 },
  },
};
export type ItemDef = {
  id: string;
  name: string;
  description: string;
  price: number;
  mods: Partial<Record<Stat, number>>;
  mechanic?: string;
};
export const items: ItemDef[] = [
  {
    id: "coldcrit",
    name: "寒霜透镜",
    description: "暴击在命中处留下减速冰区；内置1秒间隔",
    price: 42,
    mods: { elemental: 2 },
    mechanic: "coldcrit",
  },
  {
    id: "shards",
    name: "裂隙碎片",
    description: "击杀爆出碎片，对附近敌人造成范围伤害；不递归触发",
    price: 48,
    mods: { damage: -5 },
    mechanic: "shards",
  },
  {
    id: "wallbang",
    name: "震荡铁砧",
    description: "击退撞墙时追加伤害；每目标0.5秒间隔",
    price: 42,
    mods: { melee: 2, speed: -4 },
    mechanic: "wallbang",
  },
  {
    id: "overheal",
    name: "余烬护符",
    description: "过量恢复转换为护盾，上限25；每秒恢复 +1",
    price: 45,
    mods: { regen: 1 },
    mechanic: "overheal",
  },
  {
    id: "siege",
    name: "阵地核心",
    description: "站定0.8秒后炮台伤害 +60%；移动解除",
    price: 38,
    mods: { engineering: 3, speed: -5 },
    mechanic: "siege",
  },
  {
    id: "pierce",
    name: "贯通弹芯",
    description: "远程弹丸额外穿透1个目标；穿透后伤害衰减",
    price: 45,
    mods: { ranged: 2, attack: -5 },
    mechanic: "pierce",
  },
  {
    id: "ricochet",
    name: "回响导体",
    description: "每次攻击首次命中弹射一次，造成35%伤害；不再次触发道具",
    price: 46,
    mods: { damage: -6 },
    mechanic: "ricochet",
  },
  {
    id: "shatter",
    name: "碎冰刻印",
    description: "直接攻击冻结敌人时追加范围碎冰；消耗冻结状态",
    price: 43,
    mods: { elemental: 3 },
    mechanic: "shatter",
  },
  {
    id: "edge",
    name: "磨刃石",
    description: "近战 +3，最大生命 −4",
    price: 19,
    mods: { melee: 3, maxHp: -4 },
  },
  {
    id: "scope",
    name: "精密瞄具",
    description: "远程 +3，移速 −4%",
    price: 21,
    mods: { ranged: 3, speed: -4 },
  },
  {
    id: "ember",
    name: "元素火种",
    description: "元素 +4，护甲 −1",
    price: 23,
    mods: { elemental: 4, armor: -1 },
  },
  {
    id: "gear",
    name: "精密齿轮",
    description: "工程 +4，攻速 −5%",
    price: 24,
    mods: { engineering: 4, attack: -5 },
  },
  {
    id: "boots",
    name: "轻羽靴",
    description: "移速 +8%，护甲 −1",
    price: 18,
    mods: { speed: 8, armor: -1 },
  },
  {
    id: "plate",
    name: "重装甲片",
    description: "护甲 +2，移速 −4%",
    price: 23,
    mods: { armor: 2, speed: -4 },
  },
  {
    id: "heart",
    name: "生命火种",
    description: "最大生命 +12",
    price: 22,
    mods: { maxHp: 12 },
  },
  {
    id: "trigger",
    name: "轻型扳机",
    description: "攻速 +10%，伤害 −4%",
    price: 23,
    mods: { attack: 10, damage: -4 },
  },
  {
    id: "power",
    name: "增幅器",
    description: "伤害 +12%，攻速 −5%",
    price: 25,
    mods: { damage: 12, attack: -5 },
  },
  {
    id: "lens",
    name: "弱点透镜",
    description: "暴击 +8%，最大生命 −4",
    price: 24,
    mods: { crit: 8, maxHp: -4 },
  },
  {
    id: "cloak",
    name: "幻影披风",
    description: "闪避 +8%，护甲 −1",
    price: 25,
    mods: { dodge: 8, armor: -1 },
  },
  {
    id: "sap",
    name: "再生树液",
    description: "每秒恢复 +0.5",
    price: 27,
    mods: { regen: 0.5 },
  },
  {
    id: "fang",
    name: "汲血獠牙",
    description: "吸血 +5%，伤害 −3%",
    price: 28,
    mods: { lifesteal: 5, damage: -3 },
  },
  {
    id: "basket",
    name: "丰收背篓",
    description: "每波收获 +8，伤害 −5%",
    price: 25,
    mods: { harvest: 8, damage: -5 },
  },
  {
    id: "coin",
    name: "幸运古币",
    description: "幸运 +12，最大生命 −3",
    price: 21,
    mods: { luck: 12, maxHp: -3 },
  },
  {
    id: "magnet",
    name: "材料磁石",
    description: "拾取范围 +35",
    price: 18,
    mods: { pickup: 35 },
  },
  {
    id: "medal",
    name: "决斗勋章",
    description: "近战 +2，暴击 +4%",
    price: 26,
    mods: { melee: 2, crit: 4 },
  },
  {
    id: "ammo",
    name: "弹药匣",
    description: "远程 +2，攻速 +5%",
    price: 27,
    mods: { ranged: 2, attack: 5 },
  },
  {
    id: "battery",
    name: "奥术电池",
    description: "元素 +2，工程 +2",
    price: 26,
    mods: { elemental: 2, engineering: 2 },
  },
  {
    id: "brick",
    name: "坚守砖石",
    description: "护甲 +1，最大生命 +8，移速 −3%",
    price: 25,
    mods: { armor: 1, maxHp: 8, speed: -3 },
  },
  {
    id: "clover",
    name: "收获四叶草",
    description: "幸运 +8，每波收获 +4",
    price: 30,
    mods: { luck: 8, harvest: 4 },
  },
  {
    id: "contract",
    name: "危险契约",
    description: "伤害 +20%，最大生命 −12",
    price: 29,
    mods: { damage: 20, maxHp: -12 },
  },
];
export const attributeChoices = [
  ["damage", "火力增幅", 8],
  ["attack", "快速装填", 8],
  ["melee", "近战训练", 3],
  ["ranged", "远程训练", 3],
  ["elemental", "元素研究", 3],
  ["engineering", "工程研究", 3],
  ["maxHp", "生命成长", 10],
  ["armor", "坚韧", 2],
  ["dodge", "闪避练习", 5],
  ["regen", "再生", 0.5],
  ["harvest", "收获", 5],
  ["luck", "幸运", 8],
] as const;
export const buildWaves = Array.from({ length: 12 }, (_, i) => ({
  health: 1 + Math.pow(i, 1.35) * 0.27,
  speed: 0.8 + i * 0.035,
  spawn: 1.15 / (1 + i * 0.095),
  runners: i < 2 ? 0 : Math.min(0.3, 0.1 + i * 0.018),
  archers: i < 3 ? 0 : Math.min(0.25, 0.07 + i * 0.015),
  elites: [3, 7, 9].includes(i) ? 1 : 0,
}));
export const waveSeconds = (wave: number) => 30 + wave * 3;
export const iconFor = (id: string) =>
  `${import.meta.env.BASE_URL}assets/v9/weapons/${id}.png`;

export const itemIconFor = (id: string) =>
  `${import.meta.env.BASE_URL}assets/v9/items/${id}.png`;
