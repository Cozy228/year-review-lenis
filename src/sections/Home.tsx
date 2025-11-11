import { useRect } from '@darkroom.engineering/hamo'
import { useScroll } from '@/hooks/useScroll'
import { clamp, mapRange } from '@/utils/math'
import { useStore } from '@/store'
import { useEffect, useRef, useState } from 'react'
import { useIntersection, useWindowSize } from 'react-use'
import { WebGL } from '@/components/WebGL'
import { HeroSection } from './HeroSection'
import { WhySection } from './WhySection'
import { RethinkSection } from './RethinkSection'
import { SolutionSection } from './SolutionSection'
import { FeaturingSection } from './FeaturingSection'
import { InUseSection } from './InUseSection'
import s from './home.module.css'
import { Footer } from '@/components/Footer'

export default function Home() {
  const [hasScrolled, setHasScrolled] = useState(false)
  const zoomRef = useRef<HTMLElement>(null)
  const [zoomWrapperRectRef, zoomWrapperRect] = useRect()
  const { height: windowHeight } = useWindowSize()
  const introOut = useStore((state) => state.introOut)
  const setTheme = useStore((state) => state.setTheme)
  const lenis = useStore((state) => state.lenis)
  const isAuthorized = useStore((state) => state.isAuthorized)

  useScroll(({ scroll }) => {
    setHasScrolled(scroll > 10)
    if (!zoomWrapperRect.top) return

    const start = zoomWrapperRect.top + windowHeight * 0.5
    const end = zoomWrapperRect.top + zoomWrapperRect.height - windowHeight

    const progress = clamp(0, mapRange(start, end, scroll, 0, 1), 1)
    const center = 0.6
    const progress1 = clamp(0, mapRange(0, center, progress, 0, 1), 1)
    const progress2 = clamp(0, mapRange(center - 0.055, 1, progress, 0, 1), 1)
    setTheme(progress2 === 1 ? 'light' : 'dark')

    if (zoomRef.current) {
      zoomRef.current.style.setProperty('--progress1', progress1.toString())
      zoomRef.current.style.setProperty('--progress2', progress2.toString())

      if (progress === 1) {
        zoomRef.current.style.setProperty('background-color', 'currentColor')
      } else {
        zoomRef.current.style.removeProperty('background-color')
      }
    }
  }, [zoomWrapperRect, windowHeight])

  const [whyRectRef, whyRect] = useRect()
  const [cardsRectRef, cardsRect] = useRect()
  const [whiteRectRef, whiteRect] = useRect()
  const [featuresRectRef, featuresRect] = useRect()
  const [inuseRectRef, inuseRect] = useRect()

  const addThreshold = useStore((state) => state.addThreshold)

  useEffect(() => {
    addThreshold({ id: 'top', value: 0 })
  }, [addThreshold])

  useEffect(() => {
    if (!whyRect) return
    const top = whyRect.top - windowHeight / 2
    addThreshold({ id: 'why-start', value: top })
    addThreshold({
      id: 'why-end',
      value: top + whyRect.height,
    })
  }, [whyRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!cardsRect) return
    const top = cardsRect.top - windowHeight / 2
    addThreshold({ id: 'cards-start', value: top })
    addThreshold({ id: 'cards-end', value: top + cardsRect.height })
    addThreshold({
      id: 'red-end',
      value: top + cardsRect.height + windowHeight,
    })
  }, [cardsRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!whiteRect) return
    const top = whiteRect.top - windowHeight
    addThreshold({ id: 'light-start', value: top })
  }, [whiteRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!featuresRect) return
    const top = featuresRect.top
    addThreshold({ id: 'features', value: top })
  }, [featuresRect, addThreshold])

  useEffect(() => {
    if (!inuseRect) return
    const top = inuseRect.top
    addThreshold({ id: 'in-use', value: top })
  }, [inuseRect, addThreshold])

  useEffect(() => {
    if (!lenis) return
    const top = lenis.limit
    addThreshold({ id: 'end', value: top })
  }, [lenis?.limit, addThreshold])

  const inUseRef = useRef<HTMLElement>(null)

  const [visible, setIsVisible] = useState(false)
  const intersection = useIntersection(inUseRef as any, {
    threshold: 0.2,
  })
  
  useEffect(() => {
    if (intersection?.isIntersecting) {
      setIsVisible(true)
    }
  }, [intersection])

  // Control scroll based on authorization status
  useEffect(() => {
    if (!lenis) return

    if (!isAuthorized) {
      // Disable scroll when not authorized
      lenis.stop()
      document.body.style.overflow = 'hidden'
    } else {
      // Enable scroll when authorized
      lenis.start()
      document.body.style.overflow = ''
    }

    return () => {
      // Cleanup
      document.body.style.overflow = ''
    }
  }, [isAuthorized, lenis])

  return (
    <div className={s.home} style={{ 
      height: !isAuthorized ? '100vh' : 'auto',
      overflow: !isAuthorized ? 'hidden' : 'visible'
    }}>
      <div className={s.canvas}>
        <WebGL />
      </div>
      
      <HeroSection hasScrolled={hasScrolled} />
      
      {isAuthorized && (
        <>
          
          <RethinkSection cardsRectRef={cardsRectRef} />
          
          <SolutionSection 
            zoomRef={zoomRef}
            zoomWrapperRectRef={zoomWrapperRectRef}
          />
          
          <FeaturingSection 
            whiteRectRef={whiteRectRef}
            featuresRectRef={featuresRectRef}
          />
          <WhySection whyRectRef={whyRectRef} />
          
          <InUseSection 
            inUseRef={inUseRef}
            inuseRectRef={inuseRectRef}
            visible={visible}
          />
          <Footer />
        </>
      )}
    </div>
  )
}

