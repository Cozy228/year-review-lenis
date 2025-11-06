import { useEffect, useRef, type DependencyList } from 'react'
import { useLenisStore } from '../store'
import type { LenisScrollEvent } from '../types/lenis'

export function useScroll(
  callback: (event: LenisScrollEvent) => void,
  deps: DependencyList = []
) {
  const lenis = useLenisStore((state) => state.lenis)
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!lenis) {
      return undefined
    }

    const handler = (event: unknown) => {
      savedCallback.current(event as LenisScrollEvent)
    }

    lenis.on('scroll', handler)

    return () => {
      lenis.off('scroll', handler)
    }
    // Spread dependencies to allow granular re-subscription control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenis, ...deps])
}
