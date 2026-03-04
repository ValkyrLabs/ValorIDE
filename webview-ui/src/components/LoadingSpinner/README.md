# LoadingSpinner

## Overview

`LoadingSpinner` is a lightweight activity indicator with Valkyr's neon chrome. It injects its own keyframes once per document and scales smoothly for compact or immersive layouts.

## Key Props

- `label?: string` - Optional caption rendered next to the spinner, defaults to `"Loading..."`.
- `size?: number` - Diameter in pixels; adjusts border width automatically.
- Inherits standard `div` attributes via `React.HTMLAttributes<HTMLDivElement>` for alignment tweaks.

## Usage

```tsx
import LoadingSpinner from "@valkyr/component-library/LoadingSpinner";

<LoadingSpinner label="Syncing ThorAPI data" size={48} />;
```

## QA Notes

- Injects the `vl-spin` keyframes only once; safe to render multiple instances.
- Uses pure CSS animation so it remains performant without additional dependencies.
- Honors `style` overrides for flex alignment within custom containers.
