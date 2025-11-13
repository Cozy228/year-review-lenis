// src/pages/TestGsap.tsx
import { useEffect } from 'react'
import { useFrame } from '@darkroom.engineering/hamo'
import Lenis from 'lenis'
import { useStore } from '@/store'
import { lenisSingleton } from '@/hooks/useLenisGsap'
import { FeatureCardsGsap } from '@/components/FeatureCardsGsap'

/**
 * Test page for the GSAP-based FeatureCards migration
 * Access via: http://localhost:5173?test=gsap
 */
export default function TestGsap() {
  const lenis = useStore((state) => state.lenis)
  const setLenis = useStore((state) => state.setLenis)

  // Initialize Lenis (similar to Layout component)
  useEffect(() => {
    window.scrollTo(0, 0)
    const lenisInstance = new Lenis({
      smoothWheel: true,
      syncTouch: true,
    })
    
    // Store in multiple places for compatibility
    // @ts-ignore - add lenis to window for debugging
    window.lenis = lenisInstance
    setLenis(lenisInstance)           // For main app compatibility
    lenisSingleton.current = lenisInstance  // ✅ For HoldController

    return () => {
      lenisInstance.destroy()
      setLenis(undefined as any)
      lenisSingleton.current = null  // ✅ Clean up singleton
    }
  }, [setLenis])

  // Drive Lenis with useFrame (similar to Layout)
  useFrame((time: number) => {
    lenis?.raf(time)
  }, 0)

  return (
    <div className="min-h-screen">
      <FeatureCardsGsap />
    </div>
  )
}

