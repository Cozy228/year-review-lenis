import React from 'react'
import ReactDOM from 'react-dom/client'
import Tempus from '@darkroom.engineering/tempus'
import { gsap } from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import App from './App.tsx'
import './styles/index.css'

let detachTempus: void | (() => void)

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.defaults({ markers: import.meta.env.DEV })

  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)

  detachTempus =
    (Tempus.add as unknown as (
      fn: (time: number) => void,
      priority?: number
    ) => (() => void) | void)(
      (time) => {
        gsap.updateRoot(time / 1000)
      },
      0
    )

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (typeof detachTempus === 'function') {
        detachTempus()
      }

      gsap.ticker.add(gsap.updateRoot)
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
