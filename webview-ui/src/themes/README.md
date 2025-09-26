# VALKYR DESIGN SYSTEM - BOOTSTRAP THEMES

## 🎨 Overview

This is the **consolidated Bootstrap theme system** for the Valkyr Design Language. We have created **3 distinct LCARS-style themes** that use standard Bootstrap class names, allowing seamless switching between different visual styles while maintaining consistent component behavior.

## 🌈 Available Themes

### 1. **Fun Theme** (`fun`)
- **Style**: Bright, vibrant, and energetic
- **Usage**: CMS applications, Content Management, Creative tools
- **Colors**: 
  - Primary: `#1ee5ff` (Cyan)
  - Secondary: `#7a5cff` (Purple)
  - Accent: `#ff9d00` (Orange)
- **Character**: Light theme with glass effects and bright gradients
- **Best for**: User-facing applications, creative workflows

### 2. **Dark Theme** (`dark`)
- **Style**: Professional, serious, and sophisticated
- **Usage**: CRM applications, Professional tools, Data management
- **Colors**:
  - Primary: `#1ee5ff` (Cyan)
  - Secondary: `#7a5cff` (Purple) 
  - Accent: `#ff9d00` (Orange)
- **Character**: Dark theme with subtle glows and professional gradients
- **Best for**: Business applications, data dashboards, admin interfaces

### 3. **Valkyr Theme** (`valkyr`)
- **Style**: Balanced, native Valkyr design language
- **Usage**: Core applications, Main dashboard, General purpose
- **Colors**:
  - Primary: `#ff9900` (Orange) - **Valkyr Brand Color**
  - Secondary: `#1ee5ff` (Cyan)
  - Accent: `#ff9900` (Orange)
- **Character**: Light theme matching core Valkyr identity with orange accent
- **Best for**: Main applications, default experience, brand consistency

## 🚀 Quick Start

### 1. Import and Initialize
```typescript
import { initThemes, setTheme } from './src/themes';

// Initialize the theme system
initThemes();

// Set a specific theme
setTheme('valkyr'); // or 'fun' or 'dark'
```

### 2. Use the Theme Switcher Component
```typescript
import { ThemeSwitcher } from './src/components/ThemeSwitcher';

// Dropdown variant
<ThemeSwitcher variant="dropdown" showLabels={true} />

// Button variant
<ThemeSwitcher variant="buttons" size="sm" />

// Cycle button
<ThemeSwitcher variant="cycle" />
```

### 3. Use Standard Bootstrap Classes
```html
<!-- These classes work consistently across all themes -->
<div class="card">
  <div class="card-header">
    <h5 class="card-title">My Card</h5>
  </div>
  <div class="card-body">
    <button class="btn btn-primary">Primary Button</button>
    <button class="btn btn-secondary">Secondary Button</button>
    <span class="badge badge-success">Success</span>
  </div>
</div>
```

## 🎯 Design Philosophy

### Bootstrap-First Approach
- **No custom class names** - Uses standard Bootstrap classes
- **Semantic naming** - `.btn-primary`, `.card`, `.navbar`, etc.
- **Consistent behavior** - Same HTML works across all themes
- **Easy migration** - Drop-in replacement for existing Bootstrap sites

### LCARS Integration
- **Star Trek LCARS influence** - Futuristic, technical aesthetic
- **Gradient backgrounds** - Dynamic color transitions
- **Glass morphism** - Translucent surfaces with backdrop blur
- **Animated interactions** - Hover effects and transitions
- **Geometric shapes** - Clean, angular design elements

### Theme Consolidation
- **3 themes instead of 20+ styles** - Massive consolidation
- **Shared class names** - `.card`, `.btn`, `.navbar` work everywhere  
- **Consistent patterns** - Same design patterns across themes
- **Maintainable** - One place to update styles

## 📁 File Structure

```
src/themes/
├── index.ts              # Main theme system export
├── README.md             # This documentation
├── fun/
│   ├── index.ts         # Fun theme export
│   └── bootstrap.css    # Fun theme Bootstrap overrides
├── dark/
│   ├── index.ts         # Dark theme export  
│   └── bootstrap.css    # Dark theme Bootstrap overrides
└── valkyr/
    ├── index.ts         # Valkyr theme export
    └── bootstrap.css    # Valkyr theme Bootstrap overrides
```

## 🔧 Advanced Usage

### Theme Switching API

```typescript
import { themeSwitcher, ThemeName } from './src/themes';

// Get current theme
const current: ThemeName = themeSwitcher.getCurrentTheme();

// Get theme info
const themeInfo = themeSwitcher.getCurrentThemeInfo();
console.log(themeInfo.displayName); // "Valkyr Theme"

// Set theme
themeSwitcher.setTheme('dark');

// Cycle through themes
themeSwitcher.cycleTheme();

// Listen to theme changes
const unsubscribe = themeSwitcher.onThemeChange((theme) => {
  console.log(`Theme changed to: ${theme}`);
});

// Cleanup listener
unsubscribe();

// Get all available themes
const allThemes = themeSwitcher.getAvailableThemes();
```

### Keyboard Shortcuts
- **Ctrl+Shift+T** - Cycle through themes

### Local Storage
Themes are automatically saved to `localStorage` as `valkyr-theme`.

## 🎨 Customization

### Adding a New Theme

1. **Create theme directory**:
```bash
mkdir src/themes/mytheme
```

2. **Create bootstrap.css**:
```css
/* src/themes/mytheme/bootstrap.css */
:root {
  --bs-primary: #your-color;
  --bs-secondary: #your-color;
  /* ... other variables */
}

/* Override Bootstrap classes */
.btn { /* your styles */ }
.card { /* your styles */ }
/* ... */
```

3. **Create index.ts**:
```typescript
// src/themes/mytheme/index.ts
import './bootstrap.css';

export const theme = {
  name: 'mytheme',
  displayName: 'My Theme',
  description: 'My custom theme',
  primaryColor: '#your-color',
  secondaryColor: '#your-color', 
  accentColor: '#your-color',
  type: 'light' as const, // or 'dark'
  usage: ['Custom Applications']
};

export default theme;
```

4. **Register in main index.ts**:
```typescript
// src/themes/index.ts
import myTheme from './mytheme';

export const themes = {
  fun: funTheme,
  dark: darkTheme,
  valkyr: valkyrTheme,
  mytheme: myTheme // Add here
} as const;
```

### CSS Variable System

Each theme defines these key CSS variables:

```css
:root {
  /* Bootstrap Color Palette */
  --bs-primary: #color;
  --bs-primary-rgb: r, g, b;
  --bs-secondary: #color;
  /* ... other Bootstrap colors */
  
  /* LCARS Gradients */
  --lcars-gradient-primary: linear-gradient(...);
  --lcars-gradient-secondary: linear-gradient(...);
  
  /* Glass Effects */
  --glass-bg: rgba(...);
  --glass-border: rgba(...);
  --backdrop-blur: blur(10px);
  
  /* Theme-Specific Variables */
  --theme-glow: 0 0 20px rgba(...);
  --theme-shadow: 0 4px 20px rgba(...);
}
```

## 🧩 Component Integration

### Existing Components
All existing components automatically work with the new theme system:

- **Cards** - Enhanced with glass morphism and gradients
- **Buttons** - LCARS-style with hover animations  
- **Navbars** - Translucent with accent borders
- **Modals** - Glass effect with backdrop blur
- **Tables** - Hover effects and gradient headers
- **Forms** - Styled inputs with focus states
- **Badges** - Glowing effects and borders
- **Alerts** - LCARS-style with accent borders

### Theme-Aware Components
Some components are specifically designed to work with themes:

```typescript
// Theme switcher variants
<ThemeSwitcher variant="dropdown" />
<ThemeSwitcher variant="buttons" />  
<ThemeSwitcher variant="cycle" />
```

## 🔍 Browser Support

- **Modern Browsers**: Full support with all effects
- **Fallbacks**: Graceful degradation for older browsers
- **Accessibility**: High contrast mode support
- **Reduced Motion**: Respects `prefers-reduced-motion`

## 🚀 Performance

- **CSS-in-CSS**: No JavaScript overhead for styles
- **Tree Shaking**: Only loaded theme CSS is included
- **Caching**: Themes cached in localStorage
- **Minimal Bundle**: ~50KB per theme (gzipped ~8KB)

## 🎯 Migration Guide

### From Custom CSS Classes
**Before**:
```html
<div class="lcars-card variant-cyan">
  <div class="lcars-card-header">
    <h5 class="lcars-card-title">Title</h5>
  </div>
</div>
```

**After**:
```html
<div class="card">
  <div class="card-header">
    <h5 class="card-title">Title</h5>
  </div>
</div>
```

### From Multiple Theme Files
**Before**:
```typescript
import './cms-styles.css';
import './crm-dark.css';
import './sidebar-theme.css';
```

**After**:
```typescript
import { initThemes, setTheme } from './src/themes';
initThemes();
setTheme('fun'); // or 'dark', 'valkyr'
```

## 🏆 Benefits

### For Developers
- ✅ **Consistent API** - Same Bootstrap classes everywhere
- ✅ **Easy switching** - Change entire app theme with one line
- ✅ **Maintainable** - One theme system to rule them all
- ✅ **TypeScript support** - Full type safety
- ✅ **Hot reloading** - Instant theme changes in development

### For Designers  
- ✅ **Design consistency** - Unified design language
- ✅ **Brand flexibility** - Multiple themes for different apps
- ✅ **LCARS aesthetic** - Futuristic, technical look and feel
- ✅ **Responsive** - Works on all screen sizes

### For Users
- ✅ **Theme persistence** - Remembers preferred theme
- ✅ **Keyboard shortcuts** - Quick theme switching
- ✅ **Accessibility** - High contrast and reduced motion support
- ✅ **Performance** - Fast theme switching with no flicker

## 🛠️ Development

### Adding New Components
When creating new components, use standard Bootstrap classes:

```typescript
// Good - Uses Bootstrap classes
const MyComponent = () => (
  <div className="card">
    <div className="card-body">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
);

// Avoid - Custom classes that won't work with themes
const MyComponent = () => (
  <div className="my-custom-card">
    <button className="my-custom-button">Action</button>
  </div>
);
```

### Testing Themes
```bash
# Test all themes
npm run test:themes

# Visual regression testing  
npm run test:visual

# Accessibility testing
npm run test:a11y
```

---

## 📞 Support

For questions or issues with the theme system:

1. Check this documentation
2. Look at existing component implementations
3. Test with all 3 themes to ensure consistency
4. Follow Bootstrap naming conventions

**Remember**: The goal is ONE unified, maintainable theme system that works consistently across all Valkyr applications! 🎨✨
