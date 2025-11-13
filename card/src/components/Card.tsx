// src/components/Card.tsx
import React, { forwardRef, type CSSProperties } from "react";

export type CardData = {
  id: string;
  title: string;
  body: string[];
  coverLabel?: string;
  width?: string;
  height?: string;
};

export type CardProps = {
  data: CardData;
  className?: string;
  style?: CSSProperties;
};

const Card = forwardRef<HTMLElement, CardProps>(({ data, className, style }, ref) => {
  const { title, body, coverLabel, width = "520px", height = "340px" } = data;

  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      data-card-id={data.id}
      className={["card fixed invisible z-0", className].filter(Boolean).join(" ")}
      style={{ width, height, ...(style || {}) }}
    >
      {/* 统一使用主题梯度作为容器背景（封面与正文一致） */}
      <div className="relative w-full h-full overflow-hidden rounded-2xl border border-card-border shadow-[0_10px_30px_rgba(0,0,0,0.35)] [background:var(--gradient-card)]">
        {/* 封面：与正文同梯度；放大过程中淡出 */}
        <div
          data-role="cover"
          className="absolute inset-0 flex items-center justify-center gap-3 text-cover-fg font-semibold tracking-[0.2px] [background:var(--gradient-card)]"
        >
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-[rgba(255,255,255,0.14)] text-blue-50/90">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
              <path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z" />
            </svg>
          </div>
          <div className="text-[18px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
            {coverLabel ?? title}
          </div>
        </div>

        {/* 正文：全屏阶段淡入；容器透明，底层即为同一梯度 */}
        <div data-role="content" className="absolute inset-0 overflow-hidden opacity-0 pointer-events-none">
          <div data-role="content-inner" className="absolute left-0 right-0 top-0 will-change-transform px-7 py-6">
            <h2 className="m-0 mb-2 text-[20px] text-blue-50 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
              {title}
            </h2>
            {body.map((t, idx) => (
              <p key={idx} className="my-2 text-[color:var(--color-fg)]/95">
                {t}
              </p>
            ))}
            <hr className="border-b-2 border-blue-50/95" />
            <div style={{ height: "40vh" }} />
          </div>
        </div>
      </div>
    </article>
  );
});

Card.displayName = "Card";
export default Card;