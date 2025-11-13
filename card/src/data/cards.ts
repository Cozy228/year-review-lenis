// src/data/cards.ts
import { LoremIpsum } from "lorem-ipsum";
import type { CardData } from "../components/Card";

const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 8, min: 4 },
  wordsPerSentence: { max: 12, min: 6 },
});

const makeRandomCards = (count = 5, startIndex = 3): CardData[] => {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
  return Array.from({ length: count }, (_, i) => {
    const paras = rand(3, 12);
    const body = lorem
      .generateParagraphs(paras)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: `c${i + startIndex}`,
      width: "520px",
      height: "340px",
      title: lorem.generateWords(1),
      coverLabel: lorem.generateWords(1),
      body,
    };
  });
};

export function getCards(): CardData[] {
  return [
    {
      id: "c1",
      width: "520px",
      height: "340px",
      title: "Card 1",
      coverLabel: "Overview",
      body: [
        "进入全屏时正文从顶部淡入；到底部先停留（FULL_HOLD）再退出全屏。",
        "卡片尺寸固定，内容用假内滚（内部平移）。",
        ...lorem.generateParagraphs(8).split(/\n+/),
      ],
    },
    {
      id: "c2",
      width: "520px",
      height: "340px",
      title: "Card 2",
      coverLabel: "Details",
      body: lorem.generateParagraphs(3).split(/\n+/),
    },
    ...makeRandomCards(5, 3),
  ];
}