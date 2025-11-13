import cn from 'clsx'
import { Link } from '@/components/Link'
import { FeatureCardsIntegrated } from '@/components/FeatureCardsIntegrated'
import s from './home.module.css'

interface FeaturingSectionProps {
  whiteRectRef: (node: HTMLElement | null) => void
  featuresRectRef: (node: HTMLElement | null) => void
}

export const FeaturingSection = ({ whiteRectRef, featuresRectRef }: FeaturingSectionProps) => {
  return (
    <section className={cn('theme-light', s.featuring)} ref={whiteRectRef}>
      <div className={s.inner}>
        <div className={cn('layout-block', s.intro)}>
          <p className="p-l">
            Your Developer Annual Review aggregates data from{' '}
            <Link
              className="contrast semi-bold"
              href="https://github.com"
            >
              GitHub
            </Link>
            , Jira, Jenkins, and Sonar to paint a complete picture of your
            development year—from collaboration patterns to code quality,
            from delivery cadence to build stability.
          </p>
        </div>
      </div>
      <section ref={featuresRectRef}>
        <FeatureCardsIntegrated />
      </section>
    </section>
  )
}

