import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Simulation, type Action } from "./game/simulation";
import {
  heroes,
  heroIds,
  heroDetails,
  upgrades,
  specials,
  relics,
  type HeroId,
} from "./game/content";
import { createGame, runtime } from "./phaser/scene";
import { loadSave, writeSave } from "./game/save";
import { sound, unlockAudio, configureAudio, audioStats } from "./game/audio";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-600.css";
import "./ui/style.css";
import { iconKeys, iconUrl, skillIcons } from "./phaser/manifest";
function App() {
  const [viewport, setViewport] = useState(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  useEffect(() => {
    const resize = () =>
      setViewport({
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  const compact = viewport.width < 700 && viewport.height > viewport.width;
  const frameWidth = compact ? 524 : 1124;
  const frameHeight = compact ? 914 : 780;
  const frameScale = Math.min(
    (viewport.width - 16) / frameWidth,
    (viewport.height - 16) / frameHeight,
  );
  const canvas = useRef<HTMLDivElement>(null);
  const [hero, setHero] = useState<HeroId>("gunner");
  const [revision, render] = useState(0);
  const [save, setSave] = useState(loadSave);
  const savedRun = useRef<Simulation | null>(null);
  const [, setFullscreen] = useState(false);
  const refresh = () => render((x) => x + 1);
  const sim = runtime.sim;
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
  useEffect(() => {
    if (
      sim &&
      (sim.phase === "won" || sim.phase === "lost") &&
      savedRun.current !== sim
    ) {
      savedRun.current = sim;
      setSave((s) => ({
        ...s,
        bestWave: Math.max(s.bestWave, sim.wave),
        bestKills: Math.max(s.bestKills, sim.kills),
        wins: s.wins + (sim.phase === "won" ? 1 : 0),
      }));
    }
  }, [revision]);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioStarting = useRef(false);
  async function start() {
    if (audioStarting.current) return;
    audioStarting.current = true;
    setAudioLoading(true);
    try {
      await unlockAudio();
    } catch {
      /* Keep the game playable on devices without audio. */
    }
    audioStarting.current = false;
    setAudioLoading(false);
    const s = new Simulation(hero);
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
  function act(action: Action) {
    sim?.action(action);
    refresh();
  }
  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
    setFullscreen((v) => !v);
  }
  const h = heroes[sim?.hero || hero];
  const boss = sim?.enemies.find((e) => e.type === 4);
  const all = [
    ...upgrades,
    ...heroIds.flatMap((id) => specials[id]),
    ...relics,
  ];
  return (
    <div
      className="viewport-frame"
      style={{
        width: frameWidth,
        height: frameHeight,
        transform: `translate(-50%, -50%) scale(${Math.max(0.05, frameScale)})`,
      }}
    >
      <main className={`app${compact ? " compact" : ""}`}>
        <header className="masthead">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              if (!sim) home();
            }}
          >
            <span className="brand-mark">✧</span>
            <span>
              裂隙幸存者<small>RIFT SURVIVORS</small>
            </span>
          </a>
          <div className="edition">
            <span className="dot" /> 八波竞技场{" "}
            <span className="version">v0.7.2 · 自适应视窗</span>
          </div>
          <div className="tools">
            <a
              href="https://github.com/holynova/rift-survivors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub 源码仓库"
            >
              GitHub ↗
            </a>
            <button
              aria-label={save.sound ? "关闭音效" : "打开音效"}
              onClick={() => setSave((s) => ({ ...s, sound: !s.sound }))}
            >
              {save.sound ? "♪ 音效" : "♪ 静音"}
            </button>
            <button
              aria-label={save.music ? "关闭音乐" : "打开音乐"}
              onClick={() => {
                unlockAudio();
                setSave((s) => ({ ...s, music: !s.music }));
              }}
            >
              ♫ {save.music ? "音乐" : "音乐关"}
            </button>
            <button onClick={toggleFull}>⛶ 全屏</button>
            {sim && (
              <button
                disabled={!["battle", "paused"].includes(sim.phase)}
                onClick={() => {
                  sim.phase === "paused" ? sim.resume() : sim.pause();
                  refresh();
                }}
              >
                Ⅱ 暂停
              </button>
            )}
          </div>
        </header>
        <section className="game-shell" aria-label="游戏竞技场">
          <div ref={canvas} className="canvas" />
          {sim && (
            <div className="hud">
              <div className="hud-left">
                <div className="hero-label">
                  {h.name}
                  <span>LV.{sim.level}</span>
                </div>
                <div className="meter health">
                  <i style={{ width: `${(sim.p.hp / sim.p.maxHp) * 100}%` }} />
                  <span>
                    {Math.ceil(sim.p.hp)} / {sim.p.maxHp}
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
              <div className="hero-resource">
                {sim.hero === "frost" &&
                  `寒霜领域 ${sim.zones.length} · 冰箭连锁 ${sim.special.has("shatter") ? 5 : 3}`}
                {sim.hero === "engineer" &&
                  `炮台 ${sim.turrets.length}/${sim.special.has("assembly") ? 4 : 3} ${sim.overload > 0 ? `· 超载 ${sim.overload.toFixed(1)}s` : ""}`}
                {sim.hero === "reaper" && (
                  <>
                    血能 <b>{sim.blood}/100</b> · 收割需
                    {sim.special.has("harvest") ? 40 : 60}
                    <div className="blood-meter">
                      <i style={{ width: `${sim.blood}%` }} />
                    </div>
                  </>
                )}
              </div>
              <div className="wave">
                <small>生存波次</small>
                <b>
                  {String(sim.wave).padStart(2, "0")}
                  <em>/ 08</em>
                </b>
                <span>
                  {sim.time > 0
                    ? `${Math.ceil(sim.time)}s`
                    : sim.wave === 8
                      ? "击败领主"
                      : "结算中"}
                </span>
              </div>
              <div className="hud-right">
                <strong>◆ {sim.coins}</strong>
                <span>击杀 {sim.kills}</span>
              </div>
            </div>
          )}
          {boss && sim?.phase === "battle" && (
            <div className="boss">
              <span>
                {boss.hp < boss.maxHp / 2 ? "裂隙领主 · 狂暴" : "裂隙领主"}
              </span>
              <div className="meter">
                <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
              </div>
            </div>
          )}
          {sim && sim.phase === "battle" && (
            <>
              <div className="combat-note" key={sim.lastMessage}>
                {sim.lastMessage}
              </div>
              <div className="abilities">
                {(["core", "skill", "ultimate"] as const).map((a, i) => {
                  const cd =
                    a === "core"
                      ? sim.hero === "gunner"
                        ? sim.charges
                          ? 0
                          : 3 * sim.haste - sim.chargeTimer
                        : sim.coreCd
                      : a === "skill"
                        ? sim.skillCd
                        : sim.ultCd;
                  const bloodLocked =
                    a === "ultimate" &&
                    sim.hero === "reaper" &&
                    sim.blood < (sim.special.has("harvest") ? 40 : 60);
                  return (
                    <button
                      key={a}
                      className={cd > 0 || bloodLocked ? "cooling" : ""}
                      onClick={() => act(a)}
                      disabled={cd > 0 || bloodLocked}
                    >
                      <img
                        className="skill-icon-art"
                        src={iconUrl(skillIcons[sim.hero][a])}
                        alt=""
                      />
                      <kbd>{["SPACE", "E", "Q"][i]}</kbd>
                      <span>{[h.core, h.skill, h.ultimate][i]}</span>
                      <b>
                        {bloodLocked
                          ? "血能不足"
                          : cd > 0
                            ? `${cd.toFixed(1)}s`
                            : a === "core" && sim.hero === "gunner"
                              ? `×${sim.charges}`
                              : "就绪"}
                      </b>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {!sim && (
            <div className="menu">
              <div className="intro">
                <div className="eyebrow">异世界交汇 · 生存试炼</div>
                <h1>
                  穿过裂隙。
                  <br />
                  <span>活到最后。</span>
                </h1>
                <p>
                  自动火力，主动出击。
                  <br />
                  操控时间、冻结怪潮、部署炮台，或以刀锋直面深渊。
                </p>
                <div className="run-facts">
                  <div>
                    <b>05</b>
                    <span>英雄机制</span>
                  </div>
                  <div>
                    <b>08</b>
                    <span>战斗波次</span>
                  </div>
                  <div>
                    <b>01</b>
                    <span>最终领主</span>
                  </div>
                </div>
                <div className="record">
                  最佳波次 {save.bestWave} / 8　·　最高击杀 {save.bestKills}
                  　·　通关 {save.wins}
                </div>
              </div>
              <div className="hero-select">
                <div className="select-title">
                  <span>选择你的英雄</span>
                  <small>01 / 起点</small>
                </div>
                <div className="hero-options">
                  {heroIds.map((id) => (
                    <button
                      key={id}
                      className={`hero-option ${hero === id ? "selected" : ""}`}
                      onClick={() => setHero(id)}
                      aria-pressed={hero === id}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}assets/${id === "gunner" || id === "knight" ? "v2" : "v4"}/${id}-portrait.png`}
                        alt={heroes[id].name}
                      />
                      <div>
                        <small>{heroDetails[id].subtitle}</small>
                        <b>{heroes[id].name}</b>
                        <span>{heroes[id].tag}</span>
                      </div>
                      <span className="selection-dot">
                        {hero === id ? "●" : "○"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="hero-detail">
                  <span>核心能力</span>
                  <p>{heroDetails[hero].description}</p>
                  <div>
                    <kbd>SPACE</kbd> {h.core} <kbd>E</kbd> {h.skill}{" "}
                    <kbd>Q</kbd> {h.ultimate}
                  </div>
                </div>
                <button
                  className="primary start"
                  onClick={start}
                  disabled={audioLoading}
                >
                  {audioLoading ? "准备音效…" : "进入竞技场"} <span>↗</span>
                </button>
                <p className="start-hint">
                  WASD 移动 · 普通攻击自动释放 · 约 6–9 分钟
                </p>
              </div>
            </div>
          )}
          {sim && sim.phase !== "battle" && (
            <div className="overlay" data-phase={sim.phase}>
              <div
                className={`dialog ${sim.phase === "upgrade" || sim.phase === "shop" ? "wide" : ""}`}
              >
                {sim.phase === "paused" && (
                  <>
                    <div className="eyebrow">时间已停驻</div>
                    <h2>休息片刻</h2>
                    <p>战斗、冷却与波次计时均已暂停。</p>
                    <div className="control-grid">
                      <span>
                        <kbd>WASD</kbd> 移动
                      </span>
                      <span>
                        <kbd>SPACE</kbd> {h.core}
                      </span>
                      <span>
                        <kbd>E</kbd> {h.skill}
                      </span>
                      <span>
                        <kbd>Q</kbd> {h.ultimate}
                      </span>
                    </div>
                    <label className="audio-setting">
                      音效音量{" "}
                      <input
                        aria-label="音效音量"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={save.effectsVolume}
                        onChange={(e) =>
                          setSave((s) => ({
                            ...s,
                            effectsVolume: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="audio-setting">
                      音乐音量{" "}
                      <input
                        aria-label="音乐音量"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={save.musicVolume}
                        onChange={(e) =>
                          setSave((s) => ({
                            ...s,
                            musicVolume: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
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
                      onClick={() => {
                        sim.resume();
                        refresh();
                      }}
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
                      火种成长 · LEVEL {sim.level + 1}
                    </div>
                    <h2>选择一项强化</h2>
                    <p>战斗暂停。每一个选择，都改变下一波。</p>
                    <div className="choice-grid">
                      {sim.choices.map((c) => (
                        <button
                          className="choice"
                          key={c.id}
                          onClick={() => {
                            sim.choose(c.id);
                            refresh();
                          }}
                        >
                          <span className="choice-icon">
                            <img
                              className="choice-icon-art"
                              src={iconUrl(iconKeys[c.id])}
                              alt=""
                            />
                          </span>
                          <small>
                            {specials[sim.hero].some((s) => s.id === c.id)
                              ? "英雄专属"
                              : "通用强化"}
                          </small>
                          <b>{c.name}</b>
                          <p>{c.desc}</p>
                          <span className="choose-label">选择强化 ↗</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {sim.phase === "shop" && (
                  <>
                    <div className="eyebrow">
                      第 {sim.wave} 波完成 · 行旅商店
                    </div>
                    <h2>
                      为下一波做好准备{" "}
                      <span className="gold">◆ {sim.coins}</span>
                    </h2>
                    <p>遗物效果可以叠加。离开商店后开始下一波。</p>
                    <div className="choice-grid">
                      {sim.shop.map((r, i) => (
                        <button
                          className="choice"
                          key={i}
                          disabled={sim.bought.has(i) || sim.coins < r.price}
                          onClick={() => {
                            sim.buy(i);
                            refresh();
                          }}
                        >
                          <span className="choice-icon">
                            <img
                              className="choice-icon-art"
                              src={iconUrl(iconKeys[r.id])}
                              alt=""
                            />
                          </span>
                          <small>遗物</small>
                          <b>{r.name}</b>
                          <p>{r.desc}</p>
                          <span className="choose-label">
                            {sim.bought.has(i) ? "已购买" : `◆ ${r.price}`}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="shop-actions">
                      <button
                        disabled={
                          sim.healed ||
                          sim.coins < 18 ||
                          sim.p.hp >= sim.p.maxHp
                        }
                        onClick={() => {
                          sim.heal();
                          refresh();
                        }}
                      >
                        {sim.healed
                          ? "本波已恢复"
                          : "恢复30%生命 · ◆18（每波一次）"}
                      </button>
                      <button
                        disabled={sim.coins < 8 + sim.rerolls * 4}
                        onClick={() => {
                          sim.reroll();
                          refresh();
                        }}
                      >
                        刷新商品 · ◆{8 + sim.rerolls * 4}
                      </button>
                      <button
                        className="primary"
                        onClick={() => {
                          sim.nextWave();
                          refresh();
                        }}
                      >
                        第 {sim.wave + 1} 波 →
                      </button>
                    </div>
                    <div className="build-strip">
                      当前构筑：
                      {Object.entries(sim.inventory).length
                        ? Object.entries(sim.inventory).map(([id, n]) => (
                            <span key={id}>
                              {all.find((c) => c.id === id)?.name || id} ×{n}
                            </span>
                          ))
                        : "尚未获得强化"}
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
                        : "这一次，到此为止。"}
                    </h2>
                    <p>
                      {sim.phase === "won"
                        ? "八波试炼完成，下一场选择另一种战斗方式。"
                        : "保留经验，尝试另一种构筑与技能节奏。"}
                    </p>
                    <div className="result-stats">
                      <div>
                        <b>
                          {sim.wave}
                          <small>/8</small>
                        </b>
                        <span>到达波次</span>
                      </div>
                      <div>
                        <b>{sim.kills}</b>
                        <span>击败敌人</span>
                      </div>
                      <div>
                        <b>{sim.level}</b>
                        <span>英雄等级</span>
                      </div>
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
            <div className="asset-warning">
              部分角色素材加载失败，使用临时图形。刷新可重试。
            </div>
          )}
        </section>
        <footer>
          <span>
            <kbd>WASD</kbd> 移动 <span className="sep">/</span> <kbd>ESC</kbd>{" "}
            暂停
          </span>
          <span>自动攻击 · 主动技能 · 构筑成长</span>
          <span className="perf">
            {sim ? `${Math.round(runtime.fps)} FPS` : "原创角色 · 2D 生存试炼"}
          </span>
        </footer>
        <div className="mobile-note">
          当前版本采用桌面键鼠操作。请在电脑浏览器开始战斗。
        </div>
        <style>
          {save.reduceMotion
            ? "*{animation:none!important;transition:none!important}"
            : ""}
        </style>
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
        runtime.sim = new Simulation(hero, seed);
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
