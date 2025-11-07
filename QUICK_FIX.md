# 🔧 快速修复报告

**日期:** ${new Date().toLocaleString('zh-CN')}

---

## 🐛 发现的问题

### 问题 1: Scroll Hint 的动画线不见了

**症状:** 首页 "Scroll to explore" 旁边的动画线条不显示

**根本原因:**
- `@keyframes scale` 定义在 `theme.css` 中
- **CSS Modules 无法访问外部文件中定义的 @keyframes！**
- 每个 CSS Module 都是独立的作用域

**黄金 CSS 对比:**
```css
/* 黄金 CSS - keyframes 在同一个编译单元中 */
._hero_lv72g_43 ._scroll-hint_lv72g_143:before {
  animation: _scale_lv72g_1 4s infinite;
}
@keyframes _scale_lv72g_1 { 50% { transform: scaleY(1.5); } }
```

**修复方案:**
将 `@keyframes scale` 从 `theme.css` 移到 `home.module.css` 中

```css
/* home.module.css */
@keyframes scale {
  50% {
    transform: scaleY(1.5);
  }
}

.hero .bottom .scroll-hint::before {
  animation: scale 4s infinite;
}
```

---

### 问题 2: Feature Cards 没有固定，只能看到第一个

**症状:** 
- Feature cards 不会固定在屏幕上
- 滚动时其他卡片无法显示
- 整个区域没有 sticky 效果

**根本原因:**
在 `feature-cards.module.css` 中发现**重复的 position 声明**：

```css
/* ❌ 错误 - 后面的覆盖了前面的 */
.sticky {
  overflow: hidden;
  position: sticky;  /* 正确的声明 */
  position: relative; /* ❌ 这行覆盖了上面的 sticky！*/
  top: 0;
}
```

这是自动转换过程中的错误，可能是因为：
1. 从 Sass 嵌套展开时产生了重复
2. 从 `@apply` 转换时误保留了原属性

**黄金 CSS 对比:**
```css
/* 黄金 CSS - 只有一个 position 声明 */
._sticky_s2ssh_102 {
  overflow: hidden;
  position: sticky;
  top: 0;
  height: 100vh;
  padding: var(--layout-margin);
}
```

**修复方案:**
移除重复的 `position: relative` 声明

```css
/* ✅ 修复后 */
.sticky {
  overflow: hidden;
  position: sticky;
  top: 0;
  height: 100vh;
  padding: var(--layout-margin);
}
```

---

## ✅ 已应用的修复

### 1. 移动 @keyframes 到 CSS Module

**文件:** `src/sections/home.module.css`

```diff
+ /* Keyframes must be defined in the same CSS Module */
+ @keyframes scale {
+   50% {
+     transform: scaleY(1.5);
+   }
+ }
+ 
  .hero .bottom .scroll-hint::before {
    animation: scale 4s infinite;
  }
```

### 2. 移除重复的 position 声明

**文件:** `src/components/feature-cards.module.css`

```diff
  .sticky {
    overflow: hidden;
    position: sticky;
-   position: relative;  /* 删除这行 */
    top: 0;
    height: 100vh;
    padding: var(--layout-margin);
  }
```

---

## 🎓 重要教训

### CSS Modules 的 @keyframes 作用域

**关键点:**
- ✅ `@keyframes` 必须在使用它的 CSS Module 文件中定义
- ❌ 不能从外部文件（如 `theme.css`）引用 keyframes
- ❌ 即使变量在 `:root` 中定义，keyframes 也不共享

**正确做法:**
```css
/* component.module.css */
@keyframes myAnimation { ... }

.element {
  animation: myAnimation 1s;
}
```

**错误做法:**
```css
/* theme.css */
@keyframes myAnimation { ... }

/* component.module.css */
.element {
  animation: myAnimation 1s;  /* ❌ 找不到 myAnimation */
}
```

### 自动转换的风险

转换过程中可能产生的问题：
1. 重复的属性声明
2. 属性覆盖顺序错误
3. 选择器展开错误

**建议:**
- ✅ 转换后仔细检查生成的 CSS
- ✅ 对比黄金 CSS 验证关键样式
- ✅ 测试每个组件的交互功能

---

## 🔍 验证清单

现在请验证修复效果：

- [ ] **Scroll Hint 动画线**
  - 首页加载后能看到 "Scroll to explore" 左侧的粉色动画线
  - 线条会垂直缩放动画（scale animation）
  - 滚动后线条会淡出

- [ ] **Feature Cards**
  - 滚动到 "Lenis brings the heat" 部分
  - 卡片区域会固定在屏幕上（sticky）
  - 继续滚动会依次显示不同的 feature card
  - 9 个卡片应该能全部看到

---

## 📊 CSS Modules 作用域规则

| 内容类型 | 作用域 | 是否共享 |
|---------|--------|---------|
| CSS 变量 (`:root`) | 全局 | ✅ 共享 |
| CSS 类名 | Module 内 | ❌ 独立 |
| `@keyframes` | Module 内 | ❌ 独立 |
| `@media` 查询 | - | ✅ 正常工作 |

**记住:**
- CSS 变量可以跨 Module 使用（如果在 `:root` 中定义）
- 类名会被 hash 化，每个 Module 独立
- **@keyframes 必须在使用它的 Module 中定义**

---

## ✅ 修复状态

- ✅ Scroll hint 动画线修复完成
- ✅ Feature cards sticky 定位修复完成
- ✅ 所有修改已应用

**请刷新页面验证效果！**

---

_修复时间: ${new Date().toLocaleString('zh-CN')}_

