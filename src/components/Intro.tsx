import { useMediaQuery } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useStore } from '@/store'
import { useEffect, useState, TransitionEvent, useId } from 'react'
import s from './intro.module.css'

interface SVGProps {
  isLoaded?: boolean
  className?: string
  fill?: string
}

export const Intro = () => {
  const isMobile = useMediaQuery('(max-width: 800px)')
  const [isLoaded, setIsLoaded] = useState(false)
  const [scroll, setScroll] = useState(false)
  const introOut = useStore(({ introOut }) => introOut)
  const setIntroOut = useStore(({ setIntroOut }) => setIntroOut)
  const lenis = useStore(({ lenis }) => lenis)

  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true)
    }, 1000)
  }, [])

  useEffect(() => {
    if (isMobile || !lenis) {
      lenis?.start()
      document.documentElement.classList.toggle('intro', false)
      return
    }

    if (!scroll) {
      document.documentElement.classList.toggle('intro', true)
    }

    if (scroll) {
      lenis.start()
      document.documentElement.classList.toggle('intro', false)
    } else {
      setTimeout(() => {
        lenis.stop()
      }, 0)
      document.documentElement.classList.toggle('intro', true)
    }
  }, [scroll, lenis, isMobile])

  return (
    <div
      className={cn(s.wrapper, s.leagueFont, isLoaded && s.out)}
      onTransitionEnd={(e: TransitionEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        target.classList.forEach((value) => {
          if (value.includes('out')) {
            setScroll(true)
          }
          if (value.includes('show')) {
            setIntroOut(true)
          }
        })
      }}
    >
      <div className={cn(isLoaded && s.relative)}>
        <DeveloperLogoBase isLoaded={isLoaded} />
        <DeveloperLogoOverlay isLoaded={isLoaded} className={cn(introOut && s.translate)} />
      </div>
    </div>
  )
}

export const Title = ({ className }: { className?: string }) => {
  const introOut = useStore(({ introOut }) => introOut)

  return (
    <div className={cn(className, s.leagueFont)}>
      <DeveloperLogoBase />
      <DeveloperLogoOverlay className={cn(introOut && s.translate, s.mobile)} />
    </div>
  )
}

type LetterPath = {
  d: string
  index: number
}

const LETTER_GROUP_TRANSFORM = 'translate(0 0)'

const renderLetterPaths = (
  paths: LetterPath[],
  isLoaded?: boolean,
) =>
  paths.map(({ d, index }) => (
    <path
      key={`developer-letter-${index}`}
      className={cn(s.start, isLoaded && s.show)}
      style={{ '--index': index } as React.CSSProperties}
      d={d}
      stroke="#2B345E"
      strokeOpacity={0.6}
      strokeWidth={1.4}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  ))

const DeveloperLogoBase = ({ isLoaded, className }: SVGProps) => {
  const gradientId = useId()
  const filterId = useId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="-2 8 154.85000610351562 44"
      className={cn(s.lns, className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="75.425" y1="11.23" x2="75.425" y2="48.77" gradientUnits="userSpaceOnUse">
          <stop offset="0.1" stopColor="#F2F5FF" />
          <stop offset="0.55" stopColor="#DDE3FF" />
          <stop offset="1" stopColor="#C7D0FF" />
        </linearGradient>
      </defs>
      <g data-letter-group="odd" transform={LETTER_GROUP_TRANSFORM} fill={`url(#${gradientId})`}>
        {renderLetterPaths(DEVELOPER_ODD_PATHS, isLoaded)}
      </g>
    </svg>
  )
}

const DeveloperLogoOverlay = ({ isLoaded, className }: SVGProps) => {
  const gradientId = useId()
  const filterId = useId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="-2 8 154.85000610351562 44"
      className={cn(s.ei, className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="75.425" y1="11.23" x2="75.425" y2="48.77" gradientUnits="userSpaceOnUse">
          <stop offset="0.1" stopColor="#F2F5FF" />
          <stop offset="0.55" stopColor="#DDE3FF" />
          <stop offset="1" stopColor="#C7D0FF" />
        </linearGradient>
      </defs>
      <g data-letter-group="even" transform={LETTER_GROUP_TRANSFORM} fill={`url(#${gradientId})`}>
        {renderLetterPaths(DEVELOPER_EVEN_PATHS, isLoaded)}
      </g>
    </svg>
  )
}

const DEVELOPER_LETTER_PATHS: LetterPath[] = [
  {
    d: 'M0 48.38L0 11.63L5.50 11.63Q8.10 11.63 9.90 12.48Q11.70 13.32 12.80 15.38Q13.90 17.42 14.39 21Q14.88 24.57 14.88 30.02Q14.88 35.50 14.39 39.06Q13.90 42.63 12.80 44.66Q11.70 46.70 9.90 47.54Q8.10 48.38 5.50 48.38L0 48.38M5.40 42.98Q7.40 42.98 8.23 41.40Q9.05 39.83 9.23 36.90Q9.40 33.98 9.40 29.95Q9.40 25.88 9.23 22.99Q9.05 20.10 8.21 18.56Q7.38 17.02 5.40 17.02L5.40 42.98Z',
    index: 1,
  },
  {
    d: 'M18.60 48.38L18.60 11.63L30.95 11.63L30.95 17.17L24 17.17L24 27.07L29 27.07L29 32.48L24 32.48L24 42.83L30.95 42.83L30.95 48.38L18.60 48.38Z',
    index: 2,
  },
  {
    d: 'M39.30 48.38L33.70 11.63L38.95 11.63L41.65 33.33L41.85 36.88L42.15 36.88L42.35 33.33L45.05 11.63L50.30 11.63L44.70 48.38L39.30 48.38Z',
    index: 3,
  },
  {
    d: 'M53.05 48.38L53.05 11.63L65.40 11.63L65.40 17.17L58.45 17.17L58.45 27.07L63.45 27.07L63.45 32.48L58.45 32.48L58.45 42.83L65.40 42.83L65.40 48.38L53.05 48.38Z',
    index: 4,
  },
  {
    d: 'M69.40 48.38L69.40 11.63L74.80 11.63L74.80 43.38L81.95 43.38L81.95 48.38L69.40 48.38Z',
    index: 5,
  },
  {
    d: 'M91.10 48.77Q88.85 48.77 87.24 47.73Q85.63 46.67 84.76 44.88Q83.90 43.08 83.90 40.83L83.90 19.17Q83.90 16.90 84.76 15.11Q85.63 13.32 87.24 12.27Q88.85 11.23 91.10 11.23Q93.35 11.23 94.96 12.27Q96.58 13.32 97.44 15.13Q98.30 16.92 98.30 19.17L98.30 40.83Q98.30 43.08 97.44 44.88Q96.58 46.67 94.96 47.73Q93.35 48.77 91.10 48.77M91.10 43.52Q92.10 43.52 92.50 42.69Q92.90 41.85 92.90 40.83L92.90 19.17Q92.90 18.15 92.48 17.31Q92.05 16.47 91.10 16.47Q90.18 16.47 89.74 17.31Q89.30 18.15 89.30 19.17L89.30 40.83Q89.30 41.85 89.73 42.69Q90.15 43.52 91.10 43.52Z',
    index: 6,
  },
  {
    d: 'M102.05 48.38L102.05 11.63L107.45 11.63Q110.53 11.63 112.59 12.98Q114.65 14.32 115.68 16.80Q116.70 19.27 116.70 22.63Q116.70 25.97 115.63 28.40Q114.55 30.82 112.49 32.19Q110.43 33.55 107.45 33.67L107.45 48.38L102.05 48.38M107.45 28.17Q108.88 28.17 109.70 27.61Q110.53 27.05 110.89 25.82Q111.25 24.60 111.25 22.67Q111.25 20.72 110.89 19.50Q110.53 18.27 109.69 17.70Q108.85 17.13 107.45 17.13L107.45 28.17Z',
    index: 7,
  },
  {
    d: 'M119.65 48.38L119.65 11.63L132 11.63L132 17.17L125.05 17.17L125.05 27.07L130.05 27.07L130.05 32.48L125.05 32.48L125.05 42.83L132 42.83L132 48.38L119.65 48.38Z',
    index: 8,
  },
  {
    d: 'M136 48.38L136 11.63L141.40 11.63Q146.25 11.63 148.55 14.31Q150.85 17 150.85 22.22Q150.85 25.32 149.76 27.59Q148.68 29.85 147.13 30.90L150.80 48.38L145.40 48.38L142.35 32.88L141.40 32.88L141.40 48.38L136 48.38M141.40 27.88Q142.90 27.88 143.78 27.21Q144.65 26.55 145.03 25.32Q145.40 24.10 145.40 22.42Q145.40 19.80 144.54 18.39Q143.68 16.97 141.40 16.97L141.40 27.88Z',
    index: 9,
  },
]

const DEVELOPER_ODD_PATHS = DEVELOPER_LETTER_PATHS.filter(({ index }) => index % 2 === 1)
const DEVELOPER_EVEN_PATHS = DEVELOPER_LETTER_PATHS.filter(({ index }) => index % 2 === 0)


