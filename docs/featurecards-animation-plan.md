# FeatureCards 动画迁移方案

## 1. `card/src/App.tsx` 动画实现拆解

### 1.1 时间线与场景布置
- 舞台 (`section`) 前后追加 header/footer 供滚动驱动整条时间线（`card/src/App.tsx`）。Card App 使用 `ScrollTrigger` pin，但迁移到 FeatureCards 时将改用 `sticky` 定位 + `pin: false`。
- 所有卡片 `position: fixed`，初始放在视窗右下角 (`startLeft/startTop`)，避免影响文档流并方便过渡到中心/全屏/Dock。
- `INTRO_GAP`, `APPEAR`, `ZOOM`, `TEXT_FADE`, `DOCK_MOVE`, `BETWEEN` 等常量集中在 `card/src/animationConfig.ts`，保证每个阶段的滚动配额一致；注意这些值本质是"滚动像素"而非秒数，与 `ScrollTrigger.end = "+=" + total` 强耦合，日后调整 scrub/倍速时必须同步换算。

### 1.2 `HoldController`（滚动钉住机制）
- 进入 FULL_HOLD 段时，通过 `lenisSingleton` 暂停 Lenis，记录进入时的 scrollY，并在 `document.body` 上挂一个透明 overlay 拦截 wheel/touch/keyboard（`card/src/App.tsx:25-124`）。
- 正向滚动：累计滚动距离，达到 `FULL_HOLD` 像素后 `finish()`，Lenis 立即跳到 hold 末尾；反向滚动/按键则触发 `releaseReverse()`，Lenis 回到阅读末端起点。
- 退出 hold 后开启 `reverseGuard`，直到时间线倒退超过 1px 才允许再次进入，避免“刚松手就被重新锁定”。

### 1.3 卡片内容阶段
| 阶段 | 动作 | 技术要点 |
| --- | --- | --- |
| APPEAR | 从右下角移动到视口中心 | `tl.to(card, { left: centerLeft, top: centerTop, duration: APPEAR, ease: "power4.out" })` |
| ZOOM IN | 卡片铺满视口并淡出封面 | 同步执行 `card` 尺寸动画 + `cover` opacity 0 |
| TEXT IN | `contentWrap` opacity 1，正文可读 | `TEXT_FADE` 时间 |
| FAKE SCROLL | 正文内部平移 | 调用 `measureExtraPxFull` 计算 `extraPx`，再用 `tl.to(contentInner, { y: -extraPx })` |
| FULL_HOLD | 读完后的静止时间 | `tl.to({}, { duration: FULL_HOLD })`，配合 `HoldController` |
| EXIT FULL | 正文淡出、封面复原 | `contentWrap` opacity 0, `cover` opacity 1 |
| ZOOM OUT | 回到中心尺寸 | 与 ZOOM IN 对称 |
| DOCK | 滑向左上角 Dock 阵列 | 使用 `DOCK_BASE_LEFT/TOP + i * DOCK_GAP` |

### 1.4 滚动监听与状态同步
- `useLenisGsap` 初始化 Lenis 并绑定 `ScrollTrigger.update`，确保 GSAP timeline 与 Lenis scroll 1:1 映射。
- `ScrollTrigger.onUpdate` 中根据 `tl.time()` 与 `metas`，动态切换 `.is-visible`、`z-index` 与补间透明度；逆向滚动时提前一段 `HIDE_FADE` 做预淡出（`card/src/App.tsx:363-420`）。
- `metas` 保存每张卡的时间戳：`tVisible`, `tFullIn`, `tReadEnd`, `tHoldEnd`, `tFullOut`, `tDockEnd`，供 `onUpdate` 判断阶段。

### 1.5 像素化时长语义
- App 里所有段落时长都等于“滚动多少像素”：`total` 递增、`FULL_HOLD`/`APPEAR` 等常量、`ScrollTrigger.end` 都是像素单位。
- 迁移时需要在代码与文档中注明这一点，避免其他同学误以为是秒数；若日后想添加倍速或多段 scrub，就必须同时更新这些常量与 `total`。

## 2. `src/components/FeatureCards.tsx` 现状

### 2.1 滚动进度
- 使用 `useRect` + `useWindowSize` 计算 section 的 `start/end`，`useScroll` 从 Lenis store 获取滚动事件，根据滚动映射 `progress ∈ [0,1]`。
- `progress` 被量化为 10 份 (`Math.floor(progress * 10)`)，结果写入 `current` state，并把 `--progress` 自定义属性写到容器上但 CSS 未消费。

### 2.2 DOM 与样式
- `.features` 是一个超高容器 (`height: 1600vh`)，内部的 `layout-block-inner` 设为 sticky，高度 100vh；标题固定在右侧，卡片容器 `position: relative`。
- 每张 `.card` 绝对定位，`nth-child` 计算 top/left，形成对角线排列；非 `.current` 卡片统一 `translate3d(100%,100%,0)` + `opacity:0`，依赖 `transition: opacity, transform` 实现阶梯显隐。
- 没有封面/正文分层，也没有对 Lenis 的硬停或 z-index 管理，CSS 只处理进入/退出视野。

### 2.3 与 App 动画的差距
1. **驱动方式**：当前仅基于 `current` 布尔切换，无法控制连续的 APPEAR→ZOOM→FULL_HOLD 等阶段，也无法对 Lenis 施加 hold。
2. **结构**：卡片只有单层文案，没有封面/正文、`contentWrap/contentInner`，无法执行"封面淡出 + 正文假滚动"。
3. **几何数据**：现有布局靠纯 CSS `nth-child` 计算，缺少 JS 层面对 `startLeft/startTop` 的认知，无法在 GSAP 中复用这些坐标。
4. **CSS 变量**：`--progress` 被写入却未使用，导致视觉表现与 JS 脱节，难以精细控制。

⸻

## 3. 目标与约束
	•	目标：把 Card App 的整套 GSAP 时间线 + Lenis/HOLD 行为迁到 FeatureCards，实现「右下角入场 → 居中 → 全屏（阅读+HOLD）→ 居中 → 回到现有 nth-child 定义的停靠位」。
	•	不改变：feature-cards.module.css 中通过 nth-child 计算出的 最终 top/left 布局（Dock 位置）与版面风格。
	•	改变：显隐与动效的控制权由 CSS/本地 useScroll 逻辑移交给 GSAP 时间线；HOLD 由 Lenis 覆盖层“吞滚量”。

## 4. 差异与对齐
- **现 FeatureCards**：sticky 容器固定 100vh，卡片通过 nth-child 计算静态 top/left；显隐靠 .current + 过渡。
- **目标行为**：卡片不再由 .current 控显隐/位移；GSAP 接管位移动画；Lenis 接管 HOLD 阶段的滚动"配额"。

⸻

## 5. 迁移总览（不改 Dock，换控制权）
	1.	DOM 轻增强：每张卡增加三层结构供时间线选择
[data-role="cover"]（封面） / [data-role="content"] / [data-role="content-inner"]（假内滚移动此层）。
	2.	CSS 调整（保持 Dock）

	•	保留全部 nth-child 的 top/left 计算（Dock 终点）。
	•	移除 .card:not(.current) 的强制位移/透明度与相关过渡（否则和 GSAP 打架）。
	•	新增三层的初始态（cover 可见、content 隐藏）。

	3.	时间线在 App

	•	舞台：选择 FeatureCards 的 sticky 容器（继续 sticky，ScrollTrigger 不 pin）。
	•	Dock 坐标：以 sticky 为包含块读取每张卡当前 BCR → 作为动画末端。
	•	单卡 TL：右下角 → 居中 → 全屏（测 extraPx → 假内滚）→ HOLD 占位 → 正文淡出 → 缩回居中 → tween 到 Dock 坐标。
	•	HOLD：Lenis stop() + 覆盖层吞 wheel/touch/keydown，累计像素达 FULL_HOLD 再释放推进；逆向立即释放并加“迟滞”。

⸻

## 6. 详细步骤（按执行顺序）

### A. 组件与样式（最小必要改造）
	1.	FeatureCards.tsx
	•	删：useScroll/current/s.current 相关状态与计算。
	•	外层加舞台标记：data-stage="feature-cards"（或直接把 sticky 容器作为舞台）。
	•	每个 .card 包装为：

<article className={s.card} data-card-id={id}>
  <div data-role="cover">...原 <Card/> ...</div>
  <div data-role="content" aria-hidden>
    <div data-role="content-inner">...正文（任意长文）...</div>
  </div>
</article>


	•	不改：卡片元素本身的 class、nth-child 依赖的 DOM 层级。

	2.	feature-cards.module.css
	•	保留：所有 nth-child 的 top/left 规则（移动端仅 top）。
	•	移除/注释（关键）：

/* 会把未 current 的卡推走，需取消 */
.features .card:not(.current) { transform: translate3d(100%,100%,0); opacity: 0; }
/* 避免 CSS 过渡干扰 GSAP，卡片层 transition 设为 none */
.features .card { transition: none; will-change: transform,opacity,left,top,width,height; }


	•	新增（三层初始态）：

[data-role="cover"]{ opacity:1; }
[data-role="content"]{ opacity:0; pointer-events:none; }
[data-role="content-inner"]{ transform: translate3d(0,0,0); will-change: transform; }


	•	保留：.sticky { position: sticky; top:0; height:100vh; }。

说明：Dock 是 CSS 决定 的静态终点；动画只是“把卡送回那里”。因此 timeLine 末段必须 tween 到 当前 CSS BCR，而不是写死坐标。

### B. App 内时间线接入（GSAP + ScrollTrigger + Lenis/HOLD）
	1.	选择器与容器
	•	舞台（不 pin）：const stage = document.querySelector('[data-stage="feature-cards"]')!;
	•	sticky 容器：const sticky = stage.querySelector('.sticky') as HTMLElement;
	•	卡片集合：const cards = gsap.utils.toArray<HTMLElement>('[data-stage="feature-cards"] .card');
	2.	坐标换算（Dock 终点）
	•	以 sticky 为包含块换算：

const toLocal = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const cr = sticky.getBoundingClientRect();
  return { left: r.left - cr.left, top: r.top - cr.top };
};
// 每张卡：const { left: dockLeft, top: dockTop } = toLocal(cardEl);


	3.	时间线片段（单卡）
	•	初始几何（视窗右下角）：
	•	startLeft = max(0, vw - baseW - margin)
	•	startTop  = max(0, vh - baseH - margin)
	•	gsap.set(card, { left:startLeft, top:startTop, width:baseW, height:baseH, zIndex:15 })
	•	右下角 → 居中（原尺寸）：APPEAR
	•	居中 → 全屏（left:0, top:0, width:vw, height:vh）：ZOOM；cover 同步淡出。
	•	正文淡入：content opacity:1（从顶部开始）。
	•	阅读段（假内滚）：
	•	全屏几何下测量：extraPx = max(0, ceil((innerH - wrapH + 2px)*DPR)/DPR)
	•	TL：to(contentInner, { y: -extraPx, duration: extraUnits=round(extraPx), ease:"none" })
	•	HOLD 占位：插入 to({}, { duration: FULL_HOLD })（不 tween 元素）。
	•	正文淡出：content opacity:0；cover opacity:1。
	•	全屏 → 居中（还原原尺寸）：ZOOM
	•	居中 → Dock（tween 到 dockLeft/top）：DOCK_MOVE。
	4.	ScrollTrigger

ScrollTrigger.create({
  animation: tl,
  trigger: stage,
  start: "top top",
  end: () => "+=" + total,   // total 为“像素化时长”的合计
  scrub: 1,
  pin: false,                // 关键：sticky 已固定
  anticipatePin: 1,
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    // 维持 z-index、入场可见性
    // HOLD 进/出判定（见下）
  },
  onKill: () => holdCtl.releaseReverse(),
});


	5.	HOLD 控制器（输入侧吞滚量）
	•	进入（t ∈ [tReadEnd, tHoldEnd) 且未保护）：lenis.stop()；记录 holdScroll；挂载透明覆盖层（passive:false, touch-action:none）拦截 wheel/touch/keydown；每帧 scrollTo(holdScroll, { immediate:true }) 钉住。
	•	累计：将 dy 像素累加到 accPx；当 accPx ≥ FULL_HOLD → 卸载覆盖层、lenis.start()、scrollTo(holdScroll + FULL_HOLD, { immediate:true })，时间线自然越过占位段。
	•	逆向：捕获上滚（dy<0 或 ArrowUp/PageUp）→ 立即释放，scrollTo(holdScroll)；标记 reverse guard，直到时间回退离开 tReadEnd 一定阈值（建议 1 单位）再允许重入 HOLD。
	•	短文优化：extraPx <= 0 时不进入 HOLD，直接跳过占位段。
	6.	重建与刷新
	•	resize/orientationchange：重算 Dock BCR 与 extraPx，重建 TL → ScrollTrigger.refresh()。
	•	懒加载资源（图片/字体）导致高度变化：用 ResizeObserver(contentInner) 监听，变化后做同样重建。
	•	onKill/异常：兜底 holdCtl.releaseReverse()，防止覆盖层遗留。

⸻

## 7. 参数建议（统一"像素化时长"）
	•	APPEAR = 240、ZOOM = 240、TEXT_FADE = 120、DOCK_MOVE = 260、BETWEEN = 100（单位=时间线“步”，与 px 1:1）。
	•	FULL_HOLD = 320 ~ 640（按体验微调）。
	•	HIDE_FADE = 60（逆向回放靠近出现点的预淡入）。

原则：时长只与像素有关（scrub=1），保证不同机器滚动手感一致。

⸻

## 8. 验收用例
	1.	长文卡：到末端停住；继续滚 FULL_HOLD 距离后才缩回；逆向立即脱离 HOLD。
	2.	短文卡：不进入 HOLD；直接缩回 Dock。
	3.	快滚/触控/键盘：Space/PageDown/触滑与滚轮吞滚一致。
	4.	断点切换（<800px / ≥800px）：Dock 位置按 nth-child 切换后仍正确；无跳跃。
	5.	资源迟到：图片/可变字体加载后自动重建；阅读距离、HOLD 不漂移。
	6.	反复来回滚：无“卡在右下角/左侧突然跳位/闪隐”。

⸻

## 9. 风险与规避
	•	双固定冲突：若把 pin:true 与 sticky 同时使用会错位；本方案固定用 sticky，禁用 pin。
	•	坐标系错位：Dock 终点必须以 sticky 为包含块换算（BCR 相减），否则 tween 到错误位置。
	•	祖先 transform：如存在，会改变包含块；尽量避免；必要时以该祖先为参照换算。
	•	覆盖层遗留：所有 rebuild/kill 路径强制 releaseReverse()。
	•	性能：读写样式集中在 useLayoutEffect/GSAP 内；避免在滚动回调里同步测量布局。

⸻

## 10. 任务清单（实施顺序）
	1.	改 FeatureCards.tsx：移除 useScroll/current；添加 data-stage 与三层结构。
	2.	改 CSS：注释 .card:not(.current)；新增三层初始态；保持 nth-child。
	3.	App 接入：选择器、Dock 坐标换算、单卡 TL、主 ST（pin:false）、HOLD 控制器。
	4.	监听：resize/ResizeObserver 重建。
	5.	参数微调：FULL_HOLD 与阶段时长按体验校准。
	6.	验收矩阵逐项过。

⸻

## 11. 实施代码

以下代码把 Card App 的「时间线 + HOLD」完整迁到 FeatureCards：
- 不改 Dock 布局（nth-child 计算仍生效），Dock 终点用 BCR 实测
- 舞台继续用 sticky，ScrollTrigger 设置 `pin: false`
- HOLD 用覆盖层吞滚 +（可选）Lenis，像素配额达标后才进入"缩小"段
- 含 resize/内容高度变化自动重建

### 11.1 HoldController.ts

```typescript
// src/timeline/HoldController.ts
// 可选注入 lenis；没有也能工作（回退到 window.scrollTo）
export type LenisLike = {
  stop(): void;
  start(): void;
  scrollTo(y: number, opts?: { immediate?: boolean }): void;
};

export class HoldController {
  private overlay: HTMLDivElement | null = null;
  private holding = false;
  private holdIdx = -1;
  private holdScroll = 0;
  private accPx = 0;

  constructor(private lenis?: LenisLike) {}

  begin(cardIndex: number) {
    if (this.holding) return;
    this.holding = true;
    this.holdIdx = cardIndex;

    this.holdScroll = this.getScrollY();
    this.lenis?.stop();
    this.scrollTo(this.holdScroll, true);
    this.mountOverlay();
  }

  isHolding(cardIndex?: number) {
    return this.holding && (cardIndex == null || cardIndex === this.holdIdx);
  }

  keepPinned() {
    if (!this.holding) return;
    this.scrollTo(this.holdScroll, true);
  }

  finish(fullHoldPx: number) {
    if (!this.holding) return;
    this.unmountOverlay();
    this.holding = false;
    this.lenis?.start();
    this.scrollTo(this.holdScroll + fullHoldPx, true); // 推过 HOLD 段
    this.holdIdx = -1;
    this.accPx = 0;
  }

  releaseReverse() {
    if (!this.holding) return;
    this.unmountOverlay();
    this.holding = false;
    this.lenis?.start();
    this.scrollTo(this.holdScroll, true);
    this.holdIdx = -1;
    this.accPx = 0;
  }

  /* 覆盖层与输入吞噬 */
  private mountOverlay() {
    if (this.overlay) return;
    const el = document.createElement("div");
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
    if (dy < 0) return this.releaseReverse();
    this.accPx += Math.abs(dy);
  };

  private tTouch = 0;
  private onTouchStart = (e: TouchEvent) => {
    if (!this.holding) return;
    this.tTouch = e.touches[0]?.clientY ?? 0;
  };
  private onTouchMove = (e: TouchEvent) => {
    if (!this.holding) return;
    const y = e.touches[0]?.clientY ?? 0;
    const dy = this.tTouch - y;
    this.tTouch = y;
    if (dy < 0) return this.releaseReverse();
    e.preventDefault();
    this.accPx += dy;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.holding) return;
    const k = e.key.toLowerCase();
    let step = 0;
    if (k === " " || k === "pagedown") step = window.innerHeight * 0.9;
    else if (k === "arrowdown") step = 80;
    else if (k === "arrowup" || k === "pageup") {
      e.preventDefault();
      return this.releaseReverse();
    }
    if (step > 0) {
      e.preventDefault();
      this.accPx += step;
    }
  };

  /** 外部每帧调用：达到配额就 finish */
  tick(fullHoldPx: number) {
    if (this.holding && this.accPx >= fullHoldPx) this.finish(fullHoldPx);
  }

  private getScrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  private scrollTo(y: number, immediate = false) {
    if (this.lenis) this.lenis.scrollTo(y, { immediate });
    else {
      if (immediate) window.scrollTo(0, y);
      else window.scrollTo({ top: y, behavior: "auto" });
    }
  }
}
```

### 11.2 featureCardsTimeline.ts

```typescript
// src/timeline/featureCardsTimeline.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HoldController, LenisLike } from "./HoldController";

gsap.registerPlugin(ScrollTrigger);

type Options = {
  stageSelector?: string;                  // 舞台容器（含 .sticky）
  cardSelector?: string;                   // 卡选择器
  stickySelector?: string;                 // sticky 容器选择器
  marginPx?: number;                       // 右下角起点与视窗边距
  APPEAR?: number;
  ZOOM?: number;
  TEXT_FADE?: number;
  DOCK_MOVE?: number;
  BETWEEN?: number;
  HIDE_FADE?: number;
  FULL_HOLD?: number;                      // 像素配额
  lenis?: LenisLike;                       // 可选注入
};

export function mountFeatureCardsTimeline(opts: Options = {}) {
  const {
    stageSelector = '[data-stage="feature-cards"]',
    cardSelector = ".card",
    stickySelector = ".sticky",
    marginPx = 16,
    APPEAR = 240,
    ZOOM = 240,
    TEXT_FADE = 120,
    DOCK_MOVE = 260,
    BETWEEN = 100,
    HIDE_FADE = 60,
    FULL_HOLD = 480,
    lenis,
  } = opts;

  const stage = document.querySelector(stageSelector) as HTMLElement | null;
  if (!stage) return { kill: () => {} };

  const sticky = stage.querySelector(stickySelector) as HTMLElement | null;
  const cards = Array.from(stage.querySelectorAll<HTMLElement>(cardSelector));

  // —— 工具：坐标换算到 sticky 本地
  const toLocal = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const cr = (sticky ?? stage).getBoundingClientRect();
    return { left: r.left - cr.left, top: r.top - cr.top };
    // 注意：这里假设 sticky 祖先未设置 transform；若有需改参照系
  };

  // —— 工具：在“全屏几何”下测正文溢出像素
  const measureExtraPxFull = (
    card: HTMLElement,
    wrap: HTMLElement,
    inner: HTMLElement,
    vw: number,
    vh: number,
    restore: { left: number; top: number; width: number; height: number }
  ) => {
    gsap.set(card, { left: 0, top: 0, width: vw, height: vh });
    void card.getBoundingClientRect(); // 强制回流
    const wrapH = wrap.getBoundingClientRect().height || vh;
    const innerH = inner.getBoundingClientRect().height;
    const dpr = window.devicePixelRatio || 1;
    const extraPx = Math.max(0, Math.ceil((innerH - wrapH + 2) * dpr) / dpr);
    gsap.set(card, restore);
    return extraPx;
  };

  const holdCtl = new HoldController(lenis);
  const reverseGuard: Record<number, boolean> = {};
  const metas: {
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
  }[] = [];

  let tl: gsap.core.Timeline | null = null;
  let st: ScrollTrigger | null = null;
  const ro = new ResizeObserver(rebuild);
  const observed: HTMLElement[] = [];

  build(); // 初次构建
  window.addEventListener("resize", scheduleRebuild, { passive: true });

  return {
    kill() {
      cleanup();
    },
  };

  /* ---------------- internal ---------------- */

  let rebuildRaf = 0;
  function scheduleRebuild() {
    cancelAnimationFrame(rebuildRaf);
    rebuildRaf = requestAnimationFrame(rebuild);
  }

  function cleanup() {
    cancelAnimationFrame(rebuildRaf);
    st?.kill();
    tl?.kill();
    metas.length = 0;
    observed.forEach((el) => ro.unobserve(el));
    observed.length = 0;
    holdCtl.releaseReverse();
    window.removeEventListener("resize", scheduleRebuild);
  }

  function rebuild() {
    st?.kill();
    tl?.kill();
    metas.length = 0;
    observed.forEach((el) => ro.unobserve(el));
    observed.length = 0;

    tl = gsap.timeline({ defaults: { ease: "none" } });
    let total = 0;

    // 初始空屏
    tl.to({}, {}, total);
    total += 100; // 与 Card App 保持有个起步缓冲

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    cards.forEach((card, i) => {
      const cover = card.querySelector<HTMLElement>('[data-role="cover"]');
      const contentWrap = card.querySelector<HTMLElement>('[data-role="content"]');
      const contentInner = card.querySelector<HTMLElement>('[data-role="content-inner"]');

      if (!cover || !contentWrap || !contentInner) {
        // 没有三层结构则跳过此卡（保持原状，不影响布局）
        return;
      }

      // 观察正文高度变化（图片/字体懒加载），变化后重建
      ro.observe(contentInner);
      observed.push(contentInner);

      // 计算 Dock 终点（CSS nth-child 布局）
      const dock = toLocal(card);
      const cs = getComputedStyle(card);
      const baseW = parseFloat(cs.width);
      const baseH = parseFloat(cs.height);

      // 初始：右下角
      const startLeft = Math.max(0, vw - baseW - marginPx);
      const startTop = Math.max(0, vh - baseH - marginPx);
      // 居中（原尺寸）
      const centerLeft = (vw - baseW) / 2;
      const centerTop = (vh - baseH) / 2;

      // 清动画属性
      gsap.set(card, { clearProps: "x,y,scale,transform,opacity" });
      gsap.set(contentWrap, { clearProps: "opacity" });
      gsap.set(contentInner, { clearProps: "y,transform" });

      // 初态
      gsap.set(card, { left: startLeft, top: startTop, width: baseW, height: baseH, zIndex: 15 });
      gsap.set(contentWrap, { opacity: 0, pointerEvents: "none" });
      gsap.set(contentInner, { y: 0 });
      gsap.set(cover, { opacity: 1 });

      const tVisible = total;

      // 右下角 → 居中
      tl!.to(card, { left: centerLeft, top: centerTop, duration: APPEAR, ease: "power4.out" }, total);
      total += APPEAR;

      // 居中 → 全屏；封面反向淡出
      tl!.to(card, { left: 0, top: 0, width: vw, height: vh, duration: ZOOM, ease: "power1.inOut" }, total);
      tl!.to(cover, { opacity: 0, duration: ZOOM, ease: "power1.inOut" }, total);
      total += ZOOM;

      // 正文淡入
      const tFullIn = total;
      tl!.set(contentInner, { y: 0 }, total);
      tl!.to(contentWrap, { opacity: 1, duration: TEXT_FADE, ease: "none" }, total);
      total += TEXT_FADE;

      // 阅读段：全屏几何下测量 extra
      const extraPx = measureExtraPxFull(
        card,
        contentWrap,
        contentInner,
        vw,
        vh,
        { left: startLeft, top: startTop, width: baseW, height: baseH }
      );
      const extraUnits = Math.max(1, Math.round(extraPx));
      const tReadStart = total;
      tl!.to(contentInner, { y: -extraPx, duration: extraUnits, ease: "none" }, total);
      const tReadEnd = total + extraUnits;
      total += extraUnits;

      // HOLD 占位（短文可跳过）
      let tHoldEnd = tReadEnd;
      if (extraPx > 0 && FULL_HOLD > 0) {
        tl!.to({}, { duration: FULL_HOLD }, total);
        tHoldEnd = total + FULL_HOLD;
        total += FULL_HOLD;
      }

      // 正文淡出
      tl!.to(contentWrap, { opacity: 0, duration: TEXT_FADE, ease: "none" }, total);
      const tFullOut = total + TEXT_FADE;
      total += TEXT_FADE;

      // 退出全屏准备
      tl!.set(contentInner, { y: 0 }, total);
      tl!.set(cover, { opacity: 1 }, total);

      // 全屏 → 居中
      tl!.to(card, { left: centerLeft, top: centerTop, width: baseW, height: baseH, duration: ZOOM, ease: "power1.inOut" }, total);
      total += ZOOM;

      // 居中 → Dock（你的 nth-child 位置）
      tl!.to(card, { left: dock.left, top: dock.top, duration: DOCK_MOVE, ease: "power2.inOut" }, total);
      const tDockEnd = total + DOCK_MOVE;
      total += DOCK_MOVE;

      metas.push({
        card, contentWrap, contentInner, cover,
        tVisible, tFullIn, tReadEnd, tHoldEnd, tFullOut, tDockEnd,
        startLeft, startTop
      });

      total += BETWEEN;
    });

    // 主 ScrollTrigger（不 pin；sticky 已固定）
    st = ScrollTrigger.create({
      animation: tl!,
      trigger: stage,
      start: "top top",
      end: () => "+=" + total,
      scrub: 1,
      pin: false,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const t = tl!.time();
        const dir = self.direction;

        // HOLD 管理 + 可见性/层级
        metas.forEach((m, idx) => {
          // 可见性（逆向靠近出现点时预淡入）
          if (t >= m.tVisible) {
            m.card.style.opacity = "";
          } else if (dir === -1 && t > m.tVisible - HIDE_FADE) {
            const alpha = (t - (m.tVisible - HIDE_FADE)) / HIDE_FADE;
            m.card.style.opacity = String(alpha);
            m.card.style.left = m.startLeft + "px";
            m.card.style.top = m.startTop + "px";
          } else {
            m.card.style.opacity = "0";
          }

          // z-index：全屏期间置顶
          const phase =
            t >= m.tDockEnd ? 3 :
            t >= m.tFullIn && t < m.tFullOut ? 2 :
            t >= m.tVisible ? 1 : 0;
          if (phase === 2) m.card.style.zIndex = "20";
          else if (phase === 3) m.card.style.zIndex = "12";
          else if (phase === 1) m.card.style.zIndex = "15";
          else m.card.style.zIndex = "0";

          // 逆向迟滞：刚反向释放后需先离开阅读末端 1 单位再允许重入
          const guard = reverseGuard[idx] === true;
          if (guard && t < m.tReadEnd - 1) reverseGuard[idx] = false;

          // 进入 HOLD（短文/未配置 FULL_HOLD 则不会到此）
          if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
            holdCtl.begin(idx);
          }

          // HOLD 期间：钉住；上滚则释放 + 开启迟滞
          if (holdCtl.isHolding(idx)) {
            holdCtl.keepPinned();
            if (dir === -1) {
              holdCtl.releaseReverse();
              reverseGuard[idx] = true;
            }
          }
        });

        // 满额释放（像素累加达标）
        holdCtl.tick(FULL_HOLD);
      },
      onKill() {
        holdCtl.releaseReverse();
      },
    });

    ScrollTrigger.refresh();
  }
}
```

### 11.3 使用方式

在 App 入口或页面逻辑里调用一次：

```typescript
// src/main.tsx（或页面组件 useEffect 中）
import { mountFeatureCardsTimeline } from "./timeline/featureCardsTimeline";

// 可选：把 Lenis 实例传进来（若项目已集成 Lenis）
const { kill } = mountFeatureCardsTimeline({
  stageSelector: '[data-stage="feature-cards"]',
  cardSelector: '.card',
  stickySelector: '.sticky',
  FULL_HOLD: 480,
  // lenis, // 若有就传
});

// 需要销毁时调用 kill()
```

### 11.4 前置要求

#### DOM 结构

每个 `.card` 内补三层结构：

```tsx
<article className={s.card} data-card-id={id}>
  <div data-role="cover">…原 <Card/> …</div>
  <div data-role="content" aria-hidden>
    <div data-role="content-inner">…正文…</div>
  </div>
</article>
```

#### CSS 调整

`feature-cards.module.css`：
- 保留所有 `nth-child` 的 `top/left` 规则
- 移除 `.card:not(.current)` 的强制位移与透明度
- 为三层加初始态：

```css
[data-role="cover"] { 
  opacity: 1; 
}

[data-role="content"] { 
  opacity: 0; 
  pointer-events: none; 
}

[data-role="content-inner"] { 
  transform: translate3d(0,0,0); 
  will-change: transform; 
}
```

⸻

这样即可把 Card App 的完整动画时间线 + HOLD 行为复制到 FeatureCards，且不改变现有 CSS 定义的最终停靠位置。