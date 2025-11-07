import { gsap } from 'gsap'
import { mapRange } from '@/utils/math'
import { useEffect, useRef, ReactNode } from 'react'
import { useWindowSize } from 'react-use'

interface ParallaxProps {
  className?: string
  children: ReactNode
  speed?: number
  id?: string
  position?: 'top' | 'bottom'
}

export function Parallax({
  className,
  children,
  speed = 1,
  id = 'parallax',
  position,
}: ParallaxProps) {
  const trigger = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)

  const { width: windowWidth } = useWindowSize()

  useEffect(() => {
    if (!trigger.current || !target.current) return

    const y = windowWidth * speed * 0.1

    const setY = gsap.quickSetter(target.current, 'y', 'px')
    const set3D = gsap.quickSetter(target.current, 'force3D')

    const timeline = gsap.timeline({
      scrollTrigger: {
        id: id,
        trigger: trigger.current,
        scrub: true,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (e) => {
          if (position === 'top') {
            setY(e.progress * y)
          } else {
            setY(-mapRange(0, 1, e.progress, -y, y))
          }

          set3D(e.progress > 0 && e.progress < 1)
        },
      },
    })

    return () => {
      timeline.kill()
    }
  }, [id, speed, position, windowWidth])

  return (
    <div ref={trigger}>
      <div ref={target} className={className}>
        {children}
      </div>
    </div>
  )
}

