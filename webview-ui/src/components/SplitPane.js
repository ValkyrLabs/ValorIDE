import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
export const SplitPane = ({ children, className = "", style = {}, }) => {
    return (_jsx("div", { className: `split-pane ${className}`, style: {
            display: "flex",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            ...style,
        }, children: children }));
};
export const SplitPaneLeft = ({ children, clientWidth = 3, className = "", style = {}, }) => {
    // Convert clientWidth (1-12) to percentage
    const widthPercentage = Math.max(10, Math.min(50, (clientWidth / 12) * 100));
    return (_jsx("div", { className: `split-pane-left ${className}`, style: {
            width: `${widthPercentage}%`,
            minWidth: "200px",
            maxWidth: "50%",
            height: "100%",
            overflow: "hidden",
            flexShrink: 0,
            ...style,
        }, children: children }));
};
export const SplitPaneRight = ({ children, className = "", style = {}, }) => {
    return (_jsx("div", { className: `split-pane-right ${className}`, style: {
            flex: 1,
            height: "100%",
            overflow: "hidden",
            minWidth: "300px",
            ...style,
        }, children: children }));
};
export const SplitPaneTop = ({ children, clientHeight = 8, className = "", style = {}, }) => {
    // Convert clientHeight (1-12) to percentage, allow up to 90% for chat view
    const heightPercentage = Math.max(30, Math.min(90, (clientHeight / 12) * 100));
    return (_jsx("div", { className: `split-pane-top ${className}`, style: {
            height: `${heightPercentage}%`,
            minHeight: "300px",
            maxHeight: "90%",
            width: "100%",
            overflow: "hidden",
            flexShrink: 0,
            ...style,
        }, children: children }));
};
export const SplitPaneBottom = ({ children, className = "", style = {}, }) => {
    return (_jsx("div", { className: `split-pane-bottom ${className}`, style: {
            flex: 1,
            width: "100%",
            overflow: "hidden",
            minHeight: "150px",
            height: "100%",
            ...style,
        }, children: children }));
};
export const Divider = ({ className = "", style = {}, orientation = "vertical", }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [startLeftWidth, setStartLeftWidth] = useState(0);
    const [startTopHeight, setStartTopHeight] = useState(0);
    const dividerRef = useRef(null);
    const containerRef = useRef(null);
    const isVertical = orientation === "vertical";
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.clientX);
        setStartY(e.clientY);
        // Find the parent split pane container
        const container = dividerRef.current?.parentElement;
        if (container) {
            containerRef.current = container;
            if (isVertical) {
                const leftPane = container.querySelector(".split-pane-left");
                if (leftPane) {
                    setStartLeftWidth(leftPane.offsetWidth);
                }
            }
            else {
                const topPane = container.querySelector(".split-pane-top");
                if (topPane) {
                    setStartTopHeight(topPane.offsetHeight);
                }
            }
        }
        // Add global mouse event listeners
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [isVertical]);
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !containerRef.current)
            return;
        e.preventDefault();
        const container = containerRef.current;
        if (isVertical) {
            const deltaX = e.clientX - startX;
            const leftPane = container.querySelector(".split-pane-left");
            if (leftPane) {
                const containerWidth = container.offsetWidth;
                const newLeftWidth = Math.max(200, Math.min(containerWidth * 0.7, startLeftWidth + deltaX));
                const newLeftWidthPercent = (newLeftWidth / containerWidth) * 100;
                leftPane.style.width = `${newLeftWidthPercent}%`;
            }
        }
        else {
            const deltaY = e.clientY - startY;
            const topPane = container.querySelector(".split-pane-top");
            if (topPane) {
                const containerHeight = container.offsetHeight;
                const newTopHeight = Math.max(200, Math.min(containerHeight * 0.9, startTopHeight + deltaY));
                const newTopHeightPercent = (newTopHeight / containerHeight) * 100;
                topPane.style.height = `${newTopHeightPercent}%`;
            }
        }
    }, [isDragging, startX, startY, startLeftWidth, startTopHeight, isVertical]);
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseMove]);
    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    return (_jsx("div", { ref: dividerRef, className: `split-pane-divider ${className} ${isDragging ? "dragging" : ""}`, style: {
            ...(isVertical
                ? {
                    width: "4px",
                    cursor: "col-resize",
                }
                : {
                    height: "4px",
                    cursor: "row-resize",
                }),
            backgroundColor: "var(--vscode-sideBar-border)",
            flexShrink: 0,
            userSelect: "none",
            position: "relative",
            ...style,
            ...(isDragging && {
                backgroundColor: "var(--vscode-focusBorder)",
                boxShadow: "0 0 0 1px var(--vscode-focusBorder)",
            }),
        }, onMouseDown: handleMouseDown, children: _jsx("div", { style: {
                position: "absolute",
                ...(isVertical
                    ? {
                        top: 0,
                        left: "-2px",
                        right: "-2px",
                        bottom: 0,
                        cursor: "col-resize",
                    }
                    : {
                        left: 0,
                        top: "-2px",
                        bottom: "-2px",
                        right: 0,
                        cursor: "row-resize",
                    }),
            } }) }));
};
export default SplitPane;
//# sourceMappingURL=SplitPane.js.map