# 会话状态机
menu → battle → upgrade → battle；battle → shop → battle；battle → won/lost；battle → paused → battle；结算 → menu。
普通波结束若积累升级：battle → upgrade → shop。升级选择完成后继续检查经验，可连续处理多次升级。
打开升级/商店/暂停/结算清空按键。失去焦点仅在战斗时转 paused，返回不自动继续。
菜单和升级/商店阻断战斗输入。重新开始创建新的模拟对象，不沿用旧对象与定时器。
