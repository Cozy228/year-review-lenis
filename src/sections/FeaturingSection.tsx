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
            Lenis is an{' '}
            <Link
              className="contrast semi-bold"
              href="https://github.com/darkroomengineering/lenis"
            >
              open-source library
            </Link>{' '}
            built to standardize scroll experiences and sauce up websites with
            butter-smooth navigation, all while using the platform and keeping
            it accessible.
          </p>
        </div>
      </div>
      <section ref={featuresRectRef}>
        <FeatureCardsIntegrated />
      </section>
    </section>
  )
}

