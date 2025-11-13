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
      {/* GSAP will fade this out during ZOOM phase (opacity: 1 → 0) */}
      <div
        data-role="cover"
        style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          backgroundColor: 'rgba(239, 239, 239, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '2rem',
        }}
      >
        {/* Number */}
        <p
          style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: 'clamp(3rem, 14.93vw, 8rem)',
            lineHeight: '0.9',
            color: 'oklch(0.4628 0.3059 264.18)',
            margin: '0',
            filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))',
          }}
        >
          {number.toString().padStart(2, '0')}
        </p>
        
        {/* Text */}
        <p
          style={{
            fontFamily: 'Panchang, sans-serif',
            fontWeight: '700',
            textTransform: 'uppercase',
            fontSize: 'clamp(1.25rem, 5.33vw, 3rem)',
            lineHeight: '1.0',
            color: '#000',
            textAlign: 'center',
            margin: '0',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
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
          borderRadius: '1rem',
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
            padding: '1.75rem',
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
          
          {/* Divider */}
          <hr 
            style={{ 
              margin: '1.5rem 0',
              borderWidth: '0 0 1px 0',
              borderStyle: 'solid',
              borderColor: 'oklch(0.4628 0.3059 264.18)',
              opacity: 0.3 
            }} 
          />
          
          {/* Bottom space (important: ensures content can scroll to bottom) */}
          <div style={{ height: '40vh' }} />
        </div>
      </div>
    </>
  )
}

