import cn from 'clsx'
import { Card } from '@/components/Card'
import { Link } from '@/components/Link'
import { AppearTitle } from '@/components/AppearTitle'
import { Parallax } from '@/components/Parallax'
import { HorizontalSlides } from '@/components/HorizontalSlides'
import s from './home.module.css'

interface RethinkSectionProps {
  cardsRectRef: (node: HTMLElement | null) => void
}

export const RethinkSection = ({ cardsRectRef }: RethinkSectionProps) => {
  return (
    <section className={s.rethink}>
      <div className={cn('layout-grid', s.pre)}>
        <div className={s.highlight}>
          <Parallax speed={-0.5}>
            <p className="h2">
              <AppearTitle>Rethinking smooth scroll</AppearTitle>
            </p>
          </Parallax>
        </div>
        <div className={s.comparison}>
          <Parallax speed={0.5}>
            <p className="p">
              We have to give props to libraries like{' '}
              <Link
                className="contrast semi-bold"
                href="https://github.com/locomotivemtl/locomotive-scroll"
              >
                Locomotive Scroll
              </Link>{' '}
              and{' '}
              <Link
                className="contrast semi-bold"
                href="https://greensock.com/docs/v3/Plugins/ScrollSmoother"
              >
                GSAP ScrollSmoother
              </Link>
              . They're well built and well documented – and we've used them a
              lot. But they still have issues that keep them from being
              bulletproof.
            </p>
          </Parallax>
        </div>
      </div>
      <div className={s.cards} ref={cardsRectRef}>
        <HorizontalSlides>
          <Card
            className={s.card}
            number={1}
            text="Loss of performance budget due to using CSS transforms"
          />
          <Card
            className={s.card}
            number={2}
            text="Inaccessibility from no page search support and native scrollbar"
          />
          <Card
            className={s.card}
            number={3}
            text="Non-negligible import costs (12.1kb - 24.34kb gzipped)"
          />
          <Card
            className={s.card}
            number={4}
            text="Limited animation systems for complex, scroll-based animations"
          />
          <Card
            className={s.card}
            number={5}
            text="Erasing native APIs like Intersection-Observer, CSS Sticky, etc."
          />
        </HorizontalSlides>
      </div>
    </section>
  )
}

