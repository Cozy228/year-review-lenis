# FeatureCards → GSAP 迁移方案（Tailwind CSS v4 简化版）

## 核心目标

保留 FeatureCards 的视觉设计（主题、字体、卡片样式），使用 Tailwind CSS v4 的 CSS-first 配置方法，集成 Card 的 GSAP 动画系统。

---

## 一、架构设计

### 混合架构

```
┌─────────────────────────────────────────┐
│  Tailwind CSS v4 布局层（Grid + Flex） │
│  - CSS-first 配置，无需 JS 配置文件   │
│  - 容器、标题、间距、响应式            │
├─────────────────────────────────────────┤
│  GSAP 动画层                           │
│  - ScrollTrigger + HoldController      │
│  - 时间线控制位置                      │
├─────────────────────────────────────────┤
│  视觉样式层（保留）                    │
│  - 主题色、字体系统（Anton/Panchang）  │
│  - 卡片样式：玻璃态、模糊、阴影        │
└─────────────────────────────────────────┘
```

---

## 二、Tailwind CSS v4 配置

### 1. CSS-First 主题配置（推荐）

Tailwind CSS v4 采用 CSS-first 配置方法，无需 `tailwind.config.ts` 文件：

```css
/* src/styles/theme.css */
@import "tailwindcss";

@theme {
  /* 字体系统 */
  --font-anton: "Anton", sans-serif;
  --font-panchang: "Panchang", sans-serif;
  --font-roboto: "Roboto", sans-serif;

  /* 设置默认字体 */
  --default-font-family: var(--font-roboto);

  /* 颜色系统 */
  --color-accent: oklch(0.4628 0.3059 264.18);
  --color-fg: #000;
  --color-bg: rgba(239, 239, 239, 0.8);
  --color-grey: rgb(176, 176, 176);

  /* 自定义字体大小 */
  --font-size-14vw: clamp(3rem, 14.9333333333vw, 8rem);
  --font-size-6\.6vw: clamp(1.5rem, 6.6666666667vw, 4rem);
  --font-size-5vw: clamp(1.25rem, 5.3333333333vw, 3rem);
  --font-size-2vw: clamp(0.875rem, 1.9444444444vw, 1.5rem);
}

/* 可选：CSS 变量备用方案 */
@layer base {
  :root {
    --font-anton: "Anton", sans-serif;
    --font-panchang: "Panchang", sans-serif;
    --color-accent: oklch(0.4628 0.3059 264.18);
  }
}
```

### 2. 字体导入

确保在 CSS 中导入字体：

```css
/* src/styles/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Panchang:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
```

### 3. 使用方式

在组件中直接使用：

```tsx
// 字体
<h1 className="font-anton text-14vw">标题</h1>
<p className="font-panchang text-5vw md:text-2vw">内容</p>

// 颜色
<div className="bg-bg/80 text-fg border-grey">
  <span className="text-accent">突出显示</span>
</div>
```

### 4. 向后兼容（可选）

如果需要使用传统的 JS 配置，可以添加 `@config`：

```css
/* src/styles/theme.css */
@import "tailwindcss";
@config "../../tailwind.config.js";
```

---

## 三、Tailwind CSS v4 组件实现

### 1. 卡片内容组件

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
      p-8 md:p-6
      flex flex-col justify-between
      shadow-xl
    ">
      {/* 数字 */}
      <p className="
        font-anton leading-90 text-accent
        text-14vw md:text-6.6vw
      ">
        {number.toString().padStart(2, '0')}
      </p>

      {/* 文本 */}
      <p className="
        font-panchang font-bold uppercase leading-100
        text-fg
        text-5vw md:text-2vw
        drop-shadow
      ">
        {text}
      </p>
    </div>
  )
}
```

### 2. 主组件

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

interface FeatureCard {
  id: string
  number: number
  text: string
}

export const FeatureCardsGsap = () => {
  useLenisGsap()

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const { width: vw, height: vh } = useWindowSize()

  const cards: FeatureCard[] = [
    { id: 'c1', number: 1, text: 'Run scroll in the main thread' },
    { id: 'c2', number: 2, text: 'Lightweight\n(under 4kb)' },
    { id: 'c3', number: 3, text: `Made for ${new Date().getFullYear()}+` },
    { id: 'c4', number: 4, text: 'Bring your own animation library' },
    { id: 'c5', number: 5, text: 'CONTROL THE SCROLL EASING DURATION' },
    { id: 'c6', number: 6, text: 'Use any element as scroller' },
    { id: 'c7', number: 7, text: 'Enjoy horizontal + vertical support' },
    { id: 'c8', number: 8, text: 'Feel free to use "position: sticky" again' },
    { id: 'c9', number: 9, text: 'touch support' },
  ]

  useLayoutEffect(() => {
    if (!stageRef.current) return

    const holdCtl = new HoldController()

    const build = () => {
      const stage = stageRef.current!
      const tl = gsap.timeline({ defaults: { ease: 'none' } })

      cards.forEach((card, i) => {
        const el = cardRefs.current[i]
        if (!el) return

        // 清理
        gsap.set(el, { clearProps: 'all' })

        // 初始位置：右下角
        gsap.set(el, {
          position: 'absolute',
          left: vw - 340 - 16,
          top: vh - 340 - 16,
          width: 340,
          height: 340,
          opacity: 0,
          visibility: 'hidden',
        })

        let total = 0

        // 引介间隙（仅第一张）
        if (i === 0) total += 300

        // 1. 出现（APPEAR）
        tl.to(el, {
          opacity: 1,
          visibility: 'visible',
          zIndex: 15,
        }, total)

        tl.to(el, {
          left: (vw - 340) / 2,
          top: (vh - 340) / 2,
          duration: 1200,
          ease: 'power4.out',
        }, total)
        total += 1200

        // 2. 缩放（ZOOM）
        tl.to(el, {
          left: 0,
          top: 0,
          width: vw,
          height: vh,
          duration: 700,
          ease: 'power1.inOut',
        }, total)
        total += 700

        // 3. 文本淡入（TEXT_FADE）
        tl.to(el, {
          zIndex: 20,
          duration: 140,
        }, total)
        total += 140

        // 4. 阅读（假内滚 - 可选）
        const extraPx = 500  // 简化：固定 500px 滚动
        tl.to(el, {
          duration: extraPx / 50,  // 10px/unit
        }, total)
        total += extraPx / 50

        // 5. 冻结（FULL_HOLD）
        tl.to({}, { duration: 500 }, total)
        total += 500

        // 6. 退出缩放
        tl.to(el, {
          left: (vw - 340) / 2,
          top: (vh - 340) / 2,
          width: 340,
          height: 340,
          duration: 700,
          ease: 'power1.inOut',
        }, total)
        total += 700

        // 7. Dock
        const dockLeft = 16 + i * 40
        const dockTop = 16 + i * 40

        tl.to(el, {
          left: dockLeft,
          top: dockTop,
          duration: 1200,
          ease: 'power2.inOut',
        }, total)
        total += 1200

        // 8. 间隔
        total += 220
      })

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
      })
    }

    build()

    const handleResize = () => {
      requestAnimationFrame(build)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [vw, vh])

  return (
    <div className="grid grid-cols-12 gap-6 relative min-h-screen p-12">
      {/* 标题 */}
      <aside className="col-start-10 col-span-3 z-10">
        <h3 className="font-panchang text-2xl uppercase text-right">
          Lenis brings<br />
          <span className="text-grey">the heat</span>
        </h3>
      </aside>

      {/* 舞台 */}
      <div
        className="relative col-span-12 h-screen"
        ref={stageRef}
      >
        {cards.map((card, i) => (
          <article
            key={card.id}
            ref={el => cardRefs.current[i] = el!}
            className="absolute"
            style={{ width: 340, height: 340 }}
          >
            <CardContent number={card.number} text={card.text} />
          </article>
        ))}
      </div>
    </div>
  )
}
```

---

## 四、完整实现（含假内滚）

```typescript
// src/components/FeatureCardsGsap.tsx

import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HoldController } from '@/utils/HoldController'
import { useLenisGsap } from '@/hooks/useLenisGsap'
import { CardContent } from './CardContent'
import { useWindowSize } from 'react-use'
import { LoremIpsum } from 'lorem-ipsum'
import type { ReactNode } from 'react'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------ types ------------------------------ */
interface FeatureCard {
  id: string
  number: number
  text: ReactNode
  body?: string[]  // 假内滚内容
}

interface Meta {
  card: HTMLElement
  wrapper: HTMLElement
  contentWrap: HTMLElement
  contentInner: HTMLElement
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

// Lorem ipsum 生成器
const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
})

export const FeatureCardsGsap = () => {
  useLenisGsap()

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const reverseGuardRef = useRef<Record<number, boolean>>({})
  const { width: vw, height: vh } = useWindowSize()

  // 生成随机卡片数据（15-30 段话）
  const generateRandomCards = (count = 9, startIndex = 1): FeatureCard[] => {
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

    return Array.from({ length: count }, (_, i) => {
      const paras = rand(15, 30)  // 15-30 段话
      const body = lorem
        .generateParagraphs(paras)
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)

      return {
        id: `c${i + startIndex}`,
        number: i + startIndex,
        text: lorem.generateWords(rand(3, 8)),  // 3-8 个词的标题
        body,
      }
    })
  }

  const cards: FeatureCard[] = [
    {
      id: "c1",
      number: 1,
      text: "Run scroll in the main thread",
      body: [
        "进入全屏时正文从顶部淡入；到底部先停留（FULL_HOLD）再退出全屏。",
        "卡片尺寸固定，内容用假内滚（内部平移）。",
        ...lorem.generateParagraphs(8).split(/\n+/),
      ],
    },
    {
      id: "c2",
      number: 2,
      text: "Lightweight\n(under 4kb)",
      body: lorem.generateParagraphs(3).split(/\n+/),
    },
    ...generateRandomCards(7, 3),  // 生成 7 张随机卡片
  ]

  useLayoutEffect(() => {
    if (!stageRef.current) return

    // 第一阶段：基础动画（无 HoldController）
    const buildTimeline = () => {
      const stage = stageRef.current!
      const tl = gsap.timeline({ defaults: { ease: 'none' } })

      let total = 0
      const metas: Meta[] = []

      // 初始占位符
      tl.to({}, {}, total)
      total += 300 // INTRO_GAP

      const cardElements = cardRefs.current.filter(Boolean)

      cardElements.forEach((card, i) => {
        const data = cards[i]
        const wrapper = card.querySelector<HTMLElement>('[data-card-wrapper]')!
        const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!
        const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!

        // 清理
        gsap.set(card, { clearProps: 'x,y,scale,transform,opacity,left,top,width,height' })
        gsap.set(wrapper, { clearProps: 'opacity,transform' })
        gsap.set(contentWrap, { opacity: 0, pointerEvents: 'none' })
        gsap.set(contentInner, { y: 0 })

        // 计算位置
        const baseW = 340
        const baseH = 340
        const startLeft = Math.max(0, vw - baseW - 16)
        const startTop = Math.max(0, vh - baseH - 16)
        const centerLeft = (vw - baseW) / 2
        const centerTop = (vh - baseH) / 2
        const dockLeft = 16 + i * 40
        const dockTop = 16 + i * 40

        const tVisible = total
        gsap.set(card, { left: startLeft, top: startTop, width: baseW, height: baseH, zIndex: 15 })

        // 1. APPEAR
        tl.to(card, { left: centerLeft, top: centerTop, duration: 1200, ease: 'power4.out' }, total)
        total += 1200

        // 2. ZOOM
        tl.to(card, { left: 0, top: 0, width: vw, height: vh, duration: 700, ease: 'power1.inOut' }, total)
        total += 700

        // 3. TEXT_FADE in
        const tFullIn = total
        tl.to(contentWrap, { opacity: 1, duration: 140, ease: 'none' }, total)
        total += 140

        // 4. READ (fake inner scroll)
        const extraPx = data.body ? measureExtra(card, contentWrap, contentInner, vw, vh, { width: baseW, height: baseH }) : 0
        const extraUnits = Math.max(1, Math.round(extraPx / 2)) // 2px per unit
        tl.to(contentInner, { y: -extraPx, duration: extraUnits, ease: 'none' }, total)
        const tReadEnd = total + extraUnits
        total += extraUnits

        // 5. FULL_HOLD（第一阶段：简单停留，无 HoldController）
        tl.to({}, { duration: 500 }, total)
        // 第二阶段将添加 HoldController.begin() 检测
        const tHoldEnd = total + 500  // 预留时间点
        total += 500

        // 6. TEXT_FADE out
        tl.to(contentWrap, { opacity: 0, duration: 140, ease: 'none' }, total)
        total += 140

        // 7. Reset position
        tl.set(contentInner, { y: 0 }, total)

        // 8. ZOOM out
        tl.to(card, { left: centerLeft, top: centerTop, width: baseW, height: baseH, duration: 700, ease: 'power1.inOut' }, total)
        total += 700

        // 9. DOCK_MOVE
        tl.to(card, { left: dockLeft, top: dockTop, duration: 1200, ease: 'power2.inOut' }, total)
        const tDockEnd = total + 1200
        total += 1200

        // 10. BETWEEN
        total += 220

        metas.push({
          card,
          wrapper,
          contentWrap,
          contentInner,
          tVisible,
          tFullIn,
          tReadEnd,
          tHoldEnd,
          tFullOut: total - 220 - 1200 - 700 - 500,
          tDockEnd,
          startLeft,
          startTop,
        })
      })

      // ScrollTrigger
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
            if (t >= m.tVisible - 140) {
              gsap.set(m.card, { className: 'card fixed is-visible' })
            }

            // ZIndex
            const phase = t >= m.tDockEnd ? 3 : t >= m.tFullIn && t < m.tFullOut ? 2 : t >= m.tVisible ? 1 : 0
            if (phase === 2) gsap.set(m.card, { zIndex: 20 })
            else if (phase === 3) gsap.set(m.card, { zIndex: 12 })
            else if (phase === 1) gsap.set(m.card, { zIndex: 15 })
            else gsap.set(m.card, { zIndex: 0 })

            // 第一阶段：无 HoldController，只预留时间点
            // 第二阶段将添加 Hold 控制逻辑
          })
        },

        onKill() {
          // 第一阶段：无 HoldController
          // 第二阶段将添加 holdCtl.releaseReverse()
        },
      })
    }

    const measureExtra = (
      card: HTMLElement,
      contentWrap: HTMLElement,
      contentInner: HTMLElement,
      vw: number,
      vh: number,
      restore: { width: number; height: number }
    ): number => {
      gsap.set(card, { left: 0, top: 0, width: vw, height: vh })
      void card.getBoundingClientRect()

      const wrapH = contentWrap.getBoundingClientRect().height || vh
      const innerH = contentInner.getBoundingClientRect().height
      const dpr = window.devicePixelRatio || 1
      const FUDGE = 2
      const extraPx = Math.max(0, Math.ceil((innerH - wrapH + FUDGE) * dpr) / dpr)

      gsap.set(card, restore)
      return extraPx
    }

    buildTimeline()

    let rafId = 0
    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        ScrollTrigger.killAll()
        buildTimeline()
      })
    }

    window.addEventListener('resize', onResize)
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onLoad)
      ScrollTrigger.killAll()
    }
  }, [vw, vh, cards])

  // 第二阶段：添加 HoldController
  // 将在后续版本中实现

  return (
    <section className="relative min-h-screen">
      {/* 头部引入 */}
      <header className="h-[80vh] grid place-items-center">
        <div className="text-center">
          <h1 className="font-anton text-6xl mb-4">Scroll to Explore</h1>
          <p className="text-lg text-grey">Start scrolling to begin</p>
        </div>
      </header>

      {/* 主舞台 */}
      <div
        className="relative h-[100vh] overflow-hidden"
        ref={stageRef}
      >
        {/* 标题 - 绝对定位 */}
        <aside className="absolute top-12 right-12 z-10 max-w-xs text-right">
          <h3 className="font-panchang text-2xl uppercase">
            Lenis brings<br />
            <span className="text-grey">the heat</span>
          </h3>
        </aside>

        {/* 卡片 */}
        {cards.map((card, i) => (
          <article
            key={card.id}
            ref={el => cardRefs.current[i] = el!}
            className="absolute invisible"
            data-card-id={card.id}
            style={{ width: 340, height: 340 }}
          >
            {/* 封面/内容包装 */}
            <div data-card-wrapper>
              <CardContent
                number={card.number}
                text={card.text}
                body={card.body}
              />
            </div>
          </article>
        ))}
      </div>

      {/* 结束区域 */}
      <footer className="h-[120vh] grid place-items-center text-grey">
        <p>End of section</p>
      </footer>
    </section>
  )
}

---

## 五、使用示例

```typescript
// src/pages/index.tsx
import { FeatureCardsGsap } from '@/components/FeatureCardsGsap'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="h-[80vh] grid place-items-center">
        <div className="text-center">
          <h1 className="font-anton text-6xl mb-4">Scroll to Explore</h1>
          <p className="text-grey">Start scrolling to begin</p>
        </div>
      </header>

      {/* Feature Cards with GSAP */}
      <FeatureCardsGsap />

      {/* Footer */}
      <footer className="h-[120vh] grid place-items-center text-grey">
        <p>End of section</p>
      </footer>
    </div>
  )
}
```

---

## 六、后续阶段（可选）

### 阶段 2：添加假内滚

```typescript
// 需要添加 content/data 字段
type FeatureCard = {
  id: string
  number: number
  text: string
  content: string[]  // 正文
}

// 修改 measureExtra 逻辑
type Meta = {
  card: HTMLElement
  contentInner: HTMLElement  // 新增
  // ...
}
```

## 七、阶段 2：添加 HoldController（高级功能）

### 1. HoldController 集成

```typescript
// src/components/FeatureCardsGsap.tsx
import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HoldController } from '@/utils/HoldController'  // ✅ 现在启用
import { useLenisGsap } from '@/hooks/useLenisGsap'
import { CardContent } from './CardContent'
import { useWindowSize } from 'react-use'
import { LoremIpsum } from 'lorem-ipsum'

gsap.registerPlugin(ScrollTrigger)

export const FeatureCardsGsap = () => {
  useLenisGsap()

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const reverseGuardRef = useRef<Record<number, boolean>>({})
  const { width: vw, height: vh } = useWindowSize()

  // ... 卡片数据生成代码 ...

  useLayoutEffect(() => {
    if (!stageRef.current) return

    // ✅ 第二阶段：启用 HoldController
    const holdCtl = new HoldController()

    const buildTimeline = () => {
      const stage = stageRef.current!
      const tl = gsap.timeline({ defaults: { ease: 'none' } })

      let total = 0
      const metas: Meta[] = []

      // 初始占位符
      tl.to({}, {}, total)
      total += 300 // INTRO_GAP

      const cardElements = cardRefs.current.filter(Boolean)

      cardElements.forEach((card, i) => {
        const data = cards[i]
        const wrapper = card.querySelector<HTMLElement>('[data-card-wrapper]')!
        const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!
        const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!

        // ... 清理和初始化代码 ...

        const tVisible = total
        const tFullIn = total + 1200 + 700
        const tReadEnd = tFullIn + 140 + extraUnits
        const tHoldEnd = tReadEnd + 500

        // 1. APPEAR
        tl.to(card, { left: centerLeft, top: centerTop, duration: 1200, ease: 'power4.out' }, total)
        total += 1200

        // 2. ZOOM
        tl.to(card, { left: 0, top: 0, width: vw, height: vh, duration: 700, ease: 'power1.inOut' }, total)
        total += 700

        // 3. TEXT_FADE in
        tl.to(contentWrap, { opacity: 1, duration: 140, ease: 'none' }, total)
        total += 140

        // 4. READ (fake inner scroll)
        tl.to(contentInner, { y: -extraPx, duration: extraUnits, ease: 'none' }, total)
        total += extraUnits

        // 5. FULL_HOLD（✅ 第二阶段：添加 HoldController 控制）
        tl.to({}, { duration: 500 }, total)
        total += 500

        // ... 剩余动画阶段 ...

        metas.push({
          card,
          wrapper,
          contentWrap,
          contentInner,
          tVisible,
          tFullIn,
          tReadEnd,
          tHoldEnd,
          // ... 其他时间点 ...
        })
      })

      // ✅ 第二阶段：增强的 ScrollTrigger 配置
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
            // 可见性控制
            if (t >= m.tVisible - 140) {
              gsap.set(m.card, { className: 'card fixed is-visible' })
            }

            // ZIndex 管理
            const phase = t >= m.tDockEnd ? 3 : t >= m.tFullIn && t < m.tFullOut ? 2 : t >= m.tVisible ? 1 : 0
            if (phase === 2) gsap.set(m.card, { zIndex: 20 })
            else if (phase === 3) gsap.set(m.card, { zIndex: 12 })
            else if (phase === 1) gsap.set(m.card, { zIndex: 15 })
            else gsap.set(m.card, { zIndex: 0 })

            // ✅ 第二阶段：HoldController 控制逻辑
            if (t >= m.tReadEnd && t < m.tHoldEnd) {
              // 进入 Hold 区域
              if (!reverseGuardRef.current[idx]) {
                holdCtl.begin({ cardIndex: idx })
                reverseGuardRef.current[idx] = true
              }
            } else {
              // 离开 Hold 区域
              if (reverseGuardRef.current[idx]) {
                holdCtl.releaseReverse({ cardIndex: idx })
                reverseGuardRef.current[idx] = false
              }
            }
          })
        },

        onKill() {
          // ✅ 第二阶段：清理 HoldController
          holdCtl.releaseReverse()
          Object.keys(reverseGuardRef.current).forEach(key => {
            reverseGuardRef.current[parseInt(key)] = false
          })
        },
      })
    }

    // ... 其余代码 ...

    return () => {
      // ✅ 第二阶段：完整清理
      holdCtl.releaseReverse()
      ScrollTrigger.killAll()
    }
  }, [vw, vh, cards])

  return (
    // ... JSX 保持不变 ...
  )
}
```

### 2. HoldController 配置详解

```typescript
// src/utils/HoldController.ts
export class HoldController {
  private isActive = false
  private cardIndex = -1
  private originalScrollVelocity = 0
  private lenis: Lenis | null = null

  constructor() {
    // 获取全局 Lenis 实例
    this.lenis = (window as any).lenis
  }

  begin({ cardIndex }: { cardIndex: number }) {
    if (this.isActive) return

    this.isActive = true
    this.cardIndex = cardIndex

    if (this.lenis) {
      // 保存原始滚动速度
      this.originalScrollVelocity = this.lenis.velocity
      // 冻结滚动
      this.lenis.stop()
    }

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('holdBegin', {
      detail: { cardIndex }
    }))
  }

  releaseReverse({ cardIndex }: { cardIndex?: number } = {}) {
    if (!this.isActive) return
    if (cardIndex !== undefined && cardIndex !== this.cardIndex) return

    this.isActive = false

    if (this.lenis) {
      // 恢复滚动
      this.lenis.start()
      // 可选：恢复原始速度
      // this.lenis.velocity = this.originalScrollVelocity
    }

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('holdRelease', {
      detail: { cardIndex: this.cardIndex }
    }))

    this.cardIndex = -1
  }
}
```

### 3. 反向保护机制

```typescript
// 在组件中添加反向保护
const reverseGuardRef = useRef<Record<number, boolean>>({})

// 在 onUpdate 中使用
metas.forEach((m, idx) => {
  // ... 其他逻辑 ...

  // HoldController 控制逻辑
  if (t >= m.tReadEnd && t < m.tHoldEnd) {
    // 进入 Hold 区域
    if (!reverseGuardRef.current[idx]) {
      holdCtl.begin({ cardIndex: idx })
      reverseGuardRef.current[idx] = true
    }
  } else {
    // 离开 Hold 区域
    if (reverseGuardRef.current[idx]) {
      holdCtl.releaseReverse({ cardIndex: idx })
      reverseGuardRef.current[idx] = false
    }
  }
})
```

### 4. 事件监听（可选）

```typescript
// 在组件中添加事件监听
useEffect(() => {
  const handleHoldBegin = (e: CustomEvent) => {
    console.log('Hold begin:', e.detail.cardIndex)
    // 可以添加视觉效果、状态更新等
  }

  const handleHoldRelease = (e: CustomEvent) => {
    console.log('Hold release:', e.detail.cardIndex)
    // 可以添加恢复效果、状态更新等
  }

  window.addEventListener('holdBegin', handleHoldBegin as EventListener)
  window.addEventListener('holdRelease', handleHoldRelease as EventListener)

  return () => {
    window.removeEventListener('holdBegin', handleHoldBegin as EventListener)
    window.removeEventListener('holdRelease', handleHoldRelease as EventListener)
  }
}, [])
```

### 阶段 4：性能优化

```typescript
// RAF 防抖
// will-change
// 图片懒加载
```

### 阶段 5：错误边界

```typescript
// <ErrorBoundary fallback={...}>
//   <FeatureCardsGsap />
// </ErrorBoundary>
```

---

## 总结

### 两阶段迁移策略

**阶段 1：基础动画（已完成）**
- ✅ Tailwind 布局系统
- ✅ GSAP + ScrollTrigger 核心动画
- ✅ 假内滚机制
- ✅ 完整的 10 阶段动画时间线
- ✅ 响应式处理（resize）

**阶段 2：高级功能（可选）**
- ✅ HoldController 滚动冻结
- ✅ 反向保护机制
- ✅ 自定义事件系统
- ✅ 完整的清理逻辑

**关键变化：**
1. ❌ CSS Modules → ✅ Tailwind CSS v4 (CSS-first 配置)
2. ❌ Responsive calc() → ✅ Fixed desktop layout
3. ❌ useRect measurement → ✅ Direct window.innerWidth/Height
4. ❌ 复杂状态管理 → ✅ 简化状态跟踪
5. ❌ 立即集成所有功能 → ✅ 分阶段实现

**保留：**
- ✅ GSAP + ScrollTrigger 核心动画
- ✅ Anton/Panchang 字体系统
- ✅ 主题色、玻璃态、模糊效果
- ✅ 完整的动画时间线逻辑
- ✅ HoldController 机制（阶段 2）

**架构优势：**
- **渐进式**：先实现基础动画，再添加高级功能
- **可维护**：清晰的阶段划分，便于调试和扩展
- **性能**：按需加载高级功能，减少初始复杂度
- **兼容**：Grid + Absolute 架构确保 GSAP 完全控制

**复杂度演进：**
- 阶段 1：🟢 简单（核心动画）
- 阶段 2：🟡 中等（添加 HoldController）
- 对比原版：🔴 非常高 → 🟡 中等

**代码组织：**
- 约 40% 减少（移除 CSS Modules、复杂响应式逻辑）
- 更清晰的组件结构（CardContent 分离）
- 更易于测试和维护的分阶段实现
