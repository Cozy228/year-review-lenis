import cn from 'clsx'
import { AppearTitle } from '@/components/AppearTitle'
import s from './home.module.css'

interface WhySectionProps {
  whyRectRef: (node: HTMLElement | null) => void
}

export const WhySection = ({ whyRectRef }: WhySectionProps) => {
  return (
    <section className={s.why}>
      <div className="layout-grid">
        <h2 className={cn(s.sticky, 'h2')}>
          <AppearTitle>Summary</AppearTitle>
        </h2>
        <aside className={s.features} ref={whyRectRef}>
          <div className={s.feature}>
            <p className="p">
              Your 2025 Developer Annual Review distills a year of work into
              actionable insights. From collaboration velocity to code quality,
              from build stability to delivery cadence—every metric tells the
              story of how you shipped, improved, and grew as a developer.
            </p>
          </div>
          <div className={s.feature}>
            <h3 className={cn(s.title, 'h4')}>
              Collaboration & Contribution
            </h3>
            <p className="p">
              Track your pull request lifecycle, review response times, and
              collaboration patterns. See who you build with and how your
              teamwork drives momentum forward.
            </p>
          </div>
          <div className={s.feature}>
            <h3 className={cn(s.title, 'h4')}>
              Delivery & Pipeline Health
            </h3>
            <p className="p">
              Monitor your cycle time, throughput, and build stability.
              From ticket completion to green builds, measure the rhythm
              of your delivery and identify bottlenecks.
            </p>
          </div>
          <div className={s.feature}>
            <h3 className={cn(s.title, 'h4')}>
              Quality & Maintainability
            </h3>
            <p className="p">
              Watch your code coverage rise and technical debt fall.
              Quality isn't just a number—it's the discipline that
              compounds over time.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

