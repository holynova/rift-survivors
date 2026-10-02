# 已发布项目检查补齐 · 2026-10-02

| 项目 | 状态 | 证据 |
|---|---|---|
| HTTPS、Worker及域名 | 已满足，复用 | rift-survivors.xiaosang.cc，线上0.7.1 |
| GitHub源码仓库 | 待授权 | holynova/rift-survivors不存在；拟创建公开仓库 |
| 发布配置与构建 | 已满足；补丁已准备 | dist生产构建与Wrangler dry-run成功 |
| Repo链接与Umami | 已准备，待上线 | 本地生产版0.7.2，生产环境注入一次指定tracker |
| 双语README、截图、二维码 | 已补齐 | assets/screenshot.png、assets/qr.png，README校验通过 |
| 版本与首屏适配 | 已检查 | 0.7.1→0.7.2版本校验；两项相关浏览器测试通过，包含8种尺寸 |
| xiaosang.cc收录 | 已发布并验证 | master 280292f；Worker xiaosang-portfolio，版本41c05517-e527-48f0-b17a-cdb706494624；公网数据、JS、截图与提交逐字节一致，卡片可见 |
| GitHub Profile | 已准备，待推送 | work/publisher-profile，新增一行及截图 |

本次尚未创建公开仓库、推送源码或发布任何准备中的补丁。线上仍为0.7.1。待确认新建公开仓库后，按项目main、作品集master、Profile main分别提交推送；从同一提交分别手动部署项目和作品集，回读验证。未来提交时更新作品条目的真实commit_time。

## 作品集实际完成
按用户要求独立完成游戏交互分类收录，保留已验证游戏Demo，暂不填写不存在的GitHub URL。作品卡片按是否有repo.url展示GitHub入口，其他已有源码链接保持正常。只提交data/repos.json、js/detail-app.js、screenshots/rift-survivors.png并推送master；独立部署作品集Worker。源码仓库、Profile及游戏0.7.2补丁仍未公开发布。验证证据：evidence/portfolio-rift-release.json和portfolio-rift-live.png。
