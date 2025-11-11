import { create } from 'zustand'
import type Lenis from 'lenis'

export interface Threshold {
  id: string
  value: number
}

export interface StoreState {
  // Header & Footer data
  headerData?: unknown
  setHeaderData: (headerData: unknown) => void
  footerData?: unknown
  setFooterData: (footerData: unknown) => void

  // Navigation
  navIsOpen: boolean
  setNavIsOpen: (toggle: boolean) => void

  // Lenis instance
  lenis?: Lenis
  setLenis: (lenis: Lenis) => void

  // Overflow control
  overflow: boolean
  setOverflow: (overflow: boolean) => void

  // Page transition
  triggerTransition: string
  setTriggerTransition: (triggerTransition: string) => void

  // Thresholds for scroll-based animations
  thresholds: Record<string, number>
  addThreshold: (threshold: { id: string; value: number }) => void

  // Intro state
  introOut: boolean
  setIntroOut: (introOut: boolean) => void

  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // Authorization
  isAuthorized: boolean
  setIsAuthorized: (isAuthorized: boolean) => void
}

export const useStore = create<StoreState>((set, get) => ({
  headerData: undefined,
  setHeaderData: (headerData) => set({ headerData }),
  footerData: undefined,
  setFooterData: (footerData) => set({ footerData }),
  navIsOpen: false,
  setNavIsOpen: (toggle) => set({ navIsOpen: toggle, overflow: !toggle }),
  lenis: undefined,
  setLenis: (lenis) => set({ lenis }),
  overflow: true,
  setOverflow: (overflow) => set({ overflow }),
  triggerTransition: '',
  setTriggerTransition: (triggerTransition) => set({ triggerTransition }),
  thresholds: {},
  addThreshold: ({ id, value }) => {
    const thresholds = { ...get().thresholds }
    thresholds[id] = value
    set({ thresholds })
  },
  introOut: false,
  setIntroOut: (introOut) => set({ introOut }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  isAuthorized: true,
  setIsAuthorized: (isAuthorized) => set({ isAuthorized }),
}))

