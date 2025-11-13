/**
 * FeatureCards 类型定义
 */

export interface CardData {
  title: string
  body: string[]
}

export interface Meta {
  card: HTMLElement
  contentWrap: HTMLElement
  contentInner: HTMLElement
  cover: HTMLElement
  tVisible: number
  tFullIn: number
  tReadEnd: number
  tHoldEnd: number
  tFullOut: number
  tDockEnd: number
  startLeft: number
  startTop: number
  readState: ReadState
}

export interface ReadState {
  reachedTarget: boolean          // 是否已到达目标
  targetY: number                 // 目标位置（精确对齐后）
  lastProgress: number            // 上一次的 progress（检测反向）
  maxReachedY: number            // 最大滚动距离（负值）
  reachedScrollProgress: number  // 到达时的 scrollProgress
}
