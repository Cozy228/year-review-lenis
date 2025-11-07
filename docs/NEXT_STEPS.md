# 🚀 下一步行动指南

项目已经 **95% 完成**，核心功能全部可用！这里是一些可选的后续步骤。

---

## ⚡️ 立即可做的事情

### 1. 启动开发服务器
```bash
cd lenis-vite
pnpm install  # 如果还没安装依赖
pnpm dev
```

访问 http://localhost:5173 查看效果！

### 2. 构建生产版本
```bash
pnpm build
pnpm preview
```

### 3. 探索代码
- `src/sections/Home.tsx` - 完整的 Home 页面
- `src/components/` - 所有可复用组件
- `src/hooks/useScroll.ts` - Lenis 滚动 Hook
- `src/store/index.ts` - Zustand 状态管理

---

## 🎨 可选优化（按优先级排序）

### Priority 1: 完善 WebGL 场景 (2-3小时)

如果需要 100% 复刻原站的 3D 效果：

**需要做的：**
1. 在 `src/components/WebGL.tsx` 中添加完整的 Particles 组件
2. 添加 Arm 模型加载和动画
3. 实现滚动驱动的 uniform 更新

**参考文件：**
- 原始实现：`/Users/ziyu/Workspace/lenis-website-main/components/webgl/index.js`
- Shader 文件已复制到：`src/shaders/particles/`
- 模型文件已复制到：`public/models/`

**代码框架：**
```typescript
// src/components/WebGL.tsx

import { Float, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@/hooks/useScroll'
import vertexShader from '@/shaders/particles/vertex.glsl'
import fragmentShader from '@/shaders/particles/fragment.glsl'

function Particles() {
  // 实现粒子系统
  // 参考原始文件的 Particles 组件
}

function Arm() {
  const { scene } = useGLTF('/models/arm.glb')
  // 实现 Arm 动画
}

export function WebGL() {
  return (
    <Canvas>
      <Raf />
      <Particles />
      <Arm />
      {/* 光照和相机配置 */}
    </Canvas>
  )
}
```

---

### Priority 2: 性能优化 (1-2小时)

目前 JS 包较大 (1.26MB)，可以优化：

#### A. 代码分割
```typescript
// src/sections/Home.tsx
const WebGL = lazy(() => import('@/components/WebGL'))

// 在组件中使用 Suspense
<Suspense fallback={null}>
  <WebGL />
</Suspense>
```

#### B. 优化 Three.js 导入
```typescript
// 只导入需要的部分
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
import { Scene } from 'three/src/scenes/Scene'
// 而不是 import * from 'three'
```

#### C. 配置 Vite
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
```

---

### Priority 3: SCSS 现代化 (1小时)

消除 deprecation 警告：

#### 将 `@import` 迁移到 `@use`

```scss
// src/styles/global.scss - 当前
@import './_reset.scss';
@import './_fonts.scss';

// 改为
@use './_reset';
@use './_fonts';
```

#### 批量替换
```bash
find src/styles -name "*.scss" -exec sed -i '' 's/@import/@use/g' {} \;
```

---

### Priority 4: 添加更多页面 (可选)

#### Navigation 组件
```typescript
// src/components/Navigation.tsx
export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  // 实现导航菜单
}
```

#### Footer 组件
```typescript
// src/components/Footer.tsx
export function Footer() {
  // 实现页脚
}
```

#### 其他页面
- Docs 页面 (`/docs`)
- Snap 页面 (`/snap`)

---

## 🐛 常见问题解决

### Q1: 构建时出现内存错误？
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### Q2: 开发服务器启动慢？
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['three', '@react-three/fiber'],
  },
})
```

### Q3: TypeScript 类型错误？
```bash
# 清理并重新构建类型
rm -rf node_modules/.vite
pnpm install
```

### Q4: SCSS 编译错误？
检查所有 SCSS 文件中的导入路径：
```scss
// ❌ 错误
@import 'styles/_functions';

// ✅ 正确
@use '../styles/functions' as *;
```

---

## 📚 学习资源

### Lenis
- [官方文档](https://github.com/darkroomengineering/lenis)
- [API 参考](https://github.com/darkroomengineering/lenis#api)

### GSAP + ScrollTrigger
- [GSAP 文档](https://gsap.com/docs/v3/)
- [ScrollTrigger 文档](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

### Three.js
- [Three.js 文档](https://threejs.org/docs/)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/)
- [@react-three/drei](https://github.com/pmndrs/drei)

### TypeScript
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [React + TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## 🔧 调试工具

### 开发环境工具

#### 1. React DevTools
浏览器扩展，用于检查组件树

#### 2. Leva 调试面板
已集成到项目中（开发环境可用）：
```typescript
import { useControls } from 'leva'

// 在组件中添加调试控制
const { speed } = useControls({
  speed: { min: 0, max: 10, value: 1 }
})
```

#### 3. GSAP DevTools
在浏览器控制台中：
```javascript
// 查看所有 ScrollTrigger
ScrollTrigger.getAll()

// 暂停所有动画
gsap.globalTimeline.pause()

// 恢复
gsap.globalTimeline.play()
```

#### 4. Lenis 调试
在浏览器控制台中：
```javascript
// 访问 Lenis 实例
window.lenis

// 滚动到某个位置
window.lenis.scrollTo(1000)

// 停止滚动
window.lenis.stop()

// 开始滚动
window.lenis.start()
```

---

## 🎯 性能检查清单

### 首屏加载
- [ ] 首屏时间 < 3s
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### 滚动性能
- [ ] 60 FPS 流畅滚动
- [ ] 无掉帧
- [ ] 无卡顿

### 包大小
- [ ] JS < 500KB (gzipped)
- [ ] CSS < 50KB (gzipped)

### 优化建议
如果性能不达标：
1. 使用 `import { lazy } from 'react'` 延迟加载组件
2. 优化图片（WebP 格式，懒加载）
3. 减少 Three.js 包大小
4. 使用 CDN 托管静态资源

---

## 🚀 部署

### Vercel (推荐)
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd lenis-vite
vercel
```

### Netlify
```bash
# 构建命令
pnpm build

# 输出目录
dist
```

### GitHub Pages
```bash
# vite.config.ts
export default defineConfig({
  base: '/your-repo-name/',
})

# 构建并部署
pnpm build
# 将 dist/ 推送到 gh-pages 分支
```

---

## 📊 项目状态监控

### 构建分析
```bash
# 分析包大小
pnpm build -- --mode analyze

# 或使用 rollup-plugin-visualizer
pnpm add -D rollup-plugin-visualizer
```

### TypeScript 检查
```bash
# 类型检查（不构建）
pnpm exec tsc --noEmit
```

### Lint
```bash
# 如果需要，可以添加 ESLint
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

---

## 💡 提示和技巧

### 1. 快速重启开发服务器
按 `r` 键在终端中快速重启 Vite

### 2. 查看构建分析
```bash
pnpm build --mode analyze
```

### 3. 调试 SCSS
在浏览器 DevTools 中可以看到原始 SCSS 文件（source maps）

### 4. 快速定位组件
在 React DevTools 中选择组件，然后在控制台中：
```javascript
$r  // 访问选中的组件实例
```

---

## 🎉 完成后的庆祝

恭喜！你已经完成了一个复杂的迁移项目。现在可以：

1. ⭐ Star 这个项目
2. 📝 写一篇技术博客分享经验
3. 🎨 基于这个模板创建自己的项目
4. 🤝 贡献回社区

---

## 📞 需要帮助？

- 查看 [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) 了解详细迁移记录
- 查看 [FINAL_STATUS.md](./FINAL_STATUS.md) 了解完成状态
- 查看 [README.md](./README.md) 了解基本使用

---

**祝你开发愉快！** 🚀

