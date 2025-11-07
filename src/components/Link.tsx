import { forwardRef, useMemo, ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href?: string
  children?: ReactNode
  className?: string
}

export const Link = forwardRef<HTMLAnchorElement | HTMLButtonElement, LinkProps>(
  ({ href, children, className, ...props }, ref) => {
    const isProtocol = useMemo(
      () => href?.startsWith('mailto:') || href?.startsWith('tel:'),
      [href]
    )

    const isAnchor = useMemo(() => href?.startsWith('#'), [href])
    const isExternal = useMemo(() => href?.startsWith('http'), [href])

    if (typeof href !== 'string') {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className={className}
          {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      )
    }

    if (isProtocol || isExternal) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={className}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      )
    }

    // For internal links in a single-page app, we just use anchor tags
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={className}
        href={href}
        {...props}
      >
        {children}
      </a>
    )
  }
)

Link.displayName = 'Link'

