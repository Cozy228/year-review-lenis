import { useRect } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Title } from '@/components/Intro'
import { Link } from '@/components/Link'
import { ListItem } from '@/components/ListItem'
import { AppearTitle } from '@/components/AppearTitle'
import { Parallax } from '@/components/Parallax'
import { HorizontalSlides } from '@/components/HorizontalSlides'
import { FeatureCards } from '@/components/FeatureCards'
import { projects } from '@/content/projects'
import { useScroll } from '@/hooks/useScroll'
import { clamp, mapRange } from '@/utils/math'
import { useStore } from '@/store'
import { useEffect, useRef, useState, ReactNode } from 'react'
import { useIntersection, useWindowSize } from 'react-use'
import { WebGL } from '@/components/WebGL'
import s from './home.module.scss'

// GitHub and Sponsor icons
const GitHubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      fill="currentColor"
    />
  </svg>
)

const SponsorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="currentColor"
    />
  </svg>
)

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

export default function Home() {
  const [hasScrolled, setHasScrolled] = useState(false)
  const zoomRef = useRef<HTMLElement>(null)
  const [zoomWrapperRectRef, zoomWrapperRect] = useRect()
  const { height: windowHeight } = useWindowSize()
  const introOut = useStore((state) => state.introOut)
  const setTheme = useStore((state) => state.setTheme)
  const lenis = useStore((state) => state.lenis)

  useScroll(({ scroll }) => {
    setHasScrolled(scroll > 10)
    if (!zoomWrapperRect.top) return

    const start = zoomWrapperRect.top + windowHeight * 0.5
    const end = zoomWrapperRect.top + zoomWrapperRect.height - windowHeight

    const progress = clamp(0, mapRange(start, end, scroll, 0, 1), 1)
    const center = 0.6
    const progress1 = clamp(0, mapRange(0, center, progress, 0, 1), 1)
    const progress2 = clamp(0, mapRange(center - 0.055, 1, progress, 0, 1), 1)
    setTheme(progress2 === 1 ? 'light' : 'dark')

    if (zoomRef.current) {
      zoomRef.current.style.setProperty('--progress1', progress1.toString())
      zoomRef.current.style.setProperty('--progress2', progress2.toString())

      if (progress === 1) {
        zoomRef.current.style.setProperty('background-color', 'currentColor')
      } else {
        zoomRef.current.style.removeProperty('background-color')
      }
    }
  }, [zoomWrapperRect, windowHeight])

  const [whyRectRef, whyRect] = useRect()
  const [cardsRectRef, cardsRect] = useRect()
  const [whiteRectRef, whiteRect] = useRect()
  const [featuresRectRef, featuresRect] = useRect()
  const [inuseRectRef, inuseRect] = useRect()

  const addThreshold = useStore((state) => state.addThreshold)

  useEffect(() => {
    addThreshold({ id: 'top', value: 0 })
  }, [addThreshold])

  useEffect(() => {
    if (!whyRect) return
    const top = whyRect.top - windowHeight / 2
    addThreshold({ id: 'why-start', value: top })
    addThreshold({
      id: 'why-end',
      value: top + whyRect.height,
    })
  }, [whyRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!cardsRect) return
    const top = cardsRect.top - windowHeight / 2
    addThreshold({ id: 'cards-start', value: top })
    addThreshold({ id: 'cards-end', value: top + cardsRect.height })
    addThreshold({
      id: 'red-end',
      value: top + cardsRect.height + windowHeight,
    })
  }, [cardsRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!whiteRect) return
    const top = whiteRect.top - windowHeight
    addThreshold({ id: 'light-start', value: top })
  }, [whiteRect, windowHeight, addThreshold])

  useEffect(() => {
    if (!featuresRect) return
    const top = featuresRect.top
    addThreshold({ id: 'features', value: top })
  }, [featuresRect, addThreshold])

  useEffect(() => {
    if (!inuseRect) return
    const top = inuseRect.top
    addThreshold({ id: 'in-use', value: top })
  }, [inuseRect, addThreshold])

  useEffect(() => {
    if (!lenis) return
    const top = lenis.limit
    addThreshold({ id: 'end', value: top })
  }, [lenis?.limit, addThreshold])

  const inUseRef = useRef<HTMLElement>(null)

  const [visible, setIsVisible] = useState(false)
  const intersection = useIntersection(inUseRef as any, {
    threshold: 0.2,
  })
  
  useEffect(() => {
    if (intersection?.isIntersecting) {
      setIsVisible(true)
    }
  }, [intersection])

  return (
    <div className={s.home}>
      <div className={s.canvas}>
        <WebGL />
      </div>
      
      <section className={s.hero}>
        <div className="layout-grid-inner">
          <Title className={s.title} />
          <span className={cn(s.sub)}>
            <HeroTextIn introOut={introOut}>
              <h2 className={cn('h3', s.subtitle)}>Smooth Scroll</h2>
            </HeroTextIn>
            <HeroTextIn introOut={introOut}>
              <h2 className={cn('p-xs', s.tm)}>
                <span>©</span> {new Date().getFullYear()} darkroom.engineering
              </h2>
            </HeroTextIn>
          </span>
        </div>

        <div className={cn(s.bottom, 'layout-grid')}>
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
          <h1 className={cn(s.description, 'p-s')}>
            <HeroTextIn introOut={introOut}>
              <p className="p-s">A smooth scroll library</p>
            </HeroTextIn>
            <HeroTextIn introOut={introOut}>
              <p className="p-s">fresh out of darkroom.engineering</p>
            </HeroTextIn>
            <HeroTextIn introOut={introOut}>
              <p className="p-s">website designed by Studio Freight</p>
            </HeroTextIn>
          </h1>
          <Button
            className={cn(s.cta, s.documentation, introOut && s.in)}
            arrow
            icon={<GitHubIcon />}
            href="https://github.com/darkroomengineering/lenis/blob/main/README.md"
          >
            documentation
          </Button>
          <Button
            className={cn(s.cta, s.sponsor, introOut && s.in)}
            arrow
            icon={<SponsorIcon />}
            href="https://github.com/sponsors/darkroomengineering"
          >
            become a sponsor
          </Button>
        </div>
      </section>

      <section className={s.why}>
        <div className="layout-grid">
          <h2 className={cn(s.sticky, 'h2')}>
            <AppearTitle>Why smooth scroll?</AppearTitle>
          </h2>
          <aside className={s.features} ref={whyRectRef}>
            <div className={s.feature}>
              <p className="p">
                We've heard all the reasons to not use smooth scroll. It feels
                hacky. It's inaccessible. It's not performant. It's
                over-engineered. And historically, those were all true. But we
                like to imagine things as they could be, then build them. So,
                why should you use smooth scroll?
              </p>
            </div>
            <div className={s.feature}>
              <h3 className={cn(s.title, 'h4')}>
                Create more immersive interfaces
              </h3>
              <p className="p">
                Unlock the creative potential and impact of your web
                experiences. Smoothing the scroll pulls users into the flow of
                the experience that feels so substantial that they forget
                they're navigating a web page.
              </p>
            </div>
            <div className={s.feature}>
              <h3 className={cn(s.title, 'h4')}>
                Normalize all your user inputs
              </h3>
              <p className="p">
                Give all your users the same (dope) experience whether they're
                using trackpads, mouse wheels, or otherwise. With smooth scroll,
                you control how silky, heavy, or responsive the experience
                should be — no matter the input. Magic!
              </p>
            </div>
            <div className={s.feature}>
              <h3 className={cn(s.title, 'h4')}>
                Make your animations flawless
              </h3>
              <p className="p">
                Synchronization with native scroll is not reliable. Those jumps
                and delays with scroll-linked animations are caused by
                multi-threading, where modern browsers run animations/effects
                asynchronously with the scroll. Smooth scroll fixes this.
              </p>
            </div>
          </aside>
        </div>
      </section>

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

      <section
        ref={(node) => {
          if (node) {
            zoomWrapperRectRef(node)
            zoomRef.current = node
          }
        }}
        className={s.solution}
      >
        <div className={s.inner}>
          <div className={s.zoom}>
            <h2 className={cn(s.first, 'h1 vh')}>
              so we built <br />
              <span className="contrast">web scrolling</span>
            </h2>
            <h2 className={cn(s.enter, 'h3 vh')}>
              Enter <br /> Lenis
            </h2>
            <h2 className={cn(s.second, 'h1 vh')}>As it should be</h2>
          </div>
        </div>
      </section>

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
          <FeatureCards />
        </section>
      </section>

      <section
        ref={(node) => {
          if (node) {
            inuseRectRef(node)
            inUseRef.current = node
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
    </div>
  )
}

