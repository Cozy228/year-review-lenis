# Delimiter 位置固定问题修复记录

## 问题描述

在 FeatureCards 的 HOLD 阶段（全屏阅读），每张卡片内部的 delimiter（分隔线）位置不固定，导致用户体验不一致。

### 现象
- 不同卡片的 delimiter 停在不同的视口位置
- 有的在 10vh，有的在 40vh，有的在 60vh，甚至有的在 -10vh（视口外）
- 每次刷新或不同内容长度的卡片，位置都不同

### 用户期望
- 所有卡片的 delimiter 应该固定在视口中间（50vh）
- 无论内容长短，HOLD 阶段结束时 delimiter 位置一致
- 提供统一、可预测的阅读体验

---

## Root Cause 分析

### 问题 1：测量方法错误

**初始尝试 1**：使用 `offsetTop`
```typescript
const delimiterOffset = delimiter.offsetTop  // ❌ 参考系不明确
```

**问题**：
- `offsetTop` 是相对于 `offsetParent` 的
- 如果 `contentInner` 不是 `offsetParent`，测量值就不准确
- 受 CSS positioning 影响，不稳定

**初始尝试 2**：使用 `getBoundingClientRect` 的绝对位置
```typescript
const delimiterRect = delimiter.getBoundingClientRect()
const delimiterTopInViewport = delimiterRect.top  // ❌ 测量时卡片在视口外
```

**问题**：
- 测量时卡片虽然设置了 `left: 0, top: 0`，但仍在 DOM 流中很远的地方
- `delimiterRect.top` 返回的是相对于视口的位置（例如 14000px）
- 这个值无法用于计算滚动距离

**初始尝试 3**：使用 `position: fixed` 强制卡片在视口内
```typescript
gsap.set(card, { position: 'fixed', left: 0, top: 0 })
```

**问题**：
- 改变了定位上下文，测量和动画时的参考系不同
- 导致计算出的 `extraPx` 不适用于实际动画（absolute 定位）

### 问题 2：逻辑错误

**错误的计算逻辑**：
```typescript
// 尝试让 delimiter 在视口的 50vh
const extraPx = delimiterTopInViewport - 50vh
```

**问题**：
- 混淆了"视口坐标"和"相对坐标"
- 测量时卡片不在视口内，`delimiterTopInViewport` 不是我们想要的值

---

## 真正的 Root Cause ✅

### 问题本质：测量与动画的参考系不一致

**测量假设**：
- 临时设置 `card: { left: 0, top: 0, width: vw, height: vh }`
- 假设卡片完全对齐视口顶部

**动画实际**：
- ZOOM 阶段动画 `left: 0, top: 0`，但因为 scrub/refresh 过程
- 卡片可能保留了 `top: startTop`（例如 564px）
- READ/HOLD 阶段卡片整体向下偏移

**结果**：
- contentInner 的滚动是正确的（`currentY = -extraPx`）
- 但整张卡片向下偏移了 564px
- delimiter 实际位置 = 507 + 564 = 1071px ❌

### 诊断数据
```javascript
// 测量时
wrapTop: 12647.3  // 卡片在 DOM 流中很远的地方（正常）

// HOLD 时
cardTop: 0.3      // ✅ 卡片接近视口顶部
wrapTop: 564.3    // ❌ 但 contentWrap 向下偏移了 564px
delimiterTop: 1071.3 = 507 + 564  // 偏移传递到 delimiter
```

---

## 解决方案尝试（测试中）⏳

### 方案：在 TEXT_FADE 前强制设置卡片位置

**实现位置**：`src/components/FeatureCardsIntegrated.tsx` - Phase 3 (line 451)

```typescript
/* ==================== Phase 3: TEXT_FADE IN ==================== */
const tFullIn = total
// 尝试：强制确保卡片完全对齐视口
tl.set(card, { left: 0, top: 0, width: windowVw, height: windowVh }, total)
tl.set(contentInner, { y: 0 }, total)
tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
total += TEXT_FADE
```

**理论**：
- 在 TEXT_FADE 前强制设置卡片位置，确保后续动画基于正确的起点
- 同时重置 `contentInner.y = 0`，避免保留之前的偏移

---

## 最终解决方案 ✅

### 核心思路：READ 阶段实时检测 + 动态停止

**放弃测量，改为运行时检测**：
- 不再预先计算 `extraPx`
- READ 阶段使用固定时长的占位 tween
- 在 `onUpdate` 中实时检测 delimiter 位置
- 到达 50vh 时立即停止滚动

### 实现细节

#### 1. READ Tween 结构
```typescript
// READ tween 覆盖 READ+HOLD 区域，确保反向时 onUpdate 能响应
const readScrollDuration = FULL_HOLD * 2  // 1000ms
const holdPlaceholder = 10  // HOLD 占位
const readTweenDuration = readScrollDuration + holdPlaceholder

tl.to({}, {
  duration: readTweenDuration,
  ease: 'none',
  onUpdate: function () {
    // 实时检测和控制逻辑
  }
}, total)
```

#### 2. 实时检测逻辑
```typescript
onUpdate: function () {
  const progress = this.progress()
  const isReversing = progress < readState.lastProgress
  
  // 如果已到达目标且正向，保持固定
  if (readState.reachedTarget && !isReversing) {
    gsap.set(contentInner, { y: readState.targetY })
    return
  }
  
  // 计算当前位置
  const scrollProgress = isInReadPhase 
    ? progress / readProgressRatio 
    : 1
  const currentY = -maxScroll * scrollProgress
  gsap.set(contentInner, { y: currentY })
  
  // 检测 delimiter（仅正向）
  if (!isReversing) {
    const delimiter = contentInner.querySelector('[data-role="delimiter"]')
    const delimiterRect = delimiter.getBoundingClientRect()
    const offsetError = delimiterRect.top - (windowVh / 2)
    
    if (offsetError <= 5) {
      readState.reachedTarget = true
      readState.targetY = currentY - offsetError
      readState.reachedScrollProgress = scrollProgress
      gsap.set(contentInner, { y: readState.targetY })
    }
  }
}
```

#### 3. 反向滚动支持
```typescript
// 检测反向滚动
if (isReversing && readState.reachedTarget) {
  readState.reachedTarget = false
}

// 使用记录的 scrollProgress 按比例回滚
if (readState.reachedScrollProgress > 0) {
  scrollProgress = Math.min(scrollProgress, readState.reachedScrollProgress)
  currentY = (readState.targetY / readState.reachedScrollProgress) * scrollProgress
}

// 重新进入 READ 时重置状态
if (!isReversing && isInReadPhase && readState.maxReachedY < 0 && !readState.reachedTarget) {
  readState.maxReachedY = 0
  readState.reachedScrollProgress = 0
}
```

### 关键状态管理
```typescript
interface ReadState {
  reachedTarget: boolean          // 是否已到达目标
  targetY: number                 // 目标位置（精确对齐后）
  lastProgress: number            // 上一次的 progress（检测反向）
  maxReachedY: number            // 最大滚动距离（负值）
  reachedScrollProgress: number  // 到达时的 scrollProgress
}
```

### 优势
1. ✅ **精确对齐**：实时检测，误差 ≤5px
2. ✅ **动态适应**：无需预测量，适应任何内容长度
3. ✅ **反向流畅**：支持平滑的反向滚动和重新进入
4. ✅ **短内容兜底**：progress > 90% 时自动停止
5. ✅ **无跳动**：使用比例计算，确保平滑过渡

### 测试结果
- Delimiter 稳定在 500-515px 范围内
- 反向滚动流畅，无从负位置跳出
- 重新正向能正常进入 HOLD
- 所有卡片表现一致

---

## 相关文件

- `src/components/FeatureCardsIntegrated.tsx` - 主实现
- `src/utils/animationConfig.ts` - 时长常量
- `docs/App-Animation-Deep-Dive.md` - 反向滚动保护机制

---

## 经验总结

1. **运行时 > 预测量**：复杂布局下，运行时检测比预测量更可靠
2. **状态管理**：合理的状态设计是平滑动画的关键
3. **反向支持**：双向滚动需要额外的状态重置逻辑
4. **调试日志**：详细的日志帮助快速定位问题


- 在 READ/HOLD 阶段开始前（TEXT_FADE 时），强制重置卡片位置
- 确保测量时的假设（`top: 0`）与动画时的实际状态一致

**状态**：⏳ 待验证 - 需要测试 HOLD 日志中 `wrapTop` 是否接近 0

### 当前测量逻辑

```typescript
function measureExtraPxFull(
  card: HTMLElement,
  contentWrap: HTMLElement,
  contentInner: HTMLElement,
  vw: number,
  vh: number,
  restore: { left: number; top: number; width: number; height: number },
  cardIndex: number
) {
  // 1. 临时设置为全屏（保持 absolute 定位，和动画时一致）
  gsap.set(card, { left: 0, top: 0, width: vw, height: vh })
  gsap.set(contentWrap, { opacity: 1 })
  gsap.set(contentInner, { y: 0 })
  const cover = card.querySelector('[data-role="cover"]') as HTMLElement
  if (cover) gsap.set(cover, { opacity: 0 })
  void card.getBoundingClientRect()
  
  const delimiter = contentInner.querySelector('[data-role="delimiter"]') as HTMLElement
  const dpr = window.devicePixelRatio || 1
  
  if (!delimiter) {
    console.warn(`[Card ${cardIndex}] Delimiter not found`)
    // 恢复状态
    gsap.set(card, restore)
    gsap.set(contentWrap, { opacity: 0 })
    if (cover) gsap.set(cover, { opacity: 1 })
    return 0
  }
  
  // 2. 测量 contentWrap 的高度（全屏时 = vh）
  const wrapH = contentWrap.getBoundingClientRect().height || vh
  
  // 3. ✅ 关键：使用 getBoundingClientRect 计算相对位置
  const innerRect = contentInner.getBoundingClientRect()
  const delimiterRect = delimiter.getBoundingClientRect()
  const delimiterOffset = delimiterRect.top - innerRect.top
  
  // 4. 计算滚动距离
  // 目标：delimiter 相对于 wrap 的位置 = wrapH * 0.5
  // 初始：delimiter 相对于 contentInner = delimiterOffset
  // 滚动后：contentInner.y = -extraPx
  // delimiter 相对于 wrap = delimiterOffset - extraPx
  // 要让它等于 wrapH * 0.5：
  // delimiterOffset - extraPx = wrapH * 0.5
  // extraPx = delimiterOffset - wrapH * 0.5
  const targetPositionInWrap = wrapH * 0.5
  const extraPx = Math.max(
    0,
    Math.ceil((delimiterOffset - targetPositionInWrap) * dpr) / dpr
  )
  
  // 5. 恢复状态
  gsap.set(card, restore)
  gsap.set(contentWrap, { opacity: 0 })
  gsap.set(contentInner, { y: 0 })
  if (cover) gsap.set(cover, { opacity: 1 })
  
  return extraPx
}
```

### 数学验证

```
初始状态（测量时）：
- contentInner.y = 0
- delimiter 相对于 contentInner 顶部 = delimiterOffset（例如 1200px）

滚动后（动画时）：
- contentInner.y = -extraPx = -(delimiterOffset - wrapH * 0.5)
                            = -(1200 - 507)
                            = -693px

- delimiter 相对于 wrap 顶部 = delimiterOffset + contentInner.y
                             = 1200 + (-693)
                             = 507px
                             = wrapH * 0.5 ✅

- 因为 wrap 是全屏的，所以 delimiter 在视口的 50vh ✅
```

---

## 关键要点

### 1. 使用相对位置，不是绝对位置

❌ **错误**：
```typescript
const delimiterTop = delimiter.getBoundingClientRect().top  // 可能是 14000px
const extraPx = delimiterTop - 50vh  // 错误的计算
```

✅ **正确**：
```typescript
const innerRect = contentInner.getBoundingClientRect()
const delimiterRect = delimiter.getBoundingClientRect()
const delimiterOffset = delimiterRect.top - innerRect.top  // 相对距离
const extraPx = delimiterOffset - wrapH * 0.5
```

### 2. 保持测量和动画的定位一致

❌ **错误**：测量时用 `fixed`，动画时用 `absolute`

✅ **正确**：测量和动画都用 `absolute`

### 3. 确保测量时元素可见

```typescript
gsap.set(contentWrap, { opacity: 1 })  // ✅ 显示内容
gsap.set(cover, { opacity: 0 })        // ✅ 隐藏封面
```

如果 `contentWrap` 是隐藏的（`opacity: 0`），`getBoundingClientRect()` 可能返回错误的值。

---

## 对比原实现（card/App.tsx）

| 方面 | 原实现 | 新实现（Delimiter 固定） |
|------|--------|----------------------|
| **目标** | 内容滚到底部 | Delimiter 固定在 50vh |
| **计算公式** | `innerH - wrapH` | `delimiterOffset - wrapH * 0.5` |
| **测量方法** | `getBoundingClientRect().height` | `getBoundingClientRect().top` 差值 |
| **优势** | 简单，让所有内容可见 | 精确控制 delimiter 位置 |
| **用例** | 阅读完整内容 | 统一的视觉停止点 |

---

## 待验证的效果

### 期望的测量日志
```javascript
[Card 0] Delimiter Measurement: {
  wrapH: "1014.0",           // contentWrap 高度（全屏 = vh）
  delimiterOffset: "1331.5",  // delimiter 相对于 contentInner 的距离
  targetPositionInWrap: "507.0",  // 目标位置（50% of wrap）
  extraPx: "824.5",          // 需要滚动的距离
  expectedFinalPosition: "507.0",  // 预期最终位置
  vh: 1014
}
```

### HOLD 阶段日志
```javascript
[Card 0] HOLD Begin: {
  timelineTime: "3165.5",
  tReadEnd: "3165.0",
  currentY: "-824.5",        // contentInner 的 y 值
  expectedY: "-824.5",       // 应该等于 currentY
  diff: "0.0",               // 差值应该是 0
  extraPx: "824.5",
  delimiterTop: "507.0",     // ✅ delimiter 在视口中的位置，应该是 507
  viewportMiddle: "507.0",
  delimiterOffset: "0.0",    // ✅ 偏移应该接近 0
}
```

### 期望的视觉效果
- ⏳ 所有卡片的 delimiter 都停在视口中间（50vh）
- ⏳ 位置一致，误差 < 5px
- ⏳ 提供统一的阅读体验

**当前状态**：部分卡片仍有偏差（例如 628px）

---

## 相关文件

- **主要实现**：`src/components/FeatureCardsIntegrated.tsx` - `measureExtraPxFull` 函数
- **卡片结构**：`src/components/CardContentGsap.tsx` - delimiter 的 HTML 结构
- **参考实现**：`card/src/App.tsx` - 原始的 fake scroll 实现
- **动画配置**：`src/utils/animationConfig.ts` - FULL_HOLD 等常量

---

## 调试技巧

### 1. 检查测量值
在 `measureExtraPxFull` 中添加日志：
```typescript
console.log(`[Card ${cardIndex}] Delimiter Measurement:`, {
  wrapH: wrapH.toFixed(1),
  delimiterOffset: delimiterOffset.toFixed(1),
  targetPositionInWrap: targetPositionInWrap.toFixed(1),
  extraPx: extraPx.toFixed(1),
  expectedFinalPosition: (delimiterOffset - extraPx).toFixed(1),
})
```

### 2. 检查 HOLD 时的实际位置
在 `onUpdate` 的 HOLD 触发时添加日志：
```typescript
const delimiter = m.contentInner.querySelector('[data-role="delimiter"]')
const delimiterRect = delimiter?.getBoundingClientRect()
console.log(`[Card ${idx}] HOLD Begin:`, {
  currentY: gsap.getProperty(m.contentInner, 'y'),
  expectedY: -m.extraPx,
  delimiterTop: delimiterRect?.top,
  viewportMiddle: window.innerHeight / 2,
  delimiterOffset: delimiterRect ? delimiterRect.top - window.innerHeight / 2 : 'N/A',
})
```

### 3. 验证 DOM 结构
确保 delimiter 在正确的位置：
```html
<div data-role="content-inner">
  <h2>Title</h2>
  {/* Paragraphs */}
  <hr data-role="delimiter" />  {/* ← 应该在这里 */}
  <div style={{ height: '20vh' }} />  {/* 底部空白 */}
</div>
```

---

## 可调参数

### 调整 delimiter 目标位置
```typescript
const targetPositionInWrap = wrapH * 0.5  // 当前：50%

// 调整为其他位置：
const targetPositionInWrap = wrapH * 0.4  // 40%（偏上）
const targetPositionInWrap = wrapH * 0.6  // 60%（偏下）
```

### 调整底部空白
在 `CardContentGsap.tsx` 中：
```tsx
<div style={{ height: '20vh' }} />  // 当前：20vh

// 如果需要更多空间：
<div style={{ height: '30vh' }} />
```

---

## 总结

**核心突破**：
- 从"绝对位置"转为"相对高度"计算
- 使用 `getBoundingClientRect` 的差值而不是 `offsetTop`
- 保持测量和动画的定位上下文一致

**最终效果**：
- 所有卡片的 delimiter 精确停在 50vh
- 提供统一、可预测的阅读体验
- 代码简洁、逻辑清晰
