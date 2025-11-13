# Grid Layout 与 GSAP 动画定位兼容性分析

## 核心问题

**问：** 使用 CSS Grid Layout 是否会影响 GSAP 对元素的定位控制？

**答：**
- ✅ **Grid 容器** 本身不受影响（`.features` 或 `.stage` 可以是 Grid）
- ⚠️ **被 GSAP 控制的子元素** 会受 grid 属性限制
- ❌ **如果卡片设置了 `grid-column`/`grid-row`**，GSAP 的 `left/top` 会与 Grid 冲突

---

## 测试验证

### 测试代码

```typescript
// 场景 1：Grid 容器 + Grid 子元素
const GridScenario1 = () => (
  <div className="grid grid-cols-3 gap-4" style={{ height: '100vh' }}>
    <div
      ref={cardRef}
      className="bg-blue-500 col-start-2 row-start-2"  // Grid 定位
      style={{ width: '200px', height: '200px' }}
    >
      Card 1
    </div>
  </div>
)

// 场景 2：Grid 容器 + Absolute 子元素
const GridScenario2 = () => (
  <div className="relative grid grid-cols-3 gap-4" style={{ height: '100vh' }}>
    <div
      ref={cardRef}
      className="absolute bg-blue-500"  // Absolute 定位
      style={{ width: '200px', height: '200px' }}
    >
      Card 2
    </div>
  </div>
)

// GSAP 测试
useEffect(() => {
  if (cardRef.current) {
    gsap.to(cardRef.current, {
      left: 500,  // 尝试移动
      top: 300,
      duration: 1,
    })
  }
}, [])
```

### 测试结果

| 场景 | 初始位置由谁控制 | GSAP left/top 是否生效 | 结论 |
|------|----------------|----------------------|------|
| **场景 1：Grid 子元素** | `col-start-2 row-start-2` | ❌ 不生效 | **冲突** - Grid 布局优先级更高 |
| **场景 2：Absolute** | 无（默认在 0,0） | ✅ 生效 | **兼容** - Absolute 脱离文档流 |

### 根本原因

```css
/* 场景 1：Grid 子元素 */
.card {
  /* 浏览器计算的布局 */
  grid-column: 2 / 3;  /* 这会生成本地 left 值 */
  grid-row: 2 / 3;     /* 这会生成本地 top 值 */

  /* GSAP 尝试设置 */
  left: 500px !important;  /* 被 Grid 覆盖 */
  top: 300px !important;
}

/* 场景 2：Absolute */
.card {
  position: absolute;  /* 脱离 Grid 布局 */
  /* Grid 不再控制位置 */

  /* GSAP 设置 */
  left: 500px;  /* 生效 */
  top: 300px;
}
```

---

## 推荐方案：Tailwind + GSAP

### 方案 A：Grid 容器 + Absolute 卡片（推荐）

```typescript
// 容器可以是 Grid（用于初始布局参考）
<div className="grid grid-cols-3 gap-8 relative min-h-screen">
  {/* 卡片必须是 absolute，脱离 Grid 控制 */}
  <article
    ref={cardRefs.current[0]}
    className="absolute"  // 关键！脱离 Grid
    style={{ width: '340px', height: '340px' }}
  >
    <div className="w-full h-full bg-white/15 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
      <p className="text-6xl font-tight font-anton text-accent">01</p>
      <p className="text-2xl font-panchang uppercase text-fg">Explore features</p>
    </div>
  </article>
</div>

// GSAP 控制
useEffect(() => {
  cards.forEach((card, i) => {
    const el = cardRefs.current[i]
    if (!el) return

    // 初始位置：右下角
    gsap.set(el, {
      left: window.innerWidth - 340 - 16,
      top: window.innerHeight - 340 - 16,
    })

    // 动画
    gsap.to(el, {
      left: centerX,
      top: centerY,
      scrollTrigger: { ... }
    })
  })
}, [])
```

**优点：**
- ✅ Grid 容器便于初始参考
- ✅ Absolute 卡片完全由 GSAP 控制
- ✅ 无定位冲突
- ✅ 响应式时只需更新 GSAP 值

### 方案 B：Relative 容器 + Absolute 卡片（更简单）

```typescript
// 容器是普通 relative
<div className="relative min-h-screen">
  {/* 卡片 absolute */}
  <article
    ref={cardRefs.current[0]}
    className="absolute"
    style={{ width: '340px', height: '340px' }}
  >
    ...
  </article>
</div>

// GSAP 代码与方案 A 相同
```

**优点：**
- ✅ 更简单，无需 Grid
- ✅ 完全控制位置
- ✅ 性能更好（浏览器少一层计算）

**缺点：**
- ❌ 没有 Grid 的视觉参考

---

## 在 FeatureCards 中的应用

### 当前结构（问题版）

```css
/* feature-cards.module.css */
.features .card {
  /* 这是 Grid 子元素！ */
  top: calc(...);  /* 通过 calc 计算 grid 位置 */
  /* GSAP 无法覆盖 */
}
```

### 改造后（正确版）

```typescript
// FeatureCardsGsap.tsx

// 容器：可以是 Grid（用于布局边距）
<div className="grid grid-cols-12 gap-6 relative min-h-screen p-12">

  {/* 标题：Grid 正常布局 */}
  <aside className="col-start-10 col-span-3">
    <h3 className="font-panchang text-2xl uppercase">
      Lenis brings<br /><span className="text-grey">the heat</span>
    </h3>
  </aside>

  {/* 舞台：relative，用于 absolute 定位参考 */}
  <div className="relative col-span-12" ref={stageRef}>
    {cards.map((card, i) => (
      <article
        key={card.id}
        ref={el => cardRefs.current[i] = el}
        className="absolute"  // ✅ 关键！脱离 Grid
        style={{ width: '340px', height: '340px' }}
      >
        <CardContent card={card} />
      </article>
    ))}
  </div>
</div>

// GSAP 控制位置
useEffect(() => {
  cards.forEach((_, i) => {
    const card = cardRefs.current[i]
    if (!card) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    // 右下角
    gsap.set(card, {
      left: vw - 340 - 16,
      top: vh - 340 - 16,
    })

    // 时间线...
  })
}, [])
```

---

## Tailwind 完整实现

### 1. 样式系统设计

```typescript
// 主题配置（tailwind.config.ts 或 CSS 变量）
// src/styles/theme.css
:root {
  --font-anton: "Anton", sans-serif;
  --font-panchang: "Panchang", sans-serif;
  --font-roboto: "Roboto", sans-serif;
  --color-accent: oklch(0.4628 0.3059 264.18);
  --color-bg: rgba(239, 239, 239, 0.8);
  --color-fg: #000;
  --color-grey: rgb(176, 176, 176);
}

// Tailwind 扩展
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        'anton': ['var(--font-anton)'],
        'panchang': ['var(--font-panchang)'],
        'roboto': ['var(--font-roboto)'],
      },
      colors: {
        'accent': 'var(--color-accent)',
        'fg': 'var(--color-fg)',
        'grey': 'var(--color-grey)',
      },
    },
  },
}
```

### 2. 卡片内容组件

```typescript
// src/components/CardContent.tsx
import { ReactNode } from 'react'

interface CardContentProps {
  number: number
  text: ReactNode
}

export const CardContent = ({ number, text }: CardContentProps) => {
  return (
    <div className="
      w-full h-full
      bg-bg/80 border border-white/10
      backdrop-blur-sm rounded-2xl
      p-8  // mobile: 32px
      md:p-6  // desktop: 1.666vw
      flex flex-col justify-between
      shadow-xl
    ">
      <p className="
        font-anton font-tight leading-90
        text-accent
        text-14vw  // mobile: 14.933vw
        md:text-6.6vw  // desktop
      ">
        {number.toString().padStart(2, '0')}
      </p>

      <p className="
        font-panchang font-bold uppercase leading-100
        text-fg
        text-5vw  // mobile
        md:text-2vw  // desktop
        drop-shadow
      ">
        {text}
      </p>
    </div>
  )
}
```

### 3. 主组件

```typescript
// src/components/FeatureCardsGsap.tsx
import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HoldController } from '@/utils/HoldController'
import { useLenisGsap } from '@/hooks/useLenisGsap'
import { CardContent } from './CardContent'
import { useWindowSize } from 'react-use'

gsap.registerPlugin(ScrollTrigger)

export const FeatureCardsGsap = () => {
  useLenisGsap()

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const { width: vw, height: vh } = useWindowSize()

  const cards = [
    { id: 'c1', number: 1, text: 'Run scroll in the main thread' },
    { id: 'c2', number: 2, text: 'Lightweight \n (under 4kb)' },
    // ...
  ]

  useLayoutEffect(() => {
    if (!stageRef.current) return

    const holdCtl = new HoldController()

    const build = () => {
      const stage = stageRef.current!

      // 时间线
      const tl = gsap.timeline()
      let total = 0

      // 引介间隙
      total += 300  // INTRO_GAP

      cards.forEach((card, i) => {
        const el = cardRefs.current[i]
        if (!el) return

        // 初始位置：右下角
        gsap.set(el, {
          left: vw - 340 - 16,
          top: vh - 340 - 16,
          width: 340,
          height: 340,
        })

        // 出现
        tl.to(el, {
          left: (vw - 340) / 2,
          top: (vh - 340) / 2,
          duration: 1200,
          ease: 'power4.out',
        }, total)
        total += 1200

        // 全屏
        tl.to(el, {
          left: 0,
          top: 0,
          width: vw,
          height: vh,
          duration: 700,
        }, total)
        total += 700

        // 添加更多动画...
      })

      // ScrollTrigger
      ScrollTrigger.create({
        animation: tl,
        trigger: stage,
        start: 'top top',
        end: '+=' + total,
        scrub: 1,
        pin: true,
      })
    }

    build()

    const handleResize = () => build()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cards, vw, vh])

  return (
    <div className="grid grid-cols-12 gap-6 relative min-h-screen p-12">
      {/* 标题 - Grid 布局 */}
      <aside className="col-start-10 col-span-3">
        <h3 className="font-panchang text-2xl uppercase text-right">
          Lenis brings<br />
          <span className="text-grey">the heat</span>
        </h3>
      </aside>

      {/* 舞台 - 用于 absolute 定位参考 */}
      <div className="relative col-span-12 h-screen" ref={stageRef}>
        {cards.map((card, i) => (
          <article
            key={card.id}
            ref={el => cardRefs.current[i] = el!}
            className="absolute"  // ✅ 脱离 Grid
            style={{ width: 340, height: 340 }}
          >
            <CardContent
              number={card.number}
              text={card.text}
            />
          </article>
        ))}
      </div>
    </div>
  )
}
```

---

## 关键结论

### ✅ 可行方案

```typescript
// 1. Grid 容器（用于布局边距、标题位置）
<div className="grid grid-cols-12 gap-6">
  <aside className="col-start-10">...</aside>

  {/* 2. 相对定位的舞台 */}
  <div className="relative col-span-12" ref={stageRef}>
    {/* 3. Absolute 卡片 - GSAP 控制 */}
    <article className="absolute" ref={cardRef}>
      <CardContent />
    </article>
  </div>
</div>
```

### ❌ 不可行方案

```typescript
// 不要这样！
<div className="grid grid-cols-12">
  <article className="col-start-2 col-span-4" ref={cardRef}>
    {/* grid-column 会与 GSAP left 冲突 */}
  </article>
</div>
```

---

## 推荐架构

```
┌─────────────────────────────────────────┐
│  Grid Container (Tailwind)              │
│  - 边距、标题、Footer                    │
├─────────────────────────────────────────┤
│  Relative Stage (ref={stageRef})        │
│  - 作为 absolute 参考容器                │
├─────────────────────────────────────────┤
│  Absolute Cards (ref={cardRefs})        │
│  - 完全由 GSAP 控制位置                  │
│  - left/top/width/height                │
├─────────────────────────────────────────┤
│  Card Content (Component)               │
│  - Flex 布局内部元素                     │
│  - aspect-ratio 正方形                  │
└─────────────────────────────────────────┘
```

---

**结论：**
- ✅ **Grid 容器 + Absolute 卡片 = 完全兼容**
- ✅ 使用 Tailwind 的 Grid 布局容器，内部卡片设置为 `absolute`
- ✅ GSAP 完全控制卡片位置，无冲突
- ✅ 响应式通过 JS 动态计算（resize 时重建）
