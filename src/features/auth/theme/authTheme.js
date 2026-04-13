const AUTH_ACCENT = '#d35400';
const BRAND_DARK = '#2c3e50';

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(hex) {
  const sanitized = hex.replace('#', '').trim();

  if (sanitized.length === 3) {
    return sanitized
      .split('')
      .map((character) => `${character}${character}`)
      .join('');
  }

  return sanitized;
}

function hexToRgb(hex) {
  const normalizedHex = normalizeHex(hex);

  return {
    r: parseInt(normalizedHex.slice(0, 2), 16),
    g: parseInt(normalizedHex.slice(2, 4), 16),
    b: parseInt(normalizedHex.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);

  return toHex({
    r: r * (1 - amount),
    g: g * (1 - amount),
    b: b * (1 - amount),
  });
}

function alpha(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const authAccentBase = AUTH_ACCENT;

export const authTheme = {
  brand: {
    primary: AUTH_ACCENT,
    primarySoft: alpha(AUTH_ACCENT, 0.12),
    primaryDark: darken(AUTH_ACCENT, 0.18),
  },
  auth: {
    background: '#F7F6FC',
    surface: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: 'rgba(44, 62, 80, 0.10)',
    inputBorderFocused: AUTH_ACCENT,
  },
  screen: {
    darkBackground: '#101221',
    darkOverlayCircle: alpha(AUTH_ACCENT, 0.18),
    darkOverlayCircleSecondary: 'rgba(255,255,255,0.06)',
    darkOverlayWarm: 'rgba(247, 188, 140, 0.14)',
  },
  text: {
    primary: BRAND_DARK,
    secondary: '#5f6f7f',
    muted: '#8c98a5',
    onDark: '#F7F7FB',
    onDarkMuted: 'rgba(247,247,251,0.74)',
  },
  button: {
    primaryBackground: AUTH_ACCENT,
    primaryBackgroundPressed: darken(AUTH_ACCENT, 0.16),
    primaryText: '#FFFFFF',
  },
  link: {
    default: AUTH_ACCENT,
  },
  border: {
    subtle: 'rgba(44, 62, 80, 0.10)',
    onDark: 'rgba(255,255,255,0.12)',
  },
  error: {
    default: '#D84A4A',
  },
  disabled: {
    default: '#C9CED8',
  },
};
