import { useStore } from '@/store'
import { useEffect, DependencyList } from 'react'
import type Lenis from 'lenis'

export interface LenisScrollEvent {
  scroll: number
  limit: number
  velocity: number
  direction: number
  progress: number
}

export type ScrollCallback = (event: LenisScrollEvent) => void

export function useScroll(callback: ScrollCallback, deps: DependencyList = []) {
  const lenis = useStore(({ lenis }) => lenis)

  useEffect(() => {
    if (!lenis) return

    lenis.on('scroll', callback as (e: Lenis) => void)
    // Trigger initial scroll event
    // @ts-ignore - emit is private but needed for initialization
    lenis.emit?.()

    return () => {
      lenis.off('scroll', callback as (e: Lenis) => void)
    }
  }, [lenis, callback, ...deps])
}

