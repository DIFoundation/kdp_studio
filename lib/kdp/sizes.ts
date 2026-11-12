/** KDP trim sizes (inches) and cover math helpers. */

export interface TrimSize {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
}

export const TRIM_SIZES: TrimSize[] = [
  { id: "5x8", label: '5" × 8"', widthIn: 5, heightIn: 8 },
  { id: "5.5x8.5", label: '5.5" × 8.5"', widthIn: 5.5, heightIn: 8.5 },
  { id: "6x9", label: '6" × 9"', widthIn: 6, heightIn: 9 },
  { id: "7x10", label: '7" × 10"', widthIn: 7, heightIn: 10 },
  { id: "8x10", label: '8" × 10"', widthIn: 8, heightIn: 10 },
  { id: "8.5x11", label: '8.5" × 11"', widthIn: 8.5, heightIn: 11 },
];

export const DPI = 300;

/**
 * KDP paperback cover width = (trim width × 2) + spine + 0.25" bleed each side.
 * Spine width (inches) = pageCount × paperThickness / 2
 *   white paper ≈ 0.002252 in/page, cream ≈ 0.0025 in/page.
 * NOTE: always re-validate against current KDP specs at export time.
 */
export function paperbackSpineInches(pageCount: number, cream = false): number {
  const perPage = cream ? 0.0025 : 0.002252;
  return pageCount * perPage;
}

export function paperbackCoverWidthInches(
  trim: TrimSize,
  pageCount: number,
  cream = false,
): number {
  return trim.widthIn * 2 + paperbackSpineInches(pageCount, cream) + 0.5; // 0.25" bleed each side
}

export function pixels(inches: number): number {
  return Math.round(inches * DPI);
}

export function paperbackCoverPixels(
  trim: TrimSize,
  pageCount: number,
  cream = false,
): { width: number; height: number; spinePx: number } {
  const spineIn = paperbackSpineInches(pageCount, cream);
  return {
    width: pixels(paperbackCoverWidthInches(trim, pageCount, cream)),
    height: pixels(trim.heightIn + 0.5), // bleed top/bottom
    spinePx: pixels(spineIn),
  };
}

export function kindleCoverPixels(): { width: number; height: number } {
  // KDP recommends 2560×1600 (1.6:1); minimum 1000px on longest side.
  return { width: 2560, height: 1600 };
}
