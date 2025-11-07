import { useRect } from '@darkroom.engineering/hamo'
import cn from 'clsx'

import { Card } from './Card'
import { AppearTitle } from './AppearTitle'
import { useScroll } from '@/hooks/useScroll'
import { clamp, mapRange } from '@/utils/math'
import { useRef, useState, ReactNode } from 'react'
import { useWindowSize } from 'react-use'

import s from './feature-cards.module.scss'

const cards: { text: ReactNode }[] = [
  { text: 'Run scroll in the main thread' },

  {
    text: (
      <>
        Lightweight <br /> (under 4kb)
      </>
    ),
  },
  { text: `Made for ${new Date().getFullYear()}+` },
  { text: 'Bring your own animation library' },
  {
    text: <>CONTROL THE SCROLL EASING DURATION</>,
  },
  { text: 'Use any element as scroller' },
  { text: 'Enjoy horizontal + vertical support' },
  { text: 'Feel free to use "position: sticky" again' },
  {
    text: 'touch support',
  },
]

export const FeatureCards = () => {
  const element = useRef<HTMLDivElement>(null)
  const [setRef, rect] = useRect()
  const { height: windowHeight } = useWindowSize()

  const [current, setCurrent] = useState<number>()

  useScroll(
    ({ scroll }) => {
      if (!rect) return

      const start = rect.top - windowHeight * 2
      const end = rect.top + rect.height - windowHeight

      const progress = clamp(0, mapRange(start, end, scroll, 0, 1), 1)

      if (element.current) {
        element.current.style.setProperty(
          '--progress',
          clamp(0, mapRange(rect.top, end, scroll, 0, 1), 1).toString()
        )
      }
      const step = Math.floor(progress * 10)
      setCurrent(step)
    },
    [rect, windowHeight]
  )

  return (
    <div
      ref={(node) => {
        if (node) setRef(node)
      }}
      className={s.features}
    >
      <div className={cn('layout-block-inner', s.sticky)}>
        <aside className={s.title}>
          <p className="h3">
            <AppearTitle>
              Lenis brings
              <br />
              <span className="grey">the heat</span>
            </AppearTitle>
          </p>
        </aside>
        <div ref={element}>
          {cards.map((card, index) => (
            <SingleCard
              key={index}
              index={index}
              text={card.text}
              number={index + 1}
              current={current !== undefined && index <= current - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface SingleCardProps {
  text: ReactNode
  number: number
  index: number
  current: boolean
}

const SingleCard = ({ text, number, index, current }: SingleCardProps) => {
  return (
    <div className={cn(s.card, current && s.current)} style={{ '--i': index } as React.CSSProperties}>
      <Card background="rgba(239, 239, 239, 0.8)" number={number} text={text} />
    </div>
  )
}

