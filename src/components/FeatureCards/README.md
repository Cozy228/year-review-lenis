# FeatureCards 组件重构

## 文件结构

```
FeatureCards/
├── types.ts              # TypeScript 类型定义
├── dataGenerator.ts      # 卡片数据生成
├── readTweenBuilder.ts   # READ tween 构建逻辑
└── README.md            # 本文档
```

## 模块说明

### types.ts
定义核心类型：
- `CardData`: 卡片数据结构
- `Meta`: 卡片元数据（DOM 引用、时间点、状态）
- `ReadState`: READ 阶段状态管理

### dataGenerator.ts
生成测试用的卡片数据，使用 lorem-ipsum 生成随机段落。

### readTweenBuilder.ts
核心动画逻辑：
- `createReadTweenUpdate()`: 创建 READ tween 的 onUpdate 回调
- `detectDelimiterPosition()`: 实时检测 delimiter 位置
- 支持正向滚动、反向滚动、重新进入等场景

## 使用方式

```typescript
import { generateCards } from './FeatureCards/dataGenerator'
import { createReadTweenUpdate } from './FeatureCards/readTweenBuilder'
import type { Meta, ReadState } from './FeatureCards/types'

// 生成数据
const cards = generateCards(10)

// 构建 READ tween
const readState: ReadState = {
  reachedTarget: false,
  targetY: 0,
  lastProgress: 0,
  maxReachedY: 0,
  reachedScrollProgress: 0,
}

const onUpdate = createReadTweenUpdate({
  contentInner,
  windowVh,
  maxScroll,
  readScrollDuration,
  holdPlaceholder,
  cardIndex: i,
  readState,
  holdCorrectedRef,
})

tl.to({}, {
  duration: readTweenDuration,
  ease: 'none',
  onUpdate,
}, total)
```

## 重构收益

1. **可维护性**：逻辑分离，职责清晰
2. **可测试性**：独立函数易于单元测试
3. **可复用性**：READ tween 逻辑可用于其他场景
4. **可读性**：类型定义集中，代码更易理解

## 下一步

- [ ] 提取 timeline 构建逻辑到独立函数
- [ ] 提取 HoldController 相关逻辑
- [ ] 添加单元测试
- [ ] 优化性能（减少 DOM 查询）
