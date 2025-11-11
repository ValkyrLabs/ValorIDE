import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useRef, useState, } from 'react';
const STORAGE_PREFIX = 'valkyr:floatingpanel:';
const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 320;
const MOVE_STEP = 10;
const RESIZE_STEP = 20;
const EDGE_MARGIN = 16;
const sanitizeKey = (value) => value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .trim() || 'panel';
const coerceDimension = (value, fallback) => {
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
const buildPanelClassName = (className, additions = []) => {
    return ['floating-control-panel', className, ...additions]
        .filter(Boolean)
        .join(' ');
};
const ControlButton = ({ label, ariaLabel, onClick, active }) => (_jsx("button", { type: "button", "aria-label": ariaLabel, "aria-pressed": active ?? undefined, onClick: onClick, style: styles.controlButton(active), children: label }));
const FloatingControlPanel = ({ children, description, className, style, defaultSize, defaultPosition, onClose, onResetLayout, persistKey, visible, ...rest }) => {
    const sanitizedKey = useMemo(() => persistKey ?? `${STORAGE_PREFIX}${sanitizeKey(description)}`, [description, persistKey]);
    const initialSizeRef = useRef({
        width: coerceDimension(style?.width, defaultSize?.width) ?? DEFAULT_WIDTH,
        height: coerceDimension(style?.height, defaultSize?.height) ?? DEFAULT_HEIGHT,
    });
    const initialOffsetRef = useRef({
        x: defaultPosition?.x ?? 0,
        y: defaultPosition?.y ?? 0,
    });
    const [size, setSize] = useState(initialSizeRef.current);
    const [offset, setOffset] = useState(initialOffsetRef.current);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [keyboardMode, setKeyboardMode] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [internalVisible, setInternalVisible] = useState(visible ?? true);
    const previousBoundsRef = useRef(null);
    const pointerStateRef = useRef(null);
    const panelRef = useRef(null);
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
                if (typeof parsed.width === 'number' &&
                    typeof parsed.height === 'number') {
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
            }
            catch (error) {
                console.warn('Unable to read floating panel state:', error);
            }
            finally {
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
            window.localStorage.setItem(sanitizedKey, JSON.stringify({
                width: size.width,
                height: size.height,
                left: offset.x,
                top: offset.y,
                maximized: isMaximized,
            }));
        }
        catch (error) {
            console.warn('Unable to persist floating panel state:', error);
        }
    }, [isHydrated, sanitizedKey, size, offset, isMaximized]);
    const effectiveVisible = internalVisible;
    const clampSize = useCallback((next) => {
        return {
            width: Math.max(MIN_WIDTH, next.width),
            height: Math.max(MIN_HEIGHT, next.height),
        };
    }, []);
    const clampOffset = useCallback((next) => {
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
    const handleGlobalPointerMove = useCallback((event) => {
        const state = pointerStateRef.current;
        if (!state)
            return;
        const deltaX = event.clientX - state.originX;
        const deltaY = event.clientY - state.originY;
        if (state.mode === 'drag') {
            setOffset(clampOffset({
                x: state.startOffset.x + deltaX,
                y: state.startOffset.y + deltaY,
            }));
        }
        else if (state.mode === 'resize') {
            setSize(clampSize({
                width: state.startSize.width + deltaX,
                height: state.startSize.height + deltaY,
            }));
        }
    }, [clampOffset, clampSize]);
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
    const beginPointerAction = useCallback((mode, event, cursor) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.stopPropagation();
        const element = event.currentTarget;
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
        }
        else {
            setIsResizing(true);
        }
        if (cursor && panelRef.current) {
            panelRef.current.style.cursor = cursor;
        }
    }, [offset, size]);
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
    const handleDragStart = useCallback((event) => {
        beginPointerAction('drag', event, 'grabbing');
    }, [beginPointerAction]);
    const handleResizeStart = useCallback((event) => {
        beginPointerAction('resize', event, 'nwse-resize');
    }, [beginPointerAction]);
    const toggleKeyboardMode = useCallback((mode) => {
        setKeyboardMode((current) => (current === mode ? null : mode));
    }, []);
    const handleHeaderKeyDown = useCallback((event) => {
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
        const isResizeAction = keyboardMode === 'resize' || event.shiftKey;
        const delta = isResizeAction ? RESIZE_STEP : MOVE_STEP;
        if (isResizeAction) {
            event.preventDefault();
            setSize((prev) => clampSize({
                width: prev.width +
                    (event.key === 'ArrowRight'
                        ? delta
                        : event.key === 'ArrowLeft'
                            ? -delta
                            : 0),
                height: prev.height +
                    (event.key === 'ArrowDown'
                        ? delta
                        : event.key === 'ArrowUp'
                            ? -delta
                            : 0),
            }));
            return;
        }
        if (keyboardMode === 'move') {
            event.preventDefault();
            setOffset((prev) => clampOffset({
                x: prev.x +
                    (event.key === 'ArrowRight'
                        ? delta
                        : event.key === 'ArrowLeft'
                            ? -delta
                            : 0),
                y: prev.y +
                    (event.key === 'ArrowDown'
                        ? delta
                        : event.key === 'ArrowUp'
                            ? -delta
                            : 0),
            }));
        }
    }, [clampOffset, clampSize, keyboardMode, toggleKeyboardMode]);
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
        }
        else if (previousBoundsRef.current) {
            setSize(previousBoundsRef.current.size);
            setOffset(previousBoundsRef.current.offset);
            previousBoundsRef.current = null;
            setIsMaximized(false);
        }
        else {
            setIsMaximized(false);
        }
    }, [isMaximized, offset, size]);
    const handleCloseClick = useCallback(() => {
        onClose?.();
        if (visible === undefined) {
            setInternalVisible(false);
        }
    }, [onClose, visible]);
    const computedStyle = useMemo(() => {
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
    return (_jsxs("div", { ref: panelRef, className: buildPanelClassName(className, [
            keyboardMode && `fcp--keyboard-${keyboardMode}`,
            isDragging && 'fcp--dragging',
            isResizing && 'fcp--resizing',
            isMaximized && 'fcp--maximized',
        ]), style: computedStyle, ...rest, children: [_jsxs("div", { role: "toolbar", "aria-labelledby": headerId, tabIndex: 0, onPointerDown: handleDragStart, onKeyDown: handleHeaderKeyDown, onDoubleClick: handleToggleMaximize, style: styles.header, children: [_jsx("span", { "aria-hidden": "true", style: styles.dragHandle, children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: [0, 6, 12].map((y) => [0, 6].map((x) => (_jsx("circle", { cx: 2 + x, cy: 2 + y, r: 1.5, fill: "currentColor" }, `${x}-${y}`)))) }) }), _jsx("div", { id: headerId, style: styles.title, children: description }), _jsxs("div", { style: styles.controls, children: [_jsx(ControlButton, { label: "\u2194", ariaLabel: "Toggle keyboard move mode", active: keyboardMode === 'move', onClick: () => toggleKeyboardMode('move') }), _jsx(ControlButton, { label: "\u2197", ariaLabel: "Toggle keyboard resize mode", active: keyboardMode === 'resize', onClick: () => toggleKeyboardMode('resize') }), _jsx(ControlButton, { label: "\u27F2", ariaLabel: "Reset layout", onClick: handleReset }), _jsx(ControlButton, { label: isMaximized ? '❐' : '▢', ariaLabel: isMaximized ? 'Restore panel' : 'Maximize panel', onClick: handleToggleMaximize }), _jsx(ControlButton, { label: "\u2715", ariaLabel: "Close panel", onClick: handleCloseClick })] })] }), _jsx("div", { style: styles.content, children: children }), _jsx("div", { role: "separator", "aria-orientation": "horizontal", "aria-label": "Resize panel", onPointerDown: handleResizeStart, style: styles.resizeHandle, children: "\u2198" })] }));
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
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '4px 8px',
        borderRadius: 12,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(0,0,0,0.05))',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'grab',
        userSelect: 'none',
    },
    dragHandle: {
        color: 'rgba(255,255,255,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.4,
    },
    controls: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    controlButton: (active) => ({
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
    },
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
    },
};
export default FloatingControlPanel;
//# sourceMappingURL=FloatingControlPanel.js.map