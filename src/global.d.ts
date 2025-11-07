import type Lenis from 'lenis'

// CSS Modules
declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.css' {
  const content: { [key: string]: string }
  export default content
}

// GLSL Shaders
declare module '*.glsl' {
  const content: string
  export default content
}

declare module '*.vert' {
  const content: string
  export default content
}

declare module '*.frag' {
  const content: string
  export default content
}

// Window augmentation
declare global {
  interface Window {
    lenis?: Lenis
  }
}

export {}

