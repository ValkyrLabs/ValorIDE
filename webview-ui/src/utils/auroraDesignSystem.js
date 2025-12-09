/**
 * AURORA DESIGN SYSTEM UTILITIES
 * Centralized color palette, typography, spacing, and component styles
 *
 * Aurora is the unified design language for Valkyr Suite
 * Supporting LCARS aesthetic with modern dark theme sensibilities
 */
/* ===================================================================
   COLOR PALETTE - AURORA
   =================================================================== */
export const AuroraColors = {
    /* Primary & Accent Colors */
    primary: "#ff9900", // Orange - Main brand color
    secondary: "#1ee5ff", // Cyan - Secondary action
    accent: "#7a5cff", // Purple - Interactive elements
    tertiary: "#ffa500", // Light Orange - Tertiary actions
    /* Aurora Semantic Colors */
    cyan: "#1ee5ff", // Information, secondary actions
    teal: "#00e0bf", // Success, confirmations
    orange: "#ff9900", // Primary actions, emphasis
    purple: "#7a5cff", // Interactive states
    pink: "#e93cff", // Attention, special states
    gold: "#ffc94b", // Highlights, premium features
    /* Status Colors */
    success: "#00e0bf",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#39cbfb",
    /* Neutral/Background */
    background: "#05060b", // Deep space black
    surface: "#141a22", // Surface elevation 1
    surfaceElevated: "#252d3d", // Surface elevation 2
    text: "#f3f6ff", // Primary text (light)
    textSecondary: "rgba(243, 246, 255, 0.7)",
    textTertiary: "rgba(243, 246, 255, 0.5)",
    border: "#2d3b4a", // Subtle borders
    borderLight: "rgba(30, 229, 255, 0.1)",
    /* Transparency Variants */
    cyanTransparent: "rgba(30, 229, 255, 0.1)",
    purpleTransparent: "rgba(122, 92, 255, 0.1)",
    orangeTransparent: "rgba(255, 153, 0, 0.1)",
};
/* ===================================================================
   SPACING SYSTEM
   =================================================================== */
export const AuroraSpacing = {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    xxl: "3rem", // 48px
};
/* ===================================================================
   BORDER RADIUS - LCARS AESTHETIC
   =================================================================== */
export const AuroraBorderRadius = {
    none: "0",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "1rem",
    xl: "1.5rem",
    full: "9999px",
};
/* ===================================================================
   TYPOGRAPHY
   =================================================================== */
export const AuroraTypography = {
    fontFamily: {
        base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    },
    fontSize: {
        xs: "0.75rem", // 12px
        sm: "0.875rem", // 14px
        base: "1rem", // 16px
        lg: "1.125rem", // 18px
        xl: "1.25rem", // 20px
        "2xl": "1.5rem", // 24px
        "3xl": "1.875rem", // 30px
        "4xl": "2.25rem", // 36px
    },
    lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
        loose: "2",
    },
    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
};
/* ===================================================================
   SHADOW SYSTEM
   =================================================================== */
export const AuroraShadows = {
    none: "none",
    sm: "0 2px 4px rgba(0, 0, 0, 0.2)",
    base: "0 4px 8px rgba(0, 0, 0, 0.3)",
    md: "0 8px 16px rgba(0, 0, 0, 0.35)",
    lg: "0 12px 28px rgba(0, 0, 0, 0.35)",
    xl: "0 18px 36px rgba(0, 0, 0, 0.4)",
    glow: "0 0 15px rgba(30, 229, 255, 0.3)",
    glowPurple: "0 0 20px rgba(122, 92, 255, 0.3)",
    glowOrange: "0 0 15px rgba(255, 153, 0, 0.3)",
};
/* ===================================================================
   TRANSITIONS & ANIMATIONS
   =================================================================== */
export const AuroraTransitions = {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)",
};
/* ===================================================================
   COMPONENT PRESETS
   =================================================================== */
export const AuroraButton = {
    /* Primary Button */
    primary: {
        background: AuroraColors.primary,
        border: AuroraColors.primary,
        color: AuroraColors.background,
        shadow: AuroraShadows.glow,
        hover: {
            background: "#ffb347",
            shadow: AuroraShadows.glowOrange,
        },
    },
    /* Secondary Button */
    secondary: {
        background: "transparent",
        border: AuroraColors.secondary,
        color: AuroraColors.secondary,
        shadow: "none",
        hover: {
            background: AuroraColors.cyanTransparent,
            shadow: AuroraShadows.glow,
        },
    },
    /* Tertiary Button */
    tertiary: {
        background: "transparent",
        border: AuroraColors.purple,
        color: AuroraColors.purple,
        shadow: "none",
        hover: {
            background: AuroraColors.purpleTransparent,
            shadow: AuroraShadows.glowPurple,
        },
    },
    /* Success Button */
    success: {
        background: AuroraColors.success,
        border: AuroraColors.success,
        color: AuroraColors.background,
        shadow: "none",
        hover: {
            background: "#00d4a8",
        },
    },
    /* Danger Button */
    danger: {
        background: AuroraColors.danger,
        border: AuroraColors.danger,
        color: "#fff",
        shadow: "none",
        hover: {
            background: "#e84856",
        },
    },
};
export const AuroraInput = {
    background: "rgba(10, 15, 20, 0.5)",
    border: AuroraColors.border,
    color: AuroraColors.text,
    placeholder: AuroraColors.textTertiary,
    focusBorder: AuroraColors.secondary,
    focusBackground: "rgba(30, 229, 255, 0.05)",
    focusGlow: AuroraShadows.glow,
    padding: `${AuroraSpacing.sm} ${AuroraSpacing.md}`,
    borderRadius: AuroraBorderRadius.sm,
    fontSize: AuroraTypography.fontSize.base,
    fontFamily: AuroraTypography.fontFamily.base,
};
export const AuroraCard = {
    background: AuroraColors.surface,
    border: `2px solid ${AuroraColors.border}`,
    borderRadius: AuroraBorderRadius.lg,
    padding: AuroraSpacing.lg,
    shadow: AuroraShadows.md,
    hoverShadow: AuroraShadows.lg,
    transition: AuroraTransitions.normal,
};
export const AuroraModal = {
    background: AuroraColors.surface,
    overlayBackground: "rgba(5, 6, 11, 0.8)",
    border: `2px solid ${AuroraColors.border}`,
    shadow: AuroraShadows.xl,
    borderRadius: AuroraBorderRadius.lg,
};
export const AuroraNavbar = {
    background: "linear-gradient(90deg, rgba(5, 6, 11, 0.95), rgba(20, 26, 34, 0.9))",
    border: `2px solid ${AuroraColors.border}`,
    borderRadius: `0 0 ${AuroraBorderRadius.lg} ${AuroraBorderRadius.lg}`,
    shadow: AuroraShadows.lg,
};
/* ===================================================================
   CSS CLASS GENERATOR HELPERS
   =================================================================== */
/**
 * Generate Aurora-compliant CSS variables as CSS string
 * Useful for scoped styles or CSS-in-JS solutions
 */
export function getAuroraCSSVariables() {
    return `
    --aurora-primary: ${AuroraColors.primary};
    --aurora-secondary: ${AuroraColors.secondary};
    --aurora-accent: ${AuroraColors.accent};
    --aurora-success: ${AuroraColors.success};
    --aurora-warning: ${AuroraColors.warning};
    --aurora-danger: ${AuroraColors.danger};
    --aurora-bg-0: ${AuroraColors.background};
    --aurora-surface: ${AuroraColors.surface};
    --aurora-surface-elevated: ${AuroraColors.surfaceElevated};
    --aurora-text: ${AuroraColors.text};
    --aurora-text-secondary: ${AuroraColors.textSecondary};
    --aurora-border: ${AuroraColors.border};
    --aurora-border-light: ${AuroraColors.borderLight};
    --aurora-accent-1: ${AuroraColors.secondary};
    --aurora-accent-2: ${AuroraColors.purple};
    --aurora-accent-3: ${AuroraColors.orange};
    --aurora-ok: ${AuroraColors.success};
    --aurora-bg-0: ${AuroraColors.background};
    --aurora-fg-0: ${AuroraColors.text};
    --spacing-xs: ${AuroraSpacing.xs};
    --spacing-sm: ${AuroraSpacing.sm};
    --spacing-md: ${AuroraSpacing.md};
    --spacing-lg: ${AuroraSpacing.lg};
    --spacing-xl: ${AuroraSpacing.xl};
    --spacing-xxl: ${AuroraSpacing.xxl};
    --radius-sm: ${AuroraBorderRadius.sm};
    --radius-md: ${AuroraBorderRadius.md};
    --radius-lg: ${AuroraBorderRadius.lg};
    --radius-full: ${AuroraBorderRadius.full};
    --transition-fast: ${AuroraTransitions.fast};
    --transition-normal: ${AuroraTransitions.normal};
    --transition-slow: ${AuroraTransitions.slow};
  `;
}
/**
 * Apply Aurora theme to a component
 * Returns inline style object for React components
 */
export function applyAuroraTheme(componentType, variant = "primary") {
    const styles = {
        button_primary: {
            background: AuroraButton.primary.background,
            border: `2px solid ${AuroraButton.primary.border}`,
            color: AuroraButton.primary.color,
            padding: `${AuroraSpacing.sm} ${AuroraSpacing.lg}`,
            borderRadius: AuroraBorderRadius.md,
            fontWeight: AuroraTypography.fontWeight.semibold,
            cursor: "pointer",
            transition: AuroraTransitions.normal,
            boxShadow: AuroraButton.primary.shadow,
        },
        button_secondary: {
            background: AuroraButton.secondary.background,
            border: `2px solid ${AuroraButton.secondary.border}`,
            color: AuroraButton.secondary.color,
            padding: `${AuroraSpacing.sm} ${AuroraSpacing.lg}`,
            borderRadius: AuroraBorderRadius.md,
            fontWeight: AuroraTypography.fontWeight.semibold,
            cursor: "pointer",
            transition: AuroraTransitions.normal,
        },
        input_primary: {
            background: AuroraInput.background,
            border: `2px solid ${AuroraInput.border}`,
            color: AuroraInput.color,
            padding: AuroraInput.padding,
            borderRadius: AuroraInput.borderRadius,
            fontSize: AuroraInput.fontSize,
            fontFamily: AuroraInput.fontFamily,
            transition: AuroraTransitions.normal,
        },
        card_primary: {
            background: AuroraCard.background,
            border: AuroraCard.border,
            borderRadius: AuroraCard.borderRadius,
            padding: AuroraCard.padding,
            boxShadow: AuroraCard.shadow,
            transition: AuroraCard.transition,
        },
        modal_primary: {
            background: AuroraModal.background,
            border: AuroraModal.border,
            boxShadow: AuroraModal.shadow,
            borderRadius: AuroraModal.borderRadius,
        },
        navbar_primary: {
            background: AuroraNavbar.background,
            border: AuroraNavbar.border,
            borderRadius: AuroraNavbar.borderRadius,
            boxShadow: AuroraNavbar.shadow,
        },
    };
    const key = `${componentType}_${variant}`;
    return styles[key] || styles[`${componentType}_primary`] || {};
}
/**
 * Get Aurora color with optional opacity override
 */
export function getAuroraColorWithOpacity(colorKey, opacity = 1) {
    const color = AuroraColors[colorKey];
    if (color.startsWith("rgba")) {
        // Already has alpha channel, extract RGB and apply new opacity
        const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
        if (rgbMatch) {
            const rgb = rgbMatch[1].split(",").slice(0, 3).join(",");
            return `rgba(${rgb}, ${opacity})`;
        }
    }
    else if (color.startsWith("#")) {
        // Convert hex to rgba
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
}
export default {
    AuroraColors,
    AuroraSpacing,
    AuroraBorderRadius,
    AuroraTypography,
    AuroraShadows,
    AuroraTransitions,
    AuroraButton,
    AuroraInput,
    AuroraCard,
    AuroraModal,
    AuroraNavbar,
    getAuroraCSSVariables,
    applyAuroraTheme,
    getAuroraColorWithOpacity,
};
//# sourceMappingURL=auroraDesignSystem.js.map