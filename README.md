# 裂隙幸存者 / Rift Survivors

中文：v0.9 多武器构筑竞技场。三类原创角色、12种武器、6个独立攻击槽、4级合成和30件道具；用冰冻碎裂、击杀爆炸、穿透弹射、炮台阵地等联动挑战12波怪潮。波间商店支持购买、锁定、出售、合成与付费刷新。首屏适配，桌面键盘操作，无需账号。

English: v0.9 is a six-weapon build arena: three roles, twelve weapons, four upgrade tiers and thirty items. Combine freezing, shattering, kill explosions, piercing and turret builds across twelve waves. Shop, lock, sell, merge and reroll between waves. Desktop keyboard controls; viewport-fit interface.

[新增资源图鉴与音乐试听](https://rift-survivors.xiaosang.cc/build-gallery.html) · [美术与音乐制作记录](docs/art/resources-v09.md)

**正式版本：v0.9.1。近战按武器轨迹接触命中，新增白闪、接触火花、局部停顿与分武器音效。**

![游戏截图 / Game screenshot](./assets/screenshot.png)

## 在线体验 / Live Demo

- [Cloudflare Demo](https://rift-survivors.xiaosang.cc/)
- [GitHub Repo](https://github.com/holynova/rift-survivors)

<img src="./assets/qr.png" width="180" alt="扫码访问在线游戏 / Scan to play">

## 操作 / Controls

WASD / 方向键移动，Esc 暂停。六个武器独立自动瞄准攻击；升级与购物在波间进行，切换标签页自动暂停。

WASD / arrows: move; Esc: pause. All equipped weapons attack automatically. Upgrade and shop between waves; switching tabs pauses the game.

## 本地运行 / Run locally

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
npm test
npm run test:browser
npm run build
npm run preview
```

## 发布 / Deploy

```bash
npm run deploy
```

Cloudflare Workers · Custom Domain: `rift-survivors.xiaosang.cc`.
源码与发布配置使用单一主分支，本地手动部署。Source and deployment configuration share one primary branch; deploy manually from the same commit.

[设计文档 / Design docs](docs/INDEX.md) · [试玩记录 / Playtest log](docs/production/playtest-log.md) · [版本历史 / History](docs/production/version-history.md) · [音效授权 / Audio credits](docs/art/audio-manifest-v7.json)
