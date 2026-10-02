# ADR 001：Phaser 3
已确认：2D 默认，Phaser 3.90 + TypeScript + Vite；DOM UI 使用 React。理由：网页首发、2D 精灵、成熟浏览器集成。Pixi 更偏渲染会增加基础系统工作；3D 引擎不符合当前美术与玩法。
固定 Phaser 3 大版本以符合当前架构参考；升级引擎须单独验证。不需要账号、API key 或后端。
