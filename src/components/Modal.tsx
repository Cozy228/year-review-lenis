import { Button } from './Button'
import s from './modal.module.scss'
import cn from 'clsx'
import { useEffect, useState, MouseEvent } from 'react'
import { useStore } from '@/store'

// Inline sponsor icon
const SponsorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
  </svg>
)

export function Modal() {
  const [active, setActive] = useState(false)
  const lenis = useStore(({ lenis }) => lenis)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setActive(true)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!lenis) return

    if (active) {
      lenis.stop()
    } else {
      lenis.start()
    }
  }, [active, lenis])

  return (
    <div
      className={cn(
        s.modal,
        'layout-grid-inner theme-light',
        active && s.active
      )}
      onClick={() => setActive(false)}
    >
      <div className={s.content} onClick={(e: MouseEvent) => e.stopPropagation()}>
        <button className={s.close} onClick={() => setActive(false)}></button>
        <div className={cn(s.text, 'p')}>
          <p>
            Lenis is a 100% free and open-source project, built to enhance web
            experiences. 🚀
            <br />
            But maintaining and improving Lenis takes time and resources.
          </p>
          <br />
          <p>
            If you use Lenis and want to support its development, consider
            becoming a sponsor! 💙
            <br />A huge thank you to everyone who helps keep Lenis alive! 🙌
          </p>
        </div>
        <Button
          className={cn(s.cta)}
          arrow
          icon={<SponsorIcon />}
          href="https://github.com/sponsors/darkroomengineering"
        >
          become a sponsor
        </Button>
      </div>
    </div>
  )
}

