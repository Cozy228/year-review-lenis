import cn from 'clsx'
import { Link } from './Link'
import s from './list-item.module.scss'

interface ListItemProps {
  className?: string
  title: string
  source: string
  href: string
  index: number
  visible?: boolean
}

const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 13L13 1M13 1H1M13 1V13"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
)

export function ListItem({ className, title, source, href, index, visible }: ListItemProps) {
  return (
    <Link
      href={href}
      className={cn(className, s.item, visible && s.visible)}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className={s.inner}>
        <div className={s.title}>
          <span className={s.text}>{title}</span>
          <span className={s.arrow}>
            <ArrowIcon />
          </span>
        </div>
        <div className={s.source}>
          <span>{source}</span>
        </div>
      </div>
    </Link>
  )
}

