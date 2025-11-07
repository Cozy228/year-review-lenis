import cn from 'clsx'
import { Button } from './Button'
import { Link } from './Link'
import s from './footer.module.css'

const GitHubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      fill="currentColor"
    />
  </svg>
)

export const Footer = () => {
  return (
    <footer className={cn('theme-light', s.footer)}>
      <div className={cn(s.top, 'layout-grid hide-on-mobile')}>
        <p className={cn(s['first-line'], 'h1')}>
          Lenis is <br />
          <span className="contrast">Open source</span>
        </p>
        <p className={cn(s['last-line'], 'h1')}>
          & open to <span className="hide-on-desktop">&nbsp;</span> features{' '}
          <br /> and sponsors
        </p>
        <Button
          className={s.cta}
          arrow
          icon={<GitHubIcon />}
          href="https://github.com/sponsors/darkroomengineering"
        >
          Let's build together
        </Button>
      </div>
      <div className={cn(s.top, 'layout-block hide-on-desktop')}>
        <p className={cn(s['first-line'], 'h1')}>
          Lenis is <br />
          <span className="contrast">Open source</span>
          <br /> & open to <br /> features and sponsors
        </p>
      </div>
      <div className={s.bottom}>
        <div className={s.links}>
          <Link
            className={cn(s.link, 'p-xs')}
            href="https://twitter.com/darkroomdevs"
          >
            Twitter
          </Link>
          <Link
            className={cn(s.link, 'p-xs')}
            href="https://github.com/darkroomengineering"
          >
            GitHub
          </Link>
          <Link
            className={cn(s.link, 'p-xs')}
            href="https://darkroom.engineering/"
          >
            Website
          </Link>
          <Link className={cn(s.link, 'p-xs')} href="https://studiofreight.com">
            Designed by Studio Freight
          </Link>
        </div>
        <p className={cn('p-xs', s.tm)}>
          <span>©</span> {new Date().getFullYear()} darkroom.engineering
        </p>
        <Button
          className={cn(s.cta, 'hide-on-desktop')}
          arrow
          icon={<GitHubIcon />}
          href="https://github.com/sponsors/darkroomengineering"
        >
          Let's build together
        </Button>
      </div>
    </footer>
  )
}

