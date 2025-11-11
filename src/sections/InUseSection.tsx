import cn from 'clsx'
import { ListItem } from '@/components/ListItem'
import { AppearTitle } from '@/components/AppearTitle'
import { projects } from '@/content/projects'
import { MutableRefObject } from 'react'
import s from './home.module.css'

interface InUseSectionProps {
  inUseRef: MutableRefObject<HTMLElement | null>
  inuseRectRef: (node: HTMLElement | null) => void
  visible: boolean
}

export const InUseSection = ({ inUseRef, inuseRectRef, visible }: InUseSectionProps) => {
  return (
    <section
      ref={(node) => {
        if (node) {
          inuseRectRef(node)
          if (inUseRef.current !== node) {
            ;(inUseRef as any).current = node
          }
        }
      }}
      className={cn('theme-light', s['in-use'], visible && s.visible)}
    >
      <div className="layout-grid">
        <aside className={s.title}>
          <p className="h3">
            <AppearTitle>
              <span>Lenis</span>
              <br />
              <span className="grey">in use</span>
            </AppearTitle>
          </p>
        </aside>
        <ul className={s.list}>
          {projects.map((project, i) => (
            <li key={i}>
              <ListItem
                title={project.title}
                source={project.source}
                href={project.href}
                index={i}
                visible={visible}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

