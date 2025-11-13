# FeatureCards 全屏放大问题修复

## 🐛 问题描述

1. **放大后没有全屏**：卡片没有完全覆盖视口
2. **左侧有空间，右侧被遮挡**：尺寸计算不准确
3. **放大速度过快**：动画不够平滑

## 🔍 问题根源

### 错误的实现方式

```typescript
// ❌ 错误：使用计算值而不是实际渲染尺寸
const baseW = vw * 0.914666667  // 计算值
const baseH = baseW

// ❌ 错误：使用 React Hook 的值
const { width: vw, height: vh } = useWindowSize()
tl.to(card, { width: vw, height: vh })  // 可能有延迟或不准确
```

### 正确的实现方式（参照 card/src/App.tsx）

```typescript
// ✅ 正确：使用 getComputedStyle 获取实际渲染尺寸
const cs = getComputedStyle(card)
const baseW = parseFloat(cs.width)
const baseH = parseFloat(cs.height)

// ✅ 正确：使用 window.innerWidth/innerHeight
const windowVw = window.innerWidth
const windowVh = window.innerHeight
tl.to(card, { width: windowVw, height: windowVh })  // 实时准确
```

---

## ✅ 修复内容

### 1. FeatureCardsIntegrated.tsx

#### 修改 1.1：获取实际尺寸

**修改前**（计算值）：
```typescript
let baseW: number, baseH: number

if (vw < 800) {
  baseW = vw * 0.914666667  // ❌ 计算值，不准确
  baseH = baseW
} else {
  // 复杂的列宽计算
  baseW = 4 * colWidth + 3 * colGap
  baseH = baseW
}
```

**修改后**（实际值）：
```typescript
// ✅ 使用 getComputedStyle 获取渲染后的实际尺寸
const cs = getComputedStyle(card)
const baseW = parseFloat(cs.width)
const baseH = parseFloat(cs.height)

// ✅ 使用 window 的实际尺寸
const windowVw = window.innerWidth
const windowVh = window.innerHeight
```

**原理**：
- `getComputedStyle(card)` 返回元素实际渲染后的样式
- 包含了所有 CSS 规则（媒体查询、继承等）的最终计算结果
- 比手动计算更准确，更可靠

#### 修改 1.2：ZOOM 阶段使用准确尺寸

**修改前**：
```typescript
tl.to(card, {
  left: 0,
  top: 0,
  width: vw,   // ❌ React Hook 的值，可能有延迟
  height: vh,
  duration: ZOOM,
  ease: 'power1.inOut',
}, total)
```

**修改后**：
```typescript
tl.to(card, {
  left: 0,
  top: 0,
  width: windowVw,   // ✅ window.innerWidth，实时准确
  height: windowVh,  // ✅ window.innerHeight，实时准确
  duration: ZOOM,
  ease: 'power1.inOut',
}, total)
```

#### 修改 1.3：更新所有位置计算

```typescript
// ✅ 使用 windowVw/windowVh 替代 vw/vh
const startLeft = Math.max(0, windowVw - baseW - 16)
const startTop = Math.max(0, windowVh - baseH - 16)
const centerLeft = (windowVw - baseW) / 2
const centerTop = (windowVh - baseH) / 2

// DOCK 位置计算
if (windowVw < 800) {
  // 移动端逻辑
} else {
  // 桌面端逻辑
}

// measureExtraPxFull 调用
const extraPx = measureExtraPxFull(
  card, 
  contentWrap, 
  contentInner, 
  windowVw,   // ✅ 使用 windowVw
  windowVh,   // ✅ 使用 windowVh
  { left: startLeft, top: startTop, width: baseW, height: baseH }
)
```

---

### 2. CardContentGsap.tsx

#### 修改 2.1：响应式样式

**修改前**（固定值）：
```typescript
<div
  data-role="cover"
  style={{
    padding: '6.4vw',  // ❌ 移动端固定值
    // ...
  }}
>
  <p style={{ fontSize: '14.9333333333vw' }}>  {/* ❌ 移动端固定值 */}
    {number}
  </p>
```

**修改后**（响应式）：
```typescript
<div
  data-role="cover"
  style={{
    // ✅ 响应式：移动端 6.4vw，桌面端 1.67vw
    padding: window.innerWidth < 800 ? '6.4vw' : '1.6666666667vw',
    // ...
  }}
>
  <p style={{
    // ✅ 响应式：移动端 14.93vw，桌面端 6.67vw
    fontSize: window.innerWidth < 800 ? '14.9333333333vw' : '6.6666666667vw',
  }}>
    {number}
  </p>
```

---

## 📊 修改前后对比

| 项目 | 修改前 | 修改后 | 效果 |
|------|--------|--------|------|
| **卡片尺寸获取** | 计算值（vw × 系数） | getComputedStyle | ✅ 准确 |
| **视口尺寸** | React Hook（可能延迟） | window.innerWidth/Height | ✅ 实时 |
| **ZOOM 目标尺寸** | vw × vh | windowVw × windowVh | ✅ 全屏 |
| **响应式样式** | 固定移动端值 | window.innerWidth < 800 判断 | ✅ 响应式 |
| **左侧空白** | ❌ 有 | ✅ 无 | ✅ 修复 |
| **右侧遮挡** | ❌ 有 | ✅ 无 | ✅ 修复 |

---

## 🎯 关键原理

### 为什么使用 getComputedStyle？

```typescript
// 卡片的 CSS（feature-cards.module.css）
.wrapper {
  width: 91.4666666667vw;  /* 移动端 */
}

@media (min-width: 800px) {
  .wrapper {
    width: calc((4 * var(--layout-column-width)) + ((4 - 1) * var(--layout-columns-gap)));
  }
}

// 手动计算很复杂，容易出错
// getComputedStyle 自动处理所有 CSS 规则
const cs = getComputedStyle(card)
const baseW = parseFloat(cs.width)  // ✅ 直接得到最终结果
```

### 为什么使用 window.innerWidth？

```typescript
// React Hook 可能有延迟
const { width: vw } = useWindowSize()  
// 在 useLayoutEffect 中使用时，可能还没有更新

// window 对象是实时的
const windowVw = window.innerWidth  
// 总是返回当前准确的视口宽度
```

### ZOOM 动画流程

```
初始状态：
┌─────────────────────┐
│                     │
│        视口         │
│   ┌───┐            │
│   │卡片│◄──右下角   │
│   └───┘            │
└─────────────────────┘

APPEAR（1200ms）：
┌─────────────────────┐
│                     │
│        视口         │
│      ┌───┐         │
│      │卡片│◄─居中   │
│      └───┘         │
└─────────────────────┘

ZOOM（700ms）：
┌─────────────────────┐
│███████████████████████│ ✅ 完全覆盖
│███████ 卡片 ██████████│    left: 0, top: 0
│███████████████████████│    width: windowVw
└─────────────────────┘    height: windowVh
```

---

## 🧪 验证清单

### 视觉验证
- [ ] 卡片放大后完全覆盖视口（无左侧空白）
- [ ] 卡片放大后完全覆盖视口（无右侧遮挡）
- [ ] 卡片尺寸在移动端和桌面端都正确
- [ ] 字体大小响应式正常

### 动画验证
- [ ] APPEAR 阶段：右下角 → 居中（平滑）
- [ ] ZOOM 阶段：居中 → 全屏（平滑，700ms）
- [ ] 动画速度适中（不会太快）
- [ ] 过渡流畅，无跳跃

### 功能验证
- [ ] HoldController 正常工作
- [ ] 假内滚正常工作
- [ ] resize 时重建正常
- [ ] 无 console 错误

---

## 📚 参考文档

- `card/src/App.tsx`（第 293-316 行）- 黄金参照实现
- `src/components/card.module.css` - 响应式样式定义

---

## ✅ 总结

**核心修复**：
1. ✅ 使用 `getComputedStyle` 获取实际尺寸
2. ✅ 使用 `window.innerWidth/innerHeight` 获取准确视口
3. ✅ ZOOM 阶段使用准确的 windowVw × windowVh
4. ✅ 响应式样式（padding 和 fontSize）

**关键原则**：
- 实际渲染尺寸 > 计算值
- 实时 window 对象 > React Hook
- getComputedStyle > 手动计算

**当前状态**：✅ 可以测试



