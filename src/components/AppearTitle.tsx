import { useMediaQuery, useRect } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/dist/SplitText'
import { useEffect, useRef, useState, ReactNode } from 'react'
import { useIntersection, useWindowSize } from 'react-use'
import s from './appear-title.module.css'

gsap.registerPlugin(SplitText)

interface AppearTitleProps {
  children: ReactNode
  visible?: boolean
}

export function AppearTitle({ children, visible = true }: AppearTitleProps) {
  const el = useRef<HTMLSpanElement>(null)

  const [intersected, setIntersected] = useState(false)
  const intersection = useIntersection(el as any, {
    threshold: 1,
  })

  useEffect(() => {
    if (intersection?.isIntersecting) {
      setIntersected(true)
    }
  }, [intersection])

  const { width } = useWindowSize()
  const isMobile = useMediaQuery('(max-width: 800px)')

  const [rectRef, rect] = useRect()

  useEffect(() => {
    if (isMobile === false && el.current) {
      const splitted = new SplitText(el.current, {
        type: 'lines',
        lineThreshold: 0.3,
        tag: 'span',
        linesClass: s.line,
      })

      splitted.lines.forEach((line, i) => {
        const htmlLine = line as HTMLElement
        htmlLine.style.setProperty('--i', i.toString())
        const html = htmlLine.innerHTML
        htmlLine.innerHTML = ''
        const content = document.createElement('span')
        content.innerHTML = html
        htmlLine.appendChild(content)
      })

      return () => {
        splitted.revert()
      }
    }
  }, [width, rect, isMobile])

  return (
    <span
      ref={(node) => {
        if (node) {
          el.current = node
          rectRef(node)
        }
      }}
      className={cn(s.title, intersected && visible && s.visible)}
    >
      {children}
    </span>
  )
}

