// src/App.tsx
import React, { useLayoutEffect, useRef } from "react";
import "./app.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Card, { type CardData } from "./components/Card";
import { useLenisGsap, lenisSingleton } from "./hooks/useLenisGsap";
import {
  INTRO_GAP,
  APPEAR,
  ZOOM,
  TEXT_FADE,
  DOCK_MOVE,
  BETWEEN,
  HIDE_FADE,
  FULL_HOLD,
  DOCK_BASE_LEFT,
  DOCK_BASE_TOP,
  DOCK_GAP,
} from "./animationConfig";
import { LoremIpsum } from "lorem-ipsum";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------ HoldController ------------------------------ */
class HoldController {
  private overlay: HTMLDivElement | null = null;
  private holding = false;
  private holdIdx = -1;

  private holdScroll = 0; // 进入 hold 时的滚动位置（px）
  private accPx = 0;      // 吞掉的滚量

  begin(p: { cardIndex: number }) {
    if (this.holding) return;
    const lenis = lenisSingleton.current!;
    this.holding = true;
    this.holdIdx = p.cardIndex;

    this.holdScroll = this.getScrollY();
    lenis.stop();
    lenis.scrollTo(this.holdScroll, { immediate: true });

    this.mountOverlay();
  }

  isHolding(cardIndex?: number) {
    return this.holding && (cardIndex == null || cardIndex === this.holdIdx);
  }

  finish() {
    if (!this.holding) return;
    const lenis = lenisSingleton.current!;
    this.unmountOverlay();
    this.holding = false;

    // 直接把页面滚动推进 FULL_HOLD 像素，时间线自然越过 hold 段
    lenis.start();
    lenis.scrollTo(this.holdScroll + FULL_HOLD, { immediate: true });
    this.holdIdx = -1;
    this.accPx = 0;
  }

  releaseReverse() {
    if (!this.holding) return;
    const lenis = lenisSingleton.current!;
    this.unmountOverlay();
    this.holding = false;

    // 回到 hold 起点
    lenis.start();
    lenis.scrollTo(this.holdScroll, { immediate: true });
    this.holdIdx = -1;
    this.accPx = 0;
  }

  keepPinned() {
    if (!this.holding) return;
    const lenis = lenisSingleton.current!;
    lenis.scrollTo(this.holdScroll, { immediate: true });
  }

  private mountOverlay() {
    if (this.overlay) return;
    const el = document.createElement("div");
    el.setAttribute("data-hold-overlay", "true");
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "transparent",
      touchAction: "none",
      pointerEvents: "auto",
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    this.overlay = el;

    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("touchstart", this.onTouchStart, { passive: false });
    el.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
  }

  private unmountOverlay() {
    const el = this.overlay;
    if (!el) return;
    el.removeEventListener("wheel", this.onWheel as EventListener);
    el.removeEventListener("touchstart", this.onTouchStart as EventListener);
    el.removeEventListener("touchmove", this.onTouchMove as EventListener);
    window.removeEventListener("keydown", this.onKeyDown as EventListener);
    el.remove();
    this.overlay = null;
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.holding) return;
    e.preventDefault();
    const dy =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (dy < 0) {
      this.releaseReverse();
      return;
    }
    this.accPx += Math.abs(dy);
    if (this.accPx >= FULL_HOLD) this.finish();
  };

  private tTouch = 0;
  private onTouchStart = (e: TouchEvent) => {
    if (!this.holding) return;
    this.tTouch = e.touches[0]?.clientY ?? 0;
  };
  private onTouchMove = (e: TouchEvent) => {
    if (!this.holding) return;
    const y = e.touches[0]?.clientY ?? 0;
    const dy = this.tTouch - y; // 下滑为正
    this.tTouch = y;
    if (dy < 0) {
      this.releaseReverse();
      return;
    }
    e.preventDefault();
    this.accPx += dy;
    if (this.accPx >= FULL_HOLD) this.finish();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.holding) return;
    const k = e.key.toLowerCase();
    let step = 0;
    if (k === " " || k === "pagedown") step = window.innerHeight * 0.9;
    else if (k === "arrowdown") step = 80;
    else if (k === "arrowup" || k === "pageup") {
      this.releaseReverse();
      e.preventDefault();
      return;
    }
    if (step > 0) {
      e.preventDefault();
      this.accPx += step;
      if (this.accPx >= FULL_HOLD) this.finish();
    }
  };

  private getScrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
}
/* --------------------------------- /HoldController ------------------------------ */

/* ------------------------------ lorem-ipsum 随机数据 ------------------------------ */
const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
});
function randomCardsCfg(count = 5, startIndex = 3): CardData[] {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
  return Array.from({ length: count }, (_, i) => {
    const paras = rand(10, 30);
    const body = lorem
      .generateParagraphs(paras)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: `c${i + startIndex}`,
      width: "520px",
      height: "340px",
      title: lorem.generateWords(1),
      coverLabel: lorem.generateWords(1),
      body,
    };
  });
}

const cardsCfg: CardData[] = [
  {
    id: "c1",
    width: "520px",
    height: "340px",
    title: "Card 1",
    coverLabel: "Overview",
    body: [
      "进入全屏时正文从顶部淡入；到底部先淡出再退出全屏。",
      "卡片尺寸固定，内容用假内滚（内部平移）。",
      "……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","……更多文本……","结束。"
    ]
  },
  {
    id: "c2",
    width: "520px",
    height: "340px",
    title: "Card 2",
    coverLabel: "Details",
    body: lorem.generateParagraphs(3).split(/\n+/),
  },
  ...randomCardsCfg(5, 3),
];

/* --------------------------------- App --------------------------------- */
type Meta = {
  card: HTMLElement;
  contentWrap: HTMLElement;
  contentInner: HTMLElement;
  cover: HTMLElement;
  tVisible: number;
  tFullIn: number;
  tReadEnd: number;
  tHoldEnd: number;
  tFullOut: number;
  tDockEnd: number;
  startLeft: number;
  startTop: number;
};

export default function App() {
  useLenisGsap();

  const stageRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  const reverseGuardRef = useRef<Record<number, boolean>>({}); // ★ 逆向防抖/迟滞

  useLayoutEffect(() => {
    const holdCtl = new HoldController();

    const build = () => {
      ctxRef.current?.revert();

      ctxRef.current = gsap.context(() => {
        const stage = stageRef.current!;
        const tl = gsap.timeline({ defaults: { ease: "none" } });
        let total = 0;

        const metas: Meta[] = [];

        function measureExtraPxFull(
          card: HTMLElement,
          contentWrap: HTMLElement,
          contentInner: HTMLElement,
          vw: number,
          vh: number,
          restore: { left: number; top: number; width: number; height: number }
        ) {
          gsap.set(card, { left: 0, top: 0, width: vw, height: vh });
          void card.getBoundingClientRect();
          const wrapH = contentWrap.getBoundingClientRect().height || vh;
          const innerH = contentInner.getBoundingClientRect().height;
          const dpr = window.devicePixelRatio || 1;
          const FUDGE = 2;
          const extraPx = Math.max(0, Math.ceil((innerH - wrapH + FUDGE) * dpr) / dpr);
          gsap.set(card, restore);
          return extraPx;
        }

        tl.to({}, {}, total);
        total += INTRO_GAP;

        const cards = gsap.utils.toArray<HTMLElement>(".card");

        cards.forEach((card, i) => {
          const cover = card.querySelector<HTMLElement>('[data-role="cover"]')!;
          const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]')!;
          const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]')!;

          gsap.set(card, { clearProps: "x,y,scale,transform,opacity" });
          gsap.set(contentWrap, { clearProps: "opacity" });
          gsap.set(contentInner, { clearProps: "y,transform" });

          gsap.set(contentWrap, { opacity: 0, pointerEvents: "none" });
          gsap.set(contentInner, { y: 0 });
          gsap.set(cover, { opacity: 1 });

          const cs = getComputedStyle(card);
          const baseW = parseFloat(cs.width);
          const baseH = parseFloat(cs.height);

          const vw = window.innerWidth;
          const vh = window.innerHeight;

          const startLeft = Math.max(0, vw - baseW - 16);
          const startTop = Math.max(0, vh - baseH - 16);
          const centerLeft = (vw - baseW) / 2;
          const centerTop = (vh - baseH) / 2;
          const dockLeft = DOCK_BASE_LEFT + i * DOCK_GAP;
          const dockTop = DOCK_BASE_TOP + i * DOCK_GAP;

          const tVisible = total;

          gsap.set(card, { left: startLeft, top: startTop, width: baseW, height: baseH, zIndex: 15 });

          tl.to(card, { left: centerLeft, top: centerTop, duration: APPEAR, ease: "power4.out" }, total);
          total += APPEAR;

          tl.to(card, { left: 0, top: 0, width: vw, height: vh, duration: ZOOM, ease: "power1.inOut" }, total);
          tl.to(cover, { opacity: 0, duration: ZOOM, ease: "power1.inOut" }, total);
          total += ZOOM;

          const tFullIn = total;
          tl.set(contentInner, { y: 0 }, total);
          tl.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: "none" }, total);
          total += TEXT_FADE;

          const extraPx = measureExtraPxFull(
            card,
            contentWrap,
            contentInner,
            vw,
            vh,
            { left: startLeft, top: startTop, width: baseW, height: baseH }
          );
          const extraUnits = Math.max(1, Math.round(extraPx));
          tl.to(contentInner, { y: -extraPx, duration: extraUnits, ease: "none" }, total);
          const tReadEnd = total + extraUnits;
          total += extraUnits;

          tl.to({}, { duration: FULL_HOLD }, total);
          const tHoldEnd = total + FULL_HOLD;
          total += FULL_HOLD;

          tl.to(contentWrap, { opacity: 0, duration: TEXT_FADE, ease: "none" }, total);
          const tFullOut = total + TEXT_FADE;
          total += TEXT_FADE;

          tl.set(contentInner, { y: 0 }, total);
          tl.set(cover, { opacity: 1 }, total);

          tl.to(card, { left: centerLeft, top: centerTop, width: baseW, height: baseH, duration: ZOOM, ease: "power1.inOut" }, total);
          total += ZOOM;

          tl.to(card, { left: dockLeft, top: dockTop, duration: DOCK_MOVE, ease: "power2.inOut" }, total);
          const tDockEnd = total + DOCK_MOVE;
          total += DOCK_MOVE;

          metas.push({
            card, contentWrap, contentInner, cover,
            tVisible, tFullIn, tReadEnd, tHoldEnd, tFullOut, tDockEnd,
            startLeft, startTop
          });

          total += BETWEEN;
        });

        ScrollTrigger.create({
          animation: tl,
          trigger: stage,
          start: "top top",
          end: () => "+=" + total,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const t = tl.time();
            const dir = self.direction;

            metas.forEach((m, idx) => {
              if (t >= m.tVisible) {
                m.card.classList.add("is-visible");
                m.card.classList.remove("invisible");
                m.card.style.opacity = "";
              } else if (dir === -1 && t > m.tVisible - HIDE_FADE) {
                const alpha = (t - (m.tVisible - HIDE_FADE)) / HIDE_FADE;
                m.card.classList.add("is-visible");
                m.card.classList.remove("invisible");
                m.card.style.opacity = String(alpha);
                m.card.style.left = m.startLeft + "px";
                m.card.style.top = m.startTop + "px";
              } else {
                m.card.classList.remove("is-visible");
                m.card.classList.add("invisible");
                m.card.style.opacity = "";
              }

              // 层级
              const phase =
                t >= m.tDockEnd ? 3 :
                t >= m.tFullIn && t < m.tFullOut ? 2 :
                t >= m.tVisible ? 1 : 0;
              if (phase === 2) m.card.style.zIndex = "20";
              else if (phase === 3) m.card.style.zIndex = "12";
              else if (phase === 1) m.card.style.zIndex = "15";
              else m.card.style.zIndex = "0";

              // —— 逆向迟滞保护：刚从 HOLD 反向释放后，不要立刻重新进入 HOLD —— //
              const guard = reverseGuardRef.current[idx] === true;
              if (guard && t < m.tReadEnd - 1) {
                // 上滚已经离开阅读末端 1 单位，解除保护
                reverseGuardRef.current[idx] = false;
              }

              // 进入 HOLD（仅当不在保护期）
              if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
                holdCtl.begin({ cardIndex: idx });
              }

              // 正在 HOLD：钉住 scrollY；一旦检测到方向为上（ScrollTrigger 的 dir 只是提示）
              if (holdCtl.isHolding(idx)) {
                holdCtl.keepPinned();
                if (dir === -1) {
                  holdCtl.releaseReverse();
                  reverseGuardRef.current[idx] = true; // 开启保护，避免马上又被锁回 HOLD
                }
              }
            });
          },
          onKill() {
            if (holdCtl.isHolding()) holdCtl.releaseReverse();
          },
        });

        ScrollTrigger.refresh();
      }, stageRef);
    };

    build();

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        ctxRef.current?.revert();
        build();
      });
    };
    window.addEventListener("resize", onResize);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
      ctxRef.current?.revert();
    };
  }, []);

  return (
    <div className="min-h-[200vh] bg-bg text-fg">
      <header className="h-[80vh] grid place-items-center text-center text-muted">
        <div>
          <h1 className="m-0 mb-2 text-fg">GSAP + Lenis：FULL_HOLD（逆向迟滞修复）</h1>
          <p>滚动以开始</p>
        </div>
      </header>

      <section className="relative h-[100vh] overflow-hidden border-y border-white/10" ref={stageRef}>
        <div className="relative w-full h-full">
          {cardsCfg.map((c) => (
            <Card key={c.id} data={c} />
          ))}
        </div>
      </section>

      <footer className="h-[120vh] grid place-items-center text-muted">
        <p>结束</p>
      </footer>
    </div>
  );
}