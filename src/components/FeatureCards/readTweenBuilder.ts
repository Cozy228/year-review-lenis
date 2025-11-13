/**
 * READ Tween 构建器
 * 负责创建内容滚动的 tween，包括实时检测 delimiter 位置和反向滚动支持
 */

import gsap from 'gsap'
import type { ReadState } from './types'

interface ReadTweenConfig {
  contentInner: HTMLElement
  windowVh: number
  maxScroll: number
  readScrollDuration: number
  holdPlaceholder: number
  cardIndex: number
  readState: ReadState
  holdCorrectedRef: React.MutableRefObject<Record<number, boolean>>
}

/**
 * 创建 READ tween 的 onUpdate 回调
 */
export function createReadTweenUpdate(config: ReadTweenConfig) {
  const {
    contentInner,
    windowVh,
    maxScroll,
    readScrollDuration,
    holdPlaceholder,
    cardIndex,
    readState,
    holdCorrectedRef,
  } = config

  const readTweenDuration = readScrollDuration + holdPlaceholder
  const readProgressRatio = readScrollDuration / readTweenDuration

  return function onUpdate(this: gsap.core.Tween) {
    const progress = this.progress()
    const isReversing = progress < readState.lastProgress
    readState.lastProgress = progress

    const isInReadPhase = progress <= readProgressRatio

    // 正向进入 READ 区域时，重置状态
    if (!isReversing && isInReadPhase && readState.maxReachedY < 0 && !readState.reachedTarget) {
      console.log(`[Card ${cardIndex}] ♻️ Re-entering READ, reset state`)
      readState.maxReachedY = 0
      readState.reachedScrollProgress = 0
    }

    // 反向滚动时，重置状态
    if (isReversing && readState.reachedTarget) {
      console.log(`[Card ${cardIndex}] 🔄 Reversing detected, resetting reachedTarget`, {
        progress: (progress * 100).toFixed(1) + '%',
        isInReadPhase: isInReadPhase,
        targetY: readState.targetY.toFixed(1),
      })
      readState.reachedTarget = false
    }

    // 如果已到达目标且正向滚动，保持固定位置
    if (readState.reachedTarget && !isReversing) {
      gsap.set(contentInner, { y: readState.targetY })
      return
    }

    // 计算滚动进度
    let currentY: number

    // 如果曾经到达过目标，使用实际到达位置按比例回滚
    if (readState.reachedScrollProgress > 0) {
      let scrollProgress: number
      if (isInReadPhase) {
        scrollProgress = progress / readProgressRatio
      } else {
        scrollProgress = 1
      }
      // 限制 scrollProgress 不超过到达时的值
      scrollProgress = Math.min(scrollProgress, readState.reachedScrollProgress)
      // 按比例计算：从 0 到 targetY
      currentY = (readState.targetY / readState.reachedScrollProgress) * scrollProgress
    } else {
      // 正常计算
      let scrollProgress: number
      if (isInReadPhase) {
        scrollProgress = progress / readProgressRatio
      } else {
        scrollProgress = 1
      }
      currentY = -maxScroll * scrollProgress
    }

    // 更新 contentInner 位置
    gsap.set(contentInner, { y: currentY })

    // 只在正向滚动时检测 delimiter（避免反向时重复触发）
    if (!isReversing) {
      detectDelimiterPosition({
        contentInner,
        windowVh,
        currentY,
        progress,
        isInReadPhase,
        readProgressRatio,
        cardIndex,
        readState,
        holdCorrectedRef,
      })
    }
  }
}

/**
 * 检测 delimiter 位置并决定是否停止滚动
 */
function detectDelimiterPosition(params: {
  contentInner: HTMLElement
  windowVh: number
  currentY: number
  progress: number
  isInReadPhase: boolean
  readProgressRatio: number
  cardIndex: number
  readState: ReadState
  holdCorrectedRef: React.MutableRefObject<Record<number, boolean>>
}) {
  const {
    contentInner,
    windowVh,
    currentY,
    progress,
    isInReadPhase,
    readProgressRatio,
    cardIndex,
    readState,
    holdCorrectedRef,
  } = params

  const delimiter = contentInner.querySelector('[data-role="delimiter"]') as HTMLElement
  if (!delimiter) return

  const viewportMiddle = windowVh / 2
  const delimiterRect = delimiter.getBoundingClientRect()
  const offsetError = delimiterRect.top - viewportMiddle

  // 硬阈值：到达 50vh 就停止更新
  const TOLERANCE = 5
  if (offsetError <= TOLERANCE) {
    // 计算当前的 scrollProgress
    let scrollProgress: number
    if (isInReadPhase) {
      scrollProgress = progress / readProgressRatio
    } else {
      scrollProgress = 1
    }

    readState.reachedTarget = true
    readState.targetY = currentY - offsetError  // 精确对齐
    readState.maxReachedY = readState.targetY
    readState.reachedScrollProgress = scrollProgress
    gsap.set(contentInner, { y: readState.targetY })

    console.log(`[Card ${cardIndex}] READ Reached Target:`, {
      progress: (progress * 100).toFixed(1) + '%',
      targetY: readState.targetY.toFixed(1),
      delimiterTop: delimiterRect.top.toFixed(1),
      offsetError: offsetError.toFixed(1),
    })

    holdCorrectedRef.current[cardIndex] = true
  }
  // 短内容检测：如果 delimiter 已在 50vh 上方（offsetError < 0），且进度 > 20%，说明内容很短
  else if (progress > 0.2 && offsetError < -50) {
    let scrollProgress: number
    if (isInReadPhase) {
      scrollProgress = progress / readProgressRatio
    } else {
      scrollProgress = 1
    }

    readState.reachedTarget = true
    readState.targetY = currentY  // 保持当前位置
    readState.maxReachedY = readState.targetY
    readState.reachedScrollProgress = scrollProgress

    console.warn(`[Card ${cardIndex}] Content very short, stopping early:`, {
      progress: (progress * 100).toFixed(1) + '%',
      targetY: readState.targetY.toFixed(1),
      delimiterTop: delimiterRect.top.toFixed(1),
      offsetError: offsetError.toFixed(1),
    })

    holdCorrectedRef.current[cardIndex] = true
  }
  // 兜底：如果 progress > 90% 且还没到达目标，说明内容较短，直接停止
  else if (progress > 0.9 && offsetError > TOLERANCE) {
    let scrollProgress: number
    if (isInReadPhase) {
      scrollProgress = progress / readProgressRatio
    } else {
      scrollProgress = 1
    }

    readState.reachedTarget = true
    readState.targetY = currentY  // 保持当前位置
    readState.maxReachedY = readState.targetY
    readState.reachedScrollProgress = scrollProgress

    console.warn(`[Card ${cardIndex}] Content too short, stopping at:`, {
      progress: (progress * 100).toFixed(1) + '%',
      targetY: readState.targetY.toFixed(1),
      delimiterTop: delimiterRect.top.toFixed(1),
      offsetError: offsetError.toFixed(1),
    })

    holdCorrectedRef.current[cardIndex] = true
  }
}
