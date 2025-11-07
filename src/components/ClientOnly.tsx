import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children?: ReactNode
}

export const ClientOnly = ({ children }: ClientOnlyProps) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  if (!isMounted) {
    return null
  }

  return <>{children}</>
}

