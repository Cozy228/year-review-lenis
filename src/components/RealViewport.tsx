import { useEffect } from 'react'

export default function RealViewport() {
  useEffect(() => {
    const onResize = () => {
      const vh = window.innerHeight * 0.01
      const svh = document.documentElement.clientHeight * 0.01

      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--dvh', `${vh}px`)
      document.documentElement.style.setProperty('--svh', `${svh}px`)
      document.documentElement.style.setProperty('--lvh', '1vh')
    }

    window.addEventListener('resize', onResize, { passive: true })
    onResize()

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return null
}
