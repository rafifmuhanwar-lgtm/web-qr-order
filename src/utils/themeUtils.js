// Shared theme color utilities for admin and customer sides

export const THEME_COLORS = {
    orange: { primary: '#f97316', dark: '#ea580c', light: '#fed7aa' },
    red: { primary: '#ef4444', dark: '#dc2626', light: '#fecaca' },
    blue: { primary: '#3b82f6', dark: '#2563eb', light: '#bfdbfe' },
    green: { primary: '#22c55e', dark: '#16a34a', light: '#bbf7d0' },
    purple: { primary: '#a855f7', dark: '#9333ea', light: '#e9d5ff' },
    pink: { primary: '#ec4899', dark: '#db2777', light: '#fbcfe8' },
    teal: { primary: '#14b8a6', dark: '#0d9488', light: '#99f6e4' },
    amber: { primary: '#f59e0b', dark: '#d97706', light: '#fde68a' },
};

export const COLOR_OPTIONS = [
    { key: 'orange', label: 'Orange', color: '#f97316' },
    { key: 'red', label: 'Merah', color: '#ef4444' },
    { key: 'blue', label: 'Biru', color: '#3b82f6' },
    { key: 'green', label: 'Hijau', color: '#22c55e' },
    { key: 'purple', label: 'Ungu', color: '#a855f7' },
    { key: 'pink', label: 'Pink', color: '#ec4899' },
    { key: 'teal', label: 'Teal', color: '#14b8a6' },
    { key: 'amber', label: 'Amber', color: '#f59e0b' },
];

/**
 * Apply theme color to CSS variables.
 * Supports both preset keys (e.g., 'blue') and custom hex colors (e.g., '#3b82f6').
 * For custom colors, lighter/darker variants are auto-generated.
 */
export function applyThemeColor(themeColor, customColor) {
    let colors;

    if (themeColor === 'custom' && customColor) {
        colors = generateColorVariants(customColor);
    } else {
        colors = THEME_COLORS[themeColor] || THEME_COLORS.orange;
    }

    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-primary-dark', colors.dark);
    document.documentElement.style.setProperty('--color-primary-light', colors.light);
}

/**
 * Generate dark and light variants from a hex color.
 */
function generateColorVariants(hex) {
    const { h, s, l } = hexToHSL(hex);

    const darkHex = hslToHex(h, Math.min(s + 10, 100), Math.max(l - 12, 10));
    const lightHex = hslToHex(h, Math.min(s + 5, 100), Math.min(l + 30, 92));

    return {
        primary: hex,
        dark: darkHex,
        light: lightHex,
    };
}

function hexToHSL(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}
