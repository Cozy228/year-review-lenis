import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import Tempus from '@darkroom.engineering/tempus'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import App from './App'
import './styles/global.scss'
import { RealViewport } from './components/RealViewport'
import { useScroll } from './hooks/useScroll'
import { useStore } from './store'

// Setup GSAP and ScrollTrigger
gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.defaults({ 
  markers: import.meta.env.DEV 
})

// Merge GSAP ticker with Tempus
gsap.ticker.lagSmoothing(0)
gsap.ticker.remove(gsap.updateRoot)
Tempus.add((time: number) => {
  gsap.updateRoot(time / 1000)
}, 0)

function Root() {
  const lenis = useStore(({ lenis }) => lenis)

  // Update ScrollTrigger on scroll
  useScroll(() => {
    ScrollTrigger.update()
  })

  useEffect(() => {
    if (lenis) {
      ScrollTrigger.refresh()
      lenis?.start()
    }
  }, [lenis])

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  return (
    <>
      <RealViewport />
      <App />
    </>
  )
}

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Root />
    </StrictMode>
  )
}

