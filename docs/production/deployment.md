# 正式发布 · 2026-10-01

版本：0.7.1。游戏：https://rift-survivors.xiaosang.cc/ 。美术画廊：https://rift-survivors.xiaosang.cc/art-gallery.html 。备用域名：https://rift-survivors.holy-nova.workers.dev/ 。

Cloudflare Worker：rift-survivors。正式版本ID：6c13001f-efe4-4121-8ca7-c8e86d0511ed。独立自定义域名已绑定。项目为纯静态浏览器游戏，发布目录仅dist，不上传源码、生成原图、凭据或本地测试夹具。

发布流程：npm run deploy。wrangler.jsonc 管理目标和路由；默认HTML路由提供首页index，未知素材保持404，避免开发服务器SPA回退掩盖资源错误。scripts/write-release-manifest.mjs 生成文件SHA-256清单，供公网逐文件校验。

验收：v0.7完成30项规则/资源测试；v0.7.1完成6项浏览器回归测试及正式构建。103个公共文件SHA-256与正式构建一致，主页HTTP200且正文一致，不存在素材404。真实公网浏览器完成进入战斗、移动、Space/E/Q、暂停；音乐与独立音效均有非零输出，两项关闭与暂停静音，音乐重新打开恢复。无页面错误或请求失败，正式版无__rift接口。证据：evidence/public-release-integrity-v7.json、evidence/public-audio-v7.json、evidence/19-public-game.png。

v0.7.0重做战斗音效：25段Kenney CC0采样，五英雄分层组合，降低高频、连续命中频率并加入位置声像。保留v0.6难度曲线和程序背景音乐。22秒新旧实际混音试听与无削波数据见evidence/audio-v7-before.wav、audio-v7-after.wav及audio-v7-ab.json；素材来源和授权见docs/art/audio-manifest-v7.json。

发布时修复疾行魔静态贴图命名（仅替换末尾-run，保留runner主体），增加tests/assets.test.mjs防止未来加载路径与文件不符。0.6.1不改变已完成的0.6难度及音频规则。

没有现成Git远程仓库，本次完成Cloudflare公网部署及本地可复现配置；未创建或推送新的源码仓库。

v0.7.1：首屏适配上线，8种窗口动态切换通过，最新完整性证据public-release-integrity-v071.json；公网三种窗口截图和实际边界见viewport-v071.json及viewport-*-v071.png。
