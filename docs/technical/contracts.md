# 数据与边界契约
HeroId=gunner|knight。Action=move|core|skill|ultimate|pause。State=menu|battle|upgrade|shop|paused|won|lost。
Entity：id,x,y,r,hp,maxHp,type；Projectile：id,x,y,vx,vy,damage,hostile,ttl。模拟对象不包含 Sprite、Tween 或 DOM。
配置 ID 不随显示名称变化。素材键 hero-gunner、hero-knight、hero-atlas；路径仅在 manifest。
局外存档键 rift-survivors-v1，字段 version=1,bestWave,bestKills,wins,sound。浏览器存储不可用时游戏继续。
调试接口只在 import.meta.env.DEV 暴露，提供快进/生成/快照，不打包生产作弊开关。
