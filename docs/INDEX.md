# 文档索引
状态：v0.9 正式发布：三角色、六武器、十二波构筑竞技场，42个绘制图标与四阶段配乐。发布状态见production/deployment.md。

当前新增：[v0.9资源与音乐](art/resources-v09.md)。

当前入口：[v0.8玩法](gameplay/build-arena-v08.md) → [实现与验收](production/build-v08.md)。下方早期文档保留为历史设计；固定Space/E/Q技能与八波规则不再是默认玩法。
阅读顺序：vision → gameplay/core-loop → gameplay/heroes → gameplay/combat → gameplay/run-state-machine → technical/architecture → art/art-bible → balance/methodology → production/test-plan。
当前数值运行依据：src/game/build-content.ts；旧模拟回归依据：src/game/content.ts；本目录描述公式和设计意图。素材依据：src/phaser/manifest.ts 与 art/asset-manifest.csv。稳定 ID 用于英雄、升级、遗物和资源关联。
文档改动与实现一起版本管理。草案不等于已实现；测试通过不等于正式发布。

新增：balance/difficulty-v6.md 记录难度曲线与调参验收；technical/audio.md 记录音频设计和试听导出。

公网发布及复现：production/deployment.md。
