/**
 * Pixel art definitions for each consultant class character.
 * Each class shares a base 24×24 silhouette (head, body, arms, legs) and is
 * differentiated by hat/hair and a held item.
 *
 * Pixel format: [x, y, hexColor]
 * Used by both Phaser (generateClassTextures) and React (ClassCard canvas).
 */

type Pixel = [number, number, string];

export interface ClassSpriteData {
  color: string;
  hat: Pixel[];
  item: Pixel[];
}

// Shared palette
const SKIN     = '#f5d5a0';
const SKIN_D   = '#d0906a';
const EYE      = '#333333';
const LEG      = '#3a3a5c';
const LEG_D    = '#2a2a4a';
const MOUTH    = '#c0806a';

function rect(x: number, y: number, w: number, h: number, color: string): Pixel[] {
  const out: Pixel[] = [];
  for (let iy = y; iy < y + h; iy++)
    for (let ix = x; ix < x + w; ix++)
      out.push([ix, iy, color]);
  return out;
}

/**
 * Returns a flat string[] of length 576 (24×24).
 * Each entry is a hex color string or '' for transparent.
 * Later entries in hat/item arrays override earlier ones (painter's algorithm).
 */
export function makeBasePixels(
  bodyColor: string,
  hat: Pixel[],
  item: Pixel[],
): string[] {
  const canvas = new Array<string>(24 * 24).fill('');
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < 24 && y >= 0 && y < 24) canvas[y * 24 + x] = c;
  };
  const setAll = (pixels: Pixel[]) => pixels.forEach(([x, y, c]) => set(x, y, c));

  // Legs
  setAll(rect(7, 17, 4, 6, LEG));
  setAll(rect(13, 17, 4, 6, LEG));
  setAll(rect(7, 21, 4, 3, LEG_D));
  setAll(rect(13, 21, 4, 3, LEG_D));

  // Body + arms
  setAll(rect(5, 10, 14, 8, bodyColor));
  setAll(rect(3, 10, 3, 6, bodyColor));
  setAll(rect(18, 10, 3, 6, bodyColor));

  // Neck + head
  setAll(rect(10, 8, 4, 3, SKIN));
  setAll(rect(8, 2, 8, 7, SKIN));

  // Face
  set(10, 4, EYE); set(10, 5, EYE);
  set(13, 4, EYE); set(13, 5, EYE);
  set(11, 7, MOUTH); set(12, 7, MOUTH);
  set(12, 6, SKIN_D);

  // Class-specific overrides (hat first so item can overlap)
  setAll(hat);
  setAll(item);

  return canvas;
}

export const CLASS_SPRITE_DATA: Record<string, ClassSpriteData> = {
  architect: {
    color: '#f59e0b',
    hat: [
      ...rect(7, 0, 8, 1, '#f59e0b'),
      ...rect(8, 1, 6, 1, '#f8c76d'),
    ],
    item: [
      // Blueprint scroll (right arm)
      ...rect(18, 10, 3, 5, '#3b82f6'),
      [19, 11, '#93c5fd'],
      [19, 13, '#93c5fd'],
    ],
  },

  developer: {
    color: '#1d6e8a',
    hat: [
      // Hoodie outline
      ...rect(7, 1, 8, 1, '#0f4c5c'),
      [6, 2, '#0f4c5c'], [7, 2, '#0f4c5c'], [14, 2, '#0f4c5c'], [15, 2, '#0f4c5c'],
      [6, 3, '#0f4c5c'], [15, 3, '#0f4c5c'],
      [6, 4, '#0f4c5c'], [15, 4, '#0f4c5c'],
      [6, 5, '#0f4c5c'], [15, 5, '#0f4c5c'],
      [6, 6, '#0f4c5c'], [15, 6, '#0f4c5c'],
    ],
    item: [
      // Laptop (left arm)
      [3, 13, '#555555'], [4, 13, '#555555'], [5, 13, '#555555'],
      [3, 14, '#333333'], [4, 14, '#22d3ee'], [5, 14, '#333333'],
      [3, 15, '#333333'], [4, 15, '#22d3ee'], [5, 15, '#333333'],
      [2, 16, '#444444'], [3, 16, '#444444'], [4, 16, '#444444'], [5, 16, '#444444'], [6, 16, '#444444'],
    ],
  },

  ux: {
    color: '#9d3060',
    hat: [
      // Beret
      ...rect(8, 0, 6, 1, '#f472b6'),
      ...rect(7, 1, 8, 1, '#e91e8c'),
      [14, 0, '#e91e8c'],
    ],
    item: [
      // Pencil (right side)
      [20, 8, '#fbbf24'], [20, 9, '#fbbf24'], [20, 10, '#fbbf24'],
      [20, 11, '#fbbf24'], [20, 12, '#fde68a'],
      [20, 13, '#ef4444'],
    ],
  },

  datascientist: {
    color: '#5b21b6',
    hat: [
      // Spiky hair
      [8, 0, '#a78bfa'], [9, 0, '#7c3aed'], [10, 0, '#a78bfa'], [11, 0, '#7c3aed'], [12, 0, '#a78bfa'], [13, 0, '#7c3aed'],
      [8, 1, '#7c3aed'], [9, 1, '#a78bfa'], [10, 1, '#7c3aed'], [11, 1, '#a78bfa'], [12, 1, '#7c3aed'], [13, 1, '#a78bfa'],
      // Glasses
      [9, 4, '#333333'], [10, 4, '#333333'], [11, 4, '#555555'], [12, 4, '#333333'], [13, 4, '#333333'],
      [9, 5, '#333333'], [13, 5, '#333333'],
    ],
    item: [
      // Bar chart (right arm)
      ...rect(18, 10, 4, 1, '#1e1e3a'),
      [18, 11, '#1e1e3a'], [19, 11, '#a78bfa'], [20, 11, '#a78bfa'], [21, 11, '#a78bfa'],
      [18, 12, '#1e1e3a'], [19, 12, '#a78bfa'], [20, 12, '#a78bfa'], [21, 12, '#a78bfa'],
      [18, 13, '#1e1e3a'], [19, 13, '#7c3aed'], [20, 13, '#a78bfa'], [21, 13, '#a78bfa'],
      ...rect(18, 14, 4, 1, '#555555'),
    ],
  },

  pm: {
    color: '#0f6b4a',
    hat: [
      // Short hair
      ...rect(8, 0, 6, 1, '#5a3e28'),
      [8, 1, '#5a3e28'], [9, 1, '#5a3e28'], [10, 1, '#7a5e38'], [11, 1, '#7a5e38'], [12, 1, '#5a3e28'], [13, 1, '#5a3e28'],
      // Red tie
      [11, 10, '#ef4444'], [12, 10, '#ef4444'],
      [11, 11, '#ef4444'], [12, 11, '#ef4444'],
      [11, 12, '#dc2626'], [12, 12, '#dc2626'],
      [12, 13, '#dc2626'],
    ],
    item: [
      // Clipboard (right arm)
      ...rect(18, 9, 4, 1, '#8b6914'),
      [18, 10, '#f5e6c8'], [19, 10, '#f5e6c8'], [20, 10, '#333333'], [21, 10, '#f5e6c8'],
      [18, 11, '#f5e6c8'], [19, 11, '#333333'], [20, 11, '#f5e6c8'], [21, 11, '#f5e6c8'],
      [18, 12, '#f5e6c8'], [19, 12, '#333333'], [20, 12, '#f5e6c8'], [21, 12, '#f5e6c8'],
      [18, 13, '#f5e6c8'], [19, 13, '#333333'], [20, 13, '#333333'], [21, 13, '#f5e6c8'],
      ...rect(18, 14, 4, 1, '#8b6914'),
    ],
  },

  security: {
    color: '#7c2d12',
    hat: [
      // Tactical helmet
      ...rect(7, 0, 8, 1, '#374151'),
      ...rect(7, 1, 8, 1, '#4b5563'),
      [6, 2, '#374151'], [7, 2, '#374151'], [14, 2, '#374151'], [15, 2, '#374151'],
    ],
    item: [
      // Shield (right arm)
      ...rect(18, 10, 3, 1, '#fb923c'),
      [18, 11, '#fb923c'], [19, 11, '#333333'], [20, 11, '#fb923c'],
      [18, 12, '#fb923c'], [19, 12, '#333333'], [20, 12, '#fb923c'],
      ...rect(18, 13, 3, 1, '#fb923c'),
      [19, 14, '#fb923c'],
    ],
  },

  accountmanager: {
    color: '#7a5a00',
    hat: [
      // Slick dark hair
      ...rect(8, 0, 6, 1, '#3d2000'),
      [8, 1, '#5c3400'], [9, 1, '#3d2000'], [10, 1, '#3d2000'], [11, 1, '#3d2000'], [12, 1, '#3d2000'], [13, 1, '#5c3400'],
      // Suit collar + gold tie
      [9, 9, '#1a1a2e'], [10, 9, '#1a1a2e'], [11, 9, '#fbbf24'], [12, 9, '#fbbf24'], [13, 9, '#1a1a2e'], [14, 9, '#1a1a2e'],
    ],
    item: [
      // Briefcase (left arm)
      [4, 11, '#6b4c10'], [5, 11, '#6b4c10'],
      ...rect(3, 12, 4, 1, '#8b6914'),
      [3, 13, '#a07820'], [4, 13, '#c8a840'], [5, 13, '#a07820'], [6, 13, '#a07820'],
      ...rect(3, 14, 4, 1, '#8b6914'),
    ],
  },

  intern: {
    color: '#7e1d91',
    hat: [
      // Wild magenta hair
      [7, 0, '#e879f9'], [8, 0, '#c026d3'], [10, 0, '#e879f9'], [12, 0, '#c026d3'], [14, 0, '#e879f9'],
      [6, 1, '#e879f9'], [7, 1, '#c026d3'], [8, 1, '#e879f9'], [9, 1, '#c026d3'], [13, 1, '#e879f9'], [14, 1, '#c026d3'], [15, 1, '#e879f9'],
      [6, 2, '#e879f9'], [7, 2, '#e879f9'], [14, 2, '#e879f9'], [15, 2, '#e879f9'],
      // Wide surprised eyes (override base)
      [9, 4, '#ffffff'], [10, 4, '#ffffff'], [12, 4, '#ffffff'], [13, 4, '#ffffff'],
      [9, 5, '#333333'], [10, 5, '#333333'], [12, 5, '#333333'], [13, 5, '#333333'],
    ],
    item: [
      // Coffee cup (right arm)
      ...rect(18, 12, 3, 1, '#ffffff'),
      [18, 13, '#ffffff'], [19, 13, '#6b3a00'], [20, 13, '#ffffff'],
      ...rect(18, 14, 3, 1, '#ffffff'),
      ...rect(18, 15, 3, 1, '#cccccc'),
      [21, 13, '#ffffff'],
    ],
  },
};
