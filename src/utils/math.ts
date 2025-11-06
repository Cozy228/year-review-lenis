/**
 * Clamp a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error('clamp: min cannot be greater than max')
  }

  return Math.min(Math.max(value, min), max)
}

/**
 * Linearly interpolate between two numbers.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1)
}

/**
 * Map a value from one range to another.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMin === inMax) {
    throw new Error('mapRange: input range cannot be zero')
  }

  const ratio = (value - inMin) / (inMax - inMin)
  return outMin + ratio * (outMax - outMin)
}
