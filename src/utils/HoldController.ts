// src/utils/HoldController.ts
import { FULL_HOLD } from './animationConfig'
import { lenisSingleton } from '@/hooks/useLenisGsap'

/** 
 * After content reaches bottom: Lenis stops + transparent overlay captures input;
 * After accumulating FULL_HOLD pixels, advance scroll past hold segment in one jump 
 */
export class HoldController {
  private overlay: HTMLDivElement | null = null
  private holding = false
  private holdIdx = -1
  private holdScroll = 0  // Page scroll position when entering HOLD
  private accPx = 0       // Accumulated scroll pixels

  begin(p: { cardIndex: number }) {
    if (this.holding) return
    const lenis = lenisSingleton.current!
    this.holding = true
    this.holdIdx = p.cardIndex

    this.holdScroll = this.getScrollY()
    lenis.stop()
    lenis.scrollTo(this.holdScroll, { immediate: true })

    this.mountOverlay()
  }

  isHolding(cardIndex?: number) {
    return this.holding && (cardIndex == null || cardIndex === this.holdIdx)
  }

  keepPinned() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    lenis.scrollTo(this.holdScroll, { immediate: true }) // Pin every frame
  }

  finish() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    this.unmountOverlay()
    this.holding = false
    lenis.start()
    lenis.scrollTo(this.holdScroll + FULL_HOLD, { immediate: true }) // Skip hold segment
    this.holdIdx = -1
    this.accPx = 0
  }

  releaseReverse() {
    if (!this.holding) return
    const lenis = lenisSingleton.current!
    this.unmountOverlay()
    this.holding = false
    lenis.start()
    lenis.scrollTo(this.holdScroll, { immediate: true }) // Return to read end starting point
    this.holdIdx = -1
    this.accPx = 0
  }

  /* Overlay and input handling */
  private mountOverlay() {
    if (this.overlay) return
    const el = document.createElement('div')
    el.setAttribute('data-hold-overlay', 'true')
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'transparent',
      touchAction: 'none',
      pointerEvents: 'auto',
    } as CSSStyleDeclaration)
    document.body.appendChild(el)
    this.overlay = el

    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('touchstart', this.onTouchStart, { passive: false })
    el.addEventListener('touchmove', this.onTouchMove, { passive: false })
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
  }

  private unmountOverlay() {
    const el = this.overlay
    if (!el) return
    el.removeEventListener('wheel', this.onWheel as EventListener)
    el.removeEventListener('touchstart', this.onTouchStart as EventListener)
    el.removeEventListener('touchmove', this.onTouchMove as EventListener)
    window.removeEventListener('keydown', this.onKeyDown as EventListener)
    el.remove()
    this.overlay = null
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.holding) return
    e.preventDefault()
    const dy =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
    if (dy < 0) return this.releaseReverse()
    this.accPx += Math.abs(dy)
    if (this.accPx >= FULL_HOLD) this.finish()
  }

  private tTouch = 0
  private onTouchStart = (e: TouchEvent) => {
    if (!this.holding) return
    this.tTouch = e.touches[0]?.clientY ?? 0
  }
  
  private onTouchMove = (e: TouchEvent) => {
    if (!this.holding) return
    const y = e.touches[0]?.clientY ?? 0
    const dy = this.tTouch - y // Downward swipe is positive
    this.tTouch = y
    if (dy < 0) return this.releaseReverse()
    e.preventDefault()
    this.accPx += dy
    if (this.accPx >= FULL_HOLD) this.finish()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.holding) return
    const k = e.key.toLowerCase()
    let step = 0
    if (k === ' ' || k === 'pagedown') step = window.innerHeight * 0.9
    else if (k === 'arrowdown') step = 80
    else if (k === 'arrowup' || k === 'pageup') {
      e.preventDefault()
      return this.releaseReverse()
    }
    if (step > 0) {
      e.preventDefault()
      this.accPx += step
      if (this.accPx >= FULL_HOLD) this.finish()
    }
  }

  private getScrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0
  }
}

