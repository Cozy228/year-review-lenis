import cn from 'clsx'
import { Button } from '@/components/Button'
import { Title } from '@/components/Intro'
import { GitHubIcon, SponsorIcon } from '@/components/Icons'
import { useStore } from '@/store'
import { ReactNode } from 'react'
import s from './home.module.css'

interface HeroTextInProps {
  children: ReactNode
  introOut: boolean
}

const HeroTextIn = ({ children, introOut }: HeroTextInProps) => {
  return (
    <div className={cn(s['hide-text'], introOut && s['show-text'])}>
      {children}
    </div>
  )
}

interface HeroSectionProps {
  hasScrolled: boolean
}

export const HeroSection = ({ hasScrolled }: HeroSectionProps) => {
  const introOut = useStore((state) => state.introOut)
  const isAuthorized = useStore((state) => state.isAuthorized)
  const setIsAuthorized = useStore((state) => state.setIsAuthorized)

  const handleAuthorize = () => {
    // TODO: Implement actual authorization logic
    setIsAuthorized(true)
  }

  return (
    <section className={s.hero}>
      <div className="layout-grid-inner">
        <Title className={s.title} />
        <span className={cn(s.sub)}>
          <HeroTextIn introOut={introOut}>
            <h2 className={cn('h3', s.subtitle)}>
              Annual Report
            </h2>
          </HeroTextIn>
          <HeroTextIn introOut={introOut}>
            <h2 className={cn('p-xs', s.tm)}>
              <span>©</span> {new Date().getFullYear()} SSC
            </h2>
          </HeroTextIn>
        </span>
      </div>

      <div className={cn(s.bottom, 'layout-grid')}>
        {isAuthorized ? (
          // After authorization: show "scroll to explore" text
          <div
            className={cn(
              'hide-on-mobile',
              s['scroll-hint'],
              hasScrolled && s.hide,
              introOut && s.show
            )}
          >
            <div className={s.text}>
              <HeroTextIn introOut={introOut}>
                <p>scroll</p>
              </HeroTextIn>
              <HeroTextIn introOut={introOut}>
                <p> to explore</p>
              </HeroTextIn>
            </div>
          </div>
        ) : (
          // Before authorization: show authorize button
          <Button
            className={cn(s.cta, s.sponsor, introOut && s.in)}
            arrow
            icon={<GitHubIcon />}
            onClick={handleAuthorize}
          >
            Connect & Generate {new Date().getFullYear()}
          </Button>
        )}
      </div>
    </section>
  )
}

