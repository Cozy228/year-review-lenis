# FeatureCards 动画实现深度拆解文档

## 📋 目录

1. [整体架构概览](#整体架构概览)
2. [依赖系统详解](#依赖系统详解)
3. [布局计算机制](#布局计算机制)
4. [时间线动画拆解](#时间线动画拆解)
5. [滚动同步机制](#滚动同步机制)
6. [卡片切换逻辑](#卡片切换逻辑)
7. [响应式适配](#响应式适配)
8. [性能优化策略](#性能优化策略)

---

## 整体架构概览

`FeatureCards.tsx` 实现了一个基于**React + CSS + Lenis 滚动**的滚动驱动动画系统。与之前的 App.tsx 使用 GSAP 不同，此系统采用纯 React 状态 + CSS transition 实现交互动画。

### 核心架构对比

| 特性 | FeatureCards | App.tsx (Card) |
|------|--------------|----------------|
| **动画引擎** | React state + CSS transition | GSAP + ScrollTrigger |
| **滚动平滑** | Lenis | Lenis |
| **状态管理** | useState (current) | GSAP timeline |
| **计算方式** | 实时计算滚动进度 | 预定义时间线 |
| **驱动方式** | React re-render | GSAP scrub |
| **布局系统** | CSS `calc()` 公式 | JavaScript 设置 style |

### 核心工作流程

```
1. 页面加载 → 初始化 Lenis（全局 store）
2. useScroll hook 监听滚动
3. 实时计算滚动进度 → 更新 current state
4. React re-render → 卡片添加/移除 .current 类
5. CSS transition 执行动画
```

### 核心依赖树

```typescript
FeatureCards.tsx
  ├── @darkroom.engineering/hamo (useRect)
  ├── clsx (CSS 类名处理)
  ├── Card.tsx (卡片组件)
  ├── AppearTitle.tsx (标题动画)
  ├── useScroll.ts (滚动监听)
  └── math.ts (数学工具)
```

---

## 依赖系统详解

### 1. @darkroom.engineering/hamo (useRect)

**用途：** 实时测量元素位置和尺寸

```typescript
const element = useRef<HTMLDivElement>(null)
const [setRef, rect] = useRect()

// 使用方式：双向绑定
<div
  ref={(node) => {
    if (node) setRef(node)
    element.current = node
  }}
/>
```

**关键特性：**
- 自动监听元素尺寸变化
- 返回 `DOMRect` 对象（含 top, left, width, height）
- 触发重新计算时，依赖数组会重新执行

**数据结构：**
```typescript
interface DOMRect {
  top: number      // 元素顶部距离视口顶部的距离
  left: number     // 元素左侧距离视口左侧的距离
  width: number    // 元素宽度
  height: number   // 元素高度
  bottom: number   // 元素底部距离视口顶部的距离
  right: number    // 元素右侧距离视口左侧的距离
}
```

**在本组件中的作用：**
- 计算滚动触发区域 (`rect.top`, `rect.height`)
- 确定进度范围 (`start`, `end`)
- 作为 `useScroll` 的依赖，触发重新绑定

### 2. useScroll Hook (自定义)

**源码解析：**

```typescript
// src/hooks/useScroll.ts

export function useScroll(callback: ScrollCallback, deps: DependencyList = []) {
  const lenis = useStore(({ lenis }) => lenis)  // 从全局 store 获取 lenis 实例

  useEffect(() => {
    if (!lenis) return

    lenis.on('scroll', callback as (e: Lenis) => void)
    // 触发初始事件
    lenis.emit?.()

    return () => {
      lenis.off('scroll', callback as (e: Lenis) => void)
    }
  }, [lenis, callback, ...deps])
}
```

**事件参数结构：**
```typescript
interface LenisScrollEvent {
  scroll: number    // 当前滚动位置
  limit: number     // 可滚动的最大值
  velocity: number  // 滚动速度
  direction: number // 滚动方向 (1 = 向下, -1 = 向上)
  progress: number  // 整体滚动进度 (0-1)
}
```

**挂载机制：**
- 依赖数组 `[rect, windowHeight]` 触发重新挂载
- `lenis.emit?.()` 立即触发回调，初始化状态

**在本组件中的作用：**
```typescript
useScroll(
  ({ scroll }) => {
    // 每次 lenis 滚动时调用
  },
  [rect, windowHeight]  // rect 变化时重新绑定
)
```

### 3. math.ts 工具函数

#### clamp - 区间限制

```typescript
export function clamp(min: number, input: number, max: number): number {
  return Math.max(min, Math.min(input, max))
}
```

**示例：**
```typescript
clamp(0, 0.5, 1)  // 返回 0.5
clamp(0, -0.2, 1) // 返回 0
clamp(0, 1.5, 1)  // 返回 1
```

#### mapRange - 范围映射

```typescript
export function mapRange(
  in_min: number,   // 输入最小值
  in_max: number,   // 输入最大值
  input: number,    // 输入值
  out_min: number,  // 输出最小值
  out_max: number   // 输出最大值
): number {
  return ((input - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
}
```

**工作原理：**
```
输入范围: [in_min, in_max]
输出范围: [out_min, out_max]

映射公式:
  (input - in_min) / (in_max - in_min) = 输入的百分比位置
  百分比 * (out_max - out_min) = 在输出范围中的位置
  + out_min = 最终输出值
```

**示例：**
```typescript
mapRange(0, 100, 50, 0, 1)      // 返回 0.5（50%）
mapRange(0, 100, 0, 100, 200)   // 返回 100
mapRange(0, 100, 100, 100, 200) // 返回 200
```

---

## 布局计算机制

### 滚动区域计算

#### 步骤 1: 获取容器信息

```typescript
const element = useRef<HTMLDivElement>(null)
const [setRef, rect] = useRect()  // rect: DOMRect
const { height: windowHeight } = useWindowSize()  // 视口高度
```

#### 步骤 2: 定义触发区域

```typescript
// 计算起始点和结束点
const start = rect.top - windowHeight * 2
const end = rect.top + rect.height - windowHeight
```

**图解：**

```
视口 (viewport)
┌─────────────────────────────┐
│                            │
│  rect.top - 2*vh  ←───── start (触发起点)
│                            │
│                            │
│        [滚动区域]           │
│                            │
│                            │
│  rect.top + rect.height - vh ← end (触发终点)
│                            │
└─────────────────────────────┘

总滚动触发长度 = rect.height + windowHeight * 2 - windowHeight
                = rect.height + windowHeight
```

**为什么是 `windowHeight * 2`？**

```typescript
start = rect.top - windowHeight * 2
```

1. `rect.top`：元素顶部到页面顶部的距离
2. `- windowHeight`：用户需要滚动 1 个视口高度才能把元素底部带到顶部
3. `- windowHeight` 再次：**提前 1 个视口高度开始动画**，让用户有预览

**滚动进度公式：**

```typescript
// progress: 在整个触发范围内的进度 (0-1)
const progress = clamp(
  0,
  mapRange(start, end, scroll, 0, 1),
  1
)

// CSS --progress: 从元素顶部到 end 的进度
// 用于标题淡入
const progressForTitle = clamp(
  0,
  mapRange(rect.top, end, scroll, 0, 1),
  1
)
```

**示例计算：**

```
假设：
  - windowHeight = 1000px
  - rect.top = 3000px
  - rect.height = 1600vh = 16000px (移动端)

计算：
  start = 3000 - 1000 * 2 = 1000px
  end = 3000 + 16000 - 1000 = 18000px

当 scroll = 5000px 时：
  progress = mapRange(1000, 18000, 5000, 0, 1) = 0.235
  大约完成了 23.5%

对应的卡片变化：
  step = Math.floor(progress * 10) = 2
  第 2 张卡片添加 .current 类
```

---

## 时间线动画拆解

### 整体概念

**10 步卡片序列：**

```typescript
const cards = [
  { text: 'Run scroll in the main thread' },           // 第 0 步
  { text: 'Lightweight\n(under 4kb)' },                // 第 1 步
  { text: `Made for ${new Date().getFullYear()}+` },   // 第 2 步
  { text: 'Bring your own animation library' },        // 第 3 步
  { text: 'CONTROL THE SCROLL EASING DURATION' },      // 第 4 步
  { text: 'Use any element as scroller' },             // 第 5 步
  { text: 'Enjoy horizontal + vertical support' },     // 第 6 步
  { text: 'Feel free to use "position: sticky" again' }, // 第 7 步
  { text: 'touch support' },                            // 第 8 步
]

// 共 10 步（包括最后的空白步）
const step = Math.floor(progress * 10)    // 0-9
```

### 滚动步数映射

#### 步数计算逻辑

```typescript
const step = Math.floor(progress * 10)  // 0-9
```

**每个步数对应的卡片状态：**

| 步数 (step) | progress 范围 | 当前卡片数 | 说明 |
|------------|---------------|------------|------|
| 0 | [0, 0.1) | 0 | 初始状态，无卡片 |
| 1 | [0.1, 0.2) | 1 | 第 1 张卡片 |
| 2 | [0.2, 0.3) | 2 | 第 1-2 张卡片 |
| 3 | [0.3, 0.4) | 3 | 第 1-3 张卡片 |
| 4 | [0.4, 0.5) | 4 | 第 1-4 张卡片 |
| 5 | [0.5, 0.6) | 5 | 第 1-5 张卡片 |
| 6 | [0.6, 0.7) | 6 | 第 1-6 张卡片 |
| 7 | [0.7, 0.8) | 7 | 第 1-7 张卡片 |
| 8 | [0.8, 0.9) | 8 | 第 1-8 张卡片 |
| 9 | [0.9, 1] | 8 | 全部显示 |

#### 卡片条件渲染逻辑

```typescript
<SingleCard
  key={index}
  index={index}
  text={card.text}
  number={index + 1}
  current={current !== undefined && index <= current - 1}  // 关键逻辑
/>
```

**current 值传递链：**
```typescript
// FeatureCards 中
const [current, setCurrent] = useState<number>()
const step = Math.floor(progress * 10)
setCurrent(step)

// 传递给 SingleCard
current={current !== undefined && index <= current - 1}

// SingleCard 使用
<div className={cn(s.card, current && s.current)} ...>
```

**为什么要 `index <= current - 1`？**

```typescript
current = step = Math.floor(progress * 10)

// 当 progress = 0.15 (第 1 步)
step = 1
current === true for index <= 0  // 只有第 0 张卡片

// 当 progress = 0.25 (第 2 步)
step = 2
current === true for index <= 1  // 第 0、1 张卡片
```

**效果：**
- 每个步数只显示前 N 张卡片
- 形成卡片逐渐出现的效果

---

## 滚动同步机制

### useScroll 回调完整逻辑

```typescript
useScroll(
  ({ scroll }) => {
    if (!rect) return  // 无 rect 时跳过

    // 1. 计算触发范围
    const start = rect.top - windowHeight * 2
    const end = rect.top + rect.height - windowHeight

    // 2. 计算进度
    const progress = clamp(
      0,
      mapRange(start, end, scroll, 0, 1),
      1
    )

    // 3. 更新 CSS 变量（标题淡入）
    if (element.current) {
      element.current.style.setProperty(
        '--progress',
        clamp(0, mapRange(rect.top, end, scroll, 0, 1), 1).toString()
      )
    }

    // 4. 计算步数并更新状态
    const step = Math.floor(progress * 10)
    setCurrent(step)
  },
  [rect, windowHeight]  // 依赖数组
)
```

### CSS 变量更新

```typescript
// 设置为行内样式
element.current.style.setProperty(
  '--progress',
  clamp(0, mapRange(rect.top, end, scroll, 0, 1), 1).toString()
)

// 在 CSS 中使用（可能在 title 或其他地方）
.title {
  opacity: var(--progress);  // 从 0 到 1 淡入
}
```

**注意：** CSS 文件中未直接使用 `--progress`，但可能在全局或其他组件中使用。

### 性能优化点

**1. 跳过计算：**
```typescript
if (!rect) return  // 避免计算
```

**2. Map 缓存：**
```typescript
// React 会缓存依赖数组
[rect, windowHeight]
```

当 rect 不变时，不会重新绑定 scroll 事件。

**3. 状态批处理：**
```typescript
// 每次 scroll 触发时
setCurrent(step)
```

React 18 会自动批处理状态更新，避免频繁 re-render。

---

## 卡片切换逻辑

### 动画触发机制：CSS Transition

**关键点：**
- **没有 JavaScript 动画库**
- 完全依赖 CSS `transition` 属性
- React 只负责切换 `current` 类

#### CSS 动画定义

```css
/* feature-cards.module.css */

.features .card {
  position: absolute;
  --d: 100vh;
  will-change: transform;  /* 提示浏览器优化 */
  transition-duration: 1.2s;  /* 1.2秒动画 */
  transition-property: opacity, transform;  /* 同时动画 opacity 和 transform */
  transition-timing-function: var(--ease-out-expo);  /* Expo 缓动 */
}

/* 非当前卡片的隐藏状态 */
.features .card:not(.current) {
  transform: translate3d(100%, 100%, 0);  /* 右下 ➙ 移出可视区 */
  opacity: 0;  /* 完全透明 */
}
```

**动画机制：**

```typescript
// React 层：切换类名
<div className={cn(s.card, current && s.current)}>

// CSS 层：执行动画
// .card:not(.current) ➙ .card.current
// transform: translate3d(100%, 100%, 0) ➙ transform: none (初始位置)
// opacity: 0 ➙ opacity: 1
```

### .current 类的作用

**添加 .current 时：**
- 移除 `translate3d(100%, 100%, 0)`（回到正常位置）
- 移除 `opacity: 0`（恢复不透明）
- CSS transition 自动处理动画

**移除 .current 时：**
- 添加隐藏的 transform
- 设置 opacity: 0
- 同样有过渡动画

### 动画曲线

```css
transition-timing-function: var(--ease-out-expo);
```

**Expo 缓动的特点：**
- 开始快，结束慢
- `ease-out` 表示减速
- 营造高端、流畅的感觉

---

## 响应式适配

### 移动端布局 (@media max-width: 800px)

#### 高度计算

```css
.features {
  height: 1600vh;  /* 移动端总高度 */
}
```

#### 卡片位置动态计算（nth-child）

每个卡片的 `top` 位置通过复杂公式计算：

```css
@media (max-width: 800px) {
  .features .card:nth-child(1) {
    top: calc(
      (
        (100 * var(--vh, 1vh)) -
        117.3333333333vw -
        var(--layout-margin)
      ) /
      8 * 0
    );
  }

  .features .card:nth-child(2) {
    top: calc(
      (
        (100 * var(--vh, 1vh)) -
        117.3333333333vw -
        var(--layout-margin)
      ) /
      8 * 1
    );
  }

  /* 以此类推，直到 nth-child(9) */
}
```

**公式拆解：**

```
top = (
  (
    (100 * var(--vh, 1vh))      // 100vh (使用 CSS 变量确保精确)
    - 117.3333333333vw         // 卡片总高度相关
    - var(--layout-margin)      // 布局边距
  ) /
  8                           // 分为 8 份
  * 0-8                       // 乘以索引 (0-8)
)

索引 0: 最顶部
索引 8: 最底部
```

**设计原理：**
- 9 张卡片分为 8 个间隔
- 每张卡片的位置线性分布
- 使用 `vw` 单位确保响应式

### 桌面端布局 (@media min-width: 800px)

#### 高度计算

```css
@media (min-width: 800px) {
  .features {
    min-height: 90.9722222222vw;  /* 桌面端高度 */
  }
}
```

**为什么是 `90.9722222222vw`？**

```
vw = 视口宽度的 1%

计算过程：
  (总滚动空间) = (卡片高度 + 边距) * 8 步

假设：
  卡片宽度 = 30.5555555556vw (4 列 + 3 间隙)
  卡片高度 = 相似比例
  边距 = var(--layout-margin)

  总高度 ≈ (卡片高度 + 边距) * 8
  ≈ 90.9722222222vw
```

#### 卡片位置（2D 网格布局）

桌面端使用**网格布局**而非线性布局：

```css
@media (min-width: 800px) {
  .features .card:nth-child(1) {
    top: calc(
      (var(--d) - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0
    );
    left: calc(
      (100vw - 30.5555555556vw - (2 * var(--layout-margin))) / 8 * 0
    );
  }

  /* 同理 for nth-child(2-9) */
}
```

**具体计算：**

```
X 轴 (left):
  left = (100vw - 卡片宽度 - 2 * 边距) / 8 * 索引

  索引 = 0: 最左侧
  索引 = 8: 最右侧

Y 轴 (top):
  top = (var(--d) - 卡片高度 - 2 * 边距) / 8 * 索引

  索引 = 0: 最顶部
  索引 = 8: 最底部
```

**2D 网格效果：**

```
索引分布（近似）:
0 (0,0)  1 (1,0)  2 (2,0)
3 (0,1)  4 (1,1)  5 (2,1)
6 (0,2)  7 (1,2)  8 (2,2)

形成 3x3 网格对角线分布
```

### 标题定位

#### 移动端正中

```css
.features .title {
  text-align: end;
  padding-bottom: var(--layout-margin);
}
/* 无特殊定位，跟随文档流 */
```

#### 桌面端绝对定位

```css
@media (min-width: 800px) {
  .features .title {
    position: absolute;
    padding: 0;
    right: var(--layout-margin);
    /* 固定在右上角 */
  }
}
```

---

## 性能优化策略

### 1. will-change 属性

```css
.features .card {
  will-change: transform;  /* 提示浏览器预分配资源 */
}
```

**原理：**
- 浏览器检测到元素将有 transform 变化
- 预创建图层，避免运行时创建
- 提升动画流畅度

### 2. transform3d 硬件加速

```css
.features .card:not(.current) {
  transform: translate3d(100%, 100%, 0);
}
```

**关键点：**
- `translate3d` 触发 GPU 加速
- 使用 3D 变换而非 2D
- 动画在合成线程执行，不阻塞主线程

### 3. 组件拆分

```typescript
// FeatureCards (容器)
export const FeatureCards = () => { ... }

// SingleCard (单项)
const SingleCard = ({ text, number, index, current }: SingleCardProps) => {
  return (
    <div className={cn(s.card, current && s.current)} ...>
      <Card ... />
    </div>
  )
}
```

**优势：**
- 只有 current 状态变化时，SingleCard 才会 re-render
- React 可以优化组件级别更新

### 4. 依赖数组优化

```typescript
useScroll(callback, [rect, windowHeight])
```

**策略：**
- `rect` 只在元素尺寸变化时更新
- `windowHeight` 只在窗口 resize 时更新
- 大部分滚动事件不会导致重新绑定

### 5. 状态批处理

```typescript
// 每次滚动都会调用
setCurrent(step)

// React 18 自动批处理
// 多次 setState 合并为一次 re-render
```

### 6. CSS 动画 vs JS 动画

**纯 CSS 动画的优势：**

| 特性 | CSS Transition | JS Animation (GSAP) |
|------|----------------|---------------------|
| 执行线程 | 合成线程 | 主线程 |
| 性能 | ⭐⭐⭐⭐⭐ (GPU) | ⭐⭐⭐⭐ 依赖实现 |
| 灵活性 | ⭐⭐⭐ 简单动画 | ⭐⭐⭐⭐⭐ 任意动画 |
| 尺寸 | 0kb | ~40kb (GSAP) |
| 开发复杂度 | 低 | 中 |

**选择理由：**
- 简单出现/消失动画 → CSS 足够
- 需要最流畅性能 → CSS 更优
- 项目使用模块化 CSS → 无额外成本

---

## 动画时间线详解

### 时间线对比：FeatureCards vs App.tsx

#### FeatureCards (React + CSS)

```
滚动空间 = 1600vh (移动端)
步数 = 10 (0-9)
每步滚动距离 = 160vh

时间点：
  0vh   → step 0 → 无卡片
  160vh → step 1 → 卡片1
  320vh → step 2 → 卡片1-2
  ...
  1440vh → step 9 → 全部卡片

动画时长：每步 transition = 1.2s
实际滚动时：前一步卡片 1.2s 过渡到新位置
```

#### App.tsx (GSAP)

```
滚动空间 = 5200px * 8 卡片
动画类型 = 连续动画
时间点：
  0px   → 引入间隙
  300px → 卡片1出现
  1500px → 卡片1居中
  2200px → 卡片1全屏淡入
  ...
  约 40000px → 结束

动画时长 = 实时 scrub (滚动驱动)
```

### 精确滚动距离计算

**移动端：**

```typescript
features.height = 1600vh
step = Math.floor(progress * 10)

每步距离 = 160vh

假设 vh = 800px (移动端视口):
  每步像素 = 160 * 8 = 1280px
  总像素 = 1600 * 8 = 12800px
```

**桌面端：**

```typescript
features.min-height = 90.9722222222vw

假设 vw = 1440px:
  总像素 = 90.9722222222 * 14.4 ≈ 1310px
  每步像素 = 131px
```

**关键差异：**

- FeatureCards：**离散步进**（discrete steps）
- App.tsx：**连续动画**（continuous animation）

### 帧率分析

**FeatureCards：**

```typescript
// 滚动事件触发频率
// 典型浏览器：60fps = 16ms/次
useScroll(({ scroll }) => {
  // 每次调用计算 progress
  const progress = clamp(...)

  // 更新 state
  setCurrent(Math.floor(progress * 10))
})

// React re-render
// 当 current 变化时，卡片添加/移除 .current

// CSS transition: 1.2s
// 固定时长，与滚动速度无关
```

**优化点：**
- 使用 `Math.floor` 减少状态更新频率
- 只有步数变化时才执行 re-render
- CSS 动画在合成线程，不影响主线程

---

## useRect Hook 的深入分析

### 实现原理

```typescript
// @darkroom.engineering/hamo 内部逻辑（推测）

function useRect() {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const elementRef = useRef<Element | null>(null)

  const measure = useCallback(() => {
    if (elementRef.current) {
      setRect(elementRef.current.getBoundingClientRect())
    }
  }, [])

  useLayoutEffect(() => {
    measure()  // 初始测量

    const resizeObserver = new ResizeObserver(measure)
    if (elementRef.current) {
      resizeObserver.observe(elementRef.current)
    }

    window.addEventListener('resize', measure)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const setRef = useCallback((node: Element | null) => {
    elementRef.current = node
    measure()
  }, [measure])

  return [setRef, rect]
}
```

**性能特点：**
1. **ResizeObserver**：监听元素尺寸变化（高效）
2. **window resize**：监听窗口变化
3. **useLayoutEffect**：在 DOM 更新后测量，避免回流
4. **存储在 ref**：避免重复计算

### 精度问题与解决方案

**潜在问题：**

```typescript
// 当元素尺寸频繁变化时
// ResizeObserver 会频繁触发
// 可能导致 useScroll 多次重新绑定

useScroll(callback, [rect, windowHeight])
// rect 变化 → 重新绑定 scroll 事件
```

**解决方案：**

```typescript
// 1. 防抖（debounce）测量
const measure = useDebounce(() => {
  // 测量逻辑
}, 50)

// 2. 精确控制依赖
useScroll(callback, [
  rect?.width,   // 只关心宽度
  rect?.height,  // 和高度
  windowHeight
])
```

### 与 getBoundingClientRect 的对比

| 特性 | useRect | getBoundingClientRect |
|------|---------|----------------------|
| 更新时机 | 自动 | 手动 |
| 性能 | 高（缓存） | 每次调用 |
| 简单性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 灵活性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 额外依赖 | ✅ | ❌ |

---

## 与 App.tsx (Card) 的对比分析

### 设计哲学对比

#### FeatureCards：声明式（Declarative）

**核心思想：**
- 使用 React 状态描述"应该是什么"
- CSS 处理"如何变化"
- 滚动 = 状态更新

```typescript
// 声明：第 3 步应该有 3 张卡片
current = 3
cards.map((_, index) => index <= 2 && <Card ... />)

// CSS：如何出现
.card:not(.current) { opacity: 0; transform: translate3d(...); }
.card.current { opacity: 1; transform: none; }
```

**优势：**
- 代码清晰，易于理解
- 性能优秀（CSS GPU 加速）
- 无额外依赖

**劣势：**
- 动画控制有限（无法精细控制曲线）
- 复杂动画难以实现

---

#### App.tsx：命令式（Imperative）

**核心思想：**
- 使用 GSAP 精确控制每个属性
- JavaScript 描述"如何变化"
- 滚动 = 时间线驱动

```typescript
// 命令：在 300px 时，设置 left: startLeft
tl.set(card, { left: startLeft }, total)

// 命令：在 1500ms 内，移动到 centerLeft
tl.to(card, { left: centerLeft, duration: APPEAR }, total)
```

**优势：**
- 动画控制极其精细
- 支持复杂时间线
- 各种插件（ScrollTrigger, MorphSVG等）

**劣势：**
- 学习曲线陡峭
- 代码量更大
- 需要外部库

---

### 技术选型建议

| 场景 | FeatureCards | App.tsx GSAP |
|------|--------------|--------------|
| 简单出现/消失 | ✅ 推荐使用 | 过于复杂 |
| 连续位移缩放 | 可能卡顿 | ✅ 推荐使用 |
| 多属性同步 | 需要多个 transition | ✅ 时间线 |
| 性能要求极高 | ✅ CSS 加速 | 可能阻塞 |
| 代码可维护性 | ✅ 简单 | 需要经验 |
| 复杂时间线 | 难以实现 | ✅ 原生支持 |

**混合方案：**
```typescript
// 简单交互：CSS + React state
const [isVisible, setIsVisible] = useState(false)
<div className={cn(s.card, isVisible && s.visible)}>

// 复杂动画：GSAP
useLayoutEffect(() => {
  gsap.to(element, { x: 100, duration: 1, ease: 'power2.out' })
}, [])
```

---

## 调试技巧

### 1. 查看当前步数

```typescript
// 在 onScroll 中添加
console.log(`progress: ${progress.toFixed(3)}, step: ${step}`)

// 输出
// progress: 0.123, step: 1
// progress: 0.245, step: 2
// progress: 0.367, step: 3
```

### 2. 查看 CSS 变量

```javascript
// 浏览器控制台
document.querySelector('[data-feature-cards]')
  .style.getPropertyValue('--progress')

// 输出: "0.456"
```

### 3. 检查动画性能

```javascript
// Chrome DevTools > Performance
// 记录滚动操作

// 检查：
// 1. FPS 是否稳定在 60
// 2. Main 线程是否阻塞
// 3. Composite Layers 数量
```

### 4. 强制触发特定步

```typescript
// 在 useScroll 中添加调试代码
if (element.current) {
  // 强制设置 progress
  const forcedProgress = 0.5  // 第 5 步
  const forcedStep = Math.floor(forcedProgress * 10)
  setCurrent(forcedStep)
}
```

### 5. 查看 Rect 变化

```typescript
// 在 useRect 绑定后
useEffect(() => {
  console.log('rect changed:', rect)
}, [rect])
```

---

## 最佳实践总结

### 1. 选择正确的动画方案

**使用 React + CSS 当：**
- ✅ 简单出现/消失
- ✅ 简单的 transform 动画
- ✅ 需要最高性能
- ✅ 团队熟悉 CSS

**使用 GSAP 当：**
- ✅ 复杂时间线
- ✅ 需要滚动驱动精确控制
- ✅ 多属性同步动画
- ✅ 需要各种插件

### 2. 优化状态更新

 **- 减少 re-render：**
```typescript
// ❌ 每次滚动都更新多个 state
setProgress(p)
setStep(s)
setSomethingElse(x)

// ✅ 计算所有值，一次更新
const nextState = calculateEverything(scroll)
setState(nextState)
```

 **- 使用 useMemo：**
```typescript
const expensiveCalc = useMemo(() => {
  return heavyCalculation(progress)
}, [progress])
```

### 3. 响应式设计

 **- 使用 CSS 变量：**
```css
:root {
  --card-width-mobile: 91.4667vw;
  --card-width-desktop: calc((4 * var(--layout-column-width)));
}

.card {
  width: var(--card-width-mobile);
}

@media (min-width: 800px) {
  .card {
    width: var(--card-width-desktop);
  }
}
```

**- 使用相对单位：**
- `vw`, `vh`：基于视口
- `%`：基于父元素
- `rem`：基于根字体

### 4. 测试不同设备

**必须测试：**
- ✅ 不同视口尺寸（Chrome DevTools 设备模式）
- ✅ 触摸设备（iOS Safari, Android Chrome）
- ✅ 桌面设备（鼠标滚轮，键盘）
- ✅ 高刷新率屏幕（120Hz+）
- ✅ 低端设备（动画性能）

---

## 常见问题

### Q1: `useRect` 更新时，动画闪烁？

**A:** 这是因为 rect 变化导致重新计算位置。

**解决：**
```typescript
// ✅ 1. 防抖处理
const [debouncedRect] = useDebounce(rect, 50)

// ✅ 2. 仅在必要时更新
useScroll(callback, [rect?.width, rect?.height])
```

### Q2: 滚动时，卡片动画卡顿？

**A:** 可能原因：

1. **Main 线程阻塞**
   ```typescript
   // ❌ 在主线程执行重计算
   useScroll(() => {
     heavyCalculation()  // 阻塞
   })

   // ✅ 使用 Web Worker 或分批执行
   ```

2. **Layer 过多**
   - 减少 `will-change` 使用
   - 检查合成层数量

3. **频繁 re-render**
   - 使用 `React.memo` 优化子组件
   - 使用 `useMemo` 缓存计算

### Q3: 移动端和桌面端动画不一致？

**A:** CSS 中未统一定义：

```css
/* ✅ 统一 transition 定义 */
.features .card {
  transition-duration: 1.2s;
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-out-expo);
}

/* 不要分开写 */
@media (min-width: 800px) {
  .features .card {
    /* 会继承 mobile 的 transition，可能冲突 */
  }
}
```

### Q4: 如何调整动画速度？

**A:** 全局修改 `transition-duration`：

```css
.features .card {
  transition-duration: 800ms;  /* 改为 800ms */
}
```

或动态设置：

```typescript
<div
  className={s.card}
  style={{ '--duration': `${duration}ms` } as CSSProperties}
>
```

```css
.features .card {
  transition-duration: var(--duration, 1200ms);
}
```

### Q5: 如何调试特定卡片的计算？

**A:**

```typescript
// 在 useScroll 中添加
useScroll(
  ({ scroll }) => {
    if (index === 2) {  // 调试第 3 个卡片
      console.log('Card 3:', {
        scroll,
        start,
        end,
        progress,
        current
      })
    }
  },
  [rect, windowHeight]
)
```

---

## 总结

FeatureCards 组件展示了一种**纯 React + CSS** 的滚动驱动动画方案，其核心价值在于：

### 1. **简单高效**
- 无需复杂动画库
- CSS GPU 加速
- 代码易于理解

### 2. **声明式设计**
- React 状态描述"应该是什么"
- CSS 处理"如何变化"
- 职责分离清晰

### 3. **响应式友好**
- 纯 CSS 媒体查询
- 动态计算公式
- 多设备适配

### 4. **性能优秀**
- useRect 优化
- CSS 动画在合成线程
- 合理的状态管理

**核心设计原则：**
- **滚动** → **计算** → **状态更新** → **CSS 动画**
- JavaScript 负责业务逻辑
- CSS 负责视觉呈现

这种方案非常适合于：**简单的出现/消失动画**、**基于步进的序列**、**性能敏感的场景**。
