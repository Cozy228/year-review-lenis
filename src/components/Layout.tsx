import { useFrame } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { Intro } from './Intro'
import { Scrollbar } from './Scrollbar'
import { Cursor } from './Cursor'
import { Modal } from './Modal'
import { Footer } from './Footer'
import Lenis from 'lenis'
import { useStore } from '@/store'
import { useEffect, useState, ReactNode } from 'react'
import s from './layout.module.scss'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export function Layout({ children, className }: LayoutProps) {
  const lenis = useStore((state) => state.lenis)
  const setLenis = useStore((state) => state.setLenis)
  const theme = useStore((state) => state.theme)
  const [hash, setHash] = useState<string>()

  useEffect(() => {
    window.scrollTo(0, 0)
    const lenisInstance = new Lenis({
      smoothWheel: true,
      syncTouch: true,
    })
    
    // @ts-ignore - add lenis to window for debugging
    window.lenis = lenisInstance
    setLenis(lenisInstance)

    return () => {
      lenisInstance.destroy()
      setLenis(undefined as any)
    }
  }, [setLenis])

  useEffect(() => {
    if (lenis && hash) {
      // scroll to on hash change
      const target = document.querySelector(hash)
      if (target) {
        lenis.scrollTo(target as HTMLElement, { offset: 0 })
      }
    }
  }, [lenis, hash])

  useEffect(() => {
    // update scroll position on page refresh based on hash
    if (window.location.hash) {
      setHash(window.location.hash)
    }
  }, [])

  useEffect(() => {
    // catch anchor links clicks
    function onClick(e: Event) {
      e.preventDefault()
      const node = e.currentTarget as HTMLAnchorElement
      const hash = node.href.split('#').pop()
      if (hash) {
        setHash('#' + hash)
        setTimeout(() => {
          window.location.hash = hash
        }, 0)
      }
    }

    const internalLinks = [...document.querySelectorAll('[href]')].filter(
      (node) => (node as HTMLAnchorElement).href.includes('#')
    )

    internalLinks.forEach((node) => {
      node.addEventListener('click', onClick, false)
    })

    return () => {
      internalLinks.forEach((node) => {
        node.removeEventListener('click', onClick, false)
      })
    }
  }, [])

  useFrame((time: number) => {
    lenis?.raf(time)
  }, 0)

  return (
    <div className={cn(`theme-${theme}`, s.layout, className)}>
      <Intro />
      <Cursor />
      <Scrollbar />
      <Modal />
      <main className={s.main}>{children}</main>
      <Footer />
    </div>
  )
}

