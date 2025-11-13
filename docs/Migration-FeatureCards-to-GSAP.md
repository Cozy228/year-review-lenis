# FeatureCards 迁移至 GSAP 动画系统完整指南

## 📋 迁移目标

将 `FeatureCards` 的视觉样式系统与 `card/App.tsx` 的 GSAP 滚动驱动动画系统融合，实现以下组合：

- **✅ 保留 FeatureCards 样式**
  - CSS Modules 体系
  - 响应式 Grid 布局（移动端垂直，桌面端二维网格）
  - 主题系统（--theme-primary, --theme-secondary）
  - 字体系统（Anton, Panchang, Roboto）
  - 正方形卡片（aspect-ratio: 1/1）

- **✅ 采用 Card 动画系统**
  - GSAP + ScrollTrigger 核心引擎
  - HoldController 冻结机制
  - 完整时间线（出现 → 缩放 → 阅读 → 冻结 → Dock）
  - 反向滚动保护（Reverse Guard）
  - 假内滚（Fake Inner Scroll）

---

## 一、核心差异分析

### 1. 样式系统对比

| 维度 | FeatureCards | Card (App.tsx) |
|------|--------------|----------------|
| **定位方式** | CSS Grid + `calc()` 公式 | JavaScript 动态设置 `style.left/top` |
| **尺寸定义** | 响应式 `aspect-ratio: 1/1` | 固定 `520px x 340px` |
| **单位系统** | `vw` / CSS 变量 | `px` / JavaScript 计算 |
| **布局策略** | 移动端垂直列表，桌面端 3×3 网格 | 右下角 → 居中 → 全屏 → Dock |
| **主题集成** | ✅ CSS Modules + 变量 | ❌ 纯 Tailwind 类名 |
| **字体系统** | ✅ Anton, Panchang, Roboto | ❌ 默认系统字体 |

### 2. DOM 结构对比

#### FeatureCards 结构

```html
<div class="features">  <!-- 容器，1600vh 高 -->
  <div class="sticky">  <!-- sticky 区域，100vh -->
    <aside class="title">...</aside>  <!-- 标题 -->
    <div>  <!-- 卡片容器 -->
      <div class="card">  <!-- 卡片包装，绝对定位 -->
        <div class="wrapper">  <!-- 实际卡片，aspect-ratio: 1/1 -->
          <p class="number">01</p>
          <p class="text">Card content</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

**关键特征：**
- `.features`: 占满 `1600vh` 滚动空间
- `.sticky`: `position: sticky; top: 0; height: 100vh`
- `.card`: 绝对定位，`top` / `left` 由 `calc()` 计算
- `.wrapper`: 实际内容，`aspect-ratio: 1/1`

#### Card (App.tsx) 结构

```html
<div class="min-h-[200vh]">  <!-- 页面容器，最小高度 -->
  <header>...</header>  <!-- 顶部区域，80vh -->
  <section>  <!-- 舞台区域，100vh，overflow: hidden -->
    <div class="relative w-full h-full">  <!-- 相对定位容器 -->
      <article class="card fixed invisible z-0">  <!-- 卡片，fixed 定位 -->
        <div class="relative w-full h-full overflow-hidden rounded-2xl ...">
          <!-- 封面 -->
          <div data-role="cover">...</div>
          <!-- 内容 -->
          <div data-role="content" class="opacity-0 pointer-events-none">
            <div data-role="content-inner">
              <h2>...</h2>
              <p>...</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
  <footer>...</footer>
</div>
```

**关键特征：**
- 卡片 `fixed` 定位，通过 JS 控制位置
- 有封面（cover）和内容双层结构
- 内容支持假内滚（content-inner 的 y 位移）
- 使用 `data-role` 属性标识元素

### 3. 动画架构对比

#### FeatureCards：状态驱动

```typescript
// 1. 监听滚动 → 计算 progress
useScroll(({ scroll }) => {
  const progress = clamp(0, mapRange(start, end, scroll, 0, 1), 1)

  // 2. 计算步数
  const step = Math.floor(progress * 10)

  // 3. 更新状态
  setCurrent(step)
}, [rect, windowHeight])

// 4. React 渲染 → 切换类名
<div className={cn(s.card, current && s.current)}>

// 5. CSS transition 执行动画
.card {
  transition-duration: 1.2s;
  transition-property: opacity, transform;
}
.card:not(.current) {
  transform: translate3d(100%, 100%, 0);
  opacity: 0;
}
```

**数据流：**
```
滚动 → progress → step → current state → CSS 类 → CSS transition
```

#### Card：时间线驱动

```typescript
// 1. 构建时间线
tl.to(card, { left: centerLeft, top: centerTop, duration: APPEAR }, total)
tl.to(card, { left: 0, top: 0, width: vw, height: vh, duration: ZOOM }, total)
tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE }, total)
tl.to(contentInner, { y: -extraPx, duration: extraUnits }, total)
tl.to({}, { duration: FULL_HOLD }, total)

// 2. ScrollTrigger 绑定
ScrollTrigger.create({
  animation: tl,
  scrub: 1,
  onUpdate(self) {
    const t = tl.time()
    // Hold 状态检测
    if (t >= tReadEnd && t < tHoldEnd) {
      holdCtl.begin({ cardIndex: idx })
    }
  }
})
```

**数据流：**
```
滚动 → ScrollTrigger → timeline → 直接修改 style → 无 CSS transition
```

### 4. 响应式差异

#### FeatureCards：纯 CSS

```css
/* 移动端 */
@media (max-width: 800px) {
  .features .card:nth-child(1) {
    top: calc(((100 * var(--vh, 1vh)) - 117.3333333333vw - var(--layout-margin)) / 8 * 0);
  }
}

/* 桌面端 */
@media (min-width: 800px) {
  .features .card:nth-child(1) {
    top: calc((var(--d) - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0);
    left: calc((100vw - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0);
  }
}
```

**优势：**
- 无需 JS 参与
- 窗口变化自动适配
- 性能优秀

**劣势：**
- 计算复杂，不易理解
- 难以实现动态交互

#### Card：JS 计算

```typescript
const startLeft = Math.max(0, vw - baseW - 16)
const startTop = Math.max(0, vh - baseH - 16)
const centerLeft = (vw - baseW) / 2
const centerTop = (vh - baseH) / 2
const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP
const dockTop = DOCK_BASE_TOP + i * DOCK_GAP

gsap.set(card, { left: startLeft, top: startTop, width: baseW, height: baseH })
```

**优势：**
- 逻辑清晰，易调试
- 可动态调整
- 支持复杂计算

**劣势：**
- 需要监听 resize
- 性能开销略高

---

## 二、融合架构设计

### 总体方案：混合架构

#### 核心原则

```
┌─────────────────────────────────────────┐
│          视觉层：FeatureCards           │
│  CSS Modules + Grid + 主题 + 字体系统    │
├─────────────────────────────────────────┤
│          动画层：Card                  │
│  GSAP + ScrollTrigger + HoldController  │
├─────────────────────────────────────────┤
│          数据层：合并优化              │
│  cardsCfg + 动态测量                    │
└─────────────────────────────────────────┘
```

**架构图：**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  User Scroll│───▶│ ScrollTrigger│───▶│   GSAP TL    │
└─────────────┘    └──────────────┘    └──────────────┘
                            │                    │
                            │                    ▼
                            │         ┌──────────────────┐
                            │         │ HoldController   │
                            │         │  (冻结状态管理)   │
                            │         └──────────────────┘
                            │                    │
                            │                    ▼
                            │         ┌──────────────────┐
                            └────────▶│  DOM Updates     │
                                      │ (style.left/top) │
                                      └──────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  CSS Modules     │
                                      │ (视觉样式系统)    │
                                      └──────────────────┘
```

### 技术选型矩阵

| 功能 | FeatureCards | Card | 融合方案 | 说明 |
|------|--------------|------|----------|------|
| **样式系统** | ✅ CSS Modules | ❌ Tailwind | **FeatureCards** | 保留模块化 + 主题 |
| **布局算法** | ✅ Grid calc | ✅ JS 计算 | **Card** | 动态控制更灵活 |
| **响应式** | ✅ CSS 媒体查询 | ✅ JS resize | **Card** | 动画中需动态计算 |
| **动画引擎** | ❌ CSS transition | ✅ GSAP | **Card** | 核心优势 |
| **滚动控制** | ✅ Lenis | ✅ Lenis | **Both** | 统一使用全局 Lenis |
| **状态管理** | ✅ React state | ❌ GSAP context | **Card** | 避免 re-render |

### DOM 结构重组方案

#### 目标结构

```html
<div class="features" data-feature-cards>  <!-- 滚动容器 -->
  <header>...</header>  <!-- 添加：引入区域 -->

  <div class="sticky">  <!-- 固定视口 -->
    <aside class="title">  <!-- 标题 -->
      <p class="h3">
        <AppearTitle>Lenis brings<br /><span class="grey">the heat</span></AppearTitle>
      </p>
    </aside>

    <div class="stage">  <!-- 新增：动画舞台 -->
      <article class="card fixed invisible" data-card-id="c1">  <!-- 卡片 -->
        <div class="wrapper">  <!-- FeatureCards 样式 -->
          <p class="number">01</p>
          <p class="text">Run scroll in the main thread</p>
        </div>
      </article>

      <article class="card fixed invisible" data-card-id="c2">...</article>
      <!-- 更多卡片 -->
    </div>
  </div>

  <footer>...</footer>  <!-- 添加：结束区域 -->
</div>
```

#### 关键修改点

**1. 添加 header/footer**
```typescript
// 提供 ScrollTrigger 所需的滚动空间
<header style={{ height: '80vh' }}>...</header>
<footer style={{ height: '120vh' }}>...</footer>
```

**2. 合并 card 结构**
```typescript
// FeatureCards 的 wrapper
<div className={s.wrapper}>
  <p className={s.number}>...</p>
  <p className={s.text}>...</p>
</div>

// + App.tsx 的 data-role 结构
<div data-role="cover">...</div>  <!-- 删除：不需要封面 -->
<div data-role="content">...</div> <!-- 可选：如果需要假内滚 -->
```

**3. 移除 sticky 的 height**
```css
/* 原样式 */
.sticky {
  height: 100vh;  /* 移除：ScrollTrigger pin 会处理 */
}

/* 新样式 */
.sticky {
  position: relative;  /* 改为 relative */
  overflow: visible;   /* 改为 visible */
}
```

### 样式系统融合

#### 保留的 CSS 变量

```css
/* 主题变量（base.css/ theme.css） */
:root {
  --theme-primary: var(--black);
  --theme-secondary: var(--white);
  --theme-contrast: var(--color-accent);

  --font-anton: "Anton", sans-serif;
  --font-panchang: "Panchang", sans-serif;
  --font-roboto: "Roboto", sans-serif;

  --layout-margin: 4.2666666667vw; /* 移动端 */
  --layout-columns-gap: 6.4vw;
}

/* 缓动函数（theme.css） */
:root {
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
}
```

#### 合并的样式

```scss
/* feature-cards.module.css */

.features {
  /* 保留：滚动空间 */
  height: 1600vh;  /* 移动端 */
  @media (min-width: 800px) {
    min-height: 90.9722222222vw;  /* 桌面端 */
  }
}

.sticky {
  /* 移除：pin 由 ScrollTrigger 处理
  position: sticky;
  top: 0;
  height: 100vh;
  */

  /* 保留：内边距 */
  padding: var(--layout-margin);
  overflow: hidden;

  /* 添加：相对定位 */
  position: relative;
}

.title {
  /* 完全保留 */
  text-align: end;
  padding-bottom: var(--layout-margin);

  @media (min-width: 800px) {
    position: absolute;
    padding: 0;
    right: var(--layout-margin);
  }
}

.card {
  /* 保留：基础动画配置 */
  position: absolute;
  will-change: transform;

  /* 修改：移除 CSS transition，由 GSAP 控制
  transition-duration: 1.2s;
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-out-expo);
  */

  /* 添加：初始状态（GSAP 初始值） */
  opacity: 0;
  transform: translate3d(0, 0, 0);

  /* 保留：nth-child 位置计算 */
  @media (max-width: 800px) {
    &:nth-child(1) { top: calc(((100 * var(--vh, 1vh)) - 117.3333333333vw - var(--layout-margin)) / 8 * 0); }
    /* ... */
  }

  @media (min-width: 800px) {
    &:nth-child(1) {
      top: calc((var(--d) - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0);
      left: calc((100vw - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 8 * 0);
    }
    /* ... */
  }
}

/* 移除：不需要 .current 类
.card:not(.current) {
  transform: translate3d(100%, 100%, 0);
  opacity: 0;
}
*/
```

#### 新增的卡片内容样式

```scss
/* card.module.css - 保留并增强 */

.wrapper {
  /* 保留：基础布局 */
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  color: var(--theme-secondary);
  border: 1px solid;
  aspect-ratio: 1 / 1;  /* 正方形卡片 */
  padding: 6.4000000000vw;
  width: 91.4666666667vw;
  background-color: var(--background);  /* 动态变量 */
  backdrop-filter: blur(5px);

  /* 增强：添加渐变背景 */
  background: var(--gradient-card);  /* 新增变量 */

  @media (min-width: 800px) {
    width: calc((4 * var(--layout-column-width)) + ((4 - 1) * var(--layout-columns-gap)));
    padding: 1.6666666667vw;
  }
}

.number {
  /* 保留：数字样式 */
  color: var(--theme-contrast);
  line-height: 90%;
  font-size: 14.9333333333vw;
  font-family: var(--font-anton);  /* 添加：字体 */

  @media (min-width: 800px) {
    font-size: 6.6666666667vw;
  }
}

.text {
  /* 保留：文本样式 */
  text-transform: uppercase;
  font-family: var(--font-panchang);
  font-weight: 700;
  line-height: 100%;
  font-size: 5.3333333333vw;

  /* 增强：添加阴影 */
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);  /* FeatureCards 效果 */

  @media (min-width: 800px) {
    font-size: 1.9444444444vw;
  }
}
```

---

## 三、详细迁移步骤

### 第 1 步：安装依赖

```bash
# 在 FeatureCards 所在项目
npm install gsap @types/gsap

# 已安装：
# - lenis (已存在)
# - @darkroom.engineering/hamo (已存在)
```

### 第 2 步：复制核心文件

```bash
# 从 card/ 复制到 src/
cp card/src/HoldController.ts src/utils/HoldController.ts
cp card/src/animationConfig.ts src/utils/animationConfig.ts
cp card/src/hooks/useLenisGsap.ts src/hooks/
cp card/src/data/cards.ts src/data/
```

### 第 4 步：整合样式

#### 修改 `feature-cards.module.css`

```scss
/* 完整融合版本 */

.features {
  /* 保留：滚动空间 */
  height: 1600vh;

  @media (min-width: 800px) {
    min-height: 90.9722222222vw;
  }
}

.sticky {
  /* 移除：ScrollTrigger pin 会处理 fixed
  position: sticky;
  top: 0;
  height: 100vh;
  */

  /* 保留：内边距，相对定位 */
  position: relative;
  overflow: hidden;
  padding: var(--layout-margin);
}

.title {
  /* 完全保留 */
  text-align: end;
  padding-bottom: var(--layout-margin);

  @media (min-width: 800px) {
    position: absolute;
    padding: 0;
    right: var(--layout-margin);
  }
}

/* 在这个区域内，卡片将使用 GSAP 控制位置 */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 移除：CSS transition，由 GSAP 控制
.card {
  --d: 100vh;
  will-change: transform;
  transition-duration: 1.2s;
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-out-expo);
}
*/

/* 卡片初始状态 */
.card {
  position: absolute;
  will-change: transform;

  /* 初始状态（GSAP 将覆盖这些值） */
  opacity: 0;
  transform: translate3d(0, 0, 0);

  /* 保留：nth-child 位置计算（用作起始点） */
  @media (max-width: 800px) {
    &:nth-child(1) { top: calc(((100 * var(--vh, 1vh)) - 117.3333333333vw - var(--layout-margin)) / 8 * 0); }
    &:nth-child(2) { top: calc(((100 * var(--vh, 1vh)) - 117.3333333333vw - var(--layout-margin)) / 8 * 1); }
    /* ... 直到 nth-child(9) */
  }

  @media (min-width: 800px) {
    &:nth-child(1) {
      top: calc((var(--d) - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0);
      left: calc((100vw - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0);
    }
    /* ... 直到 nth-child(9) */
  }
}

/* 移除：current 类不需要
.card:not(.current) {
  transform: translate3d(100%, 100%, 0);
  opacity: 0;
}
*/

/* 增强：添加当前状态标识 */
.card.is-visible {
  opacity: 1 !important;  /* GSAP 会设置 opacity，提高优先级 */
}

.card.invisible {
  pointer-events: none;
}
```

#### 确认 `card.module.css`

```scss
/* 应与 FeatureCards 中的样式一致 */

.wrapper {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  color: var(--theme-secondary);
  border: 1px solid;
  aspect-ratio: 1 / 1;  /* FeatureCards 的正方形 */
  padding: 6.4000000000vw;
  width: 91.4666666667vw;
  background-color: var(--background);
  backdrop-filter: blur(5px);

  /* 添加渐变 */
  background: var(--gradient-card);

  /* 添加内边距 */
  padding: 1.5rem;

  @media (min-width: 800px) {
    width: calc((4 * var(--layout-column-width)) + ((4 - 1) * var(--layout-columns-gap)));
    padding: 1.6666666667vw;
  }
}

.number {
  color: var(--theme-contrast);
  line-height: 90%;
  font-size: 14.9333333333vw;
  font-family: var(--font-anton);  /* 使用 FeatureCards 的字体 */

  @media (min-width: 800px) {
    font-size: 6.6666666667vw;
  }
}

.text {
  text-transform: uppercase;
  font-family: var(--font-panchang);
  font-weight: 700;
  line-height: 100%;
  font-size: 5.3333333333vw;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);

  @media (min-width: 800px) {
    font-size: 1.9444444444vw;
  }
}
```

### 第 5 步：测试与调试

#### 测试清单

| 测试项 | 预期行为 | 检查方式 |
|--------|----------|----------|
| **滚动区域** | 高度 1600vh / 90.972vw | 检查元素高度 |
| **卡片初始位置** | 右下角 | scrollY = 0 时检查 |
| **出现动画** | 平滑移动到居中 | 滚动 300-1500px |
| **缩放动画** | 放大到全屏 | 滚动 1500-2200px |
| **文本显示** | 淡入显示 | 全屏时检查 opacity |
| **假内滚** | 内容向上滚动 | 全屏状态继续滚动 |
| **Hold 冻结** | 页面固定，内容可滚 | 检查 lenis.isStopped |
| **退出动画** | 淡出 → 缩小 → Dock | 继续滚动 |
| **ZIndex 层级** | 当前卡片在最前 | DevTools Elements |
| **响应式** | resize 后重新计算 | 改变窗口大小 |

#### 调试技巧

1. **查看 ScrollTrigger**
```javascript
// 浏览器控制台
ScrollTrigger.getAll().forEach(st => st.debug && st.debug())

// 查看时间线
gsap.globalTimeline.getChildren().forEach(child => console.log(child))
```

2. **检查 HoldController**
```javascript
// 在代码中添加
window.holdCtl = holdCtl

// 控制台
console.log('Holding:', holdCtl.holding)
console.log('Card Index:', holdCtl.holdIdx)
```

3. **打印时间线**
```typescript
// 在 buildTimeline() 结尾
console.log('Timeline duration:', tl.duration())
console.log('Metas:', metas.map(m => ({
  tVisible: m.tVisible,
  tFullIn: m.tFullIn,
  tReadEnd: m.tReadEnd,
  tHoldEnd: m.tHoldEnd,
  tDockEnd: m.tDockEnd,
})))
```

4. **慢速动画测试**
```typescript
// 临时修改 ScrollTrigger
scrub: 5,  // 改为 5 秒过渡，方便观察
```

#### 常见问题修复

##### 问题 1：卡片位置错误

**现象：** 卡片出现在屏幕左上角或错乱位置

**解决：**
```typescript
// 在 buildTimeline() 开始时
const cardElements = gsap.utils.toArray<HTMLElement>(`.${s.card}`)
cardElements.forEach(card => {
  // 强制清理所有 GSAP 属性
  gsap.set(card, { clearProps: 'all' })
  // 重新设置初始状态
  gsap.set(card, { position: 'fixed', opacity: 0, visibility: 'hidden' })
})
```

##### 问题 2：滚动区域不正确

**现象：** 滚动过快或过慢，没到卡片就结束

**解决：**
```typescript
// 检查 features 高度
// 确保 CSS 中的 height: 1600vh 正确应用
// 或计算动态高度

const totalCards = cards.length
const estimatedHeight = INTRO_GAP + cards.length * (
  APPEAR + ZOOM + TEXT_FADE +
  100 + // 假阅读
  FULL_HOLD + TEXT_FADE + ZOOM + DOCK_MOVE + BETWEEN
)

element.style.height = estimatedHeight + 'px'
```

##### 问题 3：Hold 状态不触发

**现象：** 无法进入冻结状态

**解决：**
```typescript
// 检查条件
console.log('t:', t, 'tReadEnd:', m.tReadEnd, 'tHoldEnd:', m.tHoldEnd)
console.log('guard:', reverseGuardRef.current[idx])
console.log('isHolding:', holdCtl.isHolding())

// 确认 HoldController 正确初始化
const holdCtl = new HoldController()
console.log('HoldController created')
```

##### 问题 4：文本不清晰

**现象：** 字体太小或颜色对比度不足

**解决：**
```scss
// card.module.css
.text {
  // 增大字体
  font-size: 6vw;  // 从 5.333vw

  // 添加文字阴影
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);

  // 提高对比度
  color: var(--theme-contrast);

  @media (min-width: 800px) {
    font-size: 2.5vw;  // 桌面端更大
  }
}
```

### 第 6 步：性能优化

#### 1. RAF 防抖

```typescript
// 已实现在 buildTimeline() 中
let rafId = 0
const onResize = () => {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    ctxRef.current?.revert()
    buildTimeline()
  })
}
```

#### 2. will-change 提示

```css
.card {
  will-change: transform, opacity;  /* 浏览器预优化 */
}
.wrapper {
  will-change: transform;  /* 假内滚时 */
}
```

#### 3. 避免强制同步布局

```typescript
// ❌ 在循环中读取 layout
for (let i = 0; i < cards.length; i++) {
  const height = card.offsetHeight  // 强制布局
  doSomething(height)
}

// ✅ 批量读取
const heights = cards.map(card => card.offsetHeight)
heights.forEach((height, i) => {
  doSomething(height)
})
```

#### 4. 使用文档片段

```typescript
// 构建所有卡片后一次性插入
const fragment = document.createDocumentFragment()
cards.forEach(cardData => {
  const card = createCard(cardData)
  fragment.appendChild(card)
})
stage.appendChild(fragment)
```

#### 5. 图片优化

```typescript
// 如果卡片包含图片
useEffect(() => {
  const images = stage.querySelectorAll('img')
  images.forEach(img => {
    img.loading = 'lazy'
    if (!img.complete) {
      img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
    }
  })
}, [])
```

### 第 7 步：添加假内滚支持（可选）

如果需要像 App.tsx 一样的假内滚：

```typescript
// 修改卡片结构
type FeatureCard = {
  id: string
  number: number
  text: React.ReactNode
  body?: string[]  // 添加：正文内容
}

// 在组件中
{
  cards.map((card, i) => (
    <article className={s.card} data-card-id={card.id}>
      <div className={cardStyles.wrapper}>
        <p className={cardStyles.number}>{card.number}</p>
        <p className={cardStyles.text}>{card.text}</p>

        {/* 添加正文区域（仅全屏时显示） */}
        {card.body && (
          <div data-role="content" className="absolute inset-0 overflow-hidden opacity-0 pointer-events-none">
            <div data-role="content-inner" className="will-change-transform px-7 py-6">
              <h2 className="text-[20px]">{card.text}</h2>
              {card.body.map((p, idx) => (
                <p key={idx} className="my-2">{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  ))
}

// 修改 measureExtra 函数
function measureExtra(card: HTMLElement, contentInner: HTMLElement) {
  const wrapper = card.querySelector(`.${cardStyles.wrapper}`)
  const contentWrap = card.querySelector('[data-role="content"]')

  // 临时全屏
  gsap.set(card, { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 })

  const wrapH = contentWrap?.getBoundingClientRect().height || window.innerHeight
  const innerH = contentInner.getBoundingClientRect().height

  const extraPx = Math.max(0, innerH - wrapH + 2) // 2px 缓冲

  // 恢复
  gsap.set(card, { clearProps: 'all' })
  return extraPx
}
```

---

## 四、潜在冲突与解决方案

### 冲突 1：样式优先级

**问题：**
```typescript
// FeatureCardsGsap.tsx
gsap.set(card, { left: startLeft, top: startTop })  // JS 设置

// feature-cards.module.css
@media (min-width: 800px) {
  .card:nth-child(1) { left: calc(...); }  // CSS 设置
}
```

**哪个生效？**

**Answer：**
- JS 设置的是行内 `style="left: 100px"`
- CSS 设置的是样式表规则
- **行内样式优先级更高**（1000）> 样式表（根据选择器权重）

**解决方案：**
```scss
/* 移除所有的 left/top 定义，只作为初始参考 */
.card:nth-child(1) {
  /* 注释或删除 left/top */
  /* left: calc(...); */
  /* top: calc(...); */

  /* 只保留尺寸（用于计算） */
  width: 91.4666666667vw;
}

/* 确保 GSAP 控制时不会被覆盖 */
.card[style] {
  /* 添加 !important 的替代方案 */
  transition: none !important;  /* 重要：避免 CSS 干扰 GSAP */
}
```

### 冲突 2：Lenis 双重初始化

**问题：**
```typescript
// Layout.tsx
const lenisInstance = new Lenis({ ... })

// FeatureCardsGsap.tsx
useLenisGsap()  // 内部也初始化 Lenis
```

**解决方案：**
```typescript
// 修改 useLenisGsap.ts
export function useLenisGsap() {
  const lenis = useStore(({ lenis }) => lenis)  // 从全局 store 获取

  useEffect(() => {
    if (!lenis) {
      // 只在不存在时创建
      lenis = new Lenis({
        wrapper: window,
        content: document.body,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
      })
    }

    // 同步 GSAP
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time))
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off('scroll', ScrollTrigger.update)
      gsap.ticker.remove(lenis.raf)
    }
  }, [])
}
```

### 冲突 3：ResizeObserver 性能

**问题：**
```typescript
const [setStageRef, stageRect] = useRect()

useLayoutEffect(() => {
  buildTimeline()  // 耗时操作
}, [stageRect])

// stageRect 在以下情况变化：
// - 窗口 resize（频繁触发）
// - 内容变化
// - CSS 动画
```

**解决方案：**
```typescript
// 防抖 + 阈值限制
const [setStageRef, stageRect] = useRect()
const lastRectRef = useRef<DOMRect | null>(null)

useLayoutEffect(() => {
  if (!stageRect) return

  // 如果变化小于 5%，跳过重建
  const last = lastRectRef.current
  if (last) {
    const widthDiff = Math.abs(stageRect.width - last.width) / last.width
    const heightDiff = Math.abs(stageRect.height - last.height) / last.height

    if (widthDiff < 0.05 && heightDiff < 0.05) {
      return  // 跳过
    }
  }

  lastRectRef.current = stageRect
  buildTimeline()
}, [stageRect])
```

### 冲突 4：CSS Modules 类名哈希

**问题：**
```typescript
// TypeScript
const cardElements = gsap.utils.toArray<HTMLElement>(`.${s.card}`)

// CSS Modules 可能生成哈希名（如 FeatureCards_card_3xK2o）
// 但开发环境和生产环境可能不同
// 导致 GSAP 选择器失效
```

**解决方案：**
```typescript
// 方案 1：使用 data- 属性（推荐）
<article
  data-card-id={card.id}
  data-card-index={i}
  className={cn(s.card, cardStyles.card)}
>

// GSAP 选择
gsap.utils.toArray<HTMLElement>('[data-card-id]')

// 方案 2：存储引用
const cardRefs = useRef<HTMLElement[]>([])

{
  cards.map((card, i) => (
    <article
      ref={el => {
        if (el) cardRefs.current[i] = el
      }}
    >
    </article>
  ))
}

// 直接使用
const cardElements = cardRefs.current
```

### 冲突 5：Tailwind 与 CSS Modules 共存

**问题：**
```typescript
// 类名冲突
<div className={cn(s.card, 'fixed invisible')}>
  {/* Tailwind 的 fixed: position: fixed */}
  {/* CSS Modules 可能也有 position 定义 */}
</div>
```

**CSS 优先级：**
- Tailwind: `position: fixed` (权重 0100)
- CSS Modules: `position: absolute` (权重取决于选择器)

**解决方案：**
```scss
/* feature-cards.module.css */
.card {
  /* 明确指定，优于 Tailwind */
  position: absolute !important;  /* 在 CSS Modules 中避免使用 */
}

/* 更好的方案： */
.card {
  /* 只定义不会被 Tailwind 覆盖的属性 */
  will-change: transform;
}

/* Tailwind 只用于布局 */
<article className={cn('fixed invisible z-0', s.card)}>
```

### 冲突 6：主题切换

**问题：**
```typescript
// base.css
.theme-dark {
  --theme-primary: var(--black);
  --theme-secondary: var(--white);
}

// Card 可能需要不同主题
// 例如：封面白底黑字，内容黑底白字
```

**解决方案：**
```typescript
// 卡片数据添加主题
const cards: FeatureCard[] = [
  {
    id: 'c1',
    number: 1,
    text: 'Run scroll in the main threads',
    theme: 'dark',  // 添加主题标识
  }
]

// 在组件中应用
{
  cards.map((card, i) => (
    <article
      className={cn(s.card, `theme-${card.theme}`)}  // 动态主题
      style={{
        '--gradient-card': `linear-gradient(135deg, ${card.gradientStart}, ${card.gradientEnd})`
      } as CSSProperties}
    >
    </article>
  ))
}
```

### 冲突 7：ZIndex 层级

**问题：**
```typescript
// 多个组件的 z-index
.z-dropdown { z-index: 1000; }  // 导航下拉
.z-modal { z-index: 2000; }      // 模态框
.z-tooltip { z-index: 3000; }    // 提示

// Card 需要
// - 正常时：zIndex: 15
// - 全屏时：zIndex: 20
// - Dock 时：zIndex: 12
```

**解决方案：**
```typescript
// 增加 CSS 变量层级
:root {
  --z-index-card-normal: 15;
  --z-index-card-fullscreen: 20;
  --z-index-card-dock: 12;
  --z-index-dropdown: 100;
  --z-index-modal: 200;
  --z-index-tooltip: 300;
}

// 在 GSAP 中使用
gsap.set(card, { zIndex: 'var(--z-index-card-normal)' })
gsap.set(card, { zIndex: 'var(--z-index-card-fullscreen)' })
```

---

## 五、最佳实践

### 1. 代码组织

```
components/
  FeatureCardsGsap.tsx           # 主组件
  feature-cards.module.css        # 样式系统
  CardContent.tsx                 # 卡片内容组件（可选）

utils/
  HoldController.ts               # 冻结控制
  animationConfig.ts              # 动画配置
  measureDom.ts                   # DOM 测量工具

hooks/
  useLenisGsap.ts                 # Lenis + GSAP 集成
  useFeatureCards.ts              # 业务逻辑（可选拆分）

data/
  featureCards.ts                 # 卡片数据
```

### 2. 错误处理

```typescript
// 添加错误边界
export const FeatureCardsGsapWithErrorBoundary = (props: FeatureCardsGsapProps) => {
  return (
    <ErrorBoundary fallback={<div>Something went wrong with the animation</div>}>
      <FeatureCardsGsap {...props} />
    </ErrorBoundary>
  )
}

// 在组件内部
try {
  buildTimeline()
} catch (error) {
  console.error('Failed to build timeline:', error)
  // 降级方案：显示静态卡片
  return <StaticFeatureCards cards={cards} />
}
```

### 3. 可访问性

```typescript
// 添加 ARIA 属性
<article
  aria-label={`Feature card ${i + 1}`}
  role="region"
  aria-hidden={!isCurrent}
>
  {/* 键盘导航 */}
  tabIndex={isCurrent ? 0 : -1}

  {/* 焦点管理 */}
  onFocus={() => scrollToCard(i)}
</article>

// 提供跳过动画按钮
<button onClick={() => {
  ctxRef.current?.kill()
  showStaticVersion()
}}>
  Skip animation
</button>
```

### 4. 性能监控

```typescript
// 使用 Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals'

useEffect(() => {
  const sendToAnalytics = (name: string, value: number) => {
    ga('send', 'event', {
      eventCategory: 'FeatureCards Performance',
      eventAction: name,
      eventValue: Math.round(value),
    })
  }

  onCLS(sendToAnalytics)
  onFID(sendToAnalytics)
  onLCP(sendToAnalytics)
}, [])

// 监控动画帧率
let frameCount = 0
useFrame((time) => {
  frameCount++
  if (time % 1000 < 16) {  // 每秒检查
    const fps = frameCount
    if (fps < 55) console.warn('Low FPS:', fps)
    frameCount = 0
  }
})
```

### 5. 主题适配

```typescript
// 根据当前主题自动调整样式
const getThemeStyles = (theme: 'light' | 'dark' | 'contrast') => {
  const themes = {
    light: {
      '--gradient-card': 'linear-gradient(135deg, #fff, #f5f5f5)',
      '--text-color': '#000',
    },
    dark: {
      '--gradient-card': 'linear-gradient(135deg, #000, #333)',
      '--text-color': '#fff',
    },
    contrast: {
      '--gradient-card': 'linear-gradient(135deg, #0066ff, #0044cc)',
      '--text-color': '#fff',
    },
  }
  return themes[theme]
}

// 应用到卡片
<div
  className={s.card}
  style={getThemeStyles(currentTheme)}
>
</div>
```

---

## 六、总结

### 迁移路线图

```
Week 1: 准备阶段
  ├─ 安装依赖 (gsap, @types/gsap)
  ├─ 复制核心文件 (HoldController, animationConfig)
  └─ 创建融合组件骨架

Week 2: 核心功能
  ├─ 实现基础时间线 (出现 → 缩放 → 退出)
  ├─ 集成 ScrollTrigger
  └─ 测试基础动画

Week 3: 高级功能
  ├─ HoldController 集成
  ├─ 假内滚支持
  ├─ Reverse Guard
  └─ 响应式适配

Week 4: 优化与测试
  ├─ 性能优化
  ├─ 跨浏览器测试
  ├─ 可访问性改进
  └─ 生产环境部署
```

### 关键技术点

1. **样式系统保留**
   - CSS Modules 体系完整保留
   - 主题系统、字体系统正常运作
   - 响应式布局由 JS 动态计算覆盖

2. **动画系统增强**
   - GSAP ScrollTrigger 提供精确滚动映射
   - HoldController 实现冻结状态
   - 全屏、Dock、假内滚完整支持

3. **性能与体验**
   - CSS transition → GSAP 动画平滑升级
   - GPU 加速（transform3d）保持
   - 60fps 流畅体验

4. **可维护性**
   - 清晰的职责分离（样式 vs 动画）
   - 模块化代码结构
   - 完善的 TypeScript 支持

### 预期效果

**视觉：**
- 保持 FeatureCards 的精美设计
- 9 张卡片按主题色渐变
- 字体、间距、布局完全一致

**交互：**
- 从右下角出现，平滑居中
- 放大到全屏，可阅读完整内容
- 冻结状态下假内滚浏览
- 退出到 Dock，错位排列
- 反向滚动流畅，无卡顿

**性能：**
- 滚动映射精确
- 动画 60fps
- 响应式切换无闪烁
- 移动端触摸流畅

---

## 附录：完整代码示例

### 使用示例

```typescript
// src/pages/index.tsx
import { FeatureCardsGsap } from '@/components/FeatureCardsGsap'

const cards = [
  {
    id: 'c1',
    number: 1,
    text: 'Run scroll in the main thread',
  },
  {
    id: 'c2',
    number: 2,
    text: 'Lightweight\n(under 4kb)',
  },
  // ... 更多卡片
]

export default function HomePage() {
  return (
    <Layout>
      <HeroSection />
      <FeatureCardsGsap cards={cards} />
      <OtherContent />
    </Layout>
  )
}
```

---

**文档版本：** 1.0
**最后更新：** 2025-11-13
**适用项目：** FeatureCards → GSAP 迁移
</content>

/* ------------------------------ types ------------------------------ */
type FeatureCard = {
  id: string
  number: number
  text: React.ReactNode
}

type Meta = {
  card: HTMLElement
  wrapper: HTMLElement
  tVisible: number
  tFullIn: number
  tReadEnd: number
  tHoldEnd: number
  tFullOut: number
  tDockEnd: number
  startLeft: number
  startTop: number
}

/* ------------------------------ Component ------------------------------ */
interface FeatureCardsGsapProps {
  cards: FeatureCard[]
}

export const FeatureCardsGsap = ({ cards }: FeatureCardsGsapProps) => {
  useLenisGsap()  // 初始化 Lenis

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const reverseGuardRef = useRef<Record<number, boolean>>({})

  const [setStageRef, stageRect] = useRect()
  const { height: windowHeight } = useWindowSize()

  useLayoutEffect(() => {
    const holdCtl = new HoldController()

    const buildTimeline = () => {
      ctxRef.current?.revert()

      ctxRef.current = gsap.context(() => {
        if (!stageRef.current) return

        const stage = stageRef.current
        const tl = gsap.timeline({ defaults: { ease: 'none' } })
        let total = 0

        const metas: Meta[] = []

        // 设置初始占位符
tl.to({}, {}, total)
        total += INTRO_GAP

        const cardElements = gsap.utils.toArray<HTMLElement>(`.${s.card}`)

        cardElements.forEach((card, i) => {
          const wrapper = card.querySelector<HTMLElement>(`.${cardStyles.wrapper}`)!

          // 清理之前的动画属性
gsap.set(card, { clearProps: 'x,y,scale,transform,opacity,left,top,width,height' })
          gsap.set(wrapper, { clearProps: 'opacity,transform' })

          // 初始状态
gsap.set(wrapper, { opacity: 1 })  // wrapper 始终可见

          // 计算尺寸和位置
const cs = getComputedStyle(card)
          const baseW = parseFloat(cs.width)
          const baseH = parseFloat(cs.height)

          const vw = window.innerWidth
          const vh = window.innerHeight

          // 起始位置（右下角）
          const startLeft = Math.max(0, vw - baseW - 16)
          const startTop = Math.max(0, vh - baseH - 16)
          const centerLeft = (vw - baseW) / 2
          const centerTop = (vh - baseH) / 2
          const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP
          const dockTop = DOCK_BASE_TOP + i * DOCK_GAP

          const tVisible = total

          // 设置初始状态
gsap.set(card, { left: startLeft, top: startTop, width: baseW, height: baseH, zIndex: 15 })

          // 1. APPEAR: 右下角 → 居中
tl.to(card, { left: centerLeft, top: centerTop, duration: APPEAR, ease: 'power4.out' }, total)
          total += APPEAR

          // 2. ZOOM: 居中 → 全屏
tl.to(card, {
            left: 0,
            top: 0,
            width: vw,
            height: vh,
            duration: ZOOM,
            ease: 'power1.inOut',
          }, total)
          total += ZOOM

          // 3. TEXT_FADE: 文本淡入
          const tFullIn = total
tl.to(wrapper, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
          total += TEXT_FADE

          // 4. READ: 假内滚（wrapper 向上滚动）
          const extraPx = measureExtra(wrapper, vh, { width: baseW, height: baseH })
          const extraUnits = Math.max(1, Math.round(extraPx / 2))  // 调整为 2px/单位
          const tReadEnd = total + extraUnits
          tl.to(wrapper, { y: -extraPx, duration: extraUnits, ease: 'none' }, total)
          total += extraUnits

          // 5. FULL_HOLD: 冻结段
tl.to({}, { duration: FULL_HOLD }, total)
          const tHoldEnd = total + FULL_HOLD
          total += FULL_HOLD

          // 6. 重置阅读位置
tl.set(wrapper, { y: 0 }, total)

          // 7. ZOOM: 退出全屏
tl.to(
            card,
            { left: centerLeft, top: centerTop, width: baseW, height: baseH, duration: ZOOM, ease: 'power1.inOut' },
            total
          )
          total += ZOOM

          // 8. DOCK_MOVE: 移动到 Dock 位置
tl.to(card, { left: dockLeft, top: dockTop, duration: DOCK_MOVE, ease: 'power2.inOut' }, total)
          const tDockEnd = total + DOCK_MOVE
          total += DOCK_MOVE

          // 保存元数据
metas.push({
            card,
            wrapper,
            tVisible,
            tFullIn,
            tReadEnd,
            tHoldEnd,
            tFullOut: tReadEnd + TEXT_FADE, // 文本淡出开始时间
            tDockEnd,
            startLeft,
            startTop,
          })

          // 步骤间隔
total += BETWEEN
        }) // end forEach

        // 创建 ScrollTrigger
ScrollTrigger.create({
          animation: tl,
          trigger: stage,
          start: 'top top',
          end: () => '+=' + tl.duration(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onUpdate(self) {
            const t = tl.time()
            const dir = self.direction

            metas.forEach((m, idx) => {
              // 可见性
gsap.set(m.card, { opacity: 1, className: 'card fixed is-visible' }, t >= m.tVisible ? 0 : null)

              // 层级管理
const phase =
                t >= m.tDockEnd ? 3 :
                t >= m.tFullIn && t < m.tFullOut ? 2 :
                t >= m.tVisible ? 1 : 0

              if (phase === 2) gsap.set(m.card, { zIndex: 20 })
              else if (phase === 3) gsap.set(m.card, { zIndex: 12 })
              else if (phase === 1) gsap.set(m.card, { zIndex: 15 })
              else gsap.set(m.card, { zIndex: 0 })

              // Reverse Guard
guard = reverseGuardRef.current[idx] === true
              if (guard && t < m.tReadEnd - 1) {
                reverseGuardRef.current[idx] = false
              }

              // Hold 控制
if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
                holdCtl.begin({ cardIndex: idx })
              }

              if (holdCtl.isHolding(idx)) {
                holdCtl.keepPinned()
                if (dir === -1) {
                  holdCtl.releaseReverse()
                  reverseGuardRef.current[idx] = true
                }
              }
            })
          },

          onKill() {
            if (holdCtl.isHolding()) holdCtl.releaseReverse()
          },
        })
      }, stageRef) // end gsap.context
    }

    const measureExtra = (
      wrapper: HTMLElement,
      vh: number,
      restore: { width: number; height: number }
    ): number => {
      const tempSize = { width: window.innerWidth, height: window.innerHeight }
gsap.set(wrapper.parentElement, tempSize)
      wrapper.parentElement?.getBoundingClientRect()

      const wrapH = wrapper.parentElement?.getBoundingClientRect().height || vh
      const innerH = wrapper.getBoundingClientRect().height
      const dpr = window.devicePixelRatio || 1
      const FUDGE = 2
      const extraPx = Math.max(0, Math.ceil((innerH - wrapH + FUDGE) * dpr) / dpr)

      // 恢复
gsap.set(wrapper.parentElement, restore)
      return extraPx
    }

    buildTimeline()

    let rafId = 0
    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        ctxRef.current?.revert()
        buildTimeline()
      })
    }

    window.addEventListener('resize', onResize)
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onLoad)
      ctxRef.current?.revert()
    }
  }, [cards, stageRect, windowHeight])

  return (
    <section className={s.features} data-feature-cards>
      <header className="h-[80vh] grid place-items-center text-center">
        <div>
          <h1 className="m-0 mb-2 text-fg">Scroll to Explore</h1>
          <p className="text-muted">Start scrolling to begin</p>
        </div>
      </header>

      <div className={cn(s.sticky)} ref={(node) => {
        if (node) setStageRef(node)
        stageRef.current = node
      }}>
        <aside className={s.title}>
          <p className="h3">
            <span>Lenis brings</span>
            <br />
            <span className="grey">the heat</span>
          </p>
        </aside>

        <div className="relative w-full h-full">
          {cards.map((card, i) => (
            <article
              key={card.id}
              data-card-id={card.id}
              className={cn(s.card, 'fixed invisible', cardStyles.card)}
              style={{ '--i': i } as React.CSSProperties}
            >
              <div className={cardStyles.wrapper} style={{ '--background': 'rgba(239, 239, 239, 0.8)' }}>
                <p className={cardStyles.number}>{card.number.toString().padStart(2, '0')}</p>
                <p className={cardStyles.text}>{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <footer className="h-[120vh] grid place-items-center text-muted">
        <p>End of section</p>
      </footer>
    </section>
  )
}
