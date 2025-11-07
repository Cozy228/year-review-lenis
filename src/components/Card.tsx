import cn from 'clsx'
import { ReactNode, CSSProperties } from 'react'
import s from './card.module.css'

interface CardProps {
  number?: number
  text?: ReactNode
  className?: string
  inverted?: boolean
  background?: string
}

export const Card = ({
  number,
  text,
  className,
  inverted,
  background = 'rgba(14, 14, 14, 0.15)',
}: CardProps) => {
  return (
    <div
      className={cn(className, s.wrapper, inverted && s.inverted)}
      style={{ '--background': background } as CSSProperties}
    >
      {number && (
        <p className={s.number}>{number.toString().padStart(2, '0')}</p>
      )}
      {text && <p className={s.text}>{text}</p>}
    </div>
  )
}

