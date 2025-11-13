# HoldController 已禁用

## ⚠️ 状态

HoldController 功能已**暂时禁用**，因为存在卡住问题。

## 📝 修改内容

### 已注释的代码

在 `src/components/FeatureCardsGsap.tsx` 中：

1. **初始化部分**（第 134-135 行）
```typescript
// ⚠️ HoldController 暂时禁用
// const holdCtl = new HoldController()
```

2. **HoldController 触发逻辑**（第 379-393 行）
```typescript
/* ===== HoldController Trigger (暂时禁用) ===== */
// ⚠️ HoldController 已禁用，卡片会自动通过 FULL_HOLD 阶段
// Enter HOLD (only when not in guard period)
// if (!guard && !holdCtl.isHolding() && t >= m.tReadEnd && t < m.tHoldEnd) {
//   holdCtl.begin(idx)
// }

// Currently in HOLD
// if (holdCtl.isHolding(idx)) {
//   holdCtl.keepPinned()
//   if (dir === -1) {
//     holdCtl.releaseReverse()
//     reverseGuardRef.current[idx] = true  // Enable guard
//   }
// }
```

3. **清理逻辑**（第 397-399 行）
```typescript
onKill() {
  // ⚠️ HoldController 已禁用
  // if (holdCtl.isHolding()) holdCtl.releaseReverse()
}
```

## 🎯 当前行为

禁用 HoldController 后：

- ✅ **假内滚动**仍然正常工作（contentInner 的 y 平移）
- ✅ **FULL_HOLD 阶段**会自动通过（500px 的空白时间线）
- ✅ **滚动不会卡住**，时间线平滑进行
- ❌ **无交互式暂停**：用户无法在内容阅读完后手动控制继续滚动

## 🔄 影响的动画阶段

```
1. INTRO_GAP (300px) → ✅ 正常
2. APPEAR (1200px) → ✅ 正常
3. ZOOM (700px) → ✅ 正常
4. TEXT_FADE IN (140px) → ✅ 正常
5. READ (动态) → ✅ 正常（假内滚动）
6. FULL_HOLD (500px) → ⚠️ 自动通过（不再等待用户交互）
7. TEXT_FADE OUT (140px) → ✅ 正常
8. ZOOM OUT (700px) → ✅ 正常
9. DOCK_MOVE (1200px) → ✅ 正常
10. BETWEEN (220px) → ✅ 正常
```

## 🐛 遇到的问题

HoldController 被禁用的原因：

1. **滚动卡住** - 在 FULL_HOLD 阶段时，滚动会莫名其妙卡住
2. **可能的原因**：
   - Lenis 的 `stop()` 和 `start()` 调用时机问题
   - overlay 事件捕获干扰了正常滚动
   - keepPinned() 每帧调用可能与 ScrollTrigger 冲突
   - reverseGuardRef 的状态管理可能不正确

## 🔧 未来修复建议

如果需要重新启用 HoldController，需要调查：

1. **Lenis 状态同步**
   - 检查 `lenis.stop()` 和 `lenis.start()` 的调用是否正确
   - 确保 ScrollTrigger 和 Lenis 的滚动同步正常

2. **Overlay 事件处理**
   - 检查 overlay 是否正确移除
   - 验证事件监听器是否正确解绑

3. **ScrollTrigger 冲突**
   - `keepPinned()` 每帧强制设置 scrollY 可能与 ScrollTrigger 的 scrub 冲突
   - 考虑使用 ScrollTrigger 的 `pin` 功能替代手动控制

4. **状态管理**
   - reverseGuardRef 的逻辑可能需要重新设计
   - 考虑使用状态机模式管理 HOLD 状态

## 🧪 重新启用步骤

如果需要测试修复：

1. 取消注释 `const holdCtl = new HoldController()`
2. 取消注释 HoldController 触发逻辑
3. 取消注释 onKill 清理逻辑
4. 测试滚动是否仍然卡住
5. 如果卡住，使用浏览器 DevTools 调试：
   - 检查 Console 是否有错误
   - 监控 Lenis 和 ScrollTrigger 的状态
   - 使用 Performance 面板查看是否有性能问题

## 📊 当前状态总结

| 功能 | 状态 | 说明 |
|------|------|------|
| 假内滚动 | ✅ 正常 | contentInner y 平移工作正常 |
| GSAP 时间线 | ✅ 正常 | 10 阶段动画全部正常 |
| HoldController | ❌ 禁用 | 暂时注释，避免卡住 |
| 反向保护 | ⚠️ 部分禁用 | reverseGuardRef 逻辑保留但不使用 |
| 交互式暂停 | ❌ 不可用 | 无法在阅读后暂停等待用户交互 |

## 📅 更新日期

2025-11-13

---

**注意**：HoldController 的完整实现在 `src/utils/HoldController.ts` 中仍然存在，只是在使用时被注释了。

