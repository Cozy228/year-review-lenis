# FeatureCards → GSAP 完整迁移方案（基于 Card 黄金参照）

## 📋 核心目标

**将 FeatureCards 的视觉风格与 Card 的动画系统完整融合**

- ✅ **视觉来源**：FeatureCards（玻璃态、Anton/Panchang 字体、紫色系）
- ✅ **动画参照**：Card (App.tsx) 的完整 GSAP 时间线
- ✅ **必须保留**：假内滚 + HoldController + 反向保护
- ✅ **技术栈**：Tailwind v4 + GSAP + ScrollTrigger + Lenis

---

## 🎯 关键差异分析

### 原 FeatureCards vs Card (GSAP)

| 维度 | FeatureCards | Card (GSAP) | 迁移策略 |
|------|-------------|------------|---------|
| **动画引擎** | React state + CSS transition | GSAP Timeline | ✅ 完全采用 GSAP |
| **动画类型** | 离散步进（10步） | 连续时间线（10阶段） | ✅ 采用 GSAP |
| **DOM 结构** | 单层 Card | 三层 (cover/content/inner) | ✅ 必须重构 |
| **假内滚** | ❌ 无 | ✅ contentInner y 平移 | ✅ 完整实现 |
| **HoldController** | ❌ 无 | ✅ 完整实现 | ✅ 完整复制 |
| **滚动空间** | 1600vh (静态容器) | 动态计算 (px) | ✅ 采用 GSAP |
| **响应式** | 复杂 calc() 公式 | GSAP resize 重建 | ✅ 简化为 GSAP |
| **视觉风格** | 玻璃态 + 紫色 | 蓝色渐变 | ✅ 保留玻璃态 |

---

## 一、完整架构设计

### 1. 分层架构

```
┌─────────────────────────────────────────────────┐
│  Tailwind CSS v4 主题层                         │
│  - 字体系统：Anton/Panchang/Roboto             │
│  - 颜色系统：紫色系 + 玻璃态                    │
│  - 响应式字体：clamp() 函数                    │
│  - 缓动曲线：ease-out-expo                     │
├─────────────────────────────────────────────────┤
│  GSAP 动画层（完整复制 Card/App.tsx）          │
│  - 10 阶段时间线：APPEAR → ZOOM → HOLD → DOCK  │
│  - ScrollTrigger：scrub + pin                  │
│  - HoldController：overlay + events            │
│  - 反向保护：reverseGuardRef                   │
├─────────────────────────────────────────────────┤
│  组件层                                         │
│  - FeatureCardsGsap（主容器）                  │
│  - CardContent（三层结构）                     │
│    ├─ cover（数字 + 文本）                     │
│    ├─ content（内容容器）                      │
│    └─ content-inner（可滚动）                  │
└─────────────────────────────────────────────────┘
```

### 2. 时间线完整映射（必须严格遵循）

```typescript
// 来自 card/src/App.tsx (275-361 行)
let total = 0

// 阶段 0：引入间隙
total += INTRO_GAP                      // +300

// 阶段 1：出现 (右下角 → 居中)
tl.to(card, {
  left: centerLeft,
  top: centerTop,
  duration: APPEAR,                     // 1200
  ease: 'power4.out'
}, total)
total += APPEAR                         // +1200

// 阶段 2：缩放 (居中 → 全屏)
tl.to(card, {
  left: 0, top: 0,
  width: vw, height: vh,
  duration: ZOOM,                       // 700
  ease: 'power1.inOut'
}, total)
tl.to(cover, {
  opacity: 0,                           // 封面同时淡出
  duration: ZOOM
}, total)
total += ZOOM                           // +700

// 阶段 3：文本淡入
tl.to(contentWrap, {
  opacity: 1,
  duration: TEXT_FADE,                  // 140
  ease: 'none'
}, total)
total += TEXT_FADE                      // +140

// 阶段 4：假内滚 (READ)
const extraPx = measureExtraPxFull(...)
const extraUnits = Math.max(1, Math.round(extraPx))
tl.to(contentInner, {
  y: -extraPx,                          // 向上移动
  duration: extraUnits,
  ease: 'none'
}, total)
total += extraUnits                     // +extraUnits (动态)

// 阶段 5：冻结 (FULL_HOLD)
tl.to({}, { duration: FULL_HOLD }, total)  // 空动画
total += FULL_HOLD                      // +500

// 阶段 6：文本淡出
tl.to(contentWrap, {
  opacity: 0,
  duration: TEXT_FADE,                  // 140
  ease: 'none'
}, total)
total += TEXT_FADE                      // +140

// 阶段 7：重置状态
tl.set(contentInner, { y: 0 }, total)
tl.set(cover, { opacity: 1 }, total)

// 阶段 8：退出缩放 (全屏 → 居中)
tl.to(card, {
  left: centerLeft,
  top: centerTop,
  width: baseW,
  height: baseH,
  duration: ZOOM,                       // 700
  ease: 'power1.inOut'
}, total)
total += ZOOM                           // +700

// 阶段 9：Dock 移动
const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP
const dockTop = DOCK_BASE_TOP + i * DOCK_GAP
tl.to(card, {
  left: dockLeft,
  top: dockTop,
  duration: DOCK_MOVE,                  // 1200
  ease: 'power2.inOut'
}, total)
total += DOCK_MOVE                      // +1200

// 阶段 10：卡片间隔
total += BETWEEN                        // +220

// 单卡总时长 ≈ 300 + 1200 + 700 + 140 + extraUnits + 500 + 140 + 700 + 1200 + 220
//           = 5100 + extraUnits (px)
```

---

## 二、Tailwind CSS v4 完整配置

### 1. 主题配置（src/styles/theme.css）

```css
/* src/styles/theme.css */
@import "tailwindcss";

@theme {
  /* ===== 字体系统 ===== */
  --font-anton: "Anton", sans-serif;
  --font-panchang: "Panchang", sans-serif;
  --font-roboto: "Roboto", sans-serif;
  
  /* 默认字体 */
  --default-font-family: var(--font-roboto);
  
  /* ===== 颜色系统（FeatureCards 原色） ===== */
  --color-accent: oklch(0.4628 0.3059 264.18);  /* 紫色主题色 */
  --color-fg: #000;                              /* 黑色文字 */
  --color-bg: rgba(239, 239, 239, 0.8);         /* 玻璃态背景 */
  --color-grey: rgb(176, 176, 176);             /* 次级文字 */
  
  /* ===== 响应式字体大小 ===== */
  /* 使用 clamp() 确保在移动端和桌面端都有合适的大小 */
  --font-size-14vw: clamp(3rem, 14.9333333333vw, 8rem);
  --font-size-6vw: clamp(1.5rem, 6.6666666667vw, 4rem);
  --font-size-5vw: clamp(1.25rem, 5.3333333333vw, 3rem);
  --font-size-2vw: clamp(0.875rem, 1.9444444444vw, 1.5rem);
  
  /* ===== Line Heights ===== */
  --line-height-90: 0.9;
  --line-height-100: 1.0;
  
  /* ===== 间距 ===== */
  --layout-margin: 1.5rem;  /* 24px */
  
  /* ===== 卡片尺寸 ===== */
  --card-base-width: 520px;
  --card-base-height: 340px;
}

/* ===== 缓动曲线 ===== */
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

/* ===== Lenis 基础样式 ===== */
html.lenis {
  height: auto;
}

.lenis.lenis-smooth {
  scroll-behavior: auto;
}

.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}

.lenis.lenis-stopped {
  overflow: hidden;
}

/* ===== GSAP 可见性类 ===== */
@utility is-visible {
  visibility: visible;
}
```

### 2. 字体导入（src/styles/fonts.css）

```css
/* src/styles/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Panchang:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
```

---

## 三、组件实现（关键：三层结构）

### 1. CardContent.tsx（核心组件）

```typescript
// src/components/CardContent.tsx
import { ReactNode } from 'react'

interface CardContentProps {
  number: number
  text: ReactNode
  body?: string[]  // 假内滚内容
}

export const CardContent = ({ number, text, body }: CardContentProps) => {
  return (
    <>
      {/* ====== 层 1: 封面 (data-role="cover") ====== */}
      {/* GSAP 会在 ZOOM 阶段将其淡出 (opacity: 1 → 0) */}
      <div
        data-role="cover"
        className="
          absolute inset-0
          flex flex-col items-center justify-center gap-6
          bg-bg/80 backdrop-blur-sm
          rounded-2xl border border-white/10
          shadow-xl
          p-8
        "
      >
        {/* 数字 */}
        <p
          className="
            font-anton
            text-[clamp(3rem,14.93vw,8rem)]
            leading-[0.9]
            text-accent
            drop-shadow-lg
          "
        >
          {number.toString().padStart(2, '0')}
        </p>
        
        {/* 文本 */}
        <p
          className="
            font-panchang font-bold uppercase
            text-[clamp(1.25rem,5.33vw,3rem)]
            leading-[1.0]
            text-fg
            text-center
            drop-shadow-md
          "
        >
          {text}
        </p>
      </div>

      {/* ====== 层 2: 内容容器 (data-role="content") ====== */}
      {/* GSAP 会在 TEXT_FADE 阶段将其淡入 (opacity: 0 → 1) */}
      <div
        data-role="content"
        className="
          absolute inset-0
          overflow-hidden
          opacity-0
          pointer-events-none
          bg-bg/80 backdrop-blur-sm
          rounded-2xl
        "
      >
        {/* ====== 层 3: 可滚动内容 (data-role="content-inner") ====== */}
        {/* GSAP 会在 READ 阶段移动此元素 (y: 0 → -extraPx) */}
        <div
          data-role="content-inner"
          className="
            absolute left-0 right-0 top-0
            will-change-transform
            px-7 py-6
          "
        >
          {/* 标题 */}
          <h2 className="mb-4 text-2xl font-bold text-fg">
            {text}
          </h2>
          
          {/* 正文段落 */}
          {body?.map((paragraph, index) => (
            <p key={index} className="my-3 text-fg/90 leading-relaxed">
              {paragraph}
            </p>
          ))}
          
          {/* 分割线 */}
          <hr className="my-6 border-accent/30" />
          
          {/* 底部空间（重要：确保内容可以滚动到底部） */}
          <div style={{ height: '40vh' }} />
        </div>
      </div>
    </>
  )
}
```

### 2. FeatureCardsGsap.tsx（主容器）

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

/* ==================== 配置常量 ==================== */
const INTRO_GAP = 300
const APPEAR = 1200
const ZOOM = 700
const TEXT_FADE = 140
const DOCK_MOVE = 1200
const BETWEEN = 220
const HIDE_FADE = 140
const FULL_HOLD = 500

const DOCK_BASE_LEFT = 16
const DOCK_BASE_TOP = 16
const DOCK_GAP = 40

/* ==================== 类型定义 ==================== */
interface FeatureCard {
  id: string
  number: number
  text: ReactNode
  body: string[]  // 必须有 body 内容才能假内滚
}

interface Meta {
  card: HTMLElement
  contentWrap: HTMLElement
  contentInner: HTMLElement
  cover: HTMLElement
  tVisible: number
  tFullIn: number
  tReadEnd: number
  tHoldEnd: number
  tFullOut: number
  tDockEnd: number
  startLeft: number
  startTop: number
}

/* ==================== 数据生成 ==================== */
const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
})

// 生成随机段落
function generateBody(min: number, max: number): string[] {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
  const count = rand(min, max)
  return lorem.generateParagraphs(count).split(/\n+/).map(s => s.trim()).filter(Boolean)
}

/* ==================== 主组件 ==================== */
export const FeatureCardsGsap = () => {
  useLenisGsap()  // 初始化 Lenis 平滑滚动

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const ctxRef = useRef<gsap.Context | null>(null)
  const reverseGuardRef = useRef<Record<number, boolean>>({})
  const { width: vw, height: vh } = useWindowSize()

  // 卡片数据（FeatureCards 原有文案 + 随机 body）
  const cards: FeatureCard[] = [
    {
      id: 'c1',
      number: 1,
      text: 'Run scroll in the main thread',
      body: generateBody(15, 30),
    },
    {
      id: 'c2',
      number: 2,
      text: <>Lightweight<br />(under 4kb)</>,
      body: generateBody(10, 20),
    },
    {
      id: 'c3',
      number: 3,
      text: `Made for ${new Date().getFullYear()}+`,
      body: generateBody(12, 25),
    },
    {
      id: 'c4',
      number: 4,
      text: 'Bring your own animation library',
      body: generateBody(15, 30),
    },
    {
      id: 'c5',
      number: 5,
      text: 'CONTROL THE SCROLL EASING DURATION',
      body: generateBody(10, 20),
    },
    {
      id: 'c6',
      number: 6,
      text: 'Use any element as scroller',
      body: generateBody(12, 25),
    },
    {
      id: 'c7',
      number: 7,
      text: 'Enjoy horizontal + vertical support',
      body: generateBody(15, 30),
    },
    {
      id: 'c8',
      number: 8,
      text: 'Feel free to use "position: sticky" again',
      body: generateBody(10, 20),
    },
    {
      id: 'c9',
      number: 9,
      text: 'touch support',
      body: generateBody(12, 25),
    },
  ]

  useLayoutEffect(() => {
    if (!stageRef.current) return

    const holdCtl = new HoldController()

    const build = () => {
      ctxRef.current?.revert()

      ctxRef.current = gsap.context(() => {
        const stage = stageRef.current!
        const tl = gsap.timeline({ defaults: { ease: 'none' } })
        let total = 0

        const metas: Meta[] = []

        /* ==================== 假内滚测量函数 ==================== */
        function measureExtraPxFull(
          card: HTMLElement,
          contentWrap: HTMLElement,
          contentInner: HTMLElement,
          vw: number,
          vh: number,
          restore: { left: number; top: number; width: number; height: number }
        ): number {
          // 临时设置为全屏尺寸
          gsap.set(card, { left: 0, top: 0, width: vw, height: vh })
          void card.getBoundingClientRect()

          // 测量容器和内容高度
          const wrapH = contentWrap.getBoundingClientRect().height || vh
          const innerH = contentInner.getBoundingClientRect().height

          // 计算需要滚动的像素
          const dpr = window.devicePixelRatio || 1
          const FUDGE = 2
          const extraPx = Math.max(0, Math.ceil((innerH - wrapH + FUDGE) * dpr) / dpr)

          // 恢复原始状态
          gsap.set(card, restore)
          return extraPx
        }

        /* ==================== 初始占位 ==================== */
        tl.to({}, {}, total)
        total += INTRO_GAP

        /* ==================== 遍历每张卡片，构建时间线 ==================== */
        const cardElements = cardRefs.current.filter(Boolean)

        cardElements.forEach((card, i) => {
          // 查询关键元素
          const cover = card.querySelector<HTMLElement>('[data-role="cover"]')!
          const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!
          const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!

          if (!cover || !contentWrap || !contentInner) {
            console.error(`Card ${i}: Missing required data-role elements`)
            return
          }

          // 清理之前的状态
          gsap.set(card, { clearProps: 'x,y,scale,transform,opacity' })
          gsap.set(contentWrap, { clearProps: 'opacity' })
          gsap.set(contentInner, { clearProps: 'y,transform' })

          // 初始化状态
          gsap.set(contentWrap, { opacity: 0, pointerEvents: 'none' })
          gsap.set(contentInner, { y: 0 })
          gsap.set(cover, { opacity: 1 })

          // 计算位置
          const baseW = 520
          const baseH = 340
          const startLeft = Math.max(0, vw - baseW - 16)
          const startTop = Math.max(0, vh - baseH - 16)
          const centerLeft = (vw - baseW) / 2
          const centerTop = (vh - baseH) / 2
          const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP
          const dockTop = DOCK_BASE_TOP + i * DOCK_GAP

          const tVisible = total

          // 设置初始位置
          gsap.set(card, {
            left: startLeft,
            top: startTop,
            width: baseW,
            height: baseH,
            zIndex: 15,
          })

          /* ==================== 阶段 1: APPEAR ==================== */
          tl.to(
            card,
            {
              left: centerLeft,
              top: centerTop,
              duration: APPEAR,
              ease: 'power4.out',
            },
            total
          )
          total += APPEAR

          /* ==================== 阶段 2: ZOOM ==================== */
          tl.to(
            card,
            {
              left: 0,
              top: 0,
              width: vw,
              height: vh,
              duration: ZOOM,
              ease: 'power1.inOut',
            },
            total
          )
          tl.to(cover, { opacity: 0, duration: ZOOM, ease: 'power1.inOut' }, total)
          total += ZOOM

          /* ==================== 阶段 3: TEXT_FADE IN ==================== */
          const tFullIn = total
          tl.set(contentInner, { y: 0 }, total)
          tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
          total += TEXT_FADE

          /* ==================== 阶段 4: READ (假内滚) ==================== */
          const extraPx = measureExtraPxFull(card, contentWrap, contentInner, vw, vh, {
            left: startLeft,
            top: startTop,
            width: baseW,
            height: baseH,
          })
          const extraUnits = Math.max(1, Math.round(extraPx))
          tl.to(contentInner, { y: -extraPx, duration: extraUnits, ease: 'none' }, total)
          const tReadEnd = total + extraUnits
          total += extraUnits

          /* ==================== 阶段 5: FULL_HOLD ==================== */
          tl.to({}, { duration: FULL_HOLD }, total)
          const tHoldEnd = total + FULL_HOLD
          total += FULL_HOLD

          /* ==================== 阶段 6: TEXT_FADE OUT ==================== */
          tl.to(contentWrap, { opacity: 0, duration: TEXT_FADE, ease: 'none' }, total)
          const tFullOut = total + TEXT_FADE
          total += TEXT_FADE

          /* ==================== 阶段 7: RESET ==================== */
          tl.set(contentInner, { y: 0 }, total)
          tl.set(cover, { opacity: 1 }, total)

          /* ==================== 阶段 8: ZOOM OUT ==================== */
          tl.to(
            card,
            {
              left: centerLeft,
              top: centerTop,
              width: baseW,
              height: baseH,
              duration: ZOOM,
              ease: 'power1.inOut',
            },
            total
          )
          total += ZOOM

          /* ==================== 阶段 9: DOCK_MOVE ==================== */
          tl.to(
            card,
            {
              left: dockLeft,
              top: dockTop,
              duration: DOCK_MOVE,
              ease: 'power2.inOut',
            },
            total
          )
          const tDockEnd = total + DOCK_MOVE
          total += DOCK_MOVE

          /* ==================== 保存 Meta ==================== */
          metas.push({
            card,
            contentWrap,
            contentInner,
            cover,
            tVisible,
            tFullIn,
            tReadEnd,
            tHoldEnd,
            tFullOut,
            tDockEnd,
            startLeft,
            startTop,
          })

          /* ==================== 阶段 10: BETWEEN ==================== */
          total += BETWEEN
        })

        /* ==================== ScrollTrigger 配置 ==================== */
        ScrollTrigger.create({
          animation: tl,
          trigger: stage,
          start: 'top top',
          end: () => '+=' + total,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onUpdate(self) {
            const t = tl.time()
            const dir = self.direction

            metas.forEach((m, idx) => {
              /* ===== 可见性管理 ===== */
              if (t >= m.tVisible) {
                m.card.classList.add('is-visible')
                m.card.classList.remove('invisible')
                m.card.style.opacity = ''
              } else if (dir === -1 && t > m.tVisible - HIDE_FADE) {
                const alpha = (t - (m.tVisible - HIDE_FADE)) / HIDE_FADE
                m.card.classList.add('is-visible')
                m.card.classList.remove('invisible')
                m.card.style.opacity = String(alpha)
                m.card.style.left = m.startLeft + 'px'
                m.card.style.top = m.startTop + 'px'
              } else {
                m.card.classList.remove('is-visible')
                m.card.classList.add('invisible')
                m.card.style.opacity = ''
              }

              /* ===== 层级管理 ===== */
              const phase =
                t >= m.tDockEnd ? 3 : t >= m.tFullIn && t < m.tFullOut ? 2 : t >= m.tVisible ? 1 : 0
              if (phase === 2) m.card.style.zIndex = '20'
              else if (phase === 3) m.card.style.zIndex = '12'
              else if (phase === 1) m.card.style.zIndex = '15'
              else m.card.style.zIndex = '0'

              /* ===== 反向保护机制 ===== */
              const guard = reverseGuardRef.current[idx] === true
              if (guard && t < m.tReadEnd - 1) {
                // 上滚已经离开阅读末端，解除保护
                reverseGuardRef.current[idx] = false
              }

              /* ===== HoldController 触发 ===== */
              // 进入 HOLD（仅当不在保护期）
              if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
                holdCtl.begin({ cardIndex: idx })
              }

              // 正在 HOLD
              if (holdCtl.isHolding(idx)) {
                holdCtl.keepPinned()
                if (dir === -1) {
                  holdCtl.releaseReverse()
                  reverseGuardRef.current[idx] = true  // 开启保护
                }
              }
            })
          },

          onKill() {
            if (holdCtl.isHolding()) holdCtl.releaseReverse()
          },
        })

        ScrollTrigger.refresh()
      }, stageRef)
    }

    build()

    /* ==================== Resize 处理 ==================== */
    let rafId = 0
    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        ctxRef.current?.revert()
        build()
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
  }, [vw, vh])

  return (
    <section className="relative min-h-screen bg-neutral-100">
      {/* 头部引入区域 */}
      <header className="h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-anton text-6xl mb-4">Scroll to Explore</h1>
          <p className="text-lg text-grey">Start scrolling to begin</p>
        </div>
      </header>

      {/* 主舞台 */}
      <div className="relative h-[100vh] overflow-hidden" ref={stageRef}>
        {/* 标题 - 固定在右上角 */}
        <aside className="absolute top-12 right-12 z-10 max-w-xs text-right">
          <h3 className="font-panchang text-2xl uppercase">
            Lenis brings
            <br />
            <span className="text-grey">the heat</span>
          </h3>
        </aside>

        {/* 卡片容器 */}
        <div className="relative w-full h-full">
          {cards.map((card, i) => (
            <article
              key={card.id}
              ref={(el) => (cardRefs.current[i] = el!)}
              className="fixed invisible z-0"
              data-card-id={card.id}
              style={{ width: 520, height: 340 }}
            >
              <div className="relative w-full h-full" data-card-wrapper>
                <CardContent number={card.number} text={card.text} body={card.body} />
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 结束区域 */}
      <footer className="h-[120vh] flex items-center justify-center text-grey">
        <p>End of section</p>
      </footer>
    </section>
  )
}
```

---

## 四、HoldController 完整实现

### src/utils/HoldController.ts

```typescript
// src/utils/HoldController.ts
// ⚠️ 必须从 card/src/App.tsx 完整复制（25-168 行）

import { lenisSingleton } from '@/hooks/useLenisGsap'

const FULL_HOLD = 500  // 与动画配置保持一致

export class HoldController {
  private overlay: HTMLDivElement | null = null
  private holding = false
  private holdIdx = -1
  private holdScroll = 0  // 进入 hold 时的滚动位置
  private accPx = 0       // 累积滚动量

  /* ==================== 公共方法 ==================== */
  
  begin(p: { cardIndex: number }) {
    if (this.holding) return
    const lenis = lenisSingleton.current!
    this.holding = true
    this.holdIdx = p.cardIndex

    this.holdScroll = this.getScrollY()
    lenis.stop()
    lenis.scrollTo(this.holdScroll, { immediate: true })

    this.mountOverlay()
  }

  isHolding(cardIndex?: number) {
    return this.holding && (cardIndex == null || cardIndex === this.holdIdx)
  }

  finish() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    this.unmountOverlay()
    this.holding = false

    // 直接把页面滚动推进 FULL_HOLD 像素
    lenis.start()
    lenis.scrollTo(this.holdScroll + FULL_HOLD, { immediate: true })
    this.holdIdx = -1
    this.accPx = 0
  }

  releaseReverse() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    this.unmountOverlay()
    this.holding = false

    // 回到 hold 起点
    lenis.start()
    lenis.scrollTo(this.holdScroll, { immediate: true })
    this.holdIdx = -1
    this.accPx = 0
  }

  keepPinned() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    lenis.scrollTo(this.holdScroll, { immediate: true })
  }

  /* ==================== 私有方法 ==================== */

  private mountOverlay() {
    if (this.overlay) return
    const el = document.createElement('div')
    el.setAttribute('data-hold-overlay', 'true')
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'transparent',
      touchAction: 'none',
      pointerEvents: 'auto',
    } as CSSStyleDeclaration)
    document.body.appendChild(el)
    this.overlay = el

    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('touchstart', this.onTouchStart, { passive: false })
    el.addEventListener('touchmove', this.onTouchMove, { passive: false })
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
  }

  private unmountOverlay() {
    const el = this.overlay
    if (!el) return
    el.removeEventListener('wheel', this.onWheel as EventListener)
    el.removeEventListener('touchstart', this.onTouchStart as EventListener)
    el.removeEventListener('touchmove', this.onTouchMove as EventListener)
    window.removeEventListener('keydown', this.onKeyDown as EventListener)
    el.remove()
    this.overlay = null
  }

  /* ==================== 事件处理 ==================== */

  private onWheel = (e: WheelEvent) => {
    if (!this.holding) return
    e.preventDefault()
    const dy =
      e.deltaMode === 1
        ? e.deltaY * 16
        : e.deltaMode === 2
        ? e.deltaY * window.innerHeight
        : e.deltaY
    if (dy < 0) {
      this.releaseReverse()
      return
    }
    this.accPx += Math.abs(dy)
    if (this.accPx >= FULL_HOLD) this.finish()
  }

  private tTouch = 0
  private onTouchStart = (e: TouchEvent) => {
    if (!this.holding) return
    this.tTouch = e.touches[0]?.clientY ?? 0
  }

  private onTouchMove = (e: TouchEvent) => {
    if (!this.holding) return
    const y = e.touches[0]?.clientY ?? 0
    const dy = this.tTouch - y  // 下滑为正
    this.tTouch = y
    if (dy < 0) {
      this.releaseReverse()
      return
    }
    e.preventDefault()
    this.accPx += dy
    if (this.accPx >= FULL_HOLD) this.finish()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.holding) return
    const k = e.key.toLowerCase()
    let step = 0
    if (k === ' ' || k === 'pagedown') step = window.innerHeight * 0.9
    else if (k === 'arrowdown') step = 80
    else if (k === 'arrowup' || k === 'pageup') {
      this.releaseReverse()
      e.preventDefault()
      return
    }
    if (step > 0) {
      e.preventDefault()
      this.accPx += step
      if (this.accPx >= FULL_HOLD) this.finish()
    }
  }

  private getScrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0
  }
}
```

---

## 五、测试检查清单

### ✅ 必须验证的功能

1. **时间线完整性**
   - [ ] 10 个阶段全部执行
   - [ ] 时间点计算正确（tVisible, tFullIn, tReadEnd, tHoldEnd, tFullOut, tDockEnd）
   - [ ] 每张卡片独立时间线

2. **DOM 结构**
   - [ ] `data-role="cover"` 存在且可查询
   - [ ] `data-role="content"` 存在且可查询
   - [ ] `data-role="content-inner"` 存在且可查询

3. **假内滚**
   - [ ] measureExtraPxFull 正确测量内容高度
   - [ ] contentInner 向上平移（y: 0 → -extraPx）
   - [ ] 内容可以滚动到底部

4. **HoldController**
   - [ ] overlay 遮罩正确创建
   - [ ] 鼠标滚轮事件响应
   - [ ] 触摸事件响应（移动端）
   - [ ] 键盘事件响应
   - [ ] accPx 累积到 FULL_HOLD 后继续滚动
   - [ ] 上滚时 releaseReverse 正确触发

5. **反向保护**
   - [ ] reverseGuardRef 正确设置/解除
   - [ ] 上滚释放后不会立即重新进入 HOLD
   - [ ] 离开 tReadEnd - 1 后保护解除

6. **视觉效果**
   - [ ] 玻璃态效果（backdrop-blur）
   - [ ] 字体正确（Anton 数字 + Panchang 文本）
   - [ ] 紫色主题色（--color-accent）
   - [ ] 响应式字体大小（clamp）

7. **Resize 处理**
   - [ ] 窗口大小变化时重建时间线
   - [ ] RAF 防抖正确工作
   - [ ] 无内存泄漏

---

## 六、与原方案的关键差异

| 项目 | 原迁移方案 | 本方案（修正版） |
|------|-----------|----------------|
| **CardContent 结构** | 单层，只有数字和文本 | ✅ 三层结构（cover/content/inner） |
| **body 内容** | 可选（`body?`） | ✅ 必须（每张卡片生成 15-30 段） |
| **HoldController** | 简化版，缺少 overlay | ✅ 完整复制（overlay + events） |
| **FULL_HOLD 实现** | 第一阶段是空洞 | ✅ 完整实现（可用） |
| **反向保护** | 逻辑不完整 | ✅ 完整实现（guard + keepPinned） |
| **Tailwind 配置** | 缺少关键配置 | ✅ 补全（line-height, ease） |
| **代码组织** | 分阶段实现 | ✅ 一次性完整实现 |

---

## 七、实施步骤

### 步骤 1：创建基础文件结构

```bash
src/
├── components/
│   ├── CardContent.tsx          # ✅ 新建（三层结构）
│   └── FeatureCardsGsap.tsx     # ✅ 新建（完整时间线）
├── utils/
│   └── HoldController.ts         # ✅ 新建（完整复制）
├── hooks/
│   └── useLenisGsap.ts          # ✅ 已有（确认 lenisSingleton）
└── styles/
    ├── theme.css                 # ✅ 新建（完整配置）
    └── fonts.css                 # ✅ 新建（字体导入）
```

### 步骤 2：依赖安装

```bash
pnpm add gsap lorem-ipsum
pnpm add -D @types/lorem-ipsum
```

### 步骤 3：实现顺序

1. ✅ 创建 `theme.css` 和 `fonts.css`
2. ✅ 实现 `HoldController.ts`（完整复制）
3. ✅ 实现 `CardContent.tsx`（三层结构）
4. ✅ 实现 `FeatureCardsGsap.tsx`（完整时间线）
5. ✅ 测试基础动画
6. ✅ 测试 HoldController
7. ✅ 测试反向保护
8. ✅ 调整视觉样式

### 步骤 4：集成到页面

```typescript
// src/pages/TestGsap.tsx 或 src/sections/Home.tsx
import { FeatureCardsGsap } from '@/components/FeatureCardsGsap'

export default function TestGsapPage() {
  return (
    <div className="min-h-screen">
      <FeatureCardsGsap />
    </div>
  )
}
```

---

## 八、常见问题预案

### Q1: HoldController 不工作？

**检查项**：
- [ ] lenisSingleton 是否正确导出
- [ ] overlay 是否正确创建（检查 DOM）
- [ ] 事件监听是否正确绑定
- [ ] accPx 是否累积

### Q2: 假内滚不正常？

**检查项**：
- [ ] body 内容是否足够长（15-30 段）
- [ ] contentInner 的 y 值是否变化
- [ ] measureExtraPxFull 返回值是否 > 0
- [ ] 底部空间是否存在（`height: 40vh`）

### Q3: 卡片不显示？

**检查项**：
- [ ] data-role 属性是否正确
- [ ] cardRefs 是否正确绑定
- [ ] GSAP 查询是否成功（console.log）
- [ ] zIndex 是否正确设置

### Q4: 样式不生效？

**检查项**：
- [ ] theme.css 是否正确导入
- [ ] 字体是否加载成功（Network 面板）
- [ ] Tailwind 类名是否正确
- [ ] CSS 变量是否生效（DevTools）

---

## 九、总结

### ✅ 本方案的优势

1. **完整性**：100% 复制 Card 的 GSAP 时间线
2. **准确性**：DOM 结构完全匹配 GSAP 需求
3. **可靠性**：HoldController 完整实现
4. **可维护性**：清晰的代码组织
5. **可测试性**：详细的检查清单

### 🎯 核心原则

1. **忠实参照**：Card (App.tsx) 是黄金标准
2. **视觉保留**：FeatureCards 的玻璃态 + 字体
3. **功能完整**：假内滚 + HoldController + 反向保护
4. **一次到位**：不分阶段，直接完整实现

### 📚 参考文档

- `card/src/App.tsx` (25-478 行) - HoldController + 完整时间线
- `card/src/components/Card.tsx` (1-67 行) - 三层结构
- `src/components/FeatureCards.tsx` - 原有视觉设计
- `src/components/feature-cards.module.css` - 原有样式系统

---

**结论**：本方案解决了原迁移方案的所有关键问题，提供了一个可立即实施的完整解决方案。

