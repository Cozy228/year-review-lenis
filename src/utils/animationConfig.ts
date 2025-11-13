// src/utils/animationConfig.ts
// Animation timing constants (centralized configuration)

export const INTRO_GAP = 300;   // Blank scroll distance before entering stage
export const APPEAR    = 1200;  // Bottom-right → center
export const ZOOM      = 700;   // Center ↔ fullscreen
export const TEXT_FADE = 140;   // Content fade in/out (only visible in fullscreen)
export const DOCK_MOVE = 1200;  // Center → Dock
export const BETWEEN   = 220;   // Gap between cards
export const HIDE_FADE = 140;   // Pre-fade window for reverse hiding
export const FULL_HOLD = 500;   // Fullscreen hold: fake scroll end → text fade out start

// Dock: diagonal increment (left/top both accumulate gap by index)
export const DOCK_BASE_LEFT = 16;
export const DOCK_BASE_TOP  = 16;
export const DOCK_GAP       = 40;

