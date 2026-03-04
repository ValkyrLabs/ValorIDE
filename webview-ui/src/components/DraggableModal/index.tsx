import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { Modal } from "react-bootstrap";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { FaCompress, FaExpand, FaRobot } from "react-icons/fa";

import "./index.css";
import { useLayoutMemory } from "../../hooks/useLayoutMemory";

const MODAL_PORTAL_ID = "draggable-modal-portal-root";
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 460;
const MIN_WIDTH = 340;
const MIN_HEIGHT = 260;
const VIEWPORT_FALLBACK = { width: 1280, height: 720 };
const ICON_FOOTPRINT = {
  size: 128,
  margin: 24,
  gap: 16,
};

const getViewport = () => {
  if (typeof window === "undefined") {
    return VIEWPORT_FALLBACK;
  }
  return {
    width: window.innerWidth || VIEWPORT_FALLBACK.width,
    height: window.innerHeight || VIEWPORT_FALLBACK.height,
  };
};

type Placement = "center" | "bottom-right";

const computePlacementPosition = (
  placement: Placement,
  size: { width: number; height: number },
) => {
  const { width: vw, height: vh } = getViewport();
  const gutter = 16;

  if (placement === "bottom-right") {
    const right = Math.max(gutter, vw - size.width - ICON_FOOTPRINT.margin);
    const verticalOffset =
      ICON_FOOTPRINT.margin + ICON_FOOTPRINT.size + ICON_FOOTPRINT.gap;
    const bottom = Math.max(gutter, vh - size.height - verticalOffset);

    return {
      x: right,
      y: bottom,
    };
  }

  return {
    x: Math.max(gutter, Math.round((vw - size.width) / 2)),
    y: Math.max(gutter, Math.round((vh - size.height) / 2)),
  };
};

const computeExpandedSize = () => {
  const { width: vw, height: vh } = getViewport();
  const targetWidth = Math.min(vw - 48, Math.max(DEFAULT_WIDTH, vw * 0.6));
  const targetHeight = Math.min(vh - 96, Math.max(DEFAULT_HEIGHT, vh * 0.75));

  return {
    width: Math.max(MIN_WIDTH, Math.round(targetWidth)),
    height: Math.max(MIN_HEIGHT, Math.round(targetHeight)),
  };
};

interface DraggableModalProps {
  title: React.ReactNode;
  toggle: () => void;
  body: React.ReactNode;
  showModal?: boolean;
  initialPlacement?: Placement;
  enableExpand?: boolean;
  expandEventName?: string;
  preferenceKey?: string;
  forceCenterOnOpen?: boolean;
}

// Ensure a portal root exists
function getOrCreatePortalRoot() {
  let portalRoot = document.getElementById(MODAL_PORTAL_ID);
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.id = MODAL_PORTAL_ID;
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  title,
  toggle,
  body,
  showModal,
  initialPlacement = "center",
  enableExpand = false,
  expandEventName,
  preferenceKey,
  forceCenterOnOpen = false,
}) => {
  const memKey =
    preferenceKey ?? `UX:Floating:${String(title)}:${initialPlacement}`;
  const { state, setState } = useLayoutMemory(memKey, {
    x: null as number | 500,
    y: null as number | 500,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    open: showModal ?? true,
    expanded: false,
    collapsedWidth: DEFAULT_WIDTH,
    collapsedHeight: DEFAULT_HEIGHT,
    collapsedX: null as number | null,
    collapsedY: null as number | null,
  });

  const resolveOpen = () => {
    if (typeof showModal === "boolean") {
      return showModal;
    }
    if (typeof state.open === "boolean") {
      return state.open;
    }
    return true;
  };

  const [open, setOpen] = useState<boolean>(resolveOpen());
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: state.width ?? DEFAULT_WIDTH,
    height: state.height ?? DEFAULT_HEIGHT,
  }));
  const [isExpanded, setIsExpanded] = useState<boolean>(
    state.expanded ?? false,
  );

  const sizeRef = useRef(size);

  useEffect(() => {
    const nextSize = {
      width: state.width ?? DEFAULT_WIDTH,
      height: state.height ?? DEFAULT_HEIGHT,
    };
    setSize(nextSize);
    sizeRef.current = nextSize;
  }, [state.width, state.height]);

  useEffect(() => {
    setIsExpanded(state.expanded ?? false);
  }, [state.expanded]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (state.open !== open) {
      setState({ open });
    }
  }, [open, state.open, setState]);

  const hasStoredPosition =
    typeof state.x === "number" &&
    !Number.isNaN(state.x) &&
    typeof state.y === "number" &&
    !Number.isNaN(state.y);

  const placementPosition = useMemo(
    () => computePlacementPosition(initialPlacement, size),
    [initialPlacement, size],
  );

  const clampPositionToViewport = useCallback(
    (next: { x: number; y: number }) => {
      const { width: vw, height: vh } = getViewport();
      const gutter = 16;
      const maxX = Math.max(gutter, vw - size.width - gutter);
      const maxY = Math.max(gutter, vh - size.height - gutter);

      return {
        x: Math.min(Math.max(gutter, next.x), maxX),
        y: Math.min(Math.max(gutter, next.y), maxY),
      };
    },
    [size.height, size.width],
  );

  const targetPosition = useMemo(() => {
    if (!hasStoredPosition) {
      return placementPosition;
    }
    return clampPositionToViewport({
      x: state.x as number,
      y: state.y as number,
    });
  }, [
    clampPositionToViewport,
    hasStoredPosition,
    placementPosition,
    state.x,
    state.y,
  ]);

  const [position, setPosition] = useState(targetPosition);

  useEffect(() => {
    const next = resolveOpen();
    if (forceCenterOnOpen && next && !open) {
      const centered = clampPositionToViewport(
        computePlacementPosition("center", sizeRef.current),
      );
      setPosition(centered);
      setState({
        x: centered.x,
        y: centered.y,
        collapsedX: centered.x,
        collapsedY: centered.y,
      });
    }
    setOpen(next);
  }, [
    clampPositionToViewport,
    forceCenterOnOpen,
    open,
    setState,
    showModal,
    state.open,
  ]);

  useEffect(() => {
    setPosition((prev) => {
      const clamped = clampPositionToViewport(targetPosition);
      if (prev.x === clamped.x && prev.y === clamped.y) {
        return prev;
      }
      return clamped;
    });
  }, [clampPositionToViewport, targetPosition.x, targetPosition.y]);

  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    const next = clampPositionToViewport({ x: data.x, y: data.y });
    setPosition(next);
  };

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    const next = clampPositionToViewport({ x: data.x, y: data.y });
    setPosition(next);
    const patch: Record<string, number> = { x: next.x, y: next.y };
    if (!isExpanded) {
      patch.collapsedX = next.x;
      patch.collapsedY = next.y;
    }
    setState(patch);
  };

  const toggleExpand = useCallback(() => {
    if (!enableExpand) return;

    if (isExpanded) {
      const restoreSize = {
        width: state.collapsedWidth ?? DEFAULT_WIDTH,
        height: state.collapsedHeight ?? DEFAULT_HEIGHT,
      };
      const collapsedHasPosition =
        typeof state.collapsedX === "number" &&
        typeof state.collapsedY === "number" &&
        !Number.isNaN(state.collapsedX) &&
        !Number.isNaN(state.collapsedY);
      const restorePosition = collapsedHasPosition
        ? { x: state.collapsedX as number, y: state.collapsedY as number }
        : computePlacementPosition("center", restoreSize);

      setIsExpanded(false);
      setSize(restoreSize);
      setPosition(restorePosition);
      setState({
        width: restoreSize.width,
        height: restoreSize.height,
        expanded: false,
        x: restorePosition.x,
        y: restorePosition.y,
      });
    } else {
      const collapsedWidth = sizeRef.current.width;
      const collapsedHeight = sizeRef.current.height;
      const collapsedPosition = position;

      const expandedSize = computeExpandedSize();
      const expandedPosition = computePlacementPosition("center", expandedSize);

      setIsExpanded(true);
      setSize(expandedSize);
      setPosition(expandedPosition);
      setState({
        width: expandedSize.width,
        height: expandedSize.height,
        expanded: true,
        x: expandedPosition.x,
        y: expandedPosition.y,
        collapsedWidth,
        collapsedHeight,
        collapsedX: collapsedPosition.x,
        collapsedY: collapsedPosition.y,
      });
    }
  }, [enableExpand, isExpanded, position, setState, state]);

  useEffect(() => {
    if (!enableExpand || !expandEventName || typeof document === "undefined") {
      return undefined;
    }
    const handler = () => toggleExpand();
    document.addEventListener(expandEventName, handler);
    return () => {
      document.removeEventListener(expandEventName, handler);
    };
  }, [enableExpand, expandEventName, toggleExpand]);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const { width: startWidth, height: startHeight } = sizeRef.current;

    let nextWidth = startWidth;
    let nextHeight = startHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      nextWidth = Math.max(
        MIN_WIDTH,
        startWidth + (moveEvent.clientX - startX),
      );
      nextHeight = Math.max(
        MIN_HEIGHT,
        startHeight + (moveEvent.clientY - startY),
      );
      const updated = { width: nextWidth, height: nextHeight };
      sizeRef.current = updated;
      setSize(updated);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      const patch: Record<string, number> = {
        width: nextWidth,
        height: nextHeight,
      };
      if (!isExpanded) {
        patch.collapsedWidth = nextWidth;
        patch.collapsedHeight = nextHeight;
      }
      setState(patch);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const wrapperStyle = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    zIndex: 1050,
    width: `${size.width}px`,
    height: `${size.height}px`,
  };

  const modalContent = (
    <Draggable
      handle=".modal-header"
      cancel=".draggable-modal-contents, .btn, .form-control, textarea, input, select"
      position={position}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <div style={wrapperStyle}>
        <Modal
          show={true}
          onHide={() => {
            setOpen(false);
            toggle();
          }}
          backdrop={false}
          animation={false}
          dialogClassName="draggable-modal-dialog"
          contentClassName="draggable-modal-content"
        >
          <Modal.Header closeButton className="draggable-modal-header">
            <Modal.Title className="draggable-modal-title">{title}</Modal.Title>
            {enableExpand && (
              <button
                type="button"
                className="draggable-modal-expand"
                onClick={toggleExpand}
              >
                {isExpanded ? <FaCompress size={34} /> : <FaExpand size={34} />}
                <span>{isExpanded ? "Collapse window" : "Expand window"}</span>
              </button>
            )}
          </Modal.Header>
          <Modal.Body className="draggable-modal-contents">{body}</Modal.Body>
          <div
            className="draggable-modal-resize-handle"
            role="presentation"
            onPointerDown={handleResizeStart}
          />
        </Modal>
      </div>
    </Draggable>
  );

  const launcherButton = (
    <div className="draggable-modal-launcher">
      <button
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        }}
        onClick={() => {
          setOpen(true);
          toggle();
        }}
        aria-label="Open SageChat"
      >
        <FaRobot />
      </button>
    </div>
  );

  return (
    <>
      {!open &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(launcherButton, getOrCreatePortalRoot())}
      {open &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(modalContent, getOrCreatePortalRoot())}
    </>
  );
};

export default DraggableModal;
