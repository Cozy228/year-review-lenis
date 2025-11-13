/**
 * 卡片数据生成器
 */

import { LoremIpsum } from 'lorem-ipsum'
import type { CardData } from './types'

const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
})

function generateBody(min: number, max: number): string[] {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
  const count = rand(min, max)
  return Array.from({ length: count }, () => lorem.generateParagraphs(1))
}

export function generateCards(count: number): CardData[] {
  return Array.from({ length: count }, (_, i) => ({
    title: `Feature Card ${i + 1}`,
    body: generateBody(3, 8),
  }))
}
