// src/hooks/useLenisGsap.ts
import { useLayoutEffect, useRef, type RefObject } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const lenisSingleton: { current: Lenis | null } = { current: null };

export function useLenisGsap(): RefObject<Lenis | null> {
  const lenisRef = useRef<Lenis | null>(null);
  const tickRef = useRef<((t: number) => void) | null>(null);

  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    tickRef.current = tick;
    lenisSingleton.current = lenis;
    
    // 暴露到 window 以便调试
    if (typeof window !== 'undefined') {
      (window as any).lenis = lenis;
    }
    
    return () => {
      if (tickRef.current) gsap.ticker.remove(tickRef.current);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      lenisSingleton.current = null;
      if (typeof window !== 'undefined') {
        (window as any).lenis = null;
      }
    };
  }, []);

  return lenisRef;
}

