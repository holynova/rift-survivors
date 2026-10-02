# 裂隙幸存者 · Rift Survivors
五种英雄机制进入同一个八波竞技场。桌面键鼠游戏，浏览器运行，无账号、无服务端。

## 运行
`npm install` → `npm run dev -- --host 127.0.0.1 --port 5188 --strictPort`，打开终端显示的网址。
`npm run check` 类型检查；`npm test` 规则测试；`npm run build` 生成 dist；`npm run preview` 在 5189 端口预览正式构建；`npm run test:browser` 浏览器验收。

## 操作
WASD / 方向键移动，Space 核心动作，E 主动技能，Q 终极技能，Esc 暂停。普通攻击自动锁敌。切换标签页自动暂停。

## 文档
从 [文档索引](docs/INDEX.md) 开始。当前交付是五英雄八波版本，完整六英雄二十波属于后续路线。美术若使用临时帧会在素材清单标记。发布前查看 evidence 和试玩日志。

## 当前结果
五名英雄、八波、升级、商店、精英、Boss、胜负结算和局外统计已实现。23 项规则测试通过，浏览器验收记录见试玩日志。
v0.2 美术升级：两英雄各六帧移动动画、五类敌人、石质竞技场、十二枚技能与遗物图标，以及分层战斗特效。敌人使用独立贴图配合程序摆动，人工平衡试玩仍待进行。资源可在 `/art-gallery.html` 查看；详见 [美术规范](docs/art/art-bible.md) 和 [试玩日志](docs/production/playtest-log.md)。
公网正式版：https://rift-survivors.xiaosang.cc/ （Cloudflare Workers，v0.7.1）。本地预览：http://127.0.0.1:5189/。

v0.3 新增独立武器与技能特效：双枪枪焰、月牙斩击、闪现裂口、回溯时钟、弹反盾阵、脉冲电弧与灰烬剑刃风暴。

v0.4 增加霜环术士、机巧召唤师、血刃猎手，各有独立玩法与三项专属强化。

v0.5 动态美术：五英雄、五类敌人共50帧移动动画，新增手绘炮台和九枚技能图标，统一接地阴影，增强场景符文与余烬。动画画廊：`/art-gallery.html`。

v0.6 难度与声音：重做八波压力曲线、末段怪潮、后期精英和Boss狂暴；收紧升级、金币、护甲与恢复经济。五角色分层音效，原创程序战斗编曲，108/120/132 BPM分阶段变化。暂停页有独立音量，页首分别控制音乐和音效。

## 发布
`npm run deploy`：正式构建 → 生成 release.json（文件SHA-256）→ 发布Cloudflare Worker及自定义域名。配置在 wrangler.jsonc，部署需要当前账户授权。
公网验收：`RIFT_TEST_URL=https://rift-survivors.xiaosang.cc node scripts/live-release-check.mjs` 和 `RIFT_TEST_URL=https://rift-survivors.xiaosang.cc node scripts/release-audio-smoke.mjs`。发布日志见 docs/production/deployment.md。

v0.7 音效重做：25段Kenney CC0素材，分角色武器与技能层次、金属命中、低频爆发、立体声位置、轮换变体和更克制的密集命中声。来源与处理流程见 docs/technical/audio.md。

v0.7.1 视窗适配：根据浏览器可用宽高统一缩放界面，菜单、HUD及全部弹窗均首屏显示；拖动窗口和全屏切换实时更新。窄屏竖向展示完整五英雄列表，保留桌面键鼠操作提示。
