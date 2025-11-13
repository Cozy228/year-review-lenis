// src/components/FeatureCardsGsap.tsx
import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HoldController } from '@/utils/HoldController'
import { CardContentGsap } from './CardContentGsap'
import { useWindowSize } from 'react-use'
import { LoremIpsum } from 'lorem-ipsum'
import type { ReactNode } from 'react'
import {
  INTRO_GAP,
  APPEAR,
  ZOOM,
  TEXT_FADE,
  DOCK_MOVE,
  BETWEEN,
  HIDE_FADE,
  FULL_HOLD,
  DOCK_BASE_LEFT,
  DOCK_BASE_TOP,
  DOCK_GAP,
} from '@/utils/animationConfig'

gsap.registerPlugin(ScrollTrigger)

/* ==================== Type Definitions ==================== */
interface FeatureCard {
  id: string
  number: number
  text: ReactNode
  body: string[]  // Must have body content for fake scroll
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

/* ==================== Data Generation ==================== */
const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
})

// Generate random paragraphs
function generateBody(min: number, max: number): string[] {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
  const count = rand(min, max)
  return lorem.generateParagraphs(count).split(/\n+/).map(s => s.trim()).filter(Boolean)
}

/* ==================== Main Component ==================== */
export const FeatureCardsGsap = () => {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<HTMLElement[]>([])
  const ctxRef = useRef<gsap.Context | null>(null)
  const reverseGuardRef = useRef<Record<number, boolean>>({})
  const { width: vw, height: vh } = useWindowSize()

  // Card data (original FeatureCards copy + random body)
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

        /* ==================== Fake Inner Scroll Measurement ==================== */
        function measureExtraPxFull(
          card: HTMLElement,
          contentWrap: HTMLElement,
          contentInner: HTMLElement,
          vw: number,
          vh: number,
          restore: { left: number; top: number; width: number; height: number }
        ) {
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

        /* ==================== Initial Placeholder ==================== */
        tl.to({}, {}, total)
        total += INTRO_GAP

        /* ==================== Build Timeline for Each Card ==================== */
        const cardElements = cardRefs.current.filter(Boolean)

        cardElements.forEach((card, i) => {
          // Query key elements
          const cover = card.querySelector<HTMLElement>('[data-role="cover"]')!
          const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!
          const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!

          if (!cover || !contentWrap || !contentInner) {
            console.error(`Card ${i}: Missing required data-role elements`)
            return
          }

          // Clear previous state
          gsap.set(card, { clearProps: 'x,y,scale,transform,opacity' })
          gsap.set(contentWrap, { clearProps: 'opacity' })
          gsap.set(contentInner, { clearProps: 'y,transform' })

          // Initialize state
          gsap.set(contentWrap, { opacity: 0, pointerEvents: 'none' })
          gsap.set(contentInner, { y: 0 })
          gsap.set(cover, { opacity: 1 })

          // Calculate positions
          const baseW = 520
          const baseH = 340
          const startLeft = Math.max(0, vw - baseW - 16)
          const startTop = Math.max(0, vh - baseH - 16)
          const centerLeft = (vw - baseW) / 2
          const centerTop = (vh - baseH) / 2
          const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP
          const dockTop = DOCK_BASE_TOP + i * DOCK_GAP

          const tVisible = total

          // Set initial position
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
              width: vw,
              height: vh,
              duration: ZOOM,
              ease: 'power1.inOut',
            },
            total
          )
          tl.to(cover, { opacity: 0, duration: ZOOM, ease: 'power1.inOut' }, total)
          total += ZOOM

          /* ==================== Phase 3: TEXT_FADE IN ==================== */
          const tFullIn = total
          tl.set(contentInner, { y: 0 }, total)
          tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: 'none' }, total)
          total += TEXT_FADE

          /* ==================== Phase 4: READ (Fake Inner Scroll) ==================== */
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

          /* ==================== Phase 5: FULL_HOLD ==================== */
          tl.to({}, { duration: FULL_HOLD }, total)
          const tHoldEnd = total + FULL_HOLD
          total += FULL_HOLD

          /* ==================== Phase 6: TEXT_FADE OUT ==================== */
          tl.to(contentWrap, { opacity: 0, duration: TEXT_FADE, ease: 'none' }, total)
          const tFullOut = total + TEXT_FADE
          total += TEXT_FADE

          /* ==================== Phase 7: RESET ==================== */
          tl.set(contentInner, { y: 0 }, total)
          tl.set(cover, { opacity: 1 }, total)

          /* ==================== Phase 8: ZOOM OUT ==================== */
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
          })

          /* ==================== Phase 10: BETWEEN ==================== */
          total += BETWEEN
        })

        /* ==================== ScrollTrigger Configuration ==================== */
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
              /* ===== Visibility Management ===== */
              if (t >= m.tVisible) {
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
              if (guard && t < m.tReadEnd - 1) {
                // Scrolling up has left read end, release guard
                reverseGuardRef.current[idx] = false
              }

              /* ===== HoldController Trigger ===== */
              // Enter HOLD (only when not in guard period)
              if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
                holdCtl.begin({ cardIndex: idx })
              }

              // Currently in HOLD
              if (holdCtl.isHolding(idx)) {
                holdCtl.keepPinned()
                if (dir === -1) {
                  holdCtl.releaseReverse()
                  reverseGuardRef.current[idx] = true  // Enable guard
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
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onLoad)
      ctxRef.current?.revert()
    }
  }, [vw, vh])

  return (
    <section style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'rgb(229, 229, 229)' }}>
      {/* Header intro area */}
      <header style={{ 
        height: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 
            style={{ 
              fontFamily: 'Anton, sans-serif',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              marginBottom: '1rem',
              marginTop: '0',
              color: '#000'
            }}
          >
            Scroll to Explore
          </h1>
          <p style={{ 
            fontFamily: 'Roboto, sans-serif',
            fontSize: '1.125rem',
            color: 'rgb(176, 176, 176)',
            margin: '0'
          }}>
            Start scrolling to begin
          </p>
        </div>
      </header>

      {/* Main stage */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }} ref={stageRef}>
        {/* Title - fixed in top-right corner */}
        <aside style={{ 
          position: 'absolute', 
          top: '3rem', 
          right: '3rem', 
          zIndex: 10, 
          maxWidth: '20rem', 
          textAlign: 'right' 
        }}>
          <h3 
            style={{ 
              fontFamily: 'Panchang, sans-serif',
              fontSize: '1.5rem',
              textTransform: 'uppercase',
              lineHeight: '1.2',
              margin: '0'
            }}
          >
            Lenis brings
            <br />
            <span style={{ color: 'rgb(176, 176, 176)' }}>the heat</span>
          </h3>
        </aside>

        {/* Card container */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {cards.map((card, i) => (
            <article
              key={card.id}
              ref={(el) => (cardRefs.current[i] = el!)}
              data-card-id={card.id}
              style={{ 
                position: 'fixed',
                visibility: 'hidden',
                width: 520, 
                height: 340, 
                zIndex: 0 
              }}
            >
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '100%',
                overflow: 'hidden'
              }} data-card-wrapper>
                <CardContentGsap number={card.number} text={card.text} body={card.body} />
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* End area */}
      <footer 
        style={{ 
          height: '120vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'rgb(176, 176, 176)'
        }}
      >
        <p style={{ fontFamily: 'Roboto, sans-serif', margin: '0' }}>End of section</p>
      </footer>
    </section>
  )
}

