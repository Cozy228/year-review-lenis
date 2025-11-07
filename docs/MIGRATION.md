# 迁移实施计划（React · TypeScript · Vite · SCSS）

目标：在 **React + TypeScript + Vite + SCSS 模块** 栈中完整保留 Lenis 官网 Home 页的所有动画逻辑与编排（粒子背景、WebGL Arm 模型、GSAP/Lenis 时序、组件节奏），仅移除 Next.js/SSR/PWA/多页面等框架层内容，同时把现有 JavaScript 代码全量改写为 TypeScript。

---

## 1. 技术栈基线

- **From**：Next.js 14、React 18、SCSS、Tempus/Hamo、three.js（含粒子场景与 WebGL 手臂）、多页面结构、Next SEO/PWA 配置。
- **To**：Vite + React 18 + TypeScript、沿用原 SCSS 模块、Lenis、GSAP、Zustand、three.js（粒子 + Arm）、单页体验。
- **How**：新建 Vite React TS 项目，将 `pages`/`components`/`styles` 迁移到 `src` 目录，保留 Tempus/Hamo/Lenis 的运行方式，替换 Next.js 相关入口与配置，逐步将 `.js/.jsx` 改写为 `.ts/.tsx`。
- **Why**：Vite 提供更轻量的开发体验；保留 SCSS 与 WebGL 资产可以 1:1 复刻视觉效果；限定目标为“移除 Next.js + TypeScript 化”能控制工作量并避免对动画逻辑造成扰动。

---

## 2. 项目初始化

- **From**：`next.config.js` + `pages` 目录 + Next CLI。
- **To**：Vite 脚手架（`pnpm create vite lenis-home --template react-ts`），顶层 `src/main.tsx` + `src/App.tsx`。
- **How**：
  1. 初始化 Vite 工程并启用严格模式、路径别名、ESLint（可选）。  
  2. 安装运行时依赖：`pnpm add gsap lenis zustand three @react-three/fiber @react-three/drei @darkroom.engineering/tempus @darkroom.engineering/hamo leva`。  
  3. 安装构建依赖：`pnpm add -D sass vite-plugin-glsl`，在 `vite.config.ts` 中注册 `glsl()` 以加载 shader，并在 `css.preprocessorOptions.scss.additionalData` 中注入全局变量。  
  4. 在 `vite.config.ts` 和 `tsconfig.json` 中对齐 `@/`、`~` 等别名，确保动画、shaders、store、styles 的导入路径与原项目一致。  
  5. 将公共静态资源移入 `public/`，并清理脚手架示例文件，仅保留入口。
- **Why**：以上步骤确保 Vite 工程具备与 Next 项目相同的依赖、路径与构建能力，直接支撑后续组件和动画迁移。

---

## 3. 样式体系迁移（沿用 SCSS 模块）

- **From**：`styles/*.scss`、CSS 变量、`desktop-vw` 等 mixin。
- **To**：`src/styles/*.scss`（保持拆分结构），入口在 `src/styles/global.scss`，由 `main.tsx` 导入。
- **How**：
  1. 保留 `_variables.scss`、`_colors.scss`、`_easings.scss` 等 partial，并通过 `@use`/`@forward` 重新组织，确保 mixin 与变量可以在任何模块中共享。  
  2. 将原本依赖 Next.js 全局导入的 SCSS 改成在 `main.tsx` 中显式 `import '@/styles/global.scss'`。  
  3. 使用 `vite.config.ts` 的 `css.preprocessorOptions.scss.additionalData` 注入 `@use "src/styles/mixins" as *;` 等声明，复用 `desktop-vw`、`clamp-vw` mixin。  
  4. 继续使用 CSS 自定义属性驱动动画（如 `--vh`, `--progress*`, `--theme-color`），不需要改写为原子类。  
  5. 若存在 CSS Modules（`*.module.scss`），保持文件名与 class 名，对应组件在迁移到 `tsx` 时更新导入语法即可。
- **Why**：SCSS 已包含驱动动画所需的变量、主题与网格体系，保留它可以避免额外样式重写，确保动画表现与原站一致。

---

## 4. 动画运行时与状态管理

- **From**：`pages/_app.js` 中的 Tempus + GSAP 组合、`lib/store.js`（Zustand）、`hooks/use-scroll.js`。
- **To**：Vite 环境下的统一动画循环 + TypeScript 版 Zustand store。
- **How**：
  1. 在 `src/main.tsx` 中注册 `ScrollTrigger`，并用 Tempus 驱动 `gsap.updateRoot`；透传时间给全局 RAF。  
  2. 将 `useScroll` Hook 改写为 TypeScript，维持 `lenis.on('scroll')` 的事件签名，并在订阅后立即 `lenis.emit()`。  
  3. Refactor Zustand store：定义 `lenis`, `introOut`, `thresholds`, `triggerTransition`, `setTheme` 等状态类型，保留 PageTransition/导航需要的字段。  
  4. 在 `Layout` 中初始化 Lenis（`smoothWheel`, `syncTouch`），挂到 store 与 `window.lenis`，在 `useEffect` 清理；同时通过 Tempus 注册 `lenis.raf(time)` 保持时间同步。
- **Why**：运行时是所有动画的基础，迁移后只有入口文件和编译方式变化，逻辑需完全一致才能保证时序正确。

---

## 5. 全局组件迁移

- **From**：`layouts/default` 与 `components/*` 中的 JS + SCSS 组件。
- **To**：`src/components` 下的 React + TypeScript + SCSS 模块实现，保留所有与动画相关的组件（包括 PageTransition、Navigation、Footer 等），仅替换掉依赖 Next Router 的部分。
- **How**：
  - `Layout`：继续组合 Intro/Scrollbar/Cursor/Modal/RealViewport/PageTransition/Nav/Footer，利用 Zustand 控制主题与转场；将 Next `useRouter` 调用改为自定义导航或 no-op。  
  - `Intro`：复刻计时、`lenis.stop()`/`start()`、`setIntroOut(true)`；保留原 SCSS 模块控制 SVG 路径和遮罩延迟。  
  - `Cursor`：维持 GSAP tween、`data-cursor` 机制与 SCSS 外观，只需将 refs/GSAP timeline 加上类型。  
  - `Scrollbar`：继续监听 Lenis 事件，用 `scaleX(scroll/limit)` 绘制进度，SCSS 负责定位。  
  - `Modal`：保持 10 秒后自动打开、阻止滚动/恢复滚动的逻辑；保留 SCSS 布局。  
  - `Button`/`ListItem`/`Card`：迁移现有 hover/reveal SCSS，避免引入新的原子类体系。  
  - `RealViewport`：维持 `--vh`/`--svh`/`--dvh` 变量写入。  
  - `PageTransition` 与 `Navigation`：保留 GSAP Timeline 与视觉元素，只需在没有 Next Router 的环境下改写跳转触发方式（例如触发自定义事件或保持为可扩展组件）。
- **Why**：这些组件直接影响全局交互与视觉节奏，保持原结构 + SCSS 可以避免额外联动修改。

---

## 6. Home 页面分段迁移

- **From**：`pages/home/index.js` 巨型组件 + `home.module.scss`。
- **To**：`src/sections/*.tsx` 分段组件，继续引用对应的 `*.module.scss` 文件。
- **How**：
  1. 拆分 `Hero`, `Why`, `Rethink`, `Slides`, `Solution`, `FeatureCards`, `InUse` 等段落，保持数据结构与动画 Hook 不变。  
  2. 将 `useRect`, `useWindowSize`, `useIntersection` 等逻辑搬到各段落；必要时提取成独立 Hook 并加上类型。  
  3. `Hero`：保留 `HeroTextIn` 与 `--progress1/2` 变量写入，SCSS 继续控制掩膜和主题切换。  
  4. `Why`/`Rethink`：继续配合 `<AppearTitle />` 与 `<Parallax />`，Stickied 布局仍由 SCSS 控制（`position: sticky`、边框动效）。  
  5. `Slides`（HorizontalSlides）：沿用 `gsap.to` 逻辑与 `.slides` SCSS 布局；将尺寸计算/resize 逻辑 TS 化。  
  6. `Solution`：保持 `zoomRef` 计算与 `--progress1/2` 变量，SCSS 继续负责缩放、背景色与主题切换。  
  7. `FeatureCards`：保留 `setCurrent(step)`、`--progress`，SCSS 继续处理 `transform`/`transition-delay`。  
  8. `InUse`：沿用 Intersection Observer + `visible` class，SCSS 控制 `translateY`/`opacity`。
- **Why**：段落拆分只影响文件组织，动画逻辑、样式与编排全部照搬可减少回归风险。

---

## 7. 动画子组件迁移

- **From**：`components/appear-title`, `components/parallax`, `components/horizontal-slides`, `components/sticky`, `hooks/use-scroll` 等 JS 版本。
- **To**：TypeScript + SCSS 模块版本（运行在 Vite 客户端环境）。
- **How**：
  - `AppearTitle`：继续在 `useLayoutEffect` 中使用 GSAP SplitText，并保持原 SCSS 的 `overflow:hidden` + `transform` 过渡。  
  - `Parallax`：保留 ScrollTrigger `scrub` 逻辑，类型化 `speed`、`target` props；SCSS 控制定宽/定位。  
  - `HorizontalSlides`：复用当前 `gsap.to` 与 `useScroll`，在 TypeScript 中补充 refs 类型与滚动计算；SCSS 保留 sticky 容器。  
  - `Sticky`：若继续使用，保留 `ScrollTrigger.create({ pin: ... })` 逻辑，声明 props 类型。  
  - `useScroll`：参照第 4 节实现，保持事件签名；必要时导出 `LenisScrollEvent` 类型，供所有段落共享。
- **Why**：这些子组件直接驱动画布/文字/卡片的行为，TypeScript 化能提升稳定性而不影响原先编排。

---

## 8. WebGL（Arm + 粒子场景）

- **From**：`components/webgl/index.js`、`components/webgl/particles/*`、Arm GLB、Zustand 阈值。
- **To**：`src/components/WebGL.tsx`（或拆分为 `Arm.tsx` 与 `Particles.tsx`），保持 Arm 模型与粒子场景共存，全部 TypeScript 化。
- **How**：
  1. 使用 `vite-plugin-glsl` 继续加载 `vertex.glsl`/`fragment.glsl`，并将 `uniforms`/`attributes` 声明为 TS 类型。  
  2. 保留 `Arm` GLB 与相关动画步骤（`steps` 数组、阈值驱动、GSAP timeline），仅更新资源路径与导入方式。  
  3. 通过 Zustand `thresholds` 与 `useScroll` 将滚动信息同步到粒子与 Arm，两者的 `uScroll`/`uTime` 保持与现有逻辑一致。  
  4. 维持 `<Canvas frameloop="never">` 和自定义 `<Raf render={render} />` 组件，确保与 Lenis/GSAP 同步。  
  5. 如需调试，可继续使用 `leva` 面板，但记得在生产构建中按需剥离。
- **Why**：Arm 模型与粒子共同构成首页视觉记忆点，必须原样保留；只要改写导入与类型声明即可在 Vite 中稳定运行。

---

## 9. 全量 TypeScript 化

- **From**：JavaScript 组件/Hook，无显式类型。
- **To**：TypeScript 组件、Hook、store。
- **How**：
  - 定义 `LenisScrollEvent`, `Threshold`, `Theme`, `ModalState` 等类型。  
  - 为 Zustand actions（`setLenis`, `addThreshold`, `triggerTransition` 等）声明接口，方便在组件中获得自动补全。  
  - 给所有 SCSS Modules 添加类型（可使用 `declare module '*.module.scss'`）。  
  - 为 GSAP/SplitText/Tempus 等无类型包补充 `.d.ts`，或引用社区类型定义。  
  - 将所有 `.js/.jsx` 依次迁移到 `.ts/.tsx`，迁移过程中保持逻辑不变，优先处理入口与 store，逐步扩展到组件。
- **Why**：排除隐式 `any`，为动画组件提供更安全的依赖与属性约束。

---

## 10. 验证步骤

- **From**：Next 本地运行 + DevTools 检查。
- **To**：Vite `pnpm dev` + 浏览器验证。
- **How**：
  - 首屏：Intro 阻止滚动 → 出场后恢复；Hero Scroll hint 动效正常。  
  - 段落滚动：Parallax、HorizontalSlides、Solution、FeatureCards、InUse 等动画与原站一致。  
  - WebGL：Arm 关键帧、粒子噪声、滚动联动全部存在；`thresholds` 与状态同步正确。  
  - Modal：10 秒弹窗、关闭恢复滚动。  
  - Cursor/Scrollbar：形态、延迟、鼠标跟随与滚动进度正常。  
  - Performance：录制 FPS，确认无掉帧；控制台无样式或 GSAP 警告。  
  - 浏览器：桌面 Chrome / Edge 最新版即可。
- **Why**：验证覆盖用户所有可见动画，确保迁移后体验无差异。

---

## 11. 清理交付

- **From**：包含 Next 相关配置、SSR API、PWA、额外页面。
- **To**：单页 Home 项目，仅保留动画所需资产。
- **How**：
  - 移除 `next.config.js`, `next-sitemap.config.js`, `pages/*`, API Routes、`app/`（如有）、`document/app` 包装组件。  
  - 将多余页面（`docs`, `snap` 等）改写为可选内容或文档，默认构建只输出 Home。  
  - 更新 `package.json` scripts 为 `dev` / `build` / `preview`，并说明需要 `pnpm install`。  
  - 更新 README：说明新项目结构、运行命令、SCSS 入口、WebGL 资产位置。  
  - `pnpm build` → `pnpm preview`，确认输出的静态资源包含 WebGL 纹理/GLB/Shader。  
- **Why**：交付物需清晰说明如何运行/构建/部署，同时保留动画资产，方便团队协作。

---

## 12. 风险与缓解

- SCSS 依赖 `desktop-vw` 等 mixin → 在 `vite.config.ts` 中统一注入，防止忘记导入导致编译失败。  
- Lenis/GSAP 的 RAF 顺序 → 迁移时谨慎处理 Tempus 注册顺序，避免出现双重 RAF 或 ticking 失步。  
- WebGL 资源路径 → Vite 默认将静态资源打包到 `dist/assets`，确保 GLB/shader 使用 `new URL('./arm.glb', import.meta.url)` 等写法。  
- TypeScript 引入的 strict 检查 → 先在 store/Hook 中补充类型，再迁移组件，降低一次性报错密度。  
- 依赖 Next Router 的组件（PageTransition/Nav） → 需要新的导航策略或事件触发机制，迁移时至少保证动画 timeline 可以独立触发。

---

## 13. 文件迁移映射表

### 必须迁移（核心动画）

| 原路径 | 新路径 | 优先级 | 改动点 |
|--------|--------|--------|--------|
| `pages/_app.js` | `src/main.tsx` + `src/App.tsx` | P0 | 待迁移：统一 Tempus + GSAP RAF，注册 ScrollTrigger，接管全局样式与状态注入 |
| `lib/store.js` | `src/store/index.ts` | P0 | 待迁移：Zustand 类型定义、保留 lenis/introOut/thresholds/triggerTransition 状态 |
| `hooks/use-scroll.js` | `src/hooks/useScroll.ts` | P0 | 待迁移：Lenis 事件订阅 TypeScript 化，维持 `emit` 行为 |
| `lib/maths.js` | `src/utils/math.ts` | P0 | 待迁移：clamp/mapRange/lerp 等工具并补充类型 |
| `layouts/default/index.js` | `src/components/Layout.tsx` | P0 | 待迁移：Lenis 初始化 + Tempus `useFrame` + 全局组件挂载，移除 Next 专属 API |
| `components/intro/` | `src/components/Intro.tsx` | P0 | 待迁移：保留计时与遮罩 SCSS，TS 化 props/state |
| `components/real-viewport/` | `src/components/RealViewport.tsx` | P0 | 待迁移：窗口变更写入 `--vh`/`--svh`/`--dvh` |
| `components/cursor/` | `src/components/Cursor.tsx` | P1 | 待迁移：GSAP 跟随指针 + SCSS 外观的 TS 化 |
| `components/scrollbar/` | `src/components/Scrollbar.tsx` | P1 | 待迁移：Lenis progress → scaleX，保留 SCSS 样式 |
| `components/modal/` | `src/components/Modal.tsx` | P1 | 待迁移：计时触发 + Lenis stop/start，样式沿用 SCSS |
| `components/link/` | `src/components/Link.tsx` | P1 | 待迁移：统一外链/按钮逻辑，补全类型 |
| `components/button/` | `src/components/Button.tsx` | P1 | 待迁移：CTA 样式/交互 TS 化，继续引用 SCSS |

### Home 页面段落

| 原路径 | 新路径 | 优先级 | 依赖组件 |
|--------|--------|--------|----------|
| `pages/home/index.js` (Hero) | `src/sections/Hero.tsx` | P0 | 待迁移：HeroTextIn、Scroll hint、主题切换，依赖 Intro 状态 |
| `pages/home/index.js` (Why) | `src/sections/Why.tsx` | P1 | 待迁移：Stickied 左列 + `<AppearTitle />` + 阈值写入 |
| `pages/home/index.js` (Rethink) | `src/sections/Rethink.tsx` | P1 | 待迁移：Parallax 文字 + HorizontalSlides 入口 |
| `pages/home/index.js` (Slides) | `src/sections/Slides.tsx` | P1 | 待迁移：GSAP 横向滚动 + Sticky 容器 |
| `pages/home/index.js` (Solution) | `src/sections/Solution.tsx` | P0 | 待迁移：`zoomRef` → `--progress1/2` 缩放、主题切换 |
| `pages/home/index.js` (Features) | `src/sections/Features.tsx` | P1 | 待迁移：Sticky CTA + FeatureCards 时间线 |
| `pages/home/index.js` (InUse) | `src/sections/InUse.tsx` | P2 | 待迁移：Intersection Observer 列表 reveal |

### 动画组件

| 原路径 | 新路径 | 优先级 | 关键点 |
|--------|--------|--------|--------|
| `components/appear-title/` | `src/components/AppearTitle.tsx` | P1 | 待迁移：GSAP SplitText + SCSS 掩膜 |
| `components/parallax/` | `src/components/Parallax.tsx` | P1 | 待迁移：ScrollTrigger scrub + TypeScript props |
| `components/horizontal-slides/` | `src/components/HorizontalSlides.tsx` | P1 | 待迁移：Sticky + 横向滚动计算 |
| `components/feature-cards/` | `src/components/FeatureCards.tsx` | P1 | 待迁移：`setCurrent` 状态、SCSS 延迟动画 |
| `components/sticky/` | `src/components/Sticky.tsx` | P2 | 待迁移：ScrollTrigger pin 封装 |
| `components/page-transition/` | `src/components/PageTransition.tsx` | P2 | 待迁移：GSAP Timeline + 自定义导航触发 |
| `components/navigation/` | `src/components/Navigation.tsx` | P2 | 待迁移：按钮交互 + Cursor 状态联动 |

### WebGL / Particles

| 原路径 | 新路径 | 优先级 | 改动 |
|--------|--------|--------|------|
| `components/webgl/index.js` | `src/components/WebGL.tsx` | P1 | 待迁移：保留 Arm + 粒子场景，TypeScript 化并适配 Vite 资源路径 |
| `components/webgl/particles/vertex.glsl` | `src/shaders/particles.vert` | P1 | 待迁移：改为 Vite `import` 写法，保持 uniform 命名 |
| `components/webgl/particles/fragment.glsl` | `src/shaders/particles.frag` | P1 | 待迁移：同上，复用噪声逻辑 |

---

按以上步骤推进，即可在 Vite + TypeScript + SCSS 环境下复刻 Lenis 官网动画，同时满足“移除 Next.js + 保留 Arm + 全量 TS 化”的目标。搬砖加油！💪
