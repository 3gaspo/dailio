export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  chores: '#EAB308',   // Yellow
  social: '#EC4899',   // Pink
  culture: '#22C55E',  // Green
  projets: '#A855F7',  // Purple
  projects: '#A855F7', // Purple
  work: '#3B82F6',     // Blue
  sport: '#F97316',    // Orange
};

export const PRESET_COLORS = [
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Slate', hex: '#6B7280' },
];

export function getCategoryDefaultColor(name: string): string {
  const lower = name.trim().toLowerCase();
  for (const [key, color] of Object.entries(DEFAULT_CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#A855F7'; // Default fallback color
}

export function getCategoryColor(category?: { name: string; color?: string }): string {
  if (!category) return '#6B7280';
  if (category.color) return category.color;
  return getCategoryDefaultColor(category.name);
}

export function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // YIQ luminance calculation for optimal contrast
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#000000' : '#FFFFFF';
}

export function hslToHex(h: number, s: number = 75, l: number = 55): string {
  const lFrac = l / 100;
  const a = (s * Math.min(lFrac, 1 - lFrac)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lFrac - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function hexToHue(hex: string): number {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return 0;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const d = max - min;
  if (d === 0) return 0;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
  }
  return Math.round((h * 60) % 360);
}
