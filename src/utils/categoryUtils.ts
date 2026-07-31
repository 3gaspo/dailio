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
