export const DEFAULT_STORE_THEME_ID = 'rozare-professional-store';
export const CUSTOM_STORE_THEME_ID = 'custom';

export const STORE_THEME_LAYOUTS = [
    { id: 'classic', label: 'Classic' },
    { id: 'centered', label: 'Centered' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'compact', label: 'Compact' },
];

const makeTheme = ({
    id,
    name,
    tagline,
    layout = 'classic',
    radius = '1.5rem',
    gridClass = 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    palette,
    colors,
}) => ({
    id,
    name,
    tagline,
    layout,
    radius,
    gridClass,
    palette,
    colors,
});

export const STORE_THEMES = [
    makeTheme({
        id: DEFAULT_STORE_THEME_ID,
        name: 'Rozare professional store',
        tagline: 'The original polished Rozare storefront.',
        layout: 'classic',
        palette: {
            primary: 'hsl(220, 70%, 55%)',
            secondary: 'hsl(260, 60%, 60%)',
            accent: 'hsl(150, 60%, 45%)',
            text: 'hsl(var(--foreground))',
            muted: 'hsl(var(--muted-foreground))',
            panel: undefined,
            pageBackground: undefined,
            heroGradient: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))',
            accentGradient: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))',
            chipBackground: 'rgba(56, 189, 248, 0.1)',
            chipBorder: 'rgba(56, 189, 248, 0.18)',
            chipText: 'hsl(200, 80%, 50%)',
            couponGradient: 'linear-gradient(90deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))',
        },
        colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            accent: '#10b981',
            background: '#eef4ff',
            surface: '#ffffff',
            text: '#111827',
        },
    }),
    makeTheme({
        id: 'pearl-boutique',
        name: 'Pearl Boutique',
        tagline: 'Soft blush retail with a calm premium feel.',
        layout: 'centered',
        gridClass: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        palette: {
            primary: '#d86f91',
            secondary: '#f1a37c',
            accent: '#69b7a8',
            text: '#2d2430',
            muted: '#746876',
            panel: 'rgba(255, 249, 252, 0.72)',
            pageBackground: 'radial-gradient(circle at 12% 10%, rgba(248, 187, 208, 0.34), transparent 30%), radial-gradient(circle at 90% 18%, rgba(251, 191, 140, 0.26), transparent 32%), linear-gradient(135deg, #fff8fb, #f4fbff)',
            heroGradient: 'linear-gradient(135deg, #d86f91, #f1a37c)',
            accentGradient: 'linear-gradient(135deg, #d86f91, #69b7a8)',
            chipBackground: 'rgba(216, 111, 145, 0.12)',
            chipBorder: 'rgba(216, 111, 145, 0.22)',
            chipText: '#b84f73',
            couponGradient: 'linear-gradient(90deg, #d86f91, #69b7a8)',
        },
        colors: {
            primary: '#d86f91',
            secondary: '#f1a37c',
            accent: '#69b7a8',
            background: '#fff8fb',
            surface: '#ffffff',
            text: '#2d2430',
        },
    }),
    makeTheme({
        id: 'sage-studio',
        name: 'Sage Studio',
        tagline: 'Botanical, quiet, and crisp for handmade shops.',
        layout: 'editorial',
        gridClass: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
        palette: {
            primary: '#5f9f83',
            secondary: '#8abfbc',
            accent: '#d9a441',
            text: '#1d2b24',
            muted: '#62736a',
            panel: 'rgba(248, 255, 250, 0.72)',
            pageBackground: 'radial-gradient(circle at 8% 14%, rgba(95, 159, 131, 0.24), transparent 32%), radial-gradient(circle at 85% 12%, rgba(217, 164, 65, 0.18), transparent 30%), linear-gradient(135deg, #f6fff9, #eef9ff)',
            heroGradient: 'linear-gradient(135deg, #5f9f83, #8abfbc)',
            accentGradient: 'linear-gradient(135deg, #5f9f83, #d9a441)',
            chipBackground: 'rgba(95, 159, 131, 0.12)',
            chipBorder: 'rgba(95, 159, 131, 0.22)',
            chipText: '#447b64',
            couponGradient: 'linear-gradient(90deg, #5f9f83, #d9a441)',
        },
        colors: {
            primary: '#5f9f83',
            secondary: '#8abfbc',
            accent: '#d9a441',
            background: '#f6fff9',
            surface: '#ffffff',
            text: '#1d2b24',
        },
    }),
    makeTheme({
        id: 'skyline-market',
        name: 'Skyline Market',
        tagline: 'Fresh blue glass for catalogs with many products.',
        layout: 'compact',
        radius: '1.25rem',
        gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        palette: {
            primary: '#4f8fd8',
            secondary: '#7fb8e8',
            accent: '#6fcfbd',
            text: '#172033',
            muted: '#657089',
            panel: 'rgba(246, 250, 255, 0.72)',
            pageBackground: 'radial-gradient(circle at 15% 10%, rgba(79, 143, 216, 0.26), transparent 32%), radial-gradient(circle at 90% 30%, rgba(111, 207, 189, 0.22), transparent 30%), linear-gradient(135deg, #f5fbff, #f8f7ff)',
            heroGradient: 'linear-gradient(135deg, #4f8fd8, #7fb8e8)',
            accentGradient: 'linear-gradient(135deg, #4f8fd8, #6fcfbd)',
            chipBackground: 'rgba(79, 143, 216, 0.12)',
            chipBorder: 'rgba(79, 143, 216, 0.22)',
            chipText: '#3a76bb',
            couponGradient: 'linear-gradient(90deg, #4f8fd8, #6fcfbd)',
        },
        colors: {
            primary: '#4f8fd8',
            secondary: '#7fb8e8',
            accent: '#6fcfbd',
            background: '#f5fbff',
            surface: '#ffffff',
            text: '#172033',
        },
    }),
    makeTheme({
        id: 'lilac-gallery',
        name: 'Lilac Gallery',
        tagline: 'Airy lavender showroom for elegant collections.',
        layout: 'showcase',
        gridClass: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
        palette: {
            primary: '#9b7ad7',
            secondary: '#d19ad8',
            accent: '#75c5b8',
            text: '#271f35',
            muted: '#71677f',
            panel: 'rgba(252, 248, 255, 0.72)',
            pageBackground: 'radial-gradient(circle at 10% 16%, rgba(155, 122, 215, 0.26), transparent 31%), radial-gradient(circle at 88% 15%, rgba(117, 197, 184, 0.2), transparent 31%), linear-gradient(135deg, #fbf8ff, #f5ffff)',
            heroGradient: 'linear-gradient(135deg, #9b7ad7, #d19ad8)',
            accentGradient: 'linear-gradient(135deg, #9b7ad7, #75c5b8)',
            chipBackground: 'rgba(155, 122, 215, 0.12)',
            chipBorder: 'rgba(155, 122, 215, 0.24)',
            chipText: '#7b5cbd',
            couponGradient: 'linear-gradient(90deg, #9b7ad7, #75c5b8)',
        },
        colors: {
            primary: '#9b7ad7',
            secondary: '#d19ad8',
            accent: '#75c5b8',
            background: '#fbf8ff',
            surface: '#ffffff',
            text: '#271f35',
        },
    }),
    makeTheme({
        id: 'sunlit-minimal',
        name: 'Sunlit Minimal',
        tagline: 'Clean warm light with mint and golden accents.',
        layout: 'editorial',
        gridClass: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
        palette: {
            primary: '#d9a441',
            secondary: '#76b7a5',
            accent: '#6f93d6',
            text: '#2d2a1f',
            muted: '#736f62',
            panel: 'rgba(255, 253, 245, 0.74)',
            pageBackground: 'radial-gradient(circle at 10% 10%, rgba(217, 164, 65, 0.22), transparent 30%), radial-gradient(circle at 88% 20%, rgba(118, 183, 165, 0.22), transparent 31%), linear-gradient(135deg, #fffdf5, #f4fbff)',
            heroGradient: 'linear-gradient(135deg, #d9a441, #76b7a5)',
            accentGradient: 'linear-gradient(135deg, #d9a441, #6f93d6)',
            chipBackground: 'rgba(217, 164, 65, 0.13)',
            chipBorder: 'rgba(217, 164, 65, 0.24)',
            chipText: '#9a711e',
            couponGradient: 'linear-gradient(90deg, #d9a441, #6f93d6)',
        },
        colors: {
            primary: '#d9a441',
            secondary: '#76b7a5',
            accent: '#6f93d6',
            background: '#fffdf5',
            surface: '#ffffff',
            text: '#2d2a1f',
        },
    }),
    makeTheme({
        id: 'coral-showroom',
        name: 'Coral Showroom',
        tagline: 'Friendly coral energy for lifestyle products.',
        layout: 'centered',
        gridClass: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        palette: {
            primary: '#e77f75',
            secondary: '#efb069',
            accent: '#6dbbd2',
            text: '#342525',
            muted: '#766867',
            panel: 'rgba(255, 249, 247, 0.72)',
            pageBackground: 'radial-gradient(circle at 12% 14%, rgba(231, 127, 117, 0.26), transparent 31%), radial-gradient(circle at 88% 16%, rgba(109, 187, 210, 0.22), transparent 31%), linear-gradient(135deg, #fff8f7, #f5fdff)',
            heroGradient: 'linear-gradient(135deg, #e77f75, #efb069)',
            accentGradient: 'linear-gradient(135deg, #e77f75, #6dbbd2)',
            chipBackground: 'rgba(231, 127, 117, 0.12)',
            chipBorder: 'rgba(231, 127, 117, 0.24)',
            chipText: '#c86158',
            couponGradient: 'linear-gradient(90deg, #e77f75, #6dbbd2)',
        },
        colors: {
            primary: '#e77f75',
            secondary: '#efb069',
            accent: '#6dbbd2',
            background: '#fff8f7',
            surface: '#ffffff',
            text: '#342525',
        },
    }),
    makeTheme({
        id: 'aqua-retail',
        name: 'Aqua Retail',
        tagline: 'Cool, bright, and efficient for modern stores.',
        layout: 'compact',
        radius: '1.25rem',
        gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        palette: {
            primary: '#45a9c9',
            secondary: '#5ec7ba',
            accent: '#8e8bd8',
            text: '#162b31',
            muted: '#5f757b',
            panel: 'rgba(245, 254, 255, 0.72)',
            pageBackground: 'radial-gradient(circle at 11% 12%, rgba(69, 169, 201, 0.26), transparent 31%), radial-gradient(circle at 88% 18%, rgba(142, 139, 216, 0.2), transparent 31%), linear-gradient(135deg, #f4feff, #faf8ff)',
            heroGradient: 'linear-gradient(135deg, #45a9c9, #5ec7ba)',
            accentGradient: 'linear-gradient(135deg, #45a9c9, #8e8bd8)',
            chipBackground: 'rgba(69, 169, 201, 0.12)',
            chipBorder: 'rgba(69, 169, 201, 0.24)',
            chipText: '#318aa7',
            couponGradient: 'linear-gradient(90deg, #45a9c9, #8e8bd8)',
        },
        colors: {
            primary: '#45a9c9',
            secondary: '#5ec7ba',
            accent: '#8e8bd8',
            background: '#f4feff',
            surface: '#ffffff',
            text: '#162b31',
        },
    }),
    makeTheme({
        id: 'orchid-luxe',
        name: 'Orchid Luxe',
        tagline: 'Soft luxury with refined contrast.',
        layout: 'showcase',
        gridClass: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
        palette: {
            primary: '#b06ac6',
            secondary: '#7281d9',
            accent: '#d6a85f',
            text: '#2f2335',
            muted: '#76677d',
            panel: 'rgba(253, 248, 255, 0.72)',
            pageBackground: 'radial-gradient(circle at 12% 14%, rgba(176, 106, 198, 0.24), transparent 31%), radial-gradient(circle at 88% 18%, rgba(214, 168, 95, 0.18), transparent 31%), linear-gradient(135deg, #fdf8ff, #f8fbff)',
            heroGradient: 'linear-gradient(135deg, #b06ac6, #7281d9)',
            accentGradient: 'linear-gradient(135deg, #b06ac6, #d6a85f)',
            chipBackground: 'rgba(176, 106, 198, 0.12)',
            chipBorder: 'rgba(176, 106, 198, 0.24)',
            chipText: '#934eb0',
            couponGradient: 'linear-gradient(90deg, #b06ac6, #d6a85f)',
        },
        colors: {
            primary: '#b06ac6',
            secondary: '#7281d9',
            accent: '#d6a85f',
            background: '#fdf8ff',
            surface: '#ffffff',
            text: '#2f2335',
        },
    }),
    makeTheme({
        id: 'mint-catalog',
        name: 'Mint Catalog',
        tagline: 'Balanced mint and blue for everyday commerce.',
        layout: 'classic',
        gridClass: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        palette: {
            primary: '#63bfa4',
            secondary: '#73a6dc',
            accent: '#d98291',
            text: '#18302b',
            muted: '#637671',
            panel: 'rgba(247, 255, 252, 0.72)',
            pageBackground: 'radial-gradient(circle at 10% 14%, rgba(99, 191, 164, 0.24), transparent 31%), radial-gradient(circle at 88% 18%, rgba(115, 166, 220, 0.21), transparent 31%), linear-gradient(135deg, #f7fffc, #f7fbff)',
            heroGradient: 'linear-gradient(135deg, #63bfa4, #73a6dc)',
            accentGradient: 'linear-gradient(135deg, #63bfa4, #d98291)',
            chipBackground: 'rgba(99, 191, 164, 0.12)',
            chipBorder: 'rgba(99, 191, 164, 0.24)',
            chipText: '#46977e',
            couponGradient: 'linear-gradient(90deg, #63bfa4, #d98291)',
        },
        colors: {
            primary: '#63bfa4',
            secondary: '#73a6dc',
            accent: '#d98291',
            background: '#f7fffc',
            surface: '#ffffff',
            text: '#18302b',
        },
    }),
];

export const STORE_THEME_IDS = STORE_THEMES.map(theme => theme.id);

const DEFAULT_THEME = STORE_THEMES[0];
const hexColorPattern = /^#[0-9a-f]{6}$/i;

const safeHex = (value, fallback) => {
    const color = String(value || '').trim();
    return hexColorPattern.test(color) ? color : fallback;
};

const normalizeLayout = (layout) => (
    STORE_THEME_LAYOUTS.some(option => option.id === layout) ? layout : 'classic'
);

const customGradient = (primary, secondary) => `linear-gradient(135deg, ${primary}, ${secondary})`;

const buildCustomTheme = (customTheme = {}) => {
    const colors = customTheme.colors || {};
    const primary = safeHex(colors.primary, DEFAULT_THEME.colors.primary);
    const secondary = safeHex(colors.secondary, DEFAULT_THEME.colors.secondary);
    const accent = safeHex(colors.accent, DEFAULT_THEME.colors.accent);
    const background = safeHex(colors.background, DEFAULT_THEME.colors.background);
    const surface = safeHex(colors.surface, DEFAULT_THEME.colors.surface);
    const text = safeHex(colors.text, DEFAULT_THEME.colors.text);

    return makeTheme({
        id: CUSTOM_STORE_THEME_ID,
        name: String(customTheme.name || 'Custom Store Theme').slice(0, 40),
        tagline: 'Your Elite custom storefront.',
        layout: normalizeLayout(customTheme.layout),
        gridClass: normalizeLayout(customTheme.layout) === 'compact'
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : DEFAULT_THEME.gridClass,
        palette: {
            primary,
            secondary,
            accent,
            text,
            muted: `${text}bb`,
            panel: `${surface}c7`,
            pageBackground: `radial-gradient(circle at 11% 12%, ${primary}38, transparent 31%), radial-gradient(circle at 88% 18%, ${accent}30, transparent 31%), linear-gradient(135deg, ${background}, #ffffff)`,
            heroGradient: customGradient(primary, secondary),
            accentGradient: customGradient(primary, accent),
            chipBackground: `${primary}1f`,
            chipBorder: `${primary}38`,
            chipText: primary,
            couponGradient: `linear-gradient(90deg, ${primary}, ${accent})`,
        },
        colors: { primary, secondary, accent, background, surface, text },
    });
};

export const getStoreTheme = (storeTheme) => {
    const themeId = typeof storeTheme === 'string'
        ? storeTheme
        : storeTheme?.themeId || DEFAULT_STORE_THEME_ID;

    if (themeId === CUSTOM_STORE_THEME_ID && storeTheme?.customTheme) {
        return buildCustomTheme(storeTheme.customTheme);
    }

    return STORE_THEMES.find(theme => theme.id === themeId) || DEFAULT_THEME;
};

export const isDefaultStoreTheme = (theme) => (theme?.id || DEFAULT_STORE_THEME_ID) === DEFAULT_STORE_THEME_ID;

export const buildStoreThemeStyle = (theme) => {
    if (isDefaultStoreTheme(theme)) return undefined;
    return {
        '--store-theme-primary': theme.palette.primary,
        '--store-theme-secondary': theme.palette.secondary,
        '--store-theme-accent': theme.palette.accent,
        '--store-theme-text': theme.palette.text,
        '--store-theme-muted': theme.palette.muted,
        '--store-theme-panel': theme.palette.panel,
        background: theme.palette.pageBackground,
        color: theme.palette.text,
    };
};

export const makeCustomThemeDraft = (theme = DEFAULT_THEME) => ({
    name: theme.id === CUSTOM_STORE_THEME_ID ? theme.name : `${theme.name} Custom`,
    layout: normalizeLayout(theme.layout),
    colors: {
        primary: safeHex(theme.colors?.primary, DEFAULT_THEME.colors.primary),
        secondary: safeHex(theme.colors?.secondary, DEFAULT_THEME.colors.secondary),
        accent: safeHex(theme.colors?.accent, DEFAULT_THEME.colors.accent),
        background: safeHex(theme.colors?.background, DEFAULT_THEME.colors.background),
        surface: safeHex(theme.colors?.surface, DEFAULT_THEME.colors.surface),
        text: safeHex(theme.colors?.text, DEFAULT_THEME.colors.text),
    },
});

export const normalizeThemeSelection = (storeTheme) => ({
    themeId: storeTheme?.themeId || DEFAULT_STORE_THEME_ID,
    customTheme: storeTheme?.themeId === CUSTOM_STORE_THEME_ID ? storeTheme.customTheme || null : null,
});
