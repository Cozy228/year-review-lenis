import { useEffect, type PropsWithChildren } from 'react'
import Lenis from 'lenis'
import Tempus from '@darkroom.engineering/tempus'
import { useLenisStore } from '../store'

type LayoutProps = PropsWithChildren<{
  theme?: 'light' | 'dark'
}>

export default function Layout({ children, theme = 'dark' }: LayoutProps) {
  const setLenis = useLenisStore((state) => state.setLenis)

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      syncTouch: true
    })

    window.lenis = instance
    setLenis(instance)

    const runner = (time: number) => {
      instance.raf(time)
    }

    const remove =
      (Tempus.add as unknown as (
        fn: (time: number) => void,
        priority?: number
      ) => (() => void) | void)(runner, 0) ?? null

    return () => {
      if (typeof remove === 'function') {
        remove()
      }

      if (window.lenis === instance) {
        delete window.lenis
      }

      instance.destroy()
      setLenis(null)
    }
  }, [setLenis])

  const themeClass =
    theme === 'dark'
      ? 'bg-black text-white'
      : 'bg-white text-zinc-900'

  return <div className={`min-h-screen ${themeClass}`}>{children}</div>
}
