import cn from 'clsx'
import { MutableRefObject } from 'react'
import s from './home.module.css'

interface SolutionSectionProps {
  zoomRef: MutableRefObject<HTMLElement | null>
  zoomWrapperRectRef: (node: HTMLElement | null) => void
}

export const SolutionSection = ({ zoomRef, zoomWrapperRectRef }: SolutionSectionProps) => {
  return (
    <section
      ref={(node) => {
        if (node) {
          zoomWrapperRectRef(node)
          if (zoomRef.current !== node) {
            ;(zoomRef as any).current = node
          }
        }
      }}
      className={s.solution}
    >
      <div className={s.inner}>
        <div className={s.zoom}>
          <h2 className={cn(s.first, 'h1 vh')}>
            Every <br />
            <span className="contrast">Commit</span>
          </h2>
          <h2 className={cn(s.enter, 'h3 vh')}>
            Enter <br />Your 2025
          </h2>
          <h2 className={cn(s.second, 'h1 vh')}>Tells Your Story</h2>
        </div>
      </div>
    </section>
  )
}

