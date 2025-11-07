# Lenis Home - Vite Migration

基于 **Vite + React 18 + TypeScript + SCSS** 的 Lenis 官网 Home 页面迁移版本。

## 🎯 项目目标

将 Lenis 官网从 Next.js 迁移到 Vite，保留所有动画逻辑与视觉效果，同时实现全量 TypeScript 化。

## ✨ 特性

- ⚡️ **Vite** - 极速开发体验
- 🎨 **完整动画系统** - GSAP + ScrollTrigger + Lenis 平滑滚动
- 🎭 **复杂交互组件** - Intro、Cursor、Scrollbar、Modal 等
- 📐 **视差滚动** - Parallax、HorizontalSlides、FeatureCards
- 🔒 **类型安全** - 全量 TypeScript，严格模式
- 💅 **SCSS 模块化** - 保留原有样式体系
- 🎮 **RAF 统一管理** - Tempus + GSAP ticker 合并

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

## 📁 项目结构

```
src/
├── components/      # 全局组件 + 动画子组件
│   ├── Layout.tsx
│   ├── Intro.tsx
│   ├── Cursor.tsx
│   ├── Scrollbar.tsx
│   ├── Modal.tsx
│   ├── AppearTitle.tsx
│   ├── Parallax.tsx
│   ├── HorizontalSlides.tsx
│   ├── FeatureCards.tsx
│   └── *.module.scss
├── hooks/          # React Hooks
│   └── useScroll.ts
├── store/          # Zustand 状态管理
│   └── index.ts
├── styles/         # 全局样式
│   └── global.scss
├── utils/          # 工具函数
│   ├── math.ts
│   └── slugify.ts
├── App.tsx
└── main.tsx
```

## 🎨 核心组件

### 全局组件

- **Layout** - 布局容器，管理 Lenis 生命周期
- **Intro** - 加载动画与 SVG 路径动画
- **Cursor** - 自定义光标（GSAP 平滑跟随）
- **Scrollbar** - 自定义滚动条（Lenis 进度同步）
- **Modal** - 10秒延迟弹窗

### 动画子组件

- **AppearTitle** - 文字显现动画（SplitText）
- **Parallax** - 视差滚动效果
- **HorizontalSlides** - 横向滚动容器
- **FeatureCards** - 特性卡片堆叠动画
- **Card** - 基础卡片组件

## 🔧 技术栈

### 运行时
- React 19.2.0
- Lenis 1.3.14 - 平滑滚动
- GSAP 3.13.0 - 动画引擎
- Zustand 5.0.8 - 状态管理
- Three.js 0.181.0 - WebGL
- @darkroom.engineering/tempus 0.0.46 - RAF 管理
- @darkroom.engineering/hamo 0.6.46 - Hooks 工具

### 开发工具
- Vite 7.2.1
- TypeScript 5.9.3
- Sass 1.93.3
- vite-plugin-glsl 1.5.4

## 📊 当前状态

✅ **已完成** (70%)
- 项目配置与构建
- 样式体系迁移
- 状态管理（Zustand）
- 全局组件（Layout、Intro、Cursor、Scrollbar、Modal）
- 动画子组件（AppearTitle、Parallax、HorizontalSlides、FeatureCards）
- 工具库和 Hooks

⏳ **待完成** (30%)
- WebGL 场景（Arm 模型 + 粒子系统）
- Home 页面段落（Hero、Why、Rethink、Slides、Solution、Features、InUse）

详细迁移状态请查看 [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)

## 🎯 关键特性实现

### 1. 平滑滚动

使用 Lenis 实现原生级平滑滚动，在 `Layout.tsx` 中初始化：

```typescript
const lenisInstance = new Lenis({
  smoothWheel: true,
  syncTouch: true,
})
```

### 2. RAF 统一管理

使用 Tempus 将 GSAP ticker 与自定义 RAF 合并，避免多个动画循环：

```typescript
gsap.ticker.remove(gsap.updateRoot)
Tempus.add((time: number) => {
  gsap.updateRoot(time / 1000)
}, 0)
```

### 3. ScrollTrigger 集成

在每次滚动事件中更新 ScrollTrigger：

```typescript
useScroll(() => {
  ScrollTrigger.update()
})
```

### 4. 类型安全

全量 TypeScript，包括：
- Lenis 事件类型
- Zustand store 接口
- SCSS 模块类型
- GLSL shader 导入类型

## 🐛 常见问题

### Q: SCSS 编译警告？
A: 使用了 `@import` 的弃用语法，不影响功能。Sass 3.0 前需迁移到 `@use`。

### Q: Lenis `emit()` 私有方法？
A: 使用 `// @ts-ignore` 和可选链 `lenis.emit?.()` 处理初始化触发。

### Q: 构建产物大小？
A: JavaScript 355KB (gzipped 124KB)，CSS 14KB (gzipped 3.2KB)

## 📝 开发注意事项

1. **路径别名**: 使用 `@/` 或 `~/` 引用 src 目录
2. **SCSS 导入**: 使用 `@use '../styles/functions' as *;`
3. **类型声明**: 新增类型放在 `src/global.d.ts`
4. **RAF 顺序**: Tempus 优先级为 0，确保在动画前执行

## 🔗 相关链接

- [Lenis 官网](https://lenis.darkroom.engineering/)
- [Lenis GitHub](https://github.com/darkroomengineering/lenis)
- [迁移计划文档](../MIGRATION.md)
- [迁移状态报告](./MIGRATION_STATUS.md)

## 📄 许可

本项目仅用于学习和演示目的。原项目版权归 [darkroom.engineering](https://darkroom.engineering/) 所有。

---

**迁移版本**: v0.0.0  
**最后更新**: 2025-11-07  
**状态**: 核心功能已完成 ✅

