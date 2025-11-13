// src/animationConfig.ts
// —— 动画配额（集中管理）——
export const INTRO_GAP = 300;   // 进入舞台前的空白滚动距离
export const APPEAR    = 1200;  // 右下角 → 居中
export const ZOOM      = 700;   // 居中 ↔ 全屏
export const TEXT_FADE = 140;   // 正文淡入/淡出（仅全屏阶段显示正文）
export const DOCK_MOVE = 1200;   // 居中 → Dock
export const BETWEEN   = 220;   // 卡与卡之间留白
export const HIDE_FADE = 140;   // 反向隐藏前的预淡出窗口
export const FULL_HOLD = 500;   // 全屏停留：假内滚结束 → 文本淡出开始

// Dock：对角线递增（left/top 均按索引叠加 gap）
export const DOCK_BASE_LEFT = 16;
export const DOCK_BASE_TOP  = 16;
export const DOCK_GAP       = 40;