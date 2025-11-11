import React, {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type PanelSize = {
  width: number;
  height: number;
};

type PanelOffset = {
  x: number;
  y: number;
};

type PointerMode = 'drag' | 'resize';
type KeyboardMode = 'move' | 'resize' | null;

export interface FloatingControlPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> {
  children: ReactNode;
  description: string;
  style?: CSSProperties;
  defaultSize?: Partial<PanelSize>;
  defaultPosition?: Partial<PanelOffset>;
  onClose?: () => void;
  onResetLayout?: () => void;
  /**
   * Optional custom key for localStorage persistence.
   * Defaults to a sanitized description string.
   */
  persistKey?: string;
  /**
   * Allows the parent to fully control visibility.
   * When omitted the component hides itself on close.
   */
  visible?: boolean;
}

const STORAGE_PREFIX = 'valkyr:floatingpanel:';
const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 320;
const MOVE_STEP = 10;
const RESIZE_STEP = 20;
const EDGE_MARGIN = 16;

const sanitizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .trim() || 'panel';

const coerceDimension = (value?: number | string, fallback?: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }
  return undefined;
};

const buildPanelClassName = (
  className?: string,
  additions: Array<string | false | undefined> = []
) => {
  return ['floating-control-panel', className, ...additions]
    .filter(Boolean)
    .join(' ');
};

const ControlButton: React.FC<{
  label: string;
  ariaLabel: string;
  onClick: () => void;
  active?: boolean;
}> = ({ label, ariaLabel, onClick, active }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={active ?? undefined}
    onClick={onClick}
    style={styles.controlButton(active)}
  >
    {label}
  </button>
);

const FloatingControlPanel: React.FC<FloatingControlPanelProps> = ({
  children,
  description,
  className,
  style,
  defaultSize,
  defaultPosition,
  onClose,
  onResetLayout,
  persistKey,
  visible,
  ...rest
}) => {
  const sanitizedKey = useMemo(
    () => persistKey ?? `${STORAGE_PREFIX}${sanitizeKey(description)}`,
    [description, persistKey]
  );

  const initialSizeRef = useRef<PanelSize>({
    width:
      coerceDimension(style?.width, defaultSize?.width) ?? DEFAULT_WIDTH,
    height:
      coerceDimension(style?.height, defaultSize?.height) ?? DEFAULT_HEIGHT,
  });

  const initialOffsetRef = useRef<PanelOffset>({
    x: defaultPosition?.x ?? 0,
    y: defaultPosition?.y ?? 0,
  });

  const [size, setSize] = useState<PanelSize>(initialSizeRef.current);
  const [offset, setOffset] = useState<PanelOffset>(initialOffsetRef.current);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [internalVisible, setInternalVisible] = useState(
    visible ?? true
  );

  const previousBoundsRef = useRef<{ size: PanelSize; offset: PanelOffset } | null>(
    null
  );
  const pointerStateRef = useRef<{
    mode: PointerMode;
    pointerId: number;
    originX: number;
    originY: number;
    startOffset: PanelOffset;
    startSize: PanelSize;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerId = useId();

  useEffect(() => {
    if (visible === undefined) {
      return;
    }
    setInternalVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsHydrated(true);
      return undefined;
    }

    let cancelled = false;
    const loadState = () => {
      if (cancelled) {
        return;
      }
      try {
        const value = window.localStorage.getItem(sanitizedKey);
        if (!value) {
          return;
        }
        const parsed = JSON.parse(value);
        if (
          typeof parsed.width === 'number' &&
          typeof parsed.height === 'number'
        ) {
          setSize((prev) => ({
            width: Math.max(MIN_WIDTH, parsed.width ?? prev.width),
            height: Math.max(MIN_HEIGHT, parsed.height ?? prev.height),
          }));
        }
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          setOffset({
            x: parsed.left,
            y: parsed.top,
          });
        }
        if (typeof parsed.maximized === 'boolean') {
          setIsMaximized(parsed.maximized);
        }
      } catch (error) {
        console.warn('Unable to read floating panel state:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, [sanitizedKey]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(
        sanitizedKey,
        JSON.stringify({
          width: size.width,
          height: size.height,
          left: offset.x,
          top: offset.y,
          maximized: isMaximized,
        })
      );
    } catch (error) {
      console.warn('Unable to persist floating panel state:', error);
    }
  }, [isHydrated, sanitizedKey, size, offset, isMaximized]);

  const effectiveVisible = internalVisible;

  const clampSize = useCallback((next: PanelSize): PanelSize => {
    return {
      width: Math.max(MIN_WIDTH, next.width),
      height: Math.max(MIN_HEIGHT, next.height),
    };
  }, []);

  const clampOffset = useCallback((next: PanelOffset): PanelOffset => {
    if (typeof window === 'undefined') {
      return next;
    }
    const maxX = window.innerWidth - EDGE_MARGIN;
    const maxY = window.innerHeight - EDGE_MARGIN;
    return {
      x: Math.min(Math.max(next.x, -maxX), maxX),
      y: Math.min(Math.max(next.y, -maxY), maxY),
    };
  }, []);

  const stopPointerActions = useCallback(() => {
    pointerStateRef.current = null;
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleGlobalPointerMove = useCallback(
    (event: PointerEvent) => {
      const state = pointerStateRef.current;
      if (!state) return;
      const deltaX = event.clientX - state.originX;
      const deltaY = event.clientY - state.originY;

      if (state.mode === 'drag') {
        setOffset(
          clampOffset({
            x: state.startOffset.x + deltaX,
            y: state.startOffset.y + deltaY,
          })
        );
      } else if (state.mode === 'resize') {
        setSize(
          clampSize({
            width: state.startSize.width + deltaX,
            height: state.startSize.height + deltaY,
          })
        );
      }
    },
    [clampOffset, clampSize]
  );

  const handleGlobalPointerUp = useCallback(() => {
    if (pointerStateRef.current) {
      stopPointerActions();
    }
  }, [stopPointerActions]);

  useEffect(() => {
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp]);

  const beginPointerAction = useCallback(
    (mode: PointerMode, event: React.PointerEvent, cursor?: string) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const element = event.currentTarget as HTMLElement;
      element.setPointerCapture?.(event.pointerId);
      pointerStateRef.current = {
        mode,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        startOffset: offset,
        startSize: size,
      };
      setKeyboardMode(null);
      if (mode === 'drag') {
        setIsDragging(true);
      } else {
        setIsResizing(true);
      }
      if (cursor && panelRef.current) {
        panelRef.current.style.cursor = cursor;
      }
    },
    [offset, size]
  );

  const resetCursor = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.style.cursor = '';
    }
  }, []);

  useEffect(() => {
    if (!isDragging && !isResizing) {
      resetCursor();
    }
  }, [isDragging, isResizing, resetCursor]);

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      beginPointerAction('drag', event, 'grabbing');
    },
    [beginPointerAction]
  );

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      beginPointerAction('resize', event, 'nwse-resize');
    },
    [beginPointerAction]
  );

  const toggleKeyboardMode = useCallback(
    (mode: KeyboardMode) => {
      setKeyboardMode((current) => (current === mode ? null : mode));
    },
    []
  );

  const handleHeaderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === ' ') {
        event.preventDefault();
        toggleKeyboardMode('move');
        return;
      }
      if (event.key === 'Escape') {
        setKeyboardMode(null);
        return;
      }
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(event.key)) {
        return;
      }

      const isResizeAction =
        keyboardMode === 'resize' || event.shiftKey;
      const delta = isResizeAction ? RESIZE_STEP : MOVE_STEP;

      if (isResizeAction) {
        event.preventDefault();
        setSize((prev) =>
          clampSize({
            width:
              prev.width +
              (event.key === 'ArrowRight'
                ? delta
                : event.key === 'ArrowLeft'
                ? -delta
                : 0),
            height:
              prev.height +
              (event.key === 'ArrowDown'
                ? delta
                : event.key === 'ArrowUp'
                ? -delta
                : 0),
          })
        );
        return;
      }

      if (keyboardMode === 'move') {
        event.preventDefault();
        setOffset((prev) =>
          clampOffset({
            x:
              prev.x +
              (event.key === 'ArrowRight'
                ? delta
                : event.key === 'ArrowLeft'
                ? -delta
                : 0),
            y:
              prev.y +
              (event.key === 'ArrowDown'
                ? delta
                : event.key === 'ArrowUp'
                ? -delta
                : 0),
          })
        );
      }
    },
    [clampOffset, clampSize, keyboardMode, toggleKeyboardMode]
  );

  const handleReset = useCallback(() => {
    setSize(initialSizeRef.current);
    setOffset(initialOffsetRef.current);
    setIsMaximized(false);
    setKeyboardMode(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sanitizedKey);
    }
    onResetLayout?.();
  }, [onResetLayout, sanitizedKey]);

  const handleToggleMaximize = useCallback(() => {
    if (!isMaximized) {
      previousBoundsRef.current = {
        size,
        offset,
      };
      setIsMaximized(true);
    } else if (previousBoundsRef.current) {
      setSize(previousBoundsRef.current.size);
      setOffset(previousBoundsRef.current.offset);
      previousBoundsRef.current = null;
      setIsMaximized(false);
    } else {
      setIsMaximized(false);
    }
  }, [isMaximized, offset, size]);

  const handleCloseClick = useCallback(() => {
    onClose?.();
    if (visible === undefined) {
      setInternalVisible(false);
    }
  }, [onClose, visible]);

  const computedStyle: CSSProperties = useMemo(() => {
    const { width, height, transform, ...restStyle } = style ?? {};
    return {
      ...styles.panel,
      position: isMaximized ? 'fixed' : styles.panel.position,
      zIndex: isMaximized ? 1000 : styles.panel.zIndex,
      width: isMaximized ? 'auto' : size.width,
      height: isMaximized ? 'auto' : size.height,
      transform: isMaximized
        ? undefined
        : `translate(${offset.x}px, ${offset.y}px)`,
      ...(isMaximized
        ? {
            inset: EDGE_MARGIN,
          }
        : {
            inset: undefined,
          }),
      ...restStyle,
    };
  }, [style, size, offset, isMaximized]);

  if (!effectiveVisible) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={buildPanelClassName(className, [
        keyboardMode && `fcp--keyboard-${keyboardMode}`,
        isDragging && 'fcp--dragging',
        isResizing && 'fcp--resizing',
        isMaximized && 'fcp--maximized',
      ])}
      style={computedStyle}
      {...rest}
    >
      <div
        role="toolbar"
        aria-labelledby={headerId}
        tabIndex={0}
        onPointerDown={handleDragStart}
        onKeyDown={handleHeaderKeyDown}
        onDoubleClick={handleToggleMaximize}
        style={styles.header}
      >
        <span aria-hidden="true" style={styles.dragHandle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {[0, 6, 12].map((y) =>
              [0, 6].map((x) => (
                <circle
                  key={`${x}-${y}`}
                  cx={2 + x}
                  cy={2 + y}
                  r={1.5}
                  fill="currentColor"
                />
              ))
            )}
          </svg>
        </span>
        <div id={headerId} style={styles.title}>
          {description}
        </div>
        <div style={styles.controls}>
          <ControlButton
            label="↔"
            ariaLabel="Toggle keyboard move mode"
            active={keyboardMode === 'move'}
            onClick={() => toggleKeyboardMode('move')}
          />
          <ControlButton
            label="↗"
            ariaLabel="Toggle keyboard resize mode"
            active={keyboardMode === 'resize'}
            onClick={() => toggleKeyboardMode('resize')}
          />
          <ControlButton
            label="⟲"
            ariaLabel="Reset layout"
            onClick={handleReset}
          />
          <ControlButton
            label={isMaximized ? '❐' : '▢'}
            ariaLabel={isMaximized ? 'Restore panel' : 'Maximize panel'}
            onClick={handleToggleMaximize}
          />
          <ControlButton
            label="✕"
            ariaLabel="Close panel"
            onClick={handleCloseClick}
          />
        </div>
      </div>
      <div style={styles.content}>{children}</div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel"
        onPointerDown={handleResizeStart}
        style={styles.resizeHandle}
      >
        ↘
      </div>
    </div>
  );
};

const styles = {
  panel: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderRadius: 16,
    padding: '12px 12px 16px',
    background: 'rgba(18, 18, 18, 0.9)',
    color: '#f5f5f5',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    transition: 'box-shadow 0.2s ease, border 0.2s ease, transform 0.2s ease',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '4px 8px',
    borderRadius: 12,
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(0,0,0,0.05))',
    border: '1px solid rgba(255,255,255,0.05)',
    cursor: 'grab',
    userSelect: 'none',
  } as CSSProperties,
  dragHandle: {
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.4,
  } as CSSProperties,
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  } as CSSProperties,
  controlButton: (active?: boolean): CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: active
      ? 'rgba(0, 120, 215, 0.2)'
      : 'rgba(255,255,255,0.02)',
    color: '#f1f1f1',
    cursor: 'pointer',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease, border 0.2s ease',
  }),
  content: {
    flex: 1,
    position: 'relative',
  } as CSSProperties,
  resizeHandle: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'nwse-resize',
    userSelect: 'none',
    fontSize: 14,
  } as CSSProperties,
};

export default FloatingControlPanel;
