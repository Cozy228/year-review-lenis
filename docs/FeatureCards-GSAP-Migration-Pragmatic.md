# FeatureCards → GSAP 务实迁移方案

## 🎯 核心目标

将 FeatureCards 视觉风格与 Card 的 GSAP 动画系统融合，采用**迭代式开发**，每步都可验证。

---

## ⚠️ 关键认知

### 一次性实现的风险

❌ **不可行**：写 500+ 行代码，期望一次跑通  
✅ **可行**：分 5-6 个小步骤，每步独立验证

### 黄金参照物

- **Card (card/src/App.tsx)**：完整的 GSAP 动画系统
- **FeatureCards (src/components/FeatureCards.tsx)**：视觉设计来源

---

## 一、核心差异（必须理解）

### 1. DOM 结构差异

```typescript
// ❌ 原 FeatureCards：单层
<div className={s.card}>
  <Card number={1} text="..." />
</div>

// ✅ Card (GSAP)：三层（必须）
<article className="card">
  <div data-role="cover">封面（ZOOM 时淡出）</div>
  <div data-role="content">
    <div data-role="content-inner">内容（假内滚移动）</div>
  </div>
</article>
```

**为什么必须三层？**
- GSAP 通过 `querySelector('[data-role="cover"]')` 查询元素
- 假内滚需要独立的 `content-inner` 层进行 y 轴平移

### 2. 动画机制差异

```typescript
// ❌ 原 FeatureCards：离散状态切换
const step = Math.floor(progress * 10)
setCurrent(step)  // 触发 React re-render
// CSS transition 执行动画

// ✅ Card：连续时间线
tl.to(card, { left: centerLeft, duration: 1200 }, total)
tl.to(card, { width: vw, duration: 700 }, total + 1200)
// 滚动直接驱动时间线进度
```

### 3. 假内滚的实现

```typescript
// Card 的核心：测量 → 平移
const extraPx = measureExtraPxFull(...)  // 测量超出高度
tl.to(contentInner, { y: -extraPx }, total)  // 向上平移
```

---

## 二、迭代式实施路线（6 步）

### 🟢 阶段 0：准备工作（1 小时）

**目标**：建立基础设施，不写动画代码

#### 任务清单

1. **创建文件结构**
   ```bash
   src/
   ├── components/
   │   ├── FeatureCardsGsap.tsx        # 新建（空容器）
   │   └── CardContentGsap.tsx         # 新建（三层结构）
   ├── utils/
   │   └── HoldController.ts           # 复制 card/src/App.tsx 25-168 行
   ├── styles/
   │   └── feature-cards-gsap.css      # 新建（基础样式）
   ```

2. **安装依赖**
   ```bash
   pnpm add lorem-ipsum
   pnpm add -D @types/lorem-ipsum
   ```

3. **创建测试页面**
   ```typescript
   // src/pages/TestFeatureCardsGsap.tsx
   export default function TestPage() {
     return <div>测试页面</div>
   }
   ```

#### 验证点

- [ ] 文件创建成功
- [ ] 依赖安装成功
- [ ] 测试页面可访问

---

### 🟡 阶段 1：静态三层结构（2 小时）

**目标**：实现正确的 DOM 结构，**不写任何 GSAP 动画**

#### 核心任务

**1. 实现 CardContentGsap（仅结构）**

```typescript
// src/components/CardContentGsap.tsx
interface Props {
  number: number
  text: string
  body: string[]
}

export const CardContentGsap = ({ number, text, body }: Props) => {
  return (
    <>
      {/* 封面层 */}
      <div data-role="cover" className="absolute inset-0 bg-neutral-100">
        <p>{number}</p>
        <p>{text}</p>
      </div>

      {/* 内容层 */}
      <div data-role="content" className="absolute inset-0 opacity-0">
        <div data-role="content-inner" className="p-6">
          {body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </>
  )
}
```

**2. 实现容器（仅渲染）**

```typescript
// src/components/FeatureCardsGsap.tsx
export const FeatureCardsGsap = () => {
  const cards = [
    { id: 'c1', number: 1, text: 'Card 1', body: ['段落1', '段落2'] },
  ]

  return (
    <section className="h-[200vh]">
      {cards.map(card => (
        <article key={card.id} className="fixed w-[520px] h-[340px]">
          <CardContentGsap {...card} />
        </article>
      ))}
    </section>
  )
}
```

#### 验证点

- [ ] 在浏览器 DevTools 中能看到三层结构
- [ ] `data-role="cover"` 存在
- [ ] `data-role="content"` 存在
- [ ] `data-role="content-inner"` 存在
- [ ] 封面可见，内容层不可见（opacity: 0）

#### 常见问题

**Q: 看不到卡片？**
- 检查 `position: fixed` 是否生效
- 检查 `width` 和 `height` 是否设置

---

### 🟡 阶段 2：最小化 GSAP 时间线（3 小时）

**目标**：实现 2 个阶段动画，验证 GSAP 基础可用

#### 核心任务

**1. 初始化 GSAP**

```typescript
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

useLayoutEffect(() => {
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  let total = 0

  // 只实现 2 个阶段
  const card = document.querySelector('[data-card-id="c1"]')
  
  // 阶段 1: APPEAR (右下角 → 居中)
  gsap.set(card, { left: vw - 520 - 16, top: vh - 340 - 16 })
  tl.to(card, {
    left: (vw - 520) / 2,
    top: (vh - 340) / 2,
    duration: 1200,
  }, total)
  total += 1200

  // 阶段 2: ZOOM (居中 → 全屏)
  tl.to(card, {
    left: 0,
    top: 0,
    width: vw,
    height: vh,
    duration: 700,
  }, total)

  // 创建 ScrollTrigger
  ScrollTrigger.create({
    animation: tl,
    trigger: stageRef.current,
    start: 'top top',
    end: () => '+=' + total,
    scrub: 1,
    pin: true,
  })
}, [vw, vh])
```

#### 验证点

- [ ] 滚动时卡片从右下角移动到居中
- [ ] 继续滚动卡片放大到全屏
- [ ] 动画流畅，无卡顿
- [ ] 封面在 ZOOM 阶段保持可见

#### 常见问题

**Q: ScrollTrigger 不工作？**
- 检查 `gsap.registerPlugin(ScrollTrigger)` 是否调用
- 检查 `trigger` 元素是否存在

**Q: 动画不流畅？**
- 检查 `scrub` 值（1 = 平滑）
- 检查 console 是否有错误

---

### 🟠 阶段 3：封面/内容切换（2 小时）

**目标**：在 ZOOM 时淡出封面，淡入内容

#### 核心任务

**1. 查询封面和内容元素**

```typescript
const cover = card.querySelector('[data-role="cover"]')
const contentWrap = card.querySelector('[data-role="content"]')

if (!cover || !contentWrap) {
  console.error('Missing data-role elements')
  return
}
```

**2. 添加淡入淡出**

```typescript
// 在 ZOOM 阶段同时执行
tl.to(card, { left: 0, top: 0, width: vw, height: vh, duration: 700 }, total)
tl.to(cover, { opacity: 0, duration: 700 }, total)  // 封面淡出
total += 700

// TEXT_FADE: 内容淡入
tl.to(contentWrap, { opacity: 1, duration: 140 }, total)
total += 140
```

#### 验证点

- [ ] ZOOM 时封面逐渐消失
- [ ] 全屏后内容逐渐出现
- [ ] 两者切换自然

---

### 🟠 阶段 4：假内滚（4 小时，**重点难点**）

**目标**：实现内容的假内滚效果

#### 核心任务

**1. 复制测量函数**

从 `card/src/App.tsx` 256-273 行复制 `measureExtraPxFull` 函数

**2. 测量并平移**

```typescript
const contentInner = card.querySelector('[data-role="content-inner"]')

const extraPx = measureExtraPxFull(
  card,
  contentWrap,
  contentInner,
  vw,
  vh,
  { left: centerLeft, top: centerTop, width: 520, height: 340 }
)

const extraUnits = Math.max(1, Math.round(extraPx))

// 添加到时间线
tl.to(contentInner, { y: -extraPx, duration: extraUnits }, total)
total += extraUnits
```

#### 验证点

- [ ] `measureExtraPxFull` 返回值 > 0
- [ ] 滚动时内容向上移动
- [ ] 可以看到底部的段落
- [ ] 移动速度合理

#### 调试技巧

```typescript
console.log('extraPx:', extraPx)
console.log('contentInner height:', contentInner.getBoundingClientRect().height)
console.log('contentWrap height:', contentWrap.getBoundingClientRect().height)
```

---

### 🔴 阶段 5：HoldController（6 小时，**最复杂**）

**目标**：实现滚动冻结和交互

#### ⚠️ 分解任务

**5.1 复制 HoldController 类（1 小时）**

从 `card/src/App.tsx` 25-168 行完整复制到 `src/utils/HoldController.ts`

**验证点**：
- [ ] 类可以实例化
- [ ] 无 TypeScript 错误

**5.2 集成 overlay（2 小时）**

```typescript
const holdCtl = new HoldController()

// 在时间线中添加 FULL_HOLD 阶段
tl.to({}, { duration: 500 }, total)
const tHoldEnd = total + 500
total += 500
```

**验证点**：
- [ ] `holdCtl.begin()` 可以调用
- [ ] overlay 元素出现在 DOM 中
- [ ] 滚动被阻止

**5.3 事件响应（2 小时）**

测试三种输入：
- [ ] 鼠标滚轮
- [ ] 触摸滑动（移动端）
- [ ] 键盘（Space/Arrow）

**5.4 反向保护（1 小时）**

从 `card/src/App.tsx` 404-423 行复制反向保护逻辑

---

### 🟢 阶段 6：多卡片 + 完整时间线（3 小时）

**目标**：扩展到 9 张卡片，实现完整 10 阶段时间线

#### 核心任务

1. **生成卡片数据**
   ```typescript
   const cards = Array.from({ length: 9 }, (_, i) => ({
     id: `c${i + 1}`,
     number: i + 1,
     text: cardTexts[i],
     body: generateBody(15, 30),
   }))
   ```

2. **循环构建时间线**
   ```typescript
   cards.forEach((card, i) => {
     // 完整 10 阶段
   })
   ```

3. **添加剩余阶段**
   - 文本淡出
   - 退出全屏
   - Dock 移动
   - 卡片间隔

#### 验证点

- [ ] 9 张卡片依次出现
- [ ] 每张卡片完整动画
- [ ] Dock 效果正确

---

## 三、关键检查点（每阶段必做）

### 通用验证步骤

1. **代码检查**
   - [ ] 无 TypeScript 错误
   - [ ] 无 console 警告

2. **浏览器测试**
   - [ ] Chrome DevTools 无错误
   - [ ] 动画流畅（60fps）
   - [ ] 滚动响应正常

3. **回退策略**
   - 每个阶段完成后立即 `git commit`
   - 出问题时可以快速回退

---

## 四、风险预案

### 高风险点

1. **假内滚测量不准确**
   - **症状**：extraPx = 0 或负数
   - **排查**：检查 body 内容是否足够长
   - **方案**：临时硬编码 `extraPx = 500` 验证逻辑

2. **HoldController 不工作**
   - **症状**：滚动无法冻结
   - **排查**：检查 lenisSingleton 是否正确
   - **方案**：先跳过 FULL_HOLD 阶段

3. **data-role 查询失败**
   - **症状**：`querySelector` 返回 null
   - **排查**：检查 DOM 结构是否正确渲染
   - **方案**：在每个查询后添加 console.log

### 调试工具

```typescript
// 时间线调试
ScrollTrigger.create({
  onUpdate(self) {
    console.log('Progress:', self.progress)
    console.log('Time:', tl.time())
  }
})

// DOM 调试
useEffect(() => {
  const cover = document.querySelector('[data-role="cover"]')
  console.log('Cover element:', cover)
}, [])
```

---

## 五、时间预估（总计 ~20 小时）

| 阶段 | 时间 | 累计 | 失败风险 |
|------|------|------|---------|
| 阶段 0 | 1h | 1h | 🟢 低 |
| 阶段 1 | 2h | 3h | 🟢 低 |
| 阶段 2 | 3h | 6h | 🟡 中 |
| 阶段 3 | 2h | 8h | 🟡 中 |
| 阶段 4 | 4h | 12h | 🟠 高 |
| 阶段 5 | 6h | 18h | 🔴 很高 |
| 阶段 6 | 3h | 21h | 🟡 中 |

**说明**：
- 阶段 4、5 是高风险点，可能需要额外调试时间
- 建议每天只完成 1-2 个阶段
- 总时间可能延长到 25-30 小时

---

## 六、成功标准

### 最小可行产品（MVP）

完成阶段 0-3，实现：
- ✅ 卡片从右下角出现
- ✅ 放大到全屏
- ✅ 封面淡出，内容淡入

### 完整版本

完成所有阶段，实现：
- ✅ 假内滚
- ✅ HoldController
- ✅ 9 张卡片
- ✅ 完整 10 阶段时间线

---

## 七、关键原则

1. **每次只改一处**：不要同时调试多个功能
2. **频繁 commit**：每个阶段完成立即提交
3. **console.log 是朋友**：不要吝啬调试输出
4. **参照黄金标准**：遇到问题看 `card/src/App.tsx`
5. **先跑通，再优化**：不要在第一遍就追求完美

---

## 八、下一步行动

### 立即开始

1. 阅读 `card/src/App.tsx` 的 `measureExtraPxFull` 函数（256-273 行）
2. 阅读 HoldController 类（25-168 行）
3. 创建阶段 0 的文件结构

### 准备工具

- Chrome DevTools Performance 面板（检查帧率）
- React DevTools（检查组件状态）
- Git（频繁提交）

---

## 总结

这不是一个"完美计划"，而是一个**可执行、可调试、可回退**的务实方案。

- 🟢 低风险阶段：快速完成，建立信心
- 🟠 高风险阶段：预留足够时间，准备多种方案
- 🔴 极高风险：可选功能，失败时可以跳过

**记住**：能跑起来的不完美代码，比完美但不存在的代码有价值 1000 倍。

