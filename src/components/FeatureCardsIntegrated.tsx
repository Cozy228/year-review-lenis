// src/components/FeatureCardsIntegrated.tsx
// 精简版 FeatureCardsGsap - 专门用于替换原 FeatureCards
// 移除了 header/footer，保留核心 GSAP 动画逻辑

import { useRef, useLayoutEffect, forwardRef } from 'react'
import cn from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useWindowSize } from 'react-use'
import { LoremIpsum } from 'lorem-ipsum'
import { AppearTitle } from './AppearTitle'
import { useStore } from '@/store'
import type { ReactNode } from 'react'
import {
  INTRO_GAP,
  APPEAR,
  ZOOM,
  ZOOM_BACK,
  TEXT_FADE,
  DOCK_MOVE,
  BETWEEN,
  HIDE_FADE,
  FULL_HOLD,
  DOCK_BASE_LEFT,
  DOCK_BASE_TOP,
  DOCK_GAP,
} from '@/utils/animationConfig'
import { CardContentGsap } from './CardContentGsap'
import s from './feature-cards.module.css'

gsap.registerPlugin(ScrollTrigger)

/* ==================== HoldController (内联版本，使用主应用 Lenis) ==================== */
class HoldControllerInline {
  private overlay: HTMLDivElement | null = null
  private holding = false
  private holdIdx = -1
  private holdScroll = 0
  private accPx = 0
  private lenisInstance: any = null

  setLenis(lenis: any) {
    this.lenisInstance = lenis
  }

  begin(p: { cardIndex: number }) {
    if (this.holding || !this.lenisInstance) return
    this.holding = true
    this.holdIdx = p.cardIndex

    this.holdScroll = this.getScrollY()
    this.lenisInstance.stop()
    this.lenisInstance.scrollTo(this.holdScroll, { immediate: true })

    this.mountOverlay()
  }

  isHolding(cardIndex?: number) {
    return this.holding && (cardIndex == null || cardIndex === this.holdIdx)
  }

  keepPinned() {
    if (!this.holding || !this.lenisInstance) return
    this.lenisInstance.scrollTo(this.holdScroll, { immediate: true })
  }

  finish() {
    if (!this.holding || !this.lenisInstance) return
    this.unmountOverlay()
    this.holding = false
    this.lenisInstance.start()
    this.lenisInstance.scrollTo(this.holdScroll + FULL_HOLD, { immediate: true })
    this.holdIdx = -1
    this.accPx = 0
  }

  releaseReverse() {
    if (!this.holding || !this.lenisInstance) return
    this.unmountOverlay()
    this.holding = false
    this.lenisInstance.start()
    this.lenisInstance.scrollTo(this.holdScroll, { immediate: true })
    this.holdIdx = -1
    this.accPx = 0
  }

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

  private onWheel = (e: WheelEvent) => {
    if (!this.holding) return
    e.preventDefault()
    const dy =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
    if (dy < 0) return this.releaseReverse()
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
    const dy = this.tTouch - y
    this.tTouch = y
    if (dy < 0) return this.releaseReverse()
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
      e.preventDefault()
      return this.releaseReverse()
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

/* ==================== Type Definitions ==================== */
interface FeatureCard {
  id: string
  number: number
  text: ReactNode
  body: string[]
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
  readState: { reachedTarget: boolean; targetY: number; lastProgress: number; maxReachedY: number; reachedScrollProgress: number }  // ✅ READ 阶段状态
}

/* ==================== Data Generation ==================== */
const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
})

function generateBody(min: number, max: number): string[] {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
  const count = rand(min, max)
  return lorem.generateParagraphs(count).split(/\n+/).map(s => s.trim()).filter(Boolean)
}

/* ==================== Main Component ==================== */
export const FeatureCardsIntegrated = forwardRef<HTMLDivElement>((props, ref) => {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const ctxRef = useRef<gsap.Context | null>(null)
  const reverseGuardRef = useRef<Record<number, boolean>>({})
  const holdCorrectedRef = useRef<Record<number, boolean>>({})  // ✅ 记录哪些卡片已经纠正过
  const { width: vw, height: vh } = useWindowSize()

  // Card data - 2025 Developer Annual Review
  const cards: FeatureCard[] = [
    {
      id: 'c1',
      number: 1,
      text: 'Collaboration & Contribution',
      body: generateBody(15, 30),
    },
    {
      id: 'c2',
      number: 2,
      text: <>The Pull Request<br />Ledger</>,
      body: generateBody(10, 20),
    },
    {
      id: 'c3',
      number: 3,
      text: 'Review Gravity',
      body: generateBody(12, 25),
    },
    {
      id: 'c4',
      number: 4,
      text: 'Activity Heat & Rhythm',
      body: generateBody(15, 30),
    },
    {
      id: 'c5',
      number: 5,
      text: 'DELIVERY CADENCE',
      body: generateBody(10, 20),
    },
    {
      id: 'c6',
      number: 6,
      text: 'Pipeline Temperature',
      body: generateBody(12, 25),
    },
    {
      id: 'c7',
      number: 7,
      text: 'From Red to Green',
      body: generateBody(15, 30),
    },
    {
      id: 'c8',
      number: 8,
      text: 'Quality in Motion',
      body: generateBody(10, 20),
    },
    {
      id: 'c9',
      number: 9,
      text: 'Maintainability Rising',
      body: generateBody(12, 25),
    },
  ]

  // 获取主应用的 Lenis 实例
  const lenis = useStore((state) => state.lenis)

  useLayoutEffect(() => {
    if (!stageRef.current || !lenis) return
    let cancelled = false

    const holdCtl = new HoldControllerInline()
    holdCtl.setLenis(lenis)

    const build = () => {
      ctxRef.current?.revert()
      // ✅ 重置纠正标记
      holdCorrectedRef.current = {}

      ctxRef.current = gsap.context(() => {
        const stage = stageRef.current!
        const tl = gsap.timeline({ defaults: { ease: 'none' } })
        let total = 0

        const metas: Meta[] = []

        /* ==================== Initial Placeholder ==================== */
        tl.to({}, {}, total)
        total += INTRO_GAP

        /* ==================== Build Timeline for Each Card ==================== */
        const cardElements = cardRefs.current.filter(Boolean)

        cardElements.forEach((card, i) => {
          const cover = card.querySelector<HTMLElement>('[data-role="cover"]')!
          const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!
          const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!

          if (!cover || !contentWrap || !contentInner) {
            console.error(`Card ${i}: Missing required data-role elements`)
            return
          }

          gsap.set(card, { clearProps: 'x,y,scale,transform,opacity' })
          gsap.set(contentWrap, { clearProps: 'opacity' })
          gsap.set(contentInner, { clearProps: 'y,transform' })

          gsap.set(contentWrap, { opacity: 0, pointerEvents: 'none' })
          gsap.set(contentInner, { y: 0 })
          gsap.set(cover, { opacity: 1 })

          /* ==================== 获取卡片实际尺寸（匹配原实现） ==================== */
          // 使用 getComputedStyle 获取渲染后的实际尺寸，而不是计算值
          const cs = getComputedStyle(card)
          const baseW = parseFloat(cs.width)
          const baseH = parseFloat(cs.height)

          // 使用 window 的实际尺寸（不使用 React Hook 的值）
          const windowVw = window.innerWidth
          const windowVh = window.innerHeight

          /* ==================== 初始位置：右下角（GSAP 动画起点） ==================== */
          const startLeft = Math.max(0, windowVw - baseW - 16)
          const startTop = Math.max(0, windowVh - baseH - 16)
          const centerLeft = (windowVw - baseW) / 2
          const centerTop = (windowVh - baseH) / 2
          
          /* ==================== DOCK 位置：匹配原 nth-child 公式 ==================== */
          let dockLeft: number, dockTop: number
          
          if (windowVw < 800) {
            // 移动端：只有 top，从上到下堆叠
            const layoutMargin = windowVw * 0.042666667  // 4.27vw
            dockLeft = layoutMargin  // 左边距固定
            dockTop = layoutMargin + ((windowVh - windowVw * 1.173333333 - layoutMargin) / 8) * i
          } else {
            // 桌面端：对角线排列（匹配 feature-cards.module.css）
            const layoutMargin = windowVw * 0.027777778  // 2.78vw
            const cardSize = windowVw * 0.305555556  // 30.56vw (近似卡片大小)
            dockTop = layoutMargin + ((windowVh - cardSize - 2 * layoutMargin) / 8) * i
            dockLeft = layoutMargin + ((windowVw - cardSize - 2 * layoutMargin) / 8) * i
          }

          const tVisible = total

          gsap.set(card, {
            left: startLeft,
            top: startTop,
            width: baseW,
            height: baseH,
            zIndex: 15,
          })

          /* ==================== Phase 1: APPEAR ==================== */
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

          /* ==================== Phase 2: ZOOM ==================== */
          tl.to(
            card,
            {
              left: 0,
              top: 0,
              width: windowVw,  // ✅ 使用 window.innerWidth 确保完全覆盖视口
              height: windowVh,  // ✅ 使用 window.innerHeight 确保完全覆盖视口
              duration: ZOOM,
              ease: 'power1.inOut',
            },
            total
          )
          tl.to(cover, { opacity: 0, duration: ZOOM, ease: 'power1.inOut' }, total)
          total += ZOOM

          /* ==================== Phase 3: TEXT_FADE IN ==================== */
          const tFullIn = total
          // ✅ 强制确保卡片完全对齐视口，避免 scrub 过程中保留 startTop 偏移
          tl.set(card, { left: 0, top: 0, width: windowVw, height: windowVh }, total)
          tl.set(contentInner, { y: 0 }, total)
          tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
          total += TEXT_FADE

          /* ==================== Phase 4: READ (Fake Inner Scroll) ==================== */
          // ✅ 方案 3：固定时长占位，真正滚动由 onUpdate 控制
          // 动态计算 maxScroll：确保有足够的滚动距离让 delimiter 到达 50vh
          const paragraphCount = cards[i].body.length
          const estimatedContentHeight = 200 + paragraphCount * 150 + 100
          // 至少 1.5vh，最多 2.5vh，根据内容长度调整
          const maxScroll = Math.max(windowVh * 1.5, Math.min(windowVh * 2.5, estimatedContentHeight))
          
          // ✅ 使用统一配置：READ 阶段固定为 FULL_HOLD 的 2 倍
          // FULL_HOLD = 500，所以 READ = 1000，适中的滚动时长
          const readScrollDuration = FULL_HOLD * 2
          const holdPlaceholder = 10  // HOLD 占位时长
          
          // ✅ READ tween 覆盖 READ+HOLD，让 onUpdate 在整个区域都能响应
          const readTweenDuration = readScrollDuration + holdPlaceholder
          
          // ✅ READ 占位：只推进时间，不直接控制 y
          const readTweenStart = total  // 记录 READ tween 的起始时间
          const readState = { 
            reachedTarget: false, 
            targetY: 0, 
            lastProgress: 0,
            maxReachedY: 0,  // 记录最大滚动距离（负值）
            reachedScrollProgress: 0,  // 记录到达目标时的scrollProgress
          }
          
          tl.to({}, {  // 空对象占位
            duration: readTweenDuration,  // ✅ 覆盖 READ+HOLD
            ease: 'none',
            onUpdate: function () {
              const progress = this.progress()
              const isReversing = progress < readState.lastProgress
              readState.lastProgress = progress
              
              // ✅ 检测进入 READ 区域，重置状态
              const readProgressRatio = readScrollDuration / readTweenDuration
              const isInReadPhase = progress <= readProgressRatio
              
              // 正向进入 READ 区域时，重置状态
              if (!isReversing && isInReadPhase && readState.maxReachedY < 0 && !readState.reachedTarget) {
                console.log(`[Card ${i}] ♻️ Re-entering READ, reset state`)
                readState.maxReachedY = 0
                readState.reachedScrollProgress = 0
              }
              
              // ✅ 反向滚动时，重置状态
              if (isReversing && readState.reachedTarget) {
                console.log(`[Card ${i}] 🔄 Reversing detected, resetting reachedTarget`, {
                  progress: (progress * 100).toFixed(1) + '%',
                  isInReadPhase: isInReadPhase,
                  targetY: readState.targetY.toFixed(1),
                })
                readState.reachedTarget = false
              }
              
              // ✅ 如果已到达目标且正向滚动，保持固定位置
              if (readState.reachedTarget && !isReversing) {
                gsap.set(contentInner, { y: readState.targetY })
                return
              }
              
              // ✅ 计算滚动进度
              let currentY: number
              
              // 如果曾经到达过目标，使用实际到达位置按比例回滚
              if (readState.reachedScrollProgress > 0) {
                let scrollProgress: number
                if (isInReadPhase) {
                  scrollProgress = progress / readProgressRatio
                } else {
                  scrollProgress = 1
                }
                // 限制 scrollProgress 不超过到达时的值
                scrollProgress = Math.min(scrollProgress, readState.reachedScrollProgress)
                // 按比例计算：从 0 到 targetY
                currentY = (readState.targetY / readState.reachedScrollProgress) * scrollProgress
              } else {
                // 正常计算
                let scrollProgress: number
                if (isInReadPhase) {
                  scrollProgress = progress / readProgressRatio
                } else {
                  scrollProgress = 1
                }
                currentY = -maxScroll * scrollProgress
              }
              
              // 更新 contentInner 位置
              gsap.set(contentInner, { y: currentY })
              
              // ✅ 只在正向滚动时检测 delimiter（避免反向时重复触发）
              if (!isReversing) {
                const delimiter = contentInner.querySelector('[data-role="delimiter"]') as HTMLElement
                if (!delimiter) return
                
                const viewportMiddle = windowVh / 2
                const delimiterRect = delimiter.getBoundingClientRect()
                const offsetError = delimiterRect.top - viewportMiddle
                
                // ✅ 硬阈值：到达 50vh 就停止更新
                const TOLERANCE = 5
                if (offsetError <= TOLERANCE) {
                  // 计算当前的 scrollProgress
                  let scrollProgress: number
                  if (isInReadPhase) {
                    scrollProgress = progress / readProgressRatio
                  } else {
                    scrollProgress = 1
                  }
                  
                  readState.reachedTarget = true
                  readState.targetY = currentY - offsetError  // 精确对齐
                  readState.maxReachedY = readState.targetY
                  readState.reachedScrollProgress = scrollProgress  // ✅ 记录到达时的scrollProgress
                  gsap.set(contentInner, { y: readState.targetY })
                  
                  console.log(`[Card ${i}] READ Reached Target:`, {
                    progress: (progress * 100).toFixed(1) + '%',
                    targetY: readState.targetY.toFixed(1),
                    delimiterTop: delimiterRect.top.toFixed(1),
                    offsetError: offsetError.toFixed(1),
                  })
                  
                  holdCorrectedRef.current[i] = true
                }
                // ✅ 短内容检测：如果 delimiter 已在 50vh 上方（offsetError < 0），且进度 > 20%，说明内容很短
                else if (progress > 0.2 && offsetError < -50) {
                  let scrollProgress: number
                  if (isInReadPhase) {
                    scrollProgress = progress / readProgressRatio
                  } else {
                    scrollProgress = 1
                  }
                  
                  readState.reachedTarget = true
                  readState.targetY = currentY  // 保持当前位置
                  readState.maxReachedY = readState.targetY
                  readState.reachedScrollProgress = scrollProgress
                  
                  console.warn(`[Card ${i}] Content very short, stopping early:`, {
                    progress: (progress * 100).toFixed(1) + '%',
                    targetY: readState.targetY.toFixed(1),
                    delimiterTop: delimiterRect.top.toFixed(1),
                    offsetError: offsetError.toFixed(1),
                  })
                  
                  holdCorrectedRef.current[i] = true
                }
                // ✅ 兜底：如果 progress > 90% 且还没到达目标，说明内容较短，直接停止
                else if (progress > 0.9 && offsetError > TOLERANCE) {
                  let scrollProgress: number
                  if (isInReadPhase) {
                    scrollProgress = progress / readProgressRatio
                  } else {
                    scrollProgress = 1
                  }
                  
                  readState.reachedTarget = true
                  readState.targetY = currentY  // 保持当前位置
                  readState.maxReachedY = readState.targetY
                  readState.reachedScrollProgress = scrollProgress
                  
                  console.warn(`[Card ${i}] Content too short, stopping at:`, {
                    progress: (progress * 100).toFixed(1) + '%',
                    targetY: readState.targetY.toFixed(1),
                    delimiterTop: delimiterRect.top.toFixed(1),
                    offsetError: offsetError.toFixed(1),
                  })
                  
                  holdCorrectedRef.current[i] = true
                }
              }
            },
          }, total)
          
          // ✅ tReadEnd 指向实际滚动结束的位置（不包括 HOLD 占位）
          const tReadEnd = total + readScrollDuration
          // ✅ tHoldEnd 是整个 tween 的结束位置（包括 HOLD 占位）
          const tHoldEnd = total + readTweenDuration
          total += readTweenDuration  // timeline 推进整个 tween duration

          /* ==================== Phase 6: TEXT_FADE OUT + COVER FADE IN ==================== */
          tl.to(contentWrap, { opacity: 0, duration: TEXT_FADE, ease: 'none' }, total)
          // ✅ 封面渐变恢复，与内容淡出同步，避免跳动
          tl.to(cover, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
          const tFullOut = total + TEXT_FADE
          total += TEXT_FADE

          /* ==================== Phase 7: RESET ==================== */
          // ✅ 只在内容完全隐藏后重置位置
          tl.set(contentInner, { y: 0 }, total)

          /* ==================== Phase 8: ZOOM OUT ==================== */
          tl.to(
            card,
            {
              left: centerLeft,
              top: centerTop,
              width: baseW,
              height: baseH,
              duration: ZOOM_BACK,
              ease: 'power1.inOut',
            },
            total
          )
          total += ZOOM_BACK

          /* ==================== Phase 9: DOCK_MOVE ==================== */
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

          /* ==================== Save Meta ==================== */
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
            readState,  // ✅ 保存 READ 状态
          })

          /* ==================== Phase 10: BETWEEN ==================== */
          total += BETWEEN
        })

        /* ==================== 动态滚动距离计算 ==================== */
        // 策略：固定每个 tick 对应的像素数，让滚动距离随 timeline 动态增长
        const vh = window.innerHeight
        // ✅ 优化：减少滚动行程，从 vh/600 调整到 vh/800
        // 800 ticks ≈ 1vh，让 timeline 更紧凑地映射到滚动距离
        const pxPerTick = vh / 800  // 可调节：值越大，行程越短
        // ✅ 优化：减少缓冲区从 50vh 到 30vh，进一步缩短总行程
        const postBufferPx = vh * 30  // 30vh 缓冲，确保卡片自然滚出
        const scrollDistance = Math.max(
          total * pxPerTick + postBufferPx,
          vh * 16  // 最小 1600vh，确保不会过短
        )
        const scrollVh = Math.round((scrollDistance / vh) * 100) / 100

        console.log('[FeatureCards] Timeline Analysis:', {
          total: total.toFixed(0),
          pxPerTick: pxPerTick.toFixed(2),
          scrollDistance: scrollDistance.toFixed(0),
          scrollVh: scrollVh.toFixed(1) + 'vh',
          vh: vh,
        })

        // ✅ 关键修复：不再设置 container 高度，让 ScrollTrigger 自己管理
        const container = stage.closest('[data-featurecards-root]') as HTMLElement

        /* ==================== ScrollTrigger Configuration ==================== */
        // ✅ 使用 stage 作为 trigger，pinSpacing 会自动创建 spacer
        // end 使用相对值，确保滚动距离 = scrollDistance
        
        ScrollTrigger.create({
          animation: tl,
          trigger: stage,  // ✅ 使用 stage 作为 trigger
          start: 'top top',
          end: () => `+=${scrollDistance}`,  // ✅ 相对 stage 顶部，滚动 scrollDistance 距离
          scrub: 1,
          pin: true,  // ✅ pin stage 本身
          pinSpacing: true,  // ✅ 创建 spacer，高度 = scrollDistance
          anticipatePin: 1,
          invalidateOnRefresh: true,
          markers: false,

          onUpdate(self) {
            const t = tl.time()
            const dir = self.direction


            metas.forEach((m, idx) => {
              
              /* ===== Visibility Management ===== */
              // ✅ 修复：timeline 结束后，已 dock 的卡片保持可见
              if (t >= m.tDockEnd) {
                // 卡片已完成 dock，保持可见直到自然滚出视口
                m.card.style.visibility = 'visible'
                m.card.style.opacity = '1'
              } else if (t >= m.tVisible) {
                m.card.style.visibility = 'visible'
                m.card.style.opacity = ''
              } else if (dir === -1 && t > m.tVisible - HIDE_FADE) {
                const alpha = (t - (m.tVisible - HIDE_FADE)) / HIDE_FADE
                m.card.style.visibility = 'visible'
                m.card.style.opacity = String(alpha)
                m.card.style.left = m.startLeft + 'px'
                m.card.style.top = m.startTop + 'px'
              } else {
                m.card.style.visibility = 'hidden'
                m.card.style.opacity = ''
              }

              /* ===== Z-Index Management ===== */
              const phase =
                t >= m.tDockEnd ? 3 : t >= m.tFullIn && t < m.tFullOut ? 2 : t >= m.tVisible ? 1 : 0
              if (phase === 2) m.card.style.zIndex = '20'
              else if (phase === 3) m.card.style.zIndex = '12'
              else if (phase === 1) m.card.style.zIndex = '15'
              else m.card.style.zIndex = '0'

              /* ===== Reverse Guard Mechanism ===== */
              const guard = reverseGuardRef.current[idx] === true
              // ✅ 参考原实现：上滚已经离开 READ 末端 1 单位，解除保护
              if (guard && t < m.tReadEnd - 1) {
                console.log(`[Card ${idx}] 🔓 Guard released (t < tReadEnd-1)`, {
                  t: t.toFixed(1),
                  tReadEnd: m.tReadEnd.toFixed(1),
                  readState: {
                    reachedTarget: m.readState.reachedTarget,
                    targetY: m.readState.targetY.toFixed(1),
                  }
                })
                reverseGuardRef.current[idx] = false
                holdCorrectedRef.current[idx] = false
                // ✅ 注意：不要在这里重置 readState，让它自然回滚
                // readState 会在 onUpdate 中根据 progress 自动处理
              }

              /* ===== HoldController Trigger ===== */
              if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
                if (!holdCorrectedRef.current[idx]) {
                  const delimiter = m.contentInner.querySelector('[data-role="delimiter"]') as HTMLElement
                  if (delimiter) {
                    const delimiterRect = delimiter.getBoundingClientRect()
                    const viewportMiddle = window.innerHeight / 2
                    const offsetError = delimiterRect.top - viewportMiddle
                    
                    console.log(`[Card ${idx}] HOLD Begin:`, {
                      delimiterTop: delimiterRect.top.toFixed(1),
                      targetTop: viewportMiddle.toFixed(1),
                      offsetError: offsetError.toFixed(1),
                      status: Math.abs(offsetError) < 10 ? '✅ Aligned' : '⚠️ Offset detected'
                    })
                  }
                  holdCorrectedRef.current[idx] = true
                }
                
                holdCtl.begin({ cardIndex: idx })
              }

              if (holdCtl.isHolding(idx)) {
                holdCtl.keepPinned()
                if (dir === -1) {
                  holdCtl.releaseReverse()
                  reverseGuardRef.current[idx] = true
                  // ✅ 关键：立即重置 reachedTarget，让内容能回滚
                  // lastProgress 会在 onUpdate 中自然更新，不要手动设置
                  console.log(`[Card ${idx}] 🔙 HOLD Release (dir=-1), state before:`, {
                    reachedTarget: m.readState.reachedTarget,
                    targetY: m.readState.targetY.toFixed(1),
                  })
                  m.readState.reachedTarget = false
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

    // ✅ 等待字体加载完成后再 build，确保测量时布局稳定
    const runBuild = () => {
      if (cancelled) return
      build()
    }

    const fontReady = document.fonts?.ready ?? Promise.resolve()
    fontReady.then(runBuild)
    document.fonts?.addEventListener?.('loadingdone', runBuild)

    /* ==================== Resize Handling ==================== */
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
      cancelled = true
      document.fonts?.removeEventListener?.('loadingdone', runBuild)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onLoad)
      ctxRef.current?.revert()
    }
  }, [lenis])

  // 计算初始卡片尺寸（响应式）
  const getInitialCardSize = () => {
    if (vw < 800) {
      // 移动端：91.47vw
      return vw * 0.914666667
    } else {
      // 桌面端：4 列宽度
      const layoutMargin = vw * 0.027777778
      const colCount = 12
      const colGap = vw * 0.016666667
      const layoutWidth = vw - 2 * layoutMargin
      const colWidth = (layoutWidth - (colCount - 1) * colGap) / colCount
      return 4 * colWidth + 3 * colGap
    }
  }
  
  const initialCardSize = getInitialCardSize()

  return (
    <div ref={ref} data-featurecards-root="true" className={s.features}>
      <div className={cn(s.sticky, s.fullBleed)}>
        <div ref={stageRef} className={s.stageWrap}>
          {/* GSAP 动画舞台 */}
          <div className={s.stage}>
            {cards.map((card, i) => (
              <article
                key={card.id}
                ref={(el) => {
                  if (el) cardRefs.current[i] = el
                }}
                data-card-id={card.id}
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  width: initialCardSize,
                  height: initialCardSize,  // 正方形
                  zIndex: 0,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                  data-card-wrapper
                >
                  <CardContentGsap number={card.number} text={card.text} body={card.body} />
                </div>
              </article>
            ))}
          </div>

          {/* 标题覆盖层 */}
          <aside className={cn(s.title, s.titleOverlay)}>
            <p className="h3">
              <AppearTitle>
                Your Year
                <br />
                <span className="grey">in Code</span>
              </AppearTitle>
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
})

FeatureCardsIntegrated.displayName = 'FeatureCardsIntegrated'
