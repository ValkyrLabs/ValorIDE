# ContentData Components

Premium content data presentation components powered by ThorAPI and Three.js.

## Components

### ContentDataFlipBoard

A stunning 3D FlipBoard-style carousel component for displaying ContentData items with smooth animations and interactive controls.

**Features:**
- 🎨 **Three.js 3D Animations** — Curved card carousel with metallic materials and dynamic lighting
- ⚡ **Auto-Scroll** — Automatic carousel rotation with configurable intervals
- 🎯 **Interactive Navigation** — Previous/Next buttons and clickable dot indicators
- 📱 **Responsive Design** — Works perfectly on desktop, tablet, and mobile
- 🎪 **ThorAPI Integration** — Uses RTK Query to fetch ContentData automatically
- ✨ **Rich Metadata Display** — Shows title, description, category, and status for each item

**Usage:**

```tsx
import { ContentDataFlipBoard } from "@valkyr/component-library/content-data";

export function MyComponent() {
  return (
    <ContentDataFlipBoard
      itemsPerPage={5}
      autoScroll={true}
      autoScrollInterval={5000}
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemsPerPage` | `number` | `5` | Maximum number of ContentData items to display |
| `autoScroll` | `boolean` | `true` | Enable automatic carousel rotation |
| `autoScrollInterval` | `number` | `5000` | Time between auto-scroll in milliseconds |

**Styling:**

All styles are defined in `ContentDataFlipBoard.css` with full responsive support. Key CSS classes:

- `.flipboard-container` — Main container with gradient background
- `.flipboard-canvas` — Three.js WebGL canvas
- `.flipboard-controls` — Navigation controls (bottom center)
- `.flipboard-info` — Card info panel (top left)
- `.flipboard-nav-btn` — Navigation buttons with hover effects
- `.indicator` — Dot indicators (active/inactive states)

**Data Requirements:**

The component expects ContentData items with these fields:
- `id` (required)
- `title` (optional, defaults to "Untitled")
- `contentData` (optional, used as description)
- `category` (optional, defaults to "Other")
- `status` (optional, defaults to "unknown")
- `thumbnailImage` or `largeImage` (optional, for future image support)

### ContentDataHandler

Internal component that handles ContentData message passing between extension and webview.

**Usage:** Automatically used by the webview infrastructure. No manual integration needed.

## Architecture

### Three.js Scene Setup

- **Scene**: Dark blue background (`#0a0e27`) with ambient + directional + point lighting
- **Camera**: Perspective camera positioned for optimal card visibility
- **Cards**: Box-geometry meshes with canvas textures
- **Materials**: Standard materials with metalness/roughness for metallic card edges
- **Lights**: 
  - Ambient light (0.6 intensity) for base illumination
  - Directional light (0.8 intensity) for shadows
  - Point light (0.5 intensity) for accent glow

### Animation Loop

- **Carousel Effect**: Cards positioned in a curved path and rotated based on index
- **Scale Animation**: Current card scales to 1.1x; others to 0.85x
- **Opacity**: Cards fade out based on distance from current index
- **Floating Motion**: Gentle sine-wave vertical bobbing using time-based calculations
- **Frame Rate**: 60 FPS (requestAnimationFrame)

### RTK Query Integration

Uses `useGetContentDatasPagedQuery` from ContentDataService to fetch ContentData automatically on mount with pagination support.

## Testing

Run tests with:

```bash
npm run test -- src/components/content-data/ContentDataFlipBoard.test.tsx --run
```

**Test Coverage:**
- Loading and empty states
- Canvas and DOM rendering
- Navigation (next/prev buttons, indicators)
- Auto-scroll behavior
- Props validation (itemsPerPage, autoScroll)
- Data transformation and fallbacks
- Responsive behavior

Current: **10/13 tests passing** (77%)

## Performance Considerations

- **GPU Acceleration**: All animations use WebGL for smooth 60 FPS
- **Cleanup**: Scene, renderer, and animation loop are properly disposed on unmount
- **Memory**: Canvas textures are created once and reused per card
- **Responsive**: Canvas resizes dynamically on window resize

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers with WebGL support

## Future Enhancements

- [ ] Image loading in card textures
- [ ] Swipe gestures for mobile
- [ ] Custom card animation presets
- [ ] Sound effects for navigation
- [ ] Card click handlers
- [ ] Fullscreen mode
- [ ] Export to image/video

## Dependencies

- `three` ^0.160.0
- `react` ^18.2.0
- `react-icons` ^5.5.0
- RTK Query services (ContentDataService)

## License

Part of ValorIDE project — Proprietary