---
name: Mobile Dark Mode System
description: ThemeContext with light/dark/system modes, AsyncStorage persistence, dual palettes in palettes.js, useThemedStyles hook, Appearance toggle in Settings
type: feature
---
The mobile app has a global theme system in `MobileApp/src/contexts/ThemeContext.js`. It exposes `mode` ('light'|'dark'|'system'), `resolvedMode`, `isDark`, `palette`, `setMode`, `toggle`. Persistence uses AsyncStorage key `app_theme_mode`. System mode follows `useColorScheme()`.

Palettes live in `MobileApp/src/styles/palettes.js` — `lightPalette` and `darkPalette` share identical keys (`colors`, `gradients`, `glass`). Dark mode uses inky slate base (#0b1020 background, #141a2e surface) with brightened brand indigo (#818cf8) for contrast.

Screens consume via `const { palette } = useTheme()` or `const styles = useThemedStyles((p) => ({...}))`. `GlassBackground` is theme-aware (gradient + orb tints adapt). The Appearance section in `SettingsScreen.js` provides a 3-way segmented control with haptic feedback.

Legacy `colors` and `glass` imports from `theme.js` still default to the light palette — screens must be migrated to `useTheme()` to participate in dark mode. The retheme is being rolled out in batches.
