# FeatureCards 样式保留策略分析

## 📋 问题描述

在将 FeatureCards 迁移到 FeatureCardsIntegrated（GSAP 版本）时，出现了两个关键问题：

1. ✅ **已解决**：HoldController 的 Lenis 引用错误
2. ⚠️ **待解决**：原卡片的样式和位置丢失

## 🔍 样式差异对比

### 原 FeatureCards 的样式特征

```css
/* feature-cards.module.css */
.features {
  height: 1600vh;  /* 固定超长容器 */
}

.features .card {
  position: absolute;  /* 绝对定位 */
  --d: 100vh;
  will-change: transform;
  transition-duration: 1.2s;
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-out-expo);
}

/* 初始状态：右下角隐藏 */
.features .card:not(.current) {
  transform: translate3d(100%, 100%, 0);
  opacity: 0;
}

/* 桌面端：对角线排列 */
@media (min-width: 800px) {
  .features .card:nth-child(1) {
    top: calc((var(--d) - 30.56vw - 2 * var(--layout-margin)) / 8 * 0);
    left: calc((100vw - 30.56vw - 2 * var(--layout-margin)) / 8 * 0);
  }
  /* ... nth-child(2) ~ nth-child(9) */
}
```

**关键特征**：
- 卡片使用 `Card` 组件（`card.module.css`）
- 玻璃态效果：`backdrop-filter: blur(5px)`
- 边框：`border: 1px solid`
- 正方形比例：`aspect-ratio: 1 / 1`
- 响应式尺寸：移动端 `91.47vw`，桌面端 `4 列宽度`
- 初始位置：对角线排列（从左上到右下）
- 过渡动画：CSS transition（1.2s ease-out-expo）

### FeatureCardsIntegrated 的样式特征

```typescript
// FeatureCardsIntegrated.tsx
<article
  style={{
    position: 'fixed',      // GSAP 需要 fixed
    visibility: 'hidden',   // GSAP 控制可见性
    width: 520,             // 硬编码像素值
    height: 340,            // 硬编码像素值（非正方形）
    zIndex: 0,
  }}
>
  <CardContentGsap />  {/* 三层结构，与原 Card 完全不同 */}
</article>
```

**关键特征**：
- 卡片使用 `CardContentGsap` 组件（三层结构：cover/content/content-inner）
- 硬编码尺寸：520 × 340px（固定值，不响应式）
- 位置：`position: fixed`（GSAP 完全控制 left/top）
- 初始隐藏：`visibility: hidden`（GSAP 控制）
- 过渡动画：GSAP Timeline（10 阶段复杂动画）

## 🎯 核心矛盾

**原 FeatureCards 设计哲学**：
- CSS 驱动的简单动画
- 浏览器原生 transition
- 响应式设计（vw 单位）
- 轻量级实现

**FeatureCardsGsap 设计哲学**：
- GSAP 驱动的复杂动画
- JavaScript 完全控制
- 固定像素值（便于计算）
- 重量级实现（假内滚 + HoldController）

**问题**：两者是**本质上不同的设计方案**，无法简单融合。

---

## 💡 解决方案（3 种策略）

### 策略 A：完全 GSAP（当前方案）

**保留**：
- GSAP 时间线动画
- 假内滚功能
- HoldController 交互
- 三层结构（cover/content/content-inner）

**修改**：
✅ 使用主应用 Lenis（已修复）
⚠️ 调整卡片样式以匹配原设计

**具体修改方案**：

```typescript
// 1. 修改 CardContentGsap 以匹配原 Card 样式
<div
  data-role="cover"
  className={s.wrapper}  // 复用 card.module.css
  style={{
    background: 'rgba(239, 239, 239, 0.8)',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  }}
>
  {/* 保留数字 + 文本布局 */}
</div>

// 2. 使用响应式尺寸替代硬编码
const baseW = vw < 800 
  ? vw * 0.9147  // 移动端：91.47vw
  : (/* 4 列宽度计算 */)
const baseH = baseW  // 正方形比例

// 3. 初始位置：对角线排列
const startLeft = vw < 800 
  ? vw * 0.0427  // layout-margin
  : (vw - baseW - layoutMargin) * (i / 8)
const startTop = vh < 800 
  ? ((vh - baseH - layoutMargin) * (i / 8))
  : ((vh - baseH - layoutMargin) * (i / 8))
```

**优点**：
- ✅ 保留 GSAP 的所有功能
- ✅ 视觉效果接近原设计
- ✅ 响应式支持

**缺点**：
- ⚠️ 需要大量调整和测试
- ⚠️ 代码复杂度高
- ⚠️ 维护成本高

---

### 策略 B：混合方案（推荐）

**保留原 FeatureCards 的基础结构，用 GSAP 增强动画**

```typescript
// FeatureCardsHybrid.tsx
export const FeatureCardsHybrid = () => {
  return (
    <div className={s.features}>
      <div className={s.sticky}>
        <aside className={s.title}>...</aside>
        
        {/* 基础卡片：使用原 Card 组件 */}
        {cards.map((card, i) => (
          <div className={cn(s.card, current === i && s.current)}>
            <Card 
              number={card.number} 
              text={card.text}
              background="rgba(239, 239, 239, 0.8)"
            />
          </div>
        ))}
        
        {/* GSAP 增强层：仅在点击/交互时触发 */}
        {activeCard !== null && (
          <Portal>
            <CardContentGsap 
              number={cards[activeCard].number}
              text={cards[activeCard].text}
              body={cards[activeCard].body}
              onClose={() => setActiveCard(null)}
            />
          </Portal>
        )}
      </div>
    </div>
  )
}
```

**工作流程**：
1. 滚动时：显示原 Card 组件（CSS transition 动画）
2. 点击卡片：触发 GSAP 全屏动画 + 假内滚 + HoldController
3. 关闭后：返回原 Card 列表

**优点**：
- ✅ 保留原样式 100%
- ✅ 渐进增强（GSAP 是可选的）
- ✅ 向后兼容
- ✅ 代码职责清晰

**缺点**：
- ⚠️ 需要额外的交互逻辑
- ⚠️ 不是自动滚动触发（需要点击）

---

### 策略 C：样式融合（最小改动）

**只修改 CardContentGsap 的视觉样式，保留 GSAP 动画逻辑**

```typescript
// CardContentGsap.tsx - 修改 cover 层样式
<div
  data-role="cover"
  style={{
    // 完全匹配 card.module.css
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
    color: 'var(--theme-secondary)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    aspectRatio: '1 / 1',  // 正方形
    padding: 'clamp(1.6rem, 6.4vw, 2rem)',
    backgroundColor: 'rgba(239, 239, 239, 0.8)',
    backdropFilter: 'blur(5px)',
    borderRadius: '0',  // 原设计无圆角
  }}
>
  {/* 数字 */}
  <p style={{
    color: 'var(--color-accent)',
    lineHeight: '90%',
    fontSize: 'clamp(3rem, 14.93vw, 8rem)',
    fontFamily: 'var(--font-anton)',
    margin: 0,
  }}>
    {number.toString().padStart(2, '0')}
  </p>
  
  {/* 文本 */}
  <p style={{
    textTransform: 'uppercase',
    fontFamily: 'var(--font-panchang)',
    fontWeight: 700,
    lineHeight: '100%',
    fontSize: 'clamp(1.25rem, 5.33vw, 2rem)',
    margin: 0,
  }}>
    {text}
  </p>
</div>
```

**优点**：
- ✅ 最小改动
- ✅ 视觉效果匹配
- ✅ 保留 GSAP 功能

**缺点**：
- ⚠️ 卡片尺寸仍需调整
- ⚠️ 初始位置仍需调整
- ⚠️ 响应式需要额外处理

---

## 🛠️ 推荐实施方案

### 短期（立即修复）

采用 **策略 C + 部分策略 A**：

1. ✅ **修复 Lenis 引用**（已完成）
2. 🔄 **调整卡片样式**：修改 CardContentGsap 以匹配原 Card
3. 🔄 **使用响应式尺寸**：替换硬编码的 520 × 340
4. 🔄 **调整初始位置**：匹配原对角线排列
5. ✅ **保留 GSAP 动画**：不改变时间线逻辑

### 中期（优化体验）

采用 **策略 B**：

1. 创建 `FeatureCardsHybrid` 组件
2. 基础滚动使用原 FeatureCards
3. 点击卡片触发 GSAP 全屏动画
4. 提供 feature flag 控制新旧版本

### 长期（完全迁移）

采用 **策略 A**：

1. 完全使用 GSAP 控制
2. 优化性能和响应式
3. 统一代码风格
4. 完善文档和测试

---

## 📋 立即可做的修改

### 1. 修改 CardContentGsap.tsx

```typescript
// src/components/CardContentGsap.tsx
export const CardContentGsap = ({ number, text, body }: CardContentProps) => {
  return (
    <>
      {/* Cover Layer - 匹配原 Card 样式 */}
      <div
        data-role="cover"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#000',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          padding: 'clamp(1.6rem, 6.4vw, 2rem)',
          backgroundColor: 'rgba(239, 239, 239, 0.8)',
          backdropFilter: 'blur(5px)',
        }}
      >
        <p style={{
          color: 'oklch(0.4628 0.3059 264.18)',
          lineHeight: '0.9',
          fontSize: 'clamp(3rem, 14.93vw, 6.67vw)',
          fontFamily: 'var(--font-anton)',
          margin: 0,
        }}>
          {number.toString().padStart(2, '0')}
        </p>
        
        <p style={{
          textTransform: 'uppercase',
          fontFamily: 'var(--font-panchang)',
          fontWeight: 700,
          lineHeight: '1.0',
          fontSize: 'clamp(1.25rem, 5.33vw, 1.94vw)',
          margin: 0,
        }}>
          {text}
        </p>
      </div>
      
      {/* 其余层保持不变 */}
    </>
  )
}
```

### 2. 修改 FeatureCardsIntegrated.tsx 的卡片尺寸

```typescript
// 计算响应式尺寸
const layoutMargin = vw < 800 ? vw * 0.0427 : vw * 0.0278
const baseW = vw < 800 
  ? vw * 0.9147  // 移动端：91.47vw
  : (() => {
      // 桌面端：4 列宽度
      const colCount = 12
      const colGap = vw * 0.0167  // 1.67vw
      const layoutWidth = vw - 2 * layoutMargin
      const colWidth = (layoutWidth - (colCount - 1) * colGap) / colCount
      return 4 * colWidth + 3 * colGap
    })()
const baseH = baseW  // 正方形

// 初始位置：对角线排列
const startLeft = layoutMargin + ((vw - baseW - 2 * layoutMargin) / 8) * i
const startTop = layoutMargin + ((vh - baseH - 2 * layoutMargin) / 8) * i
```

---

## 🧪 测试清单

完成上述修改后，需要验证：

### 视觉测试
- [ ] 卡片尺寸与原版一致（移动端和桌面端）
- [ ] 卡片样式匹配（边框、背景、玻璃态效果）
- [ ] 字体大小和行高正确
- [ ] 初始位置为对角线排列
- [ ] 颜色主题正确（紫色 accent）

### 功能测试
- [ ] GSAP 动画正常工作
- [ ] HoldController 无错误
- [ ] 滚动流畅，无卡顿
- [ ] 响应式正常（resize 测试）

### 性能测试
- [ ] 无 console 错误
- [ ] 无内存泄漏
- [ ] RAF 性能正常（60fps）

---

## 📚 相关文件

需要修改的文件：
1. `src/components/FeatureCardsIntegrated.tsx` - 主组件
2. `src/components/CardContentGsap.tsx` - 卡片样式
3. `src/components/card.module.css` - 样式参照

参考文档：
- `docs/Phase1-Migration-Summary.md` - 迁移方案
- `src/components/FeatureCards.tsx` - 原实现
- `src/components/Card.tsx` - 原卡片组件

---

## ✅ 总结

**当前状态**：
- ✅ 问题 1（Lenis 引用）已修复
- ⚠️ 问题 2（样式丢失）需要修改

**推荐做法**：
1. **立即**：采用策略 C，修改 CardContentGsap 样式
2. **短期**：调整卡片尺寸和初始位置为响应式
3. **中期**：考虑策略 B（混合方案）
4. **长期**：完善策略 A（完全 GSAP）

**关键原则**：
- 视觉优先：用户看到的效果要与原版一致
- 渐进增强：先修复样式，再优化功能
- 向后兼容：保留回退到原 FeatureCards 的能力



