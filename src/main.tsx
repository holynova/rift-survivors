import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BuildSimulation, type OwnedWeapon } from "./game/build-simulation";
import { type HeroId, heroes } from "./game/content";
import {
  buildHeroes,
  roster,
  weaponById,
  items,
  iconFor,
  itemIconFor,
  statNames,
  familyNames,
  familyBenefits,
  type Stat,
  type Family,
} from "./game/build-content";
import { createGame, runtime } from "./phaser/scene";
import { loadSave, writeSave } from "./game/save";
import { sound, unlockAudio, configureAudio, audioStats } from "./game/audio";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-600.css";
import "./ui/style.css";
const roman = ["I", "II", "III", "IV"];
function App() {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const resize = () =>
      setViewport({
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    resize();
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  const [revision, render] = useState(0);
  const [records, setRecords] = useState(() => {
    try {
      const r = JSON.parse(
        localStorage.getItem("rift-build-records-v1") ?? "null",
      );
      if (
        r &&
        [r.wave, r.kills, r.wins].every(
          (n: unknown) => typeof n === "number" && Number.isFinite(n),
        )
      )
        return r as { wave: number; kills: number; wins: number };
    } catch {}
    return { wave: 0, kills: 0, wins: 0 };
  });
  const savedRun = useRef<BuildSimulation | null>(null);
  useEffect(() => {
    const s = runtime.sim as BuildSimulation | null;
    if (s && ["won", "lost"].includes(s.phase) && savedRun.current !== s) {
      savedRun.current = s;
      setRecords((r) => {
        const next = {
          wave: Math.max(r.wave, s.wave),
          kills: Math.max(r.kills, s.kills),
          wins: r.wins + (s.phase === "won" ? 1 : 0),
        };
        try {
          localStorage.setItem("rift-build-records-v1", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [revision]);
  const compact = viewport.width < 700 && viewport.height > viewport.width,
    frameWidth = compact ? 524 : 1124,
    frameHeight = compact ? 914 : 780;
  const canvas = useRef<HTMLDivElement>(null);
  const [hero, setHero] = useState<HeroId>("gunner"),
    [starter, setStarter] = useState("pistol");
  const [save, setSave] = useState(loadSave),
    [audioLoading, setAudioLoading] = useState(false);
  const refresh = () => render((v) => v + 1);
  const sim = runtime.sim as BuildSimulation | null;
  useEffect(() => {
    const game = createGame(canvas.current!);
    const timer = setInterval(refresh, 100);
    return () => {
      clearInterval(timer);
      game.destroy(true);
    };
  }, []);
  useEffect(() => {
    configureAudio(
      save.sound,
      save.music,
      save.effectsVolume,
      save.musicVolume,
    );
    runtime.reduceMotion = save.reduceMotion;
    writeSave(save);
  }, [save]);
  async function start() {
    if (audioLoading) return;
    setAudioLoading(true);
    try {
      await unlockAudio();
    } catch {}
    setAudioLoading(false);
    const s = new BuildSimulation(hero, Date.now(), starter);
    s.sound = sound;
    runtime.sim = s;
    runtime.scene?.reset();
    refresh();
  }
  function home() {
    runtime.sim = null;
    runtime.scene?.reset();
    refresh();
  }
  function act(fn: () => unknown) {
    fn();
    refresh();
  }
  function weaponSlot(w: OwnedWeapon, editing = false) {
    const d = weaponById[w.id];
    return (
      <div
        className={`weapon-slot tier-${w.tier}`}
        key={w.uid}
        title={d.description}
      >
        <img src={iconFor(w.id)} alt="" />
        <div>
          <b>
            {d.name} <em>{roman[w.tier - 1]}</em>
          </b>
          <small>
            {sim!.weaponDamage(w).toFixed(1)}伤害 ·{" "}
            {sim!.weaponInterval(w).toFixed(2)}s
          </small>
        </div>
        {editing && (
          <div className="slot-actions">
            <button
              disabled={!sim!.mergeable(w.uid)}
              onClick={() => act(() => sim!.merge(w.uid))}
            >
              合成
            </button>
            <button
              disabled={sim!.weapons.length <= 1}
              onClick={() => act(() => sim!.sell(w.uid))}
            >
              售◆{sim!.sellPrice(w)}
            </button>
          </div>
        )}
      </div>
    );
  }
  const boss = sim?.enemies.find((e) => e.type === 4);
  const displayed: Stat[] = [
    "damage",
    "attack",
    "melee",
    "ranged",
    "elemental",
    "engineering",
    "crit",
    "armor",
    "dodge",
    "regen",
    "lifesteal",
    "harvest",
    "luck",
    "speed",
  ];
  return (
    <div
      className="viewport-frame"
      style={{
        width: frameWidth,
        height: frameHeight,
        transform: `translate(-50%, -50%) scale(${Math.max(0.05, Math.min((viewport.width - 16) / frameWidth, (viewport.height - 16) / frameHeight))})`,
      }}
    >
      <main className={`app build-app${compact ? " compact" : ""}`}>
        <header className="masthead">
          <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
            <span className="brand-mark">✧</span>
            <span>
              裂隙幸存者<small>RIFT SURVIVORS</small>
            </span>
          </a>
          <div className="edition">
            六武器构筑 <span className="version">v0.9.1</span>
          </div>
          <div className="tools">
            <a
              href="https://github.com/holynova/rift-survivors"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 源码仓库"
            >
              GitHub ↗
            </a>
            <button
              aria-label={save.sound ? "关闭音效" : "打开音效"}
              onClick={() => setSave((s) => ({ ...s, sound: !s.sound }))}
            >
              ♪ {save.sound ? "音效" : "静音"}
            </button>
            <button
              aria-label={save.music ? "关闭音乐" : "打开音乐"}
              onClick={() => {
                void unlockAudio();
                setSave((s) => ({ ...s, music: !s.music }));
              }}
            >
              ♫ {save.music ? "音乐" : "音乐关"}
            </button>
            <button
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen();
              }}
            >
              ⛶ 全屏
            </button>
            {sim && (
              <button
                disabled={!["battle", "paused"].includes(sim.phase)}
                onClick={() =>
                  act(() =>
                    sim.phase === "paused" ? sim.resume() : sim.pause(),
                  )
                }
              >
                Ⅱ 暂停
              </button>
            )}
          </div>
        </header>
        <section className="game-shell" aria-label="游戏竞技场">
          <div className="canvas" ref={canvas} />
          {sim && (
            <div className="hud">
              <div className="hud-left">
                <div className="hero-label">
                  {heroes[sim.hero].name}
                  <span>LV.{sim.level}</span>
                </div>
                <div className="meter health">
                  <i style={{ width: `${(sim.p.hp / sim.p.maxHp) * 100}%` }} />
                  <span>
                    {Math.ceil(sim.p.hp)} / {sim.p.maxHp}
                    {sim.shield > 0 ? ` +盾${Math.floor(sim.shield)}` : ""}
                  </span>
                </div>
                <div className="meter xp">
                  <i
                    style={{
                      width: `${Math.min(100, (sim.xp / sim.nextXp) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="wave">
                <small>波次</small>
                <b>
                  {sim.wave}
                  <small>/12</small>
                </b>
                <span>{Math.ceil(sim.time)}s</span>
              </div>
              <div className="hud-right">
                <b>◆ {Math.floor(sim.coins)}</b>
                <span>击杀 {sim.kills}</span>
              </div>
            </div>
          )}
          {boss && sim?.phase === "battle" && (
            <div className="boss">
              <span>裂隙领主{boss.hp < boss.maxHp / 2 ? " · 狂暴" : ""}</span>
              <div className="meter">
                <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
              </div>
            </div>
          )}
          {sim?.phase === "battle" && (
            <>
              <div className="combat-note">{sim.lastMessage}</div>
              <div className="loadout-hud">
                {sim.weapons.map((w) => weaponSlot(w))}
                {Array.from({ length: 6 - sim.weapons.length }, (_, i) => (
                  <div className="empty-slot" key={i}>
                    空槽
                  </div>
                ))}
              </div>
            </>
          )}
          {!sim && (
            <div className="menu build-menu">
              <div className="intro">
                <div className="eyebrow">六个武器槽 · 无数种打法</div>
                <h1>
                  这一局，
                  <br />
                  <span>由装备决定。</span>
                </h1>
                <p>
                  穿透弩把怪潮串成一线，重锤把敌人推向墙角。
                  <br />
                  也可以布下炮台，用冰链守住阵地。
                </p>
                <div className="run-facts">
                  <div>
                    <b>12</b>
                    <span>武器种类</span>
                  </div>
                  <div>
                    <b>30</b>
                    <span>构筑道具</span>
                  </div>
                  <div>
                    <b>12</b>
                    <span>生存波次</span>
                  </div>
                </div>
                <div className="build-guide">
                  <b>移动 → 收集 → 采购 → 合成</b>
                  <p>
                    同类同级武器二合一，最高 IV 级。
                    <br />
                    同族装备提供额外加成，道具改变攻击联动。
                  </p>
                </div>
                <small>约10–15分钟 · 键盘操作 · 自动瞄准攻击</small>
                <div className="record">
                  最佳波次 {records.wave}/12 · 最高击杀 {records.kills} · 通关{" "}
                  {records.wins}
                </div>
              </div>
              <div className="hero-select">
                <div className="select-title">
                  <span>选择构筑起点</span>
                  <small>角色 × 初始武器</small>
                </div>
                <div className="hero-options">
                  {roster.map((id) => (
                    <button
                      className={`hero-option ${hero === id ? "selected" : ""}`}
                      key={id}
                      aria-pressed={hero === id}
                      onClick={() => {
                        setHero(id);
                        setStarter(buildHeroes[id].start[0]);
                      }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}assets/${id === "engineer" ? "v4" : "v2"}/${id}-portrait.png`}
                        alt={heroes[id].name}
                      />
                      <div>
                        <b>{heroes[id].name}</b>
                        <span>
                          {id === "gunner"
                            ? "远程火力"
                            : id === "knight"
                              ? "近战搏杀"
                              : "工程阵地"}
                        </span>
                      </div>
                      <span className="selection-dot">
                        {hero === id ? "●" : "○"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="role-description">
                  {buildHeroes[hero].description}
                </p>
                <div className="starter-options">
                  {buildHeroes[hero].start.map((id) => (
                    <button
                      key={id}
                      className={starter === id ? "selected" : ""}
                      aria-pressed={starter === id}
                      onClick={() => setStarter(id)}
                      title={weaponById[id].description}
                    >
                      <img src={iconFor(id)} alt="" />
                      <span>{weaponById[id].name}</span>
                    </button>
                  ))}
                </div>
                <p className="starter-description">
                  {weaponById[starter].description}
                </p>
                <button
                  className="primary start"
                  disabled={audioLoading}
                  onClick={start}
                >
                  {audioLoading ? "准备音效…" : "进入竞技场"} <span>↗</span>
                </button>
                <p className="start-hint">WASD / 方向键移动 · ESC 暂停</p>
              </div>
            </div>
          )}
          {sim && sim.phase !== "battle" && (
            <div className="overlay" data-phase={sim.phase}>
              <div
                className={`dialog ${sim.phase === "shop" ? "build-shop" : sim.phase === "upgrade" ? "wide" : ""}`}
              >
                {sim.phase === "paused" && (
                  <>
                    <div className="eyebrow">时间已停驻</div>
                    <h2>休息片刻</h2>
                    <p>WASD / 方向键移动 · 武器自动攻击 · 波间购买构筑。</p>
                    {(["effectsVolume", "musicVolume"] as const).map(
                      (key, i) => (
                        <label className="audio-setting" key={key}>
                          {i ? "音乐音量" : "音效音量"}
                          <input
                            type="range"
                            aria-label={i ? "音乐音量" : "音效音量"}
                            min="0"
                            max="1"
                            step=".05"
                            value={save[key]}
                            onChange={(e) =>
                              setSave((s) => ({
                                ...s,
                                [key]: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      ),
                    )}
                    <label className="setting">
                      <input
                        type="checkbox"
                        checked={save.reduceMotion}
                        onChange={(e) =>
                          setSave((s) => ({
                            ...s,
                            reduceMotion: e.target.checked,
                          }))
                        }
                      />{" "}
                      减少界面动画
                    </label>
                    <button
                      className="primary"
                      onClick={() => act(() => sim.resume())}
                    >
                      继续战斗
                    </button>
                    <button className="quiet" onClick={home}>
                      返回英雄选择
                    </button>
                  </>
                )}
                {sim.phase === "upgrade" && (
                  <>
                    <div className="eyebrow">
                      波间训练 · LEVEL {sim.level + 1}
                    </div>
                    <h2>强化你的构筑</h2>
                    <p>选择对应武器属性，装备伤害会立即重新结算。</p>
                    <div className="choice-grid">
                      {sim.choices.map((c) => (
                        <button
                          className="choice"
                          key={c.id}
                          onClick={() => act(() => sim.choose(c.id))}
                        >
                          <span className="choice-icon">✦</span>
                          <b>{c.name}</b>
                          <p>
                            {statNames[c.id as Stat]} +{c.desc.split("+")[1]}
                          </p>
                          <span className="choose-label">选择强化 ↗</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {sim.phase === "shop" && (
                  <>
                    <div className="shop-heading">
                      <div>
                        <div className="eyebrow">
                          第 {sim.wave} 波完成 · 行旅商店
                        </div>
                        <h2>武装下一波</h2>
                      </div>
                      <b className="gold">◆ {Math.floor(sim.coins)}</b>
                    </div>
                    <div className="shop-layout">
                      <div>
                        <div className="offer-grid">
                          {sim.offers.map((o, i) => {
                            const d =
                              o?.kind === "weapon"
                                ? weaponById[o.id]
                                : items.find((it) => it.id === o?.id);
                            return (
                              <article
                                className={`offer tier-${o?.tier ?? 1}`}
                                key={i}
                              >
                                {o && d ? (
                                  <>
                                    <div className="offer-title">
                                      {o.kind === "weapon" ? (
                                        <img src={iconFor(o.id)} alt="" />
                                      ) : (
                                        <img
                                          className="item-art"
                                          src={itemIconFor(o.id)}
                                          alt=""
                                        />
                                      )}
                                      <div>
                                        <small>
                                          {o.kind === "weapon"
                                            ? `${familyNames[weaponById[o.id].family]} · ${roman[o.tier - 1]}`
                                            : "构筑道具"}
                                        </small>
                                        <b>{d.name}</b>
                                      </div>
                                      <button
                                        className={o.locked ? "locked" : ""}
                                        aria-label={`${o.locked ? "解锁" : "锁定"}商品 ${i + 1}`}
                                        onClick={() => act(() => sim.lock(i))}
                                      >
                                        {o.locked ? "锁定" : "锁"}
                                      </button>
                                    </div>
                                    <p>{d.description}</p>
                                    {o.kind === "weapon" && (
                                      <small>
                                        {sim.weaponDamage(o).toFixed(1)}伤害 ·{" "}
                                        {sim.weaponInterval(o).toFixed(2)}s
                                        {sim.weapons.some(
                                          (w) =>
                                            w.id === o.id && w.tier === o.tier,
                                        ) && o.tier < 4
                                          ? " · 可合成"
                                          : ""}
                                      </small>
                                    )}
                                    <button
                                      className="buy-button"
                                      disabled={!sim.canBuy(i)}
                                      onClick={() => act(() => sim.buy(i))}
                                    >
                                      {sim.weapons.length === 6 &&
                                      o.kind === "weapon" &&
                                      sim.canBuy(i)
                                        ? "购买并合成"
                                        : "购买"}{" "}
                                      · ◆{o.price}
                                    </button>
                                  </>
                                ) : (
                                  <div className="sold-offer">
                                    已购入
                                    <br />
                                    <small>刷新以补充商品</small>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                        <div className="shop-actions">
                          <button
                            disabled={
                              sim.coins < sim.rerollPrice ||
                              sim.offers.every((o) => o?.locked)
                            }
                            onClick={() => act(() => sim.reroll())}
                          >
                            刷新商品 · ◆{sim.rerollPrice}
                          </button>
                          <button
                            className="primary"
                            onClick={() => act(() => sim.nextWave())}
                          >
                            第 {sim.wave + 1} 波 →
                          </button>
                        </div>
                        <small className="shop-help">
                          锁定跨波保留 · 二合一释放武器槽 · 至少保留一把武器
                        </small>
                      </div>
                      <aside>
                        <div className="equipment-label">
                          武器 {sim.weapons.length}/6{" "}
                          <small>伤害已包含角色与属性加成</small>
                        </div>
                        <div className="equipment-grid">
                          {sim.weapons.map((w) => weaponSlot(w, true))}
                        </div>
                        <div className="family-strip">
                          {Object.entries(sim.families())
                            .filter(([, n]) => n > 0)
                            .map(([key, n]) => (
                              <span
                                title={familyBenefits[key as Family]}
                                key={key}
                              >
                                {familyNames[key as Family]} ×{n} ·{" "}
                                {familyBenefits[key as Family]}
                              </span>
                            ))}
                        </div>
                        <div className="stat-grid">
                          {displayed.map((key) => (
                            <span key={key}>
                              {statNames[key]}{" "}
                              <b>{Number(sim.value(key).toFixed(2))}</b>
                            </span>
                          ))}
                        </div>
                        <div className="items-strip">
                          {Object.keys(sim.inventory).length
                            ? Object.entries(sim.inventory).map(([id, n]) => (
                                <span
                                  key={id}
                                  title={`${items.find((i) => i.id === id)?.name}：${items.find((i) => i.id === id)?.description}`}
                                >
                                  <img
                                    src={itemIconFor(id)}
                                    alt={
                                      items.find((i) => i.id === id)?.name ?? id
                                    }
                                  />
                                  <b>×{n}</b>
                                </span>
                              ))
                            : "尚无构筑道具"}
                        </div>
                      </aside>
                    </div>
                  </>
                )}
                {(sim.phase === "won" || sim.phase === "lost") && (
                  <>
                    <div className="eyebrow">
                      {sim.phase === "won" ? "裂隙已封印" : "火种仍在等待"}
                    </div>
                    <h2>
                      {sim.phase === "won"
                        ? "你活到了最后。"
                        : "这一局，到此为止。"}
                    </h2>
                    <p>换一种武器组合，再试一次。</p>
                    <div className="result-stats">
                      <div>
                        <b>
                          {sim.wave}
                          <small>/12</small>
                        </b>
                        <span>到达波次</span>
                      </div>
                      <div>
                        <b>{sim.kills}</b>
                        <span>击败敌人</span>
                      </div>
                      <div>
                        <b>{sim.level}</b>
                        <span>等级</span>
                      </div>
                    </div>
                    <div className="result-weapons">
                      {sim.weapons.map((w) => weaponSlot(w))}
                    </div>
                    <button className="primary" onClick={start}>
                      再战一局
                    </button>
                    <button className="quiet" onClick={home}>
                      返回英雄选择
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {runtime.assetError && (
            <div className="asset-warning">部分素材加载失败，刷新可重试。</div>
          )}
        </section>
        <footer>
          <span>
            <kbd>WASD</kbd> 移动 / <kbd>ESC</kbd> 暂停
          </span>
          <span>六武器 · 波间商店 · 装备联动</span>
          <span className="perf">
            {sim ? `${Math.round(runtime.fps)} FPS` : "原创角色 · 构筑生存"}
          </span>
        </footer>
        <div className="mobile-note">
          当前采用键盘操作，请在电脑浏览器开始战斗。
        </div>
        {save.reduceMotion && (
          <style>
            {"*{animation:none!important;transition:none!important}"}
          </style>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.DEV) {
  Object.assign(window, {
    __rift: {
      get sim() {
        return runtime.sim;
      },
      start(hero: HeroId = "gunner", seed = 42) {
        runtime.sim = new BuildSimulation(hero, seed);
        runtime.scene?.reset();
        return runtime.sim;
      },
      audioStats,
      artSnapshot() {
        const scene = runtime.scene;
        return {
          hero: scene?.heroSprite
            ? {
                texture: scene.heroSprite.texture.key,
                frame: scene.heroSprite.frame.name,
              }
            : null,
          enemies: [...(scene?.enemyViews.entries() ?? [])].map(([id, v]) => ({
            id,
            texture: v.texture.key,
            frame: v.frame.name,
          })),
          weapons: [...(scene?.weaponViews.entries() ?? [])].map(([id, v]) => ({
            id,
            x: v.x,
            y: v.y,
            rotation: v.rotation,
          })),
          turrets: scene?.turretViews.size ?? 0,
        };
      },
      snapshot() {
        const s = runtime.sim;
        return s
          ? {
              hero: s.hero,
              phase: s.phase,
              wave: s.wave,
              hp: s.p.hp,
              kills: s.kills,
              coins: s.coins,
              entities: s.enemies.length,
              shots: s.shots.length,
              fps: runtime.fps,
              stepMs: runtime.stepMs,
            }
          : null;
      },
      advance(seconds: number) {
        const s = runtime.sim;
        if (s)
          for (let i = 0; i < seconds * 60 && s.phase === "battle"; i++)
            s.step(1 / 60);
      },
      stress() {
        const s = runtime.sim;
        if (!s) return;
        for (let i = 0; i < 300; i++) s.spawn();
        for (let i = 0; i < 600; i++) {
          const a = i * 0.4;
          s.projectile(550, 325, Math.cos(a), Math.sin(a), 1, 30, i % 2 === 0);
        }
      },
    },
  });
}
