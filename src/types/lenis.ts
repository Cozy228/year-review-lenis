export interface LenisScrollEvent {
  scroll: number
  limit: number
  velocity: number
  direction: 1 | -1
  progress: number
}
