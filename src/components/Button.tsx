import cn from 'clsx'
import { Link } from './Link'
import { CSSProperties, ReactNode, MouseEvent } from 'react'
import s from './button.module.css'

// Import arrow SVG as a component - Vite handles this via SVGR plugin or manual import
// For now, we'll use a simple inline SVG
const Arrow = () => (
  <svg className={s.arrow} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 11L11 1M11 1H1M11 1V11" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

interface ButtonProps {
  icon?: ReactNode
  arrow?: boolean
  children?: ReactNode
  href?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
  style?: CSSProperties
}

export const Button = ({
  icon,
  arrow,
  children,
  href,
  onClick,
  className,
  style,
}: ButtonProps) => {
  const content = (
    <>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.text}>
        <span className={s.visible}>
          {children} {arrow && <Arrow />}
        </span>
        <span aria-hidden="true" className={s.hidden}>
          {children} {arrow && <Arrow />}
        </span>
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(s.button, className, icon && s['has-icon'])}
        style={style}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      className={cn(s.button, className, icon && s['has-icon'])}
      style={style}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

