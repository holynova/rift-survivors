# v0.9 装备与音乐资源

2026-10-03，v0.9正式发布。默认玩法仍为v0.8六武器构筑，本次改善资源与表现。

## 保存位置与来源
- `art/generated/v9/weapons-raw.png`：内置image_gen生成的12武器透明图集，1448×1086，4×3。
- `art/generated/v9/items-raw.png`：内置image_gen生成的30道具透明图集，1374×1145，6×5。
- `public/assets/v9/weapons/*.png`、`public/assets/v9/items/*.png`：42个128×128透明精灵，脚本按格分离、alpha包围盒裁切、等比缩放至108px并居中留白。两份atlas.json记录分格与归一化结果。
- `public/assets/audio/v9/*.m4a`：四段16小节原创循环，108/118/128/136 BPM。编曲和合成乐器全部由本项目脚本制作，无外部音乐采样。原Kenney CC0战斗音效继续使用。
- `public/build-gallery.html`：全部图标与四段音乐的独立图鉴/试听页。

源图由内置工具生成，没有调用CLI/API后备路径。保留原生成结果，归一化不重绘。旧SVG图标与旧音频记录保留作为历史来源。新图标没有使用《土豆兄弟》素材。

## 提示词：武器图集
Create ONE production game inventory sprite atlas, transparent background, exactly 4 columns by 3 rows regular grid of TWELVE isolated weapon icons, high resolution landscape. Each cell same dimensions, each object centered within its cell with generous 18% clear gutters, no crossing cells, no shadows outside objects, NO TEXT NO LABELS NO frames. Original dark fantasy roguelite art, hand-painted miniature 3D inventory props, warm ivory rim highlights, aged bronze and steel, leather wraps, crystal accents, strong readable silhouettes at 40px, richly shaded but not photorealistic, cohesive with woodland stone arena. Strict reading order left to right rows: row1 ornate curved dagger jade leather grip; long ivory-steel spear bronze shaft; heavy square stone-and-bronze warhammer with amber core; crescent three-prong jade boomerang blade. Row2 antique teal flintlock pistol; compact bronze-teal automatic machine pistol; wide double-barrel bronze shotgun; elegant green wood and ivory crossbow. Row3 ice staff with large blue faceted crystal; brass handheld grenade launcher with orange glass chamber; black-steel blood scythe crimson blade; miniature brass turret deployment mechanism folded tripod and glowing amber gear. NOT a UI screenshot. All twelve complete separate objects, consistent diagonal bottom-left to top-right facing (guns face right), all fit inside cells.

## 提示词：道具图集
One production dark fantasy game inventory sprite atlas, exactly 6 columns x 5 rows aligned REGULAR grid of THIRTY isolated collectible item icons. Transparent background. NO TEXT NO NUMBERS NO LABELS NO TILE FRAMES. Landscape 6:5 aspect high resolution. Each object fits within identical square cell with 18% clear margin, centered, no objects crossing cells. Painterly premium stylized miniature props, aged bronze, jade, leather, warm ivory highlights, glossy jewel accents, same 3D isometric inventory style as dark fantasy weapons. Large distinct readable silhouettes at 32px. Strict row order left to right: Row1 frost monocle blue crystal lens; purple rift crystal shards; squat bronze anvil; burning ember amulet; mechanical turret power core with amber gear; silver piercing bullet with cyan rings. Row2 green lightning coil conductor; shattered blue ice rune stone; whetstone with crossed blade; brass telescope scope; glowing fire seed; large brass precision gear. Row3 winged leather boots; thick iron armor plate; red heart-shaped life crystal; brass trigger spring assembly; golden magical amplifier orb; jewelled targeting eyepiece. Row4 dark violet hooded cloak; corked green healing sap bottle; two crimson vampire fangs; woven harvest basket; gold lucky coin; horseshoe magnet with turquoise aura. Row5 duelling medal ribbon; leather cartridge pouch; blue arcane battery; rugged masonry brick; jade four-leaf clover; folded parchment contract with red wax seal. Exactly thirty separate objects, rich shading, no scenery, no glow bleeding into neighbors, no tiny illegible decorative writing.

## 音乐制作
`scripts/compose-music-v9.py` 使用numpy生成拨弦、弓弦、钟音、低音与鼓组音色，D小调/Bb/F/C为基础，16小节中改变旋律、和弦转位和对位节奏。立体声声部与循环尾部反射提供空间感；32kHz PCM母带存于忽略的work/music-v9，ffmpeg导出144kbps AAC。四段共约2.4MB；谱面、BPM、时长、峰值、RMS与字节数见audio/v9/manifest.json。
音乐不逐帧创建振荡器，已解码的循环由WebAudio播放，阶段切换650ms交叉淡化，暂停/商店立即停播，音效与音乐音量仍独立。原程序音色只在新音乐文件加载失败时后备。Boss配乐改为第12波，修正旧八波判断。

## 攻击与构筑表现
- 匕首/长矛：方向刺线与箭头；重锤：接触点冲击环、裂地与碎石。
- 回旋刃：旋转三刃与拖影；穿透弩：箭杆/尾翼；冰杖：冰晶几何弹体与冰屑；爆破器：实体弹丸、火花、火球与冲击波；镰刀：血色环刃。
- 裂隙碎片为紫晶爆散，冰冻敌人有冷色染色，溢出护盾有琥珀护罩，站定炮台显示强化光环。
- 六武器实例显示绘制资源、品质大小和射击后坐力，菜单/商店/库存统一图标。库存30道具同时显示无滚动；减少动画设置保留。

## 验收
52项Vitest、8项Playwright串行回归；实际资源加载、HTML音频播放、四阶段音乐切换、静音/暂停/音量恢复、8种视窗满库存、生产构建。音频离线导出用的是游戏内AudioMixer，四阶段32秒混合预览：峰值0.276、RMS0.044，没有削波，四段均有输出，4段音乐与25个音效全部解码成功。
证据：`evidence/v09-*.png`、`evidence/v09-performance.json`、`evidence/audio-v9-report.json`、`evidence/audio-v9-score.wav`。合成压力平均59.56FPS，最大采样模拟更新3.9ms。性能为合成压力测试，不保证其他设备帧率。试玩仍需真人判断听感、视觉舒适度与战斗可读性。
