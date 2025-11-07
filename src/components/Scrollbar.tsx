import { useScroll } from '@/hooks/useScroll'
import { clamp, mapRange } from '@/utils/math'
import { useStore } from '@/store'
import { useEffect, useRef, useState, MouseEvent } from 'react'
import { useWindowSize } from 'react-use'
import s from './scrollbar.module.css'

export function Scrollbar() {
  const progressBar = useRef<HTMLDivElement>(null)
  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const lenis = useStore(({ lenis }) => lenis)

  useScroll(({ scroll, limit }) => {
    const progress = scroll / limit
    if (progressBar.current) {
      progressBar.current.style.transform = `scaleX(${progress})`
    }
  })

  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    if (!clicked || !lenis) return

    function onPointerMove(e: PointerEvent) {
      if (!lenis) return
      e.preventDefault()

      const offset = (windowHeight - innerHeight) / 2
      const y = mapRange(
        0,
        windowHeight,
        e.clientY,
        -offset,
        innerHeight + offset
      )

      const progress = clamp(0, y / innerHeight, 1)
      const newPos = lenis.limit * progress

      // Scroll to position
      window.scrollTo(0, newPos)
    }

    function onPointerUp() {
      setClicked(false)
    }

    window.addEventListener('pointermove', onPointerMove, false)
    window.addEventListener('pointerup', onPointerUp, false)

    return () => {
      window.removeEventListener('pointermove', onPointerMove, false)
      window.removeEventListener('pointerup', onPointerUp, false)
    }
  }, [clicked, windowHeight, windowWidth, lenis])

  return (
    <div 
      className={s.scrollbar}
      onPointerDown={() => setClicked(true)}
    >
      <div ref={progressBar} className={s.inner} />
    </div>
  )
}

