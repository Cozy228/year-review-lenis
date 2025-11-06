import { create } from 'zustand'
import type Lenis from 'lenis'

export type ThresholdMap = Record<string, number>

interface LenisState {
  lenis: Lenis | null
  setLenis: (instance: Lenis | null) => void
  introOut: boolean
  setIntroOut: (value: boolean) => void
  thresholds: ThresholdMap
  addThreshold: (payload: { id: string; value: number }) => void
  removeThreshold: (id: string) => void
  resetThresholds: () => void
}

export const useLenisStore = create<LenisState>((set) => ({
  lenis: null,
  setLenis: (instance) => set({ lenis: instance }),
  introOut: false,
  setIntroOut: (value) => set({ introOut: value }),
  thresholds: {},
  addThreshold: ({ id, value }) =>
    set((state) => ({
      thresholds: { ...state.thresholds, [id]: value }
    })),
  removeThreshold: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.thresholds
      return { thresholds: rest }
    }),
  resetThresholds: () => set({ thresholds: {} })
}))

export type LenisStore = ReturnType<typeof useLenisStore.getState>
