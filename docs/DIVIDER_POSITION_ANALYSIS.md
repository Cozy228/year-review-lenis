# Divider Position Analysis

## 问题描述

用户反馈：不同卡片滚动到底部时，分割线（`<hr>`）的位置不一致。

## 调试数据

```
Card c1: wrapH=831, innerH=2181, hrPos=1796, hrFromBottom=385
Card c2: wrapH=831, innerH=1248, hrPos=863, hrFromBottom=385
Card c3: wrapH=831, innerH=2221, hrPos=1836, hrFromBottom=385
```

## 关键发现

1. **`hrFromBottom` 是固定的（385px）** ✅
2. **`wrapH` 是固定的（831px，视窗高度）** ✅
3. **`hrPos` 因内容长度而异** ⚠️

## 理论计算

根据当前测量逻辑：
```typescript
extraPx = innerH - wrapH + FUDGE
```

滚动结束时：
```
contentInner.y = -extraPx
```

分割线最终位置：
```
finalPos = hrPos - extraPx
        = hrPos - (innerH - wrapH + FUDGE)
        = (innerH - 385) - (innerH - wrapH + 2)
        = wrapH - 385 - 2
        = 831 - 387
        = 444px  (~53%vh)
```

**理论上所有卡片应该一致！**

## 实际问题

底部空间设置为 `40vh`，但实际 `hrFromBottom = 385px`：
- `40vh` at 831px viewport = `0.4 * 831 = 332px`
- 实际距离 = `385px`
- 差异 = `385 - 332 = 53px`（来自 padding + hr margin）

这个差异导致：
```
finalPos = wrapH - 385 - 2 = 444px  (~53%vh)
预期位置 = wrapH * 0.5 = 415px  (50%vh)
偏差 = 29px  (~3.5%vh)
```

## 参考实现验证

`card/src/App.tsx` 使用相同的测量逻辑，说明这是预期行为！

## 结论

**当前实现与参考实现一致**。分割线停在约 53%vh 的位置是设计如此（`100vh - 40vh - padding/margin - FUDGE`）。

如果需要精确停在 50%vh，需要：
1. 调整底部空间为 `50vh - padding - margin`
2. 或修改测量逻辑以 hr 位置为目标

## 建议

保持当前实现与参考一致，除非有明确的 UX 需求要求分割线精确停在 50%vh。

