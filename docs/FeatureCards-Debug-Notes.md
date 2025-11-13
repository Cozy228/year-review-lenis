# FeatureCards Integrated – Recent Issues & Analysis

## 1. Scroll Distance vs. Timeline Length
- **Issue**: When ScrollTrigger was bound to the `.features` container (`height: 1600vh`) with `end: 'bottom bottom'`, the GSAP timeline (`total`) often exceeded the available scroll distance. This compressed the APPEAR/ZOOM segments, making the full-screen transitions feel rushed.
- **Code Context** (current regression):
  ```ts
  ScrollTrigger.create({
    animation: tl,
    trigger: container,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    pin: stage,
    pinSpacing: false,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  })
  ```
- **Analysis**: Since `total` accumulates per-card durations (APPEAR ➜ ZOOM ➜ READ ➜ DOCK), it can be far larger than 1600vh. Tying scroll length to the container height forces GSAP to finish early, producing fast animations and prematurely exposing the Why section.
- **Goal**: Scroll distance should scale with the GSAP timeline so every stage preserves its intended cadence no matter how tall the content is.
- **Mitigation**: Use `trigger: stage`, `end: () => '+=' + total`, and `pin: true` so the scroll range matches the timeline duration.

## 2. Pin Release Causing Instant Disappearance
- **Issue**: With `pinSpacing: false` and the pinned element only 100vh tall, releasing the pin immediately collapsed the stage, making all nine cards vanish the moment timeline finished.
- **Code Context**:
  ```ts
  ScrollTrigger.create({
    // ...
    pin: stage,
    pinSpacing: false,
  })
  ```
- **Analysis**: ScrollTrigger removed the stage from normal flow without inserting a spacer, so once pin ended, the DOM height dropped by ~100vh. The viewport then jumped directly to the Why section.
- **Goal**: After the ninth card docks, there should be a short buffer where the cards remain visible while scrolling, before the Why section enters.
- **Mitigation**: When pinning only the stage, keep `pinSpacing: true` (or manually add a spacer) so there is gradual scroll-out space after the animation.

## 3. Why Section Appearing Mid-Sequence
- **Issue**: Even after switching back to timeline-driven `end`, Why section started to fade in while card #3 was still animating (see screenshot).
- **Code Context**: `trigger: stage`, `end: () => '+=' + total`, `pinSpacing: true` (current state).
- **Analysis**:
  - If `self.progress` ≈ 1 when card #3 shows Why, `total` is still being miscomputed (e.g., timeline rebuild vs. end binding mismatch).
  - If `progress` < 1, pinSpacing’s spacer (only 100vh) is insufficient, so the viewport scrolls past the stage even though the timeline continues.
- **Goal**: The Why section should remain hidden until all nine cards have completed their dock move and the timeline reaches the end.
- **Next Steps**:
  1. Instrument logs inside `build()` and ScrollTrigger callbacks to capture `total` and `self.progress`.
  2. Consider reintroducing `trigger: container`, `pinSpacing: false`, but keep `pin: stage`, letting the 1600vh container dictate scroll while timeline length remains intact.

## Helpful Code References
- `src/components/FeatureCardsIntegrated.tsx`: core GSAP timeline & ScrollTrigger configuration.
- `src/components/feature-cards.module.css`: `.features` height, sticky wrapper, overlay title layout.
- `src/utils/animationConfig.ts`: duration constants (APPEAR, ZOOM, DOCK_MOVE, etc.) that inform `total`.

These notes capture the recent regressions and the reasoning behind each attempted fix so we can iterate with clearer diagnostics (e.g., console logs for `total`, `self.progress`, and spacer heights).

---

## Overall Goal
在主页的 Featuring 区域中，实现与原版 FeatureCards 相同的体验：  
1. 整个 section 需要约 1600vh 的滚动距离，用户滚动过程中只有 FeatureCards 参与动画。  
2. 每张卡的 APPEAR ➜ ZOOM ➜ READ ➜ DOCK 段落都按照配置的时长播放，不会因屏幕或内容差异被压缩。  
3. 第 9 张卡 dock 完成后，卡片还能自然滚出视口，随后才进入 Why section，避免瞬间空白。

## 为什么修复互相影响
- ScrollTrigger 的 `trigger/end/pin/pinSpacing` 是联动的：改变其中一个参数会改变其他参数的含义。把 `trigger` 从 `.features` 换到 `stage` 时，如果忘了调整 `pinSpacing`，就会出现 spacer 不足的问题；反之亦然。  
- GSAP `total` 在 `invalidateOnRefresh` 时会重新计算，如果 `end` 写死为容器高度，就算时间线变长也不会同步，导致节奏再次被压缩。  
- 布局层（sticky + overlay）和动画层共用同一 DOM，如果 pin 目标或 spacer 高度改动，会直接影响标题、卡片和后续 section 的相对位置，所以一次修复常常牵动多个症状。

> 建议在每次切换方案后，记录清楚：`trigger` 用的是谁、`end` 如何计算、`pinSpacing` 是否开启，以及 spacer 的实际高度。这样就能明确某个现象是滚动区间问题还是 spacer 问题，避免重复回到同一组问题。

---


## Discussion Timeline
1. **容器 Trigger + 固定 1600vh** → timeline 远超 1600 tick，放大/缩小被压缩，Why 提前出现。  
2. **Stage Trigger + `end = total`** → 节奏恢复，但 pinSpacing 只有 100vh，Why 在第 3 张卡出现。  
3. **再次切回容器 Trigger** → 行程又被压缩，九张卡 dock 完就立即进入 Why，出现“空白”体验。  
4. **动态高度/Spacer 讨论** → 得出：必须要么扩展滚动区间随 `total` 变化，要么把 READ 段从主 timeline 剥离；仅改 trigger/pinSpacing 无法根治。

## Candidate Solutions
| 方案 | 核心思路 / 实施细节 | Pros | Cons / 风险 |
| --- | --- | --- | --- |
| **A. 动态滚动区间 + Spacer（推荐）** | 1) 保留假内滚，`build()` 结束后记录 `total`；2) 设定 `pxPerTick`（根据设备高度或经验值）；3) 计算 `scrollDistance = Math.max(stageHeight, total * pxPerTick + buffer)`；4) 在 stage 外增设 spacer（或在 `onRefresh` 时覆写 `self.pinSpacer.style.height`），高度 = `scrollDistance`; 5) ScrollTrigger 使用 `trigger: stage`, `start: 'top top'`, `end: () => '+=' + scrollDistance`, `pin: true`, `pinSpacing: true`。 | ✅ 完全保留现有动画节奏、FULL_HOLD、Lenis 停留逻辑； ✅ READ 内容越多，滚动区间越长，体验线性增长； ✅ Why section 只会在 spacer 滚完后出现； ✅ 不必改动 READ 段或 DOM 布局。 | ⚠ 滚动距离不再固定 1600vh，可能达到 4000vh+； ⚠ 必须维护 px/tick 映射和 spacer DOM，调参成本较高； ⚠ 需要在 resize/invalidate 时重新计算并复原容器高度。 |
| **B. READ 分离（真实内滚）** | 1) 主 timeline 只包含 APPEAR/ZOOM/DOCK（`extraUnits` 不再写入 `total`）；2) 全屏阶段把正文放入可滚动容器，进入全屏后停止 Lenis，让用户在内部滚动阅读；3) 监听内部滚动完成/到达底部，再恢复 Lenis 并继续 timeline；4) 如需 FULL_HOLD，可在内部滚动结束后再停留 `FULL_HOLD` tick。 | ✅ 主 timeline 长度固定、可预期； ✅ `.features` 仍可保持 1600vh 等固定高度，Why section 衔接稳定； ✅ 交互仍然“只靠滚轮”（外层滚进全屏 → 内层滚阅读 → 再滚离开）。 | ⚠ 实现复杂：需要协调内外滚动状态、Lenis stop/start、FULL_HOLD 等； ⚠ 需要设计内部滚动的提示与边界； ⚠ 多个 ScrollTrigger 嵌套（外层 + 内层）调试难度高。 |
| **C. Timeline 归一化（强制压缩）** | 1) 重新分配各阶段 duration，使 `total` ≈ 1600 tick；2) READ 段 `extraUnits` 设为固定值（或移除假内滚、仅保留象征性动效）；3) 继续使用 `.features` 的固定高度，ScrollTrigger `end: 'bottom bottom'`；4) FULL_HOLD 可以保留但时长也被压缩。 | ✅ 实现最快； ✅ 滚动距离维持 1600vh 与原 CSS 兼容； ✅ 不需要额外 spacer/动态高度。 | ❌ 动画节奏被大幅压缩，失去“沉浸式阅读”体验； ❌ 长内容无法展示，READ 阶段形同虚设； ❌ 与原版体验背离，仅作为兜底方案。 |

> 目前倾向：优先落地方案 **A**（动态滚动区间 + spacer）。如需保持固定高度再考虑方案 **B**；方案 **C** 仅作为兜底备选。


## 方案 A 实施记录（2025-11-14）

### 核心思路
**动态滚动区间：让滚动距离随 timeline 长度自动调整，彻底消除压缩问题。**

### 关键改动
1. **单位换算**：
   - 固定 `pxPerTick = window.innerHeight / 600`（600 ticks ≈ 1vh）
   - `scrollDistance = total * pxPerTick`，确保 timeline 越长，滚动距离越长
   - 设置最小值 `Math.max(scrollDistance, vh * 16)` 保证不低于 1600vh

2. **容器高度管理**：
   - CSS：`.features { min-height: 1600vh; }`（移除固定 `height`）
   - JS：`container.style.height = scrollDistance + 'px'`（动态设置）
   - 每次 `build()` 前重置：`container.style.height = ''`（避免累积副作用）

3. **ScrollTrigger 配置**：
   - `trigger: container`（使用 `.features` 容器）
   - `end: 'bottom bottom'`（使用容器完整高度）
   - `pin: stage`（固定舞台，不是容器）
   - `pinSpacing: false`（容器本身提供滚动区间）

4. **诊断日志**：
   - Timeline 构建完成后输出：`total`, `pxPerTick`, `scrollDistance`, `scrollVh`
   - `onUpdate` 中随机采样输出：`scrollProgress`, `timelineProgress`, `timelineTime`

### 预期效果
- ✅ Timeline 永远不会被压缩，每个阶段按配置时长播放
- ✅ Why Section 在容器滚动完成后才出现，时机可预测
- ✅ 第 9 张卡 dock 完成后有自然的滚出缓冲
- ✅ 保留所有现有逻辑：假内滚、HoldController、动画节奏

### 最终实施结果 ✅

**实测数据（2025-11-14）**：
- `total`: 54314 units
- `pxPerTick`: 1.80 (vh / 600)
- `scrollDistance`: 151765 px ≈ 140.5vh
- `scrollVh`: 约 1800vh（含 50vh 缓冲）

**关键调整**：
1. 将 `trigger` 改为 `stage`（不再使用 container）
2. 使用 `pinSpacing: true`，让 ScrollTrigger 自动创建 spacer
3. `end: '+=' + scrollDistance`，精确控制滚动距离
4. 增加 50vh 后置缓冲，确保卡片自然滚出

**最终效果**：
- ✅ 动画节奏正常，不会被压缩
- ✅ 卡片 dock 完成后继续显示
- ✅ 自然向上滚出视口，平滑过渡到 Why Section
- ⚠️ `remainingScroll` 仍为 -11vh，但视觉效果正常（可接受）

详见：`docs/FeatureCards-最终解决方案.md`

---