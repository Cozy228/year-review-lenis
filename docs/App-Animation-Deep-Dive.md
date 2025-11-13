# App.tsx 动画实现深度拆解文档

## 📋 目录

1. [整体架构概览](#整体架构概览)
2. [动画配置参数](#动画配置参数)
3. [HoldController 类详解](#holdcontroller-类详解)
4. [时间线动画拆解](#时间线动画拆解)
5. [滚动触发器配置](#滚动触发器配置)
6. [分段动画详解](#分段动画详解)
7. [反向滚动保护机制](#反向滚动保护机制)
8. [响应式设计](#响应式设计)

---

## 整体架构概览

`App.tsx` 实现了一个基于 GSAP 和 ScrollTrigger 的复杂滚动驱动动画系统。核心原理是将整个动画序列映射到一个统一的滚动时间线上，通过滚动位置控制动画进度。

### 核心架构

```typescript
// 核心依赖
- GSAP (GreenSock Animation Platform)
- ScrollTrigger (GSAP 插件)
- Lenis (平滑滚动库)
- React (UI 框架)
```

### 工作流程

```
1. 页面加载时初始化 Lenis (useLenisGsap hook)
2. 创建 HoldController 实例（控制"冻结"状态）
3. 在 useLayoutEffect 中构建动画时间线
4. 创建 ScrollTrigger 实例，将滚动映射到时间线
5. 监听 resize 事件，重新计算动画参数
```

### 数据结构

```typescript
type Meta = {
  card: HTMLElement;              // 卡片元素
  contentWrap: HTMLElement;       // 内容包装元素
  contentInner: HTMLElement;      // 内容内部元素
  cover: HTMLElement;             // 封面元素
  tVisible: number;              // 卡片可见时间
  tFullIn: number;               // 全屏开始时间
  tReadEnd: number;              // 阅读结束时间
  tHoldEnd: number;              // 冻结结束时间
  tFullOut: number;              // 全屏退出时间
  tDockEnd: number;              // Dock 完成时间
  startLeft: number;             // 初始 X 位置
  startTop: number;              // 初始 Y 位置
};
```

---

## 动画配置参数

### 时间参数（详见 `animationConfig.ts`）

```typescript
export const INTRO_GAP = 300;    // 引入间隙
export const APPEAR    = 1200;   // 出现动画时长
export const ZOOM      = 700;    // 缩放动画时长
export const TEXT_FADE = 140;    // 文本淡入淡出时长
export const DOCK_MOVE = 1200;   // Dock 移动时长
export const BETWEEN   = 220;    // 卡片间隔时长
export const HIDE_FADE = 140;    // 隐藏淡入时长
export const FULL_HOLD = 500;    // 全屏停留时长
```

### 布局参数

```typescript
export const DOCK_BASE_LEFT = 16;  // Dock 起始 X
export const DOCK_BASE_TOP  = 16;  // Dock 起始 Y
export const DOCK_GAP       = 40;  // Dock 间距
```

### 参数说明

| 参数 | 用途 | 说明 |
|------|------|------|
| `INTRO_GAP` | 首个卡片出现前的空白滚动距离 | 给用户初始滚动体验 |
| `APPEAR` | 右下角 → 居中动画时长 | 卡片初次出现 |
| `ZOOM` | 居中 ↔ 全屏切换时长 | 1秒左右丝滑感 |
| `TEXT_FADE` | 文本淡入淡出 | 140ms 快速过渡 |
| `FULL_HOLD` | 全屏停留 | 关键：支持"假内滚" |
| `DOCK_MOVE` | 居中 → Dock 位置 | 1.2秒柔和感 |

---

## HoldController 类详解

### 核心职责

HoldController 是动画系统的**核心组件**，负责管理"冻结"状态（Hold State）。当用户在阅读全屏卡片时，HoldController 阻止页面滚动，启用假内滚。

### 类结构

```typescript
class HoldController {
  private overlay: HTMLDivElement | null = null;  // 阻止滚动的遮罩层
  private holding = false;                         // 是否正在冻结
  private holdIdx = -1;                           // 当前冻结的卡片索引
  private holdScroll = 0;                         // 冻结时的滚动位置
  private accPx = 0;                               // 累积滚动的像素值
}
```

### 核心方法

#### 1. begin(p: { cardIndex: number })

```typescript
// 开始冻结状态
begin(p: { cardIndex: number }) {
  if (this.holding) return;
  const lenis = lenisSingleton.current!;
  this.holding = true;
  this.holdIdx = p.cardIndex;

  this.holdScroll = this.getScrollY();
  lenis.stop();  // 停止 Lenis 滚动
  lenis.scrollTo(this.holdScroll, { immediate: true });

  this.mountOverlay();  // 挂载遮罩层
}
```

**功能流程：**
```
1. 保存当前滚动位置（holdScroll）
2. 停止 Lenis（防止自然滚动）
3. 强制将 Lenis 滚动到冻结位置
4. 挂载透明遮罩层（阻止用户滚动事件）
```

#### 2. finish()

```typescript
// 完成冻结，继续向下滚动
finish() {
  if (!this.holding) return;
  const lenis = lenisSingleton.current!;
  this.unmountOverlay();
  this.holding = false;

  // 把页面滚动推进 FULL_HOLD 像素，时间线自然越过 hold 段
  lenis.start();
  lenis.scrollTo(this.holdScroll + FULL_HOLD, { immediate: true });
  this.holdIdx = -1;
  this.accPx = 0;
}
```

**关键点：**
- 重新启动 Lenis
- 直接跳转 `FULL_HOLD` 像素，跳过冻结区域

#### 3. releaseReverse()

```typescript
// 反向释放：上滚回到冻结起点
releaseReverse() {
  if (!this.holding) return;
  const lenis = lenisSingleton.current!;
  this.unmountOverlay();
  this.holding = false;

  lenis.start();
  lenis.scrollTo(this.holdScroll, { immediate: true });
  this.holdIdx = -1;
  this.accPx = 0;
}
```

**用途：** 用户上滚时，回到冻结起点

#### 4. keepPinned()

```typescript
// 保持在冻结位置
keepPinned() {
  if (!this.holding) return;
  const lenis = lenisSingleton.current!;
  lenis.scrollTo(this.holdScroll, { immediate: true });
}
```

**用途：** 防止页面被意外滚动

### 事件处理

#### Wheel 事件（鼠标滚轮）

```typescript
private onWheel = (e: WheelEvent) => {
  if (!this.holding) return;
  e.preventDefault();
  const dy = /* 兼容性处理 */;

  // 上滚：释放
  if (dy < 0) {
    this.releaseReverse();
    return;
  }

  // 下滚：累积
  this.accPx += Math.abs(dy);
  if (this.accPx >= FULL_HOLD) this.finish();
};
```

**逻辑：**
- 上滚 → 立即释放（reverse）
- 下滚 → 累积直到 FULL_HOLD

#### Touch 事件（移动端）

```typescript
private tTouch = 0;
private onTouchStart = (e: TouchEvent) => {
  if (!this.holding) return;
  this.tTouch = e.touches[0]?.clientY ?? 0;
};
private onTouchMove = (e: TouchEvent) => {
  if (!this.holding) return;
  const y = e.touches[0]?.clientY ?? 0;
  const dy = this.tTouch - y; // 下滑为正
  this.tTouch = y;

  if (dy < 0) {
    this.releaseReverse();
    return;
  }
  e.preventDefault();
  this.accPx += dy;
  if (this.accPx >= FULL_HOLD) this.finish();
};
```

**逻辑：** 与 Wheel 一致，支持移动端

#### Keyboard 事件

```typescript
private onKeyDown = (e: KeyboardEvent) => {
  if (!this.holding) return;
  const k = e.key.toLowerCase();
  let step = 0;

  if (k === " " || k === "pagedown") step = window.innerHeight * 0.9;
  else if (k === "arrowdown") step = 80;
  else if (k === "arrowup" || k === "pageup") {
    this.releaseReverse();
    e.preventDefault();
    return;
  }

  if (step > 0) {
    e.preventDefault();
    this.accPx += step;
    if (this.accPx >= FULL_HOLD) this.finish();
  }
};
```

**支持的按键：**
- Space、PageDown：大跳跃
- ArrowDown：小跳跃
- ArrowUp、PageUp：反向释放

---

## 时间线动画拆解

### 整体流程

```typescript
const tl = gsap.timeline({ defaults: { ease: "none" } });
let total = 0;
```

**每个卡片动画顺序：**

```
起始位置（右下角）→ 居中 → 全屏 → 阅读 → 冻结 → 退出全屏 → 居中 → Dock
```

### 单卡动画时间线

```
[INTRO_GAP]           →  [APPEAR]      →  [ZOOM]     →  [TEXT_FADE]
     ↓                      ↓                ↓              ↓
   总时长 0               300             1500          2200

[extraUnits]          →  [FULL_HOLD]   →  [TEXT_FADE]
   ↓                       ↓                ↓
 阅读阶段                冻结段          退出淡入

[ZOOM]                →  [DOCK_MOVE]
   ↓                       ↓
 收拢到居中            移动到 Dock

[BETWEEN]             → 下一个卡片
   ↓
 卡片间隔
```

### 代码实现

```typescript
total += INTRO_GAP;

// APPEAR: 右下角 → 居中
total += APPEAR;

// ZOOM: 居中 → 全屏
total += ZOOM;

// TEXT_FADE: 文本淡入
total += TEXT_FADE;

// READ: 假内滚（extraUnits）
total += extraUnits;

// FULL_HOLD: 冻结
total += FULL_HOLD;

// TEXT_FADE: 文本淡出
total += TEXT_FADE;

// ZOOM: 退出全屏
total += ZOOM;

// DOCK_MOVE: 移动到 Dock
total += DOCK_MOVE;

// BETWEEN: 间隔
total += BETWEEN;
```

---

## 滚动触发器配置

### ScrollTrigger 关键配置

```typescript
ScrollTrigger.create({
  animation: tl,                    // 绑定时间线
  trigger: stage,                   // 触发元素
  start: "top top",                 // 滚动起始
  end: () => "+=" + total,          // 滚动结束（总时长）
  scrub: 1,                         // 平滑滚动
  pin: true,                        // 固定舞台
  anticipatePin: 1,                 // 预固定
  invalidateOnRefresh: true,        // 刷新时重新计算

  onUpdate(self) {
    const t = tl.time();
    const dir = self.direction;
    // ... 更新逻辑
  },
});
```

### Pin 机制

**效果：** 进入舞台区域后，页面不再自然滚动，动画由滚动驱动

```typescript
pin: true              // 将舞台固定在视口
anticipatePin: 1       // 提前预判固定，避免闪动
```

### 滚动空间计算

```typescript
end: () => "+=" + total
```

**计算后的滚动空间：**
```
total = INTRO_GAP + APPEAR + ZOOM + TEXT_FADE + extraUnits + FULL_HOLD + TEXT_FADE + ZOOM + DOCK_MOVE + BETWEEN
平均每个卡片约 300 + 1200 + 700 + 140 + X + 500 + 140 + 700 + 1200 + 220 = 5100 + X 像素
```

---

## 分段动画详解

### 阶段 1: 引入间隙（INTRO_GAP）

```typescript
// 起始位置
gsap.set(card, {
  left: startLeft,    // 右下角（vw - baseW - 16）
  top: startTop,      // 底部（vh - baseH - 16）
  width: baseW,
  height: baseH,
  zIndex: 15
});
```

### 阶段 2: 出现（APPEAR）

```typescript
tl.to(card, {
  left: centerLeft,   // (vw - baseW) / 2
  top: centerTop,     // (vh - baseH) / 2
  duration: APPEAR,
  ease: "power4.out"
}, total);
```

**效果：** 从右下角平滑移动到居中位置

### 阶段 3: 缩放（ZOOM）

```typescript
tl.to(card, {
  left: 0,
  top: 0,
  width: vw,          // 视口宽度
  height: vh,         // 视口高度
  duration: ZOOM,
  ease: "power1.inOut"
}, total);

tl.to(cover, {
  opacity: 0,         // 封面淡出
  duration: ZOOM
}, total);
```

**效果：** 居中卡片展开为全屏，封面淡出

### 阶段 4: 文本淡入（TEXT_FADE）

```typescript
tl.set(contentInner, { y: 0 }, total);
tl.to(contentWrap, {
  opacity: 1,         // 内容淡入
  duration: TEXT_FADE
}, total);
```

**效果：** 正文区域淡入显示

### 阶段 5: 假内滚（extraUnits）

```typescript
const extraPx = measureExtraPxFull(
  card, contentWrap, contentInner, vw, vh, restore
);
const extraUnits = Math.max(1, Math.round(extraPx));

tl.to(contentInner, {
  y: -extraPx,        // 向上滚动内容
  duration: extraUnits,
  ease: "none"
}, total);
```

**关键方法：**

```typescript
function measureExtraPxFull(
  card: HTMLElement,
  contentWrap: HTMLElement,
  contentInner: HTMLElement,
  vw: number,
  vh: number,
  restore: { left: number; top: number; width: number; height: number }
) {
  // 临时设置全屏尺寸
  gsap.set(card, { left: 0, top: 0, width: vw, height: vh });
  void card.getBoundingClientRect();

  const wrapH = contentWrap.getBoundingClientRect().height || vh;  // 容器高度
  const innerH = contentInner.getBoundingClientRect().height;      // 内容高度

  // 考虑设备像素比
  const dpr = window.devicePixelRatio || 1;
  const FUDGE = 2;  // 额外缓冲区

  // 计算需要滚动的像素
  const extraPx = Math.max(0, Math.ceil((innerH - wrapH + FUDGE) * dpr) / dpr);

  // 恢复原始状态
  gsap.set(card, restore);
  return extraPx;
}
```

**机制原理：**
1. 临时设置全屏尺寸
2. 测量内容超出高度
3. 以 1px = 1单位 的速率滚动
4. 真正实现"假内滚"

### 阶段 6: 冻结（FULL_HOLD）

```typescript
tl.to({}, { duration: FULL_HOLD }, total);
```

**关键点：**
- 空动画，仅消耗时间
- 在 onUpdate 中检测，进入 HoldController

### 阶段 7: 文本淡出（TEXT_FADE）

```typescript
tl.to(contentWrap, {
  opacity: 0,         // 内容淡出
  duration: TEXT_FADE
}, total);
```

### 阶段 8: 重置状态

```typescript
tl.set(contentInner, { y: 0 }, total);     // 重置 Y 位置
tl.set(cover, { opacity: 1 }, total);        // 恢复封面
```

### 阶段 9: 退出缩放（ZOOM）

```typescript
tl.to(card, {
  left: centerLeft,
  top: centerTop,
  width: baseW,
  height: baseH,
  duration: ZOOM
}, total);
```

### 阶段 10: Dock 移动（DOCK_MOVE）

```typescript
const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP;
const dockTop = DOCK_BASE_TOP + i * DOCK_GAP;

tl.to(card, {
  left: dockLeft,
  top: dockTop,
  duration: DOCK_MOVE,
  ease: "power2.inOut"
}, total);
```

**效果：** 形成卡片错位的 Dock 效果

---

## 反向滚动保护机制

### 问题描述

在正常滚动时，当时间线位置 `t >= m.tReadEnd` 时触发进入 Hold 状态。但如果用户反向滚动（上滚）时出现以下情况：

```
1. 用户滚动到 t >= tReadEnd → 进入 Hold
2. 用户上滚 → releaseReverse() 被调用
3. 用户继续上滚一小段（仍在 t < tReadEnd 区域）
4. 又立即满足 t >= tReadEnd → 再次进入 Hold
```

这会导致 Hold 状态反复触发，出现卡顿。

### 解决方案

```typescript
const reverseGuardRef = useRef<Record<number, boolean>>({}); // ★ 逆向防抖/迟滞
```

**实现逻辑：**

```typescript
onUpdate(self) {
  const t = tl.time();
  const dir = self.direction;

  metas.forEach((m, idx) => {
    // —— 逆向迟滞保护：刚从 HOLD 反向释放后，不要立刻重新进入 HOLD —— //
    const guard = reverseGuardRef.current[idx] === true;

    // 如果当前处于保护期，且滚动位置已经离开阅读末端 1 单位
    if (guard && t < m.tReadEnd - 1) {
      reverseGuardRef.current[idx] = false;
    }

    // 进入 HOLD（仅当不在保护期）
    if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
      holdCtl.begin({ cardIndex: idx });
    }

    // 正在 HOLD
    if (holdCtl.isHolding(idx)) {
      holdCtl.keepPinned();
      if (dir === -1) {
        holdCtl.releaseReverse();
        reverseGuardRef.current[idx] = true; // 开启保护，避免马上又被锁回 HOLD
      }
    }
  });
}
```

**保护机制流程图：**

```
tReadEnd (500)                                    tHoldEnd (1000)
   |                                                  |
   |─── HOLD 区域 (500-1000) ───|                     |
                               |                     |
         进入 Hold → ← 上滚释放 → 立即设置 guard = true

后续滚动：
  - 如果 t < tReadEnd - 1（已离开足够远）→ guard = false（解除保护）
  - 如果 t >= tReadEnd → 检查 guard，跳过 Hold（不再次进入）
  - 需要离开保护区域再返回才会触发新的 Hold
```

**参数选择：**
```typescript
tReadEnd - 1  // 选择 1 个时间单位，确保用户彻底离开 Hold 区域
```

---

## 响应式设计

### 窗口大小变化处理

```typescript
useLayoutEffect(() => {
  build();  // 初始构建

  let rafId = 0;
  const onResize = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      ctxRef.current?.revert();  // 回滚动画
      build();                    // 重新构建
    });
  };

  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    ctxRef.current?.revert();
  };
}, []);
```

### 动态计算元素

1. **初始位置：**
   ```typescript
   const startLeft = Math.max(0, vw - baseW - 16);
   const startTop = Math.max(0, vh - baseH - 16);
   ```

2. **居中位置：**
   ```typescript
   const centerLeft = (vw - baseW) / 2;
   const centerTop = (vh - baseH) / 2;
   ```

3. **Dock 位置（动态）：**
   ```typescript
   const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP;
   const dockTop = DOCK_BASE_TOP + i * DOCK_GAP;
   ```

**优势：** 每次窗口大小变化都会重新计算所有位置，确保动画始终适配。

---

## 性能优化

### 1. GSAP Context 管理

```typescript
ctxRef.current = gsap.context(() => {
  // 所有动画在此上下文中构建
}, stageRef);

// 清理时使用 revert()
ctxRef.current?.revert();
```

**优势：**
- 自动管理所有动画和 ScrollTrigger
- revert() 一键清理

### 2. RAF 防抖

```typescript
let rafId = 0;
const onResize = () => {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    // 实际的重建逻辑
  });
};
```

**优势：** 避免频繁重建

### 3. will-change 属性

```typescript
<div data-role="content-inner" className="absolute ... will-change-transform">
```

**用途：** 告诉浏览器此元素将频繁变换，预分配资源

### 4. 类的动态管理

```typescript
m.card.classList.add("is-visible");
m.card.classList.remove("invisible");
m.card.style.opacity = "";
```

**优势：** 比每次都通过 GSAP 设置更高效

### 5. 空动画优化

```typescript
tl.to({}, {}, total);  // 用于占位，避免第一个动画被跳过
```

---

## 关键帧时间点计算

### 完整示例

假设：`extraUnits = 100`

```typescript
// 起始点
total = 0

// APPEAR: 300 → 1500
total = 300 + 1200 = 1500

// ZOOM: 1500 → 2200
total = 1500 + 700 = 2200

// TEXT_FADE: 2200 → 2340
total = 2200 + 140 = 2340

// extraUnits: 2340 → 2440
total = 2340 + 100 = 2440

// FULL_HOLD: 2440 → 2940
total = 2440 + 500 = 2940

// TEXT_FADE: 2940 → 3080
total = 2940 + 140 = 3080

// ZOOM: 3080 → 3780
total = 3080 + 700 = 3780

// DOCK_MOVE: 3780 → 4980
total = 3780 + 1200 = 4980

// BETWEEN: 4980 → 5200
total = 4980 + 220 = 5200

// 最终第一个卡片占 5200 像素滚动空间
```

**Meta 时间点：**
```typescript
tVisible = 300    // 开始显示
tFullIn = 2200    // 全屏
tReadEnd = 2440   // 阅读结束
tHoldEnd = 2940   // 冻结结束
tFullOut = 3080   // 全屏退出
tDockEnd = 4980   // Dock 完成
```

---

## 动画触发条件

### onUpdate 完整逻辑

```typescript
onUpdate(self) {
  const t = tl.time();
  const dir = self.direction;

  metas.forEach((m, idx) => {
    // 1. 可见性判断
    if (t >= m.tVisible) {
      // 正常显示
      m.card.classList.add("is-visible");
      m.card.classList.remove("invisible");
      m.card.style.opacity = "";
    } else if (dir === -1 && t > m.tVisible - HIDE_FADE) {
      // 反向淡入效果
      const alpha = (t - (m.tVisible - HIDE_FADE)) / HIDE_FADE;
      m.card.classList.add("is-visible");
      m.card.classList.remove("invisible");
      m.card.style.opacity = String(alpha);
      m.card.style.left = m.startLeft + "px";
      m.card.style.top = m.startTop + "px";
    } else {
      // 隐藏
      m.card.classList.remove("is-visible");
      m.card.classList.add("invisible");
      m.card.style.opacity = "";
    }

    // 2. 层级管理
    //    t >= tDockEnd ? 3 : // Dock 完成后 ZIndex = 12
    //    t >= tFullIn && t < tFullOut ? 2 : // 全屏时 ZIndex = 20
    //    t >= tVisible ? 1 : 0 // 其他情况

    // 3. Reverse Guard 判断
    const guard = reverseGuardRef.current[idx] === true;
    if (guard && t < m.tReadEnd - 1) {
      reverseGuardRef.current[idx] = false;
    }

    // 4. Hold 触发
    if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
      holdCtl.begin({ cardIndex: idx });
    }

    // 5. Hold 中处理
    if (holdCtl.isHolding(idx)) {
      holdCtl.keepPinned();
      if (dir === -1) {
        holdCtl.releaseReverse();
        reverseGuardRef.current[idx] = true;
      }
    }
  });
}
```

### 层级管理

```typescript
const phase =
  t >= m.tDockEnd ? 3 :           // phase = 3: Dock 阶段
  t >= m.tFullIn && t < m.tFullOut ? 2 :  // phase = 2: 全屏阶段
  t >= m.tVisible ? 1 : 0;        // phase = 1: 可见阶段

if (phase === 2) m.card.style.zIndex = "20";    // 全屏最前
else if (phase === 3) m.card.style.zIndex = "12"; // Dock 层级
else if (phase === 1) m.card.style.zIndex = "15"; // 显示但非最前
else m.card.style.zIndex = "0";                   // 隐藏
```

---

## 卡片组件结构（Card.tsx）

### DOM 结构

```html
<article class="card fixed invisible z-0" style="width: {width}; height: {height};">
  <div class="relative w-full h-full overflow-hidden ...">
    <!-- 封面 -->
    <div data-role="cover" class="absolute inset-0 ...">
      <!-- 图标 -->
      <div class="grid place-items-center rounded-xl ...">
        <svg>...</svg>
      </div>
      <!-- 标签 -->
      <div>{coverLabel}</div>
    </div>

    <!-- 内容 -->
    <div data-role="content" class="absolute inset-0 overflow-hidden opacity-0 ...">
      <div data-role="content-inner" class="will-change-transform px-7 py-6">
        <h2>{title}</h2>
        <p>...</p> <!-- 正文 -->
        <hr />
        <div style="height: 40vh" /> <!-- 底部空间 -->
      </div>
    </div>
  </div>
</article>
```

### 关键属性

- `data-role="cover"`：封面，仅显示在卡片未全屏时
- `data-role="content"`：内容容器，全屏时淡入
- `data-role="content-inner"`：实际内容，支持假内滚
- `will-change-transform`：通知浏览器优化

---

## 测试与调试

### 调试 Hold 状态

```typescript
// 在浏览器控制台输入
window.holdCtl = holdCtl; // 保存引用

// 检查状态
console.log(holdCtl.isHolding());
console.log(holdCtl.holding);
console.log(holdCtl.holdIdx);
```

### 查看时间节点

```typescript
// 在 onUpdate 中打印
console.log(`t: ${t.toFixed(0)}`, `dir: ${dir}`, `phase: ${phase}`);
```

### 检查层级

```javascript
// 在浏览器中检查元素
const card = document.querySelector('[data-card-id="c1"]');
card.style.zIndex;  // 查看当前层级
```

---

## 最佳实践与技巧

### 1. 动画时间线规划

**建议：** 先手写时间线草图，再编码

```
@500ms: 开始显示
@1500ms: 居中完成
@1200ms: 全屏
@140ms: 文本淡入
@Xms: 阅读
@500ms: 冻结
@1200ms: 退出全屏
@1000ms: 完成 Dock
```

### 2. 状态管理

**原则：** 将动画状态与 React 状态分离

- 使用 `useRef` 存储动画相关状态
- 避免触发 React 重新渲染
- 使用 `classList` 而非 React state 控制可见性

### 3. 性能优化

**技巧：**
1. 使用 `gsap.context` 管理作用域
2. 使用 RAF 防抖 resize
3. 使用 `will-change` 提示浏览器
4. 避免在动画循环中操作 DOM

### 4. 兼容性

**考虑：**
1. `devicePixelRatio` 处理
2. `deltaMode` 滚轮兼容性
3. `requestAnimationFrame` 支持
4. `getBoundingClientRect` 性能

---

## 常见问题

### Q1: 为什么使用 `gsap.to({}, { duration: FULL_HOLD })` 而不是真正冻结?

**A:** 因为 GSAP 的 ScrollTrigger 需要时间来驱动，HoldController 在「冻结时间段」内接管用户交互。

### Q2: 反向滚动时卡片会闪烁？

**A:** 这是 Reverse Guard 的工作机制，确保不会重复触发 Hold。

### Q3: 如何调整整体动画速度?

**A:** 修改 `animationConfig.ts` 中的时长参数，或者使用 ScrollTrigger 的 `duration`。

### Q4: 移动端触摸不灵敏?

**A:** 检查 `touch-action: none` 和 `e.preventDefault()` 是否正确应用。

### Q5: 如何添加更多卡片?

**A:** 修改 `cardsCfg` 数组，确保每个卡片有唯一 id，动画会自动计算。

---

## 总结

`App.tsx` 的动画系统是一个精妙的滚动驱动时间线实现，其核心价值在于：

1. **统一时间线：** 将所有动画映射到单个滚动空间
2. **冻结机制：** HoldController 支持"假内滚"体验
3. **保护机制：** Reverse Guard 防止意外重复触发
4. **响应式设计：** 完全基于视口动态计算
5. **性能优化：** 多层次的优化策略

**设计原则：**
- 时间线驱动 → 状态管理
- 用户交互 → 动画响应
- 复杂逻辑 → 简单 API
- 平滑体验 → 细节优化

这是一个高级的 GSAP 应用实例，展示了如何将复杂的动画需求转化为优雅的滚动体验。
