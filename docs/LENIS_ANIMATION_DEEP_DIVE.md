# Lenis 官网动画系统迁移蓝图（深度解析）

本文面向即将迁移 Lenis 官网（基于 Next.js + React）的同学，聚焦动画系统的运行机制与关联模块，目标是在新环境中**完整复刻滚动体验与视觉表现**。内容按照“从全局运行时 → 组件 → 样式 → 迁移步骤”的顺序展开，并附带关键文件路径，便于快速定位源码。

---

## 1. 项目与动画资产概览

- **核心框架**：Next.js 14、React 18、SCSS。
- **动画依赖**：
  - `lenis@1.1.13` — 平滑滚动主引擎。
  - `gsap@3.13.0` + `ScrollTrigger` + `SplitText` — 滚动联动、入场、页面转场等。
  - `@darkroom.engineering/tempus` / `hamo` — 自定义 RAF 合并、响应式工具（`useFrame`、`useRect`、`useMediaQuery`）。
  - `three` + `@react-three/fiber` + `@react-three/drei` — 首页 WebGL 场景。
  - `leva` — 内置调试面板，可停启 Lenis、观察 3D 参数。
- **动画入口文件**：
  - `pages/_app.js` — RAF 合并、ScrollTrigger 注册、全局脚本。
  - `layouts/default/index.js` — Lenis 初始化、生命周期、全局装饰（Intro/Cursor/Scrollbar/PageTransition）。
  - `hooks/use-scroll.js` — 将 Lenis 事件派发给任意动画回调。
  - `lib/store.js` — Zustand 全局状态（Lenis 实例、阈值表、页面转场、Intro 状态等）。

---

## 2. 全局动画运行时核心

### 2.1 RAF 合并（`pages/_app.js` 21-32）

```js
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)
  Tempus.add((time) => {
    gsap.updateRoot(time / 1000)
  }, 0)
}
```

- Tempus 负责统一 RequestAnimationFrame（RAF）时间轴，GSAP 改为由 Tempus 驱动，避免多 RAF 冲突。
- 后续所有基于 GSAP 的滚动动画都通过这一时间轴刷新，迁移必须保留。

### 2.2 Lenis 实例生命周期（`layouts/default/index.js` 18-55）

```js
useEffect(() => {
  const lenis = new Lenis({
    smoothWheel: true,
    syncTouch: true,
  })
  window.lenis = lenis
  setLenis(lenis)
  return () => {
    lenis.destroy()
    setLenis(null)
  }
}, [])
```

- 将 Lenis 挂载到 `window` 方便调试（Leva 面板、控制台）。
- `useFrame`（来自 hamo）在 `layouts/default/index.js:92` 中以 0 优先级持续调用 `lenis.raf(time)`，保持滚动逻辑与 Tempus 时间同步。

### 2.3 ScrollTrigger 同步（`pages/_app.js:41-47`）

```js
const lenis = useStore(({ lenis }) => lenis)
useScroll(ScrollTrigger.update)
useEffect(() => {
  if (!lenis) return
  ScrollTrigger.refresh()
  lenis?.start()
}, [lenis])
```

- 自定义 `useScroll` Hook（见下节）每帧触发 ScrollTrigger 更新，确保 GSAP 滚动动画与 Lenis 虚拟滚动位置一致。
- Lenis 准备好后强制刷新 ScrollTrigger，防止初始布局不一致。

### 2.4 自定义滚动 Hook（`hooks/use-scroll.js`）

```js
export function useScroll(callback, deps = []) {
  const lenis = useStore(({ lenis }) => lenis)
  useEffect(() => {
    if (!lenis) return
    lenis.on('scroll', callback)
    lenis.emit()
    return () => {
      lenis.off('scroll', callback)
    }
  }, [lenis, callback, [...deps]])
}
```

- 所有基于滚动的动画组件（如 HorizontalSlides、FeatureCards、WebGL、Scrollbar）统一通过这个 Hook 订阅 Lenis 事件。
- 迁移时务必保证新的滚动系统也提供相同的事件签名（`{ scroll, limit, velocity, isLocked, isScrolling }`）。

### 2.5 Zustand 状态 & 阈值管理（`lib/store.js`）

- `lenis` 实例、`introOut`（Intro 动画完成）、`triggerTransition`（页面转场）、`thresholds`（WebGL 场景关键帧）等统一管理。
- `addThreshold({ id, value })` 在各内容段落 `useEffect` 中调用，供 WebGL 场景读取。顺序动态生成，迁移时需要维持这一“先声明阈值 → WebGL 读取”流程。

---

## 3. 布局层动画要素

### 3.1 `Layout` 框架（`layouts/default/index.js` 60-118）

- 负责注入：
  - `<Intro />` — 首屏遮罩，控制首屏文本入场及 Lenis 停止/开始。
  - `<Cursor />` — 自定义光标，使用 GSAP 插值定位。
  - `<Scrollbar />` — 自绘进度条，监听 lenis.scroll。
  - `<PageTransition />` — 页面跳转幕布动画。
  - `<Footer />` — 页面底部，未涉及复杂动画。
- `className={cn(`theme-${theme}`, s.layout, className)}` — 根据页面传入的 `theme` 选择 CSS 主题变量。

### 3.2 Intro 蒙层（`components/intro/index.js` & `.module.scss`）

- 结构：
  - 渲染 `LNS` / `EI` 两个 SVG，通过 CSS 变量 `--index` 控制分段延时。
  - `isLoaded` 1s 后置位，触发 `.show` 类的过渡。
  - `setScroll(true)` 触发 `lenis.start()`，同时移除 `<html class="intro">` 提供的 overflow hidden。
  - `setIntroOut(true)` 写入 Zustand，供首页 Hero 文字判断是否播放入场。
- CSS 使用 `transform: translate3d` + `transition` + 自定义时长（`$intro-out`, `$intro-in`）。迁移时需要保留 `classList` 的配合逻辑。

### 3.3 Modal 弹窗（`components/modal/index.js`）

- 10 秒后自动打开 Sponsorship 提示，打开时调用 `lenis.stop()`，关闭时 `lenis.start()`。
- 在任何迁移环境中要注意与 Lenis 实例同步，保证弹窗展示期间滚动锁定。

### 3.4 Page Transition 幕布（`components/page-transition/index.js`）

- GSAP Timeline 在 `triggerTransition` 变化时执行入场动画（左 → 右填满屏幕），入场完成后调用 `router.push`。
- 路由完成后播放退出动画（向右滑出），并重置 Zustand 状态。
- 迁移必须保留这条 Timeline 以及元素结构（`.transition` div 固定定位）。

### 3.5 RealViewport（`components/real-viewport/index.js`）

- 每次 resize 更新 CSS 自定义变量 `--vh`/`--svh`/`--dvh`，配合移动端 100vh 缩放问题；多处动画使用这些变量做高度计算（例如 `.solution` 区块）。

---

## 4. 首页（`pages/home/index.js`）动画详解

首页是动画最密集的页面，可按段落拆解：

### 4.1 Hero 段（0-190 行）

- `HeroTextIn` 组件利用 `introOut` 控制文字掩膜。
- `hasScrolled` 由 `useScroll` 设置，隐藏“Scroll to explore”指示。
- 通过 `zoomWrapperRect` + `windowHeight` 计算 `progress1` / `progress2` 并写入 CSS 自定义属性，在 `.solution` 区块中用于缩放/过渡。
- `setTheme` 切换布局主题：`progress2 === 1` 时切换 `theme=light`，否则 `theme=dark`。
- GSAP 未直接参与，纯 CSS transition + Lenis 滚动值驱动。

### 4.2 Why 段（190-281 行）

- 左侧标题使用 `<AppearTitle />`，右侧多段文本纯静态。
- `whyRectRef` 等 `useRect` 结果记录在 Zustand，用于 WebGL 阈值。

### 4.3 Rethink 段（282-347 行）

- `<Parallax />` 包裹标题与说明文字，`speed` 参数为正/负实现反向滚动。
- `HorizontalSlides` 包裹卡片组，详见组件章节。

### 4.4 Solution Zoom 段（347-383 行）

- `zoomRef` 绑定 `.solution` 外层，通过滚动区间计算 `progress1/2`：
  - `--progress1` 控制 `.zoom` 容器缩放（`scale(calc(1 + var(--progress1)*3))`）与第一行文字向上移出。
  - `--progress2` 控制背景色填充与最终主题切换。
- CSS 位于 `pages/home/home.module.scss:213-336`，依赖 `transform`、`scale`、`opacity` 组合。

### 4.5 Featuring & Feature Cards 段（383-460 行）

- `<FeatureCards />` 监听滚动计算 `progress`，写入父容器 `--progress` 与 `setCurrent(step)`。
- 每张卡片通过 `transition-delay: calc(var(--i) * 100ms)` 与 `.current` 类控制入场。
- 卡片定位依赖 SCSS 循环（`@for`）计算位置，迁移时需要保留 `--layout-margin` 等 CSS 变量。

### 4.6 In Use 列表（460-504 行）

- `useIntersection` 观察元素是否进入视口 20%，激活列表。
- `<ListItem />` 中基于 `visible` 添加 `.visible` 类，引发 SCSS 中的 `transform: translateY` → 0 过渡（`components/list-item/list-item.module.scss:86-133`）。

### 4.7 阈值收集管线

- 多个 `useEffect` 读取 section 的 `DOMRect` 并 `addThreshold`：
  - `'why-start'`, `'why-end'`, `'cards-start'`, `'cards-end'`, `'light-start'`, `'features'`, `'in-use'`, `'end'`。
- WebGL 场景（Arm 模型）根据这些阈值推进关键帧，详见第 5 节。

---

## 5. WebGL 场景（`components/webgl/index.js`）运行机制

### 5.1 Canvas & Raf

```jsx
<Canvas
  frameloop="never"
  orthographic
  camera={{ near: 0.01, far: 10000, position: [0, 0, 1000] }}
>
  <Raf render={render} />
  <Suspense>
    <Content />
  </Suspense>
</Canvas>
```

- `frameloop="never"` 禁用 fiber 默认 RAF，由自定义 `<Raf />` 控制：

```js
function Raf({ render }) {
  const { advance } = useThree()
  useRaf((time) => {
    if (render) advance(time / 1000)
  })
}
```

- `useRaf` 来自 hamo，与 Tempus 同步。

### 5.2 Particles 粒子系统

- `positions/noise/size/speed/scale` 属性通过 `useMemo` 生成。
- `vertex.glsl` 中 Simplex 噪声驱动粒子漂浮，并根据 `uScroll`（Lenis scroll 值）让粒子群整体沿 Y 轴平移，且按深度调节速度。
- `fragment.glsl` 依据 `gl_PointCoord` 生成软边圆点。

### 5.3 Arm 模型动画

- 使用 GLTF 模型 `/public/models/arm.glb` 与 `arm2.glb`。
- 关键帧列表 `steps`（78 行起）定义不同阶段的 position/scale/rotation/type。
- `thresholds` 来自 Zustand：`Object.values(_thresholds).sort()`，依序映射滚动区间。
- 当前区间 `current` 与下一段 `to` 插值：

```js
const _scale = mapRange(0, 1, progress, from.scale, to.scale)
parent.current.scale.setScalar(viewport.height * _scale)
parent.current.position.copy(new Vector3(
  viewport.width * mapRange(0, 1, progress, from.position[0], to.position[0]),
  ...
))
```

- `setType(to.type)` 切换 arm1/arm2 模型。
- `useControls` 暴露 Leva 面板，用于调节材质与灯光；迁移可选择保留以方便调试。

### 5.4 光照 & 材质动态

- `useControls('lights', ...)` 根据 `step` 改变 `light1Intensity`、`lightsColor`、`ambientColor`。
- `MeshPhysicalMaterial` 的颜色、roughness、metalness 随滚动更新，维持从粉色线框到亮白金属的过渡。

---

## 6. 可复用动画组件清单

> 建议迁移时按照下表逐一核对，确保依赖齐全、事件正确绑定。

| 组件 | 路径 | 动画要点 | 依赖 | 迁移注意 |
| --- | --- | --- | --- | --- |
| Intro | `components/intro` | SVG 逐行入场，Intro 结束后释放 Lenis | CSS transitions, Zustand | 保留 `<html class="intro">` 切换逻辑 |
| AppearTitle | `components/appear-title` | SplitText 行级切分，交叉观察器触发 | `gsap`, `SplitText`, `react-use` | 需在浏览器环境运行，SSR 禁用 |
| Parallax | `components/parallax` | ScrollTrigger scrub，quickSetter 强制 3D | `gsap/ScrollTrigger` | 依赖 `windowWidth`，需处理 resize |
| HorizontalSlides | `components/horizontal-slides` | Lenis scroll → X 偏移 (GSAP 无动画帧) | `useScroll`, `gsap` | 读取 DOMRect 需等元素渲染完成 |
| FeatureCards | `components/feature-cards` | 滚动进度控制卡片显示 & `--progress` | `useRect`, `useScroll` | CSS `@for` 计算定位，需迁移 SCSS |
| Sticky | `components/sticky` | ScrollTrigger pin，自算 end 值 | `gsap/ScrollTrigger` | target 默认为父节点；pinType 可配 |
| Scrollbar | `components/scrollbar` | Lenis scroll → scaleX，pointer 拖动 | `useScroll`, `useWindowSize` | 拖动时使用原生 `window.scrollTo` |
| PageTransition | `components/page-transition` | GSAP Timeline 控制路由切换幕布 | `gsap`, `next/router` | 需要 Zustand `triggerTransition` |
| Cursor | `components/cursor` | GSAP tween 跟随鼠标，指针态切换 | `gsap` | 仅桌面显示，需保留 pointer 监听 |
| Modal | `components/modal` | Lenis 停启，延迟弹出 | Zustand | 可调整触发时机 |
| Button | `components/button` | Hover 上下翻转文本、箭头位移 | CSS transitions | 动效纯 CSS，只需保留结构 |
| ListItem | `components/list-item` | `.visible` 触发整体与边框动画 | CSS transitions | 配合 `visible` 属性延迟 |
| Marquee | `components/marquee` | 纯 CSS `@keyframes` | 无 JS | 注意 `--offset` 与时长 |

---

## 7. 其他页面示例

- `pages/docs/index.js`：演示 Lenis 包裹独立容器（`wrapper/content`），并同时驱动根滚动与子滚动。迁移时可作为“嵌套滚动”参考。
- `pages/snap/index.js`：展示 `lenis/snap` 插件的用法（`Snap` 对象、`snap.addElement` 设置 align），需要保留 `requestAnimationFrame` 手动驱动。

---

## 8. 样式系统与动画辅助

- **响应式函数**（`styles/_functions.scss`）：`desktop-vw`, `mobile-vw`, `columns()` 等，用于将整体布局和动画距离转化为 vw/vh。迁移时若改用不同 CSS 方案，需要提供等价函数。
- **颜色与主题**：
  - `styles/_colors.scss` 定义全局变量，配合 Safari 透明渐变 Bug 修复。
  - `styles/_themes.scss` 生成 `.theme-light/.theme-dark/.theme-contrast`，动画中频繁切换。
- **缓动集**（`styles/_easings.scss`）：提供命名缓动曲线，如 `var(--ease-out-expo)`，在 CSS Transition/Animation 中统一引用。
- **滚动样式**（`styles/_scroll.scss`）：同步 Lenis class（`.lenis.lenis-stopped` 等），防止迁移后丢失滚动锁定效果。

---

## 9. 辅助调试工具

- `components/stats`：基于 `stats.js` 输出性能面板，`useFrame` 以极端优先级记录 begin/end。
- `components/grid-debugger`：在调试模式（通过 `useDebug`）下渲染布局网格。
- `Leva` 控制面板（`pages/_app.js:28-37`）：仅在 debug 模式显示，可在迁移带上以验证参数。

---

## 10. 迁移实施建议

1. **先搭建运行时骨架**
   - 引入 Lenis、GSAP、Tempus，并验证 RAF 合并是否生效（检查 `gsap.ticker` 是否被移除、Lenis 是否每帧 raf）。
   - 迁移 Zustand store，保证 `setLenis`, `addThreshold`, `setTriggerTransition` 正常工作。
2. **迁移 Layout 层**
   - 确保 Intro 能完全阻塞滚动并在动画结束后释放。
   - Cursor、Scrollbar、PageTransition 需要 Lenis 实例、Router 事件协同测试。
3. **逐段迁移首页**
   - 先实现滚动阈值计算，再迁移 WebGL 场景，最后检查段落内动画。
   - 每段迁移后使用 ScrollTrigger dev markers（`NODE_ENV === 'development'` 自动开启）核对触发区间。
4. **迁移 WebGL**
   - 确认 `raw-loader` & `glslify-loader` webpack 配置在新环境可用（`next.config.js:56-83`）。
   - 检查 `frameloop="never"` + 自定义 Raf 是否保持与 Lenis 同步。
5. **迁移剩余页面 & 工具**
   - `pages/docs`、`pages/snap` 作为 Lenis 高级用例，也可作为迁移后的集成测试场景。

---

## 11. 验证清单

- **滚动同步**：打开 dev 模式，确认 ScrollTrigger markers 与页面段落一致；Lenis `window.lenis` 可调用 `.emit()` 观测事件。
- **WebGL**：滚动至 `light-start` 前后检查手臂模型切换、材质/灯光变化；观察粒子是否随滚动循环。
- **Intro & Modal**：首屏加载时滚动应被锁定，Intro 结束后释放；Modal 打开关闭需恢复滚动。
- **Page Transition**：触发 `useStore().setTriggerTransition('/target')`，确认幕布完整遮挡、路由切换后幕布退出。
- **移动端视口**：检查 `--vh`、`--svh` 是否正确更新，`.solution`、`.features` 等使用这些变量的区域无跳动。

---

## 12. 风险与注意事项

- **组件均以浏览器环境为前提**：`SplitText`、`window`、`document`、`Lenis` 仅在客户端可用。迁移到 SSR 框架时需保持动态加载（现有代码用 `next/dynamic` 禁用 SSR）。
- **事件解绑**：确保组件卸载时调用 `lenis.off`、`timeline.kill`、`window.removeEventListener`，否则多次挂载会重复添加监听。
- **CSS 自定义属性依赖**：多处动画通过写入 `element.style.setProperty('--progressX', value)` 驱动，迁移时不能忽略 DOM 引用与原子样式。
- **阈值顺序**：WebGL 关键帧依赖阈值数组排序，若在迁移中调整段落顺序或 `addThreshold` 时机需同步调整。
- **调试开关**：`useDebug`（hamo 提供）在 `NODE_ENV === 'development'` 下启用，可开启 Grid/Stats/Leva；迁移后若缺少该 hook，需要提供替代方案或移除相关逻辑。

---

通过以上拆解，可以将 Lenis 官网动画系统视作由**统一滚动运行时**驱动的多个“段落动画 + 3D 场景 + 页面 chrome”。迁移时只要按照“先还原运行时 → 再迁移局部组件 → 最后对齐样式与调试工具”的顺序推进，并在每个阶段使用上文的验证清单逐项对照，即可最大限度降低行为差异，保证滚动体验与视觉效果与原站一致。祝迁移顺利！💪


---
