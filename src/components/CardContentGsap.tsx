// src/components/CardContentGsap.tsx
import { ReactNode } from 'react'

interface CardContentGsapProps {
  number: number
  text: ReactNode
  body?: string[]  // Content for fake inner scroll
}

/**
 * Three-layer structure for GSAP animations:
 * 1. cover (data-role="cover") - Fades out during ZOOM phase
 * 2. content (data-role="content") - Container that fades in during TEXT_FADE
 * 3. content-inner (data-role="content-inner") - Scrollable content that translates during READ
 */
export const CardContentGsap = ({ number, text, body }: CardContentGsapProps) => {
  return (
    <>
      {/* ====== Layer 1: Cover (data-role="cover") ====== */}
      {/* 完全匹配原 Card 组件样式 (card.module.css) */}
      <div
        data-role="cover"
        style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: 'column',
          color: 'var(--theme-secondary)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          aspectRatio: '1 / 1',
          // 响应式 padding：移动端 6.4vw，桌面端 1.67vw
          padding: window.innerWidth < 800 ? '6.4vw' : '1.6666666667vw',
          backgroundColor: 'rgba(239, 239, 239, 0.8)',
          backdropFilter: 'blur(5px)',
        }}
      >
        {/* Number - 匹配 card.module.css .wrapper .number */}
        <p
          style={{
            color: 'var(--theme-contrast)',
            lineHeight: '90%',
            // 响应式字体：移动端 14.93vw，桌面端 6.67vw
            fontSize: window.innerWidth < 800 ? '14.9333333333vw' : '6.6666666667vw',
            fontFamily: 'var(--font-anton)',
            margin: '0',
          }}
        >
          {number.toString().padStart(2, '0')}
        </p>
        
        {/* Text - 匹配 card.module.css .wrapper .text */}
        <p
          style={{
            textTransform: 'uppercase',
            fontFamily: 'var(--font-panchang)',
            fontWeight: '700',
            lineHeight: '100%',
            // 响应式字体：移动端 5.33vw，桌面端 1.94vw
            fontSize: window.innerWidth < 800 ? '5.3333333333vw' : '1.9444444444vw',
            margin: '0',
          }}
        >
          {text}
        </p>
      </div>

      {/* ====== Layer 2: Content Container (data-role="content") ====== */}
      {/* GSAP will fade this in during TEXT_FADE phase (opacity: 0 → 1) */}
      <div
        data-role="content"
        style={{
          position: 'absolute',
          inset: '0',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
          backgroundColor: 'rgba(239, 239, 239, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: '0',  // 移除圆角，匹配 cover 层
        }}
      >
        {/* ====== Layer 3: Scrollable Content (data-role="content-inner") ====== */}
        {/* GSAP will translate this element during READ phase (y: 0 → -extraPx) */}
        <div
          data-role="content-inner"
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            top: '0',
            willChange: 'transform',
            padding: '2rem 3rem',  // 上下 2rem，左右 3rem（确保有足够的边距但不会左侧空白过多）
          }}
        >
          {/* Title */}
          <h2 
            style={{ 
              fontFamily: 'Panchang, sans-serif',
              fontWeight: '700',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              marginTop: '0',
              color: '#000'
            }}
          >
            {text}
          </h2>
          
          {/* Body paragraphs */}
          {body?.map((paragraph, index) => (
            <p 
              key={index} 
              style={{ 
                fontFamily: 'Roboto, sans-serif',
                margin: '0.75rem 0',
                lineHeight: '1.625',
                color: 'rgba(0, 0, 0, 0.9)'
              }}
            >
              {paragraph}
            </p>
          ))}
          
          {/* ✅ Delimiter - 标记内容底部，跟随 content-inner 滚动 */}
          {/* extraPx 的计算会确保滚动结束时，delimiter 停在 50vh 位置 */}
          <hr 
            data-role="delimiter"
            style={{ 
              margin: '1.5rem 3rem',
              borderWidth: '0 0 1px 0',
              borderStyle: 'solid',
              borderColor: 'oklch(0.4628 0.3059 264.18)',
              opacity: 0.3 
            }} 
          />
          
          {/* 底部空白：为测量提供额外空间 */}
          <div style={{ height: '20vh' }} />
        </div>
      </div>
    </>
  )
}

