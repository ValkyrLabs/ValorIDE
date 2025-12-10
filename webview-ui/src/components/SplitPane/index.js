import { jsx as _jsx } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { createRef, useCallback, useContext, useEffect, useRef, useState, } from "react";
import { useDispatch, useSelector } from "react-redux";
import FullSizeContainer from "../FullSizeContainer";
import SplitPaneContext from "./SplitPaneContext";
const footerOffset = 130; // Adjust this value based on footer height
const SplitPane = ({ children, ...props }) => {
    const dispatch = useDispatch();
    const layout = useSelector((state) => state.layout || {});
    const [clientHeight, setClientHeight] = useState((layout.clientHeight ?? undefined)
        ? layout.clientHeight
        : window.innerHeight - footerOffset);
    const [clientWidth, setClientWidth] = useState(layout.clientWidth ?? window.innerWidth / 3);
    const yDividerPos = useRef(null);
    const xDividerPos = useRef(null);
    const onMouseHoldDown = useCallback((e) => {
        e.preventDefault();
        yDividerPos.current = e.clientY;
        xDividerPos.current = e.clientX;
        document.body.style.userSelect = "none"; // Prevent text selection during dragging
    }, []);
    const onMouseHoldUp = useCallback(() => {
        yDividerPos.current = null;
        xDividerPos.current = null;
        document.body.style.userSelect = ""; // Re-enable text selection after dragging
        // Save current layout to Redux store
        dispatch({
            type: "UPDATE_LAYOUT",
            payload: {
                clientHeight,
                clientWidth,
            },
        });
    }, [clientHeight, clientWidth, dispatch]);
    const onMouseHoldMove = useCallback((e) => {
        e.preventDefault();
        if (yDividerPos.current !== null) {
            setClientHeight((prevHeight) => {
                const newHeight = prevHeight + (e.clientY - yDividerPos.current);
                yDividerPos.current = e.clientY;
                return newHeight;
            });
        }
        if (xDividerPos.current !== null) {
            setClientWidth((prevWidth) => {
                const newWidth = prevWidth + (e.clientX - xDividerPos.current);
                xDividerPos.current = e.clientX;
                return newWidth;
            });
        }
    }, []);
    useEffect(() => {
        const handleResize = () => {
            setClientHeight((prevHeight) => Math.min(prevHeight, window.innerHeight - footerOffset));
            setClientHeight((prevHeight) => Math.max(prevHeight, window.innerHeight - footerOffset));
        };
        window.addEventListener("resize", handleResize, { passive: false });
        document.addEventListener("mouseup", onMouseHoldUp);
        document.addEventListener("mousemove", onMouseHoldMove, { passive: false });
        return () => {
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("mouseup", onMouseHoldUp);
            document.removeEventListener("mousemove", onMouseHoldMove);
        };
    }, [onMouseHoldUp, onMouseHoldMove]);
    return (_createElement(FullSizeContainer, { ...props, key: props.key },
        _jsx(SplitPaneContext.Provider, { value: {
                clientHeight,
                setClientHeight,
                clientWidth,
                setClientWidth,
                onMouseHoldDown,
            }, children: children })));
};
export const Divider = (props) => {
    const { onMouseHoldDown } = useContext(SplitPaneContext);
    return (_jsx("div", { ...props, onMouseDown: onMouseHoldDown, style: { cursor: "row-resize", userSelect: "none", ...props.style } }));
};
export const SplitPaneTop = (props) => {
    const topRef = createRef();
    const { clientHeight, setClientHeight } = useContext(SplitPaneContext);
    useEffect(() => {
        if (!clientHeight) {
            setClientHeight(topRef.current?.clientHeight || 0);
            return;
        }
        if (topRef.current) {
            topRef.current.style.minHeight = clientHeight - footerOffset + "px";
            topRef.current.style.maxHeight = clientHeight - footerOffset + "px";
        }
    }, [clientHeight, setClientHeight]);
    return (_jsx("div", { ...props, className: "split-pane-top", ref: topRef }));
};
export const SplitPaneBottom = (props) => {
    return (_jsx("div", { ...props, className: "split-pane-bottom", children: props.children }));
};
export const SplitPaneLeft = (props) => {
    const topRef = createRef();
    const context = useContext(SplitPaneContext);
    if (!context) {
        throw new Error("SplitPaneLeft must be used within a SplitPaneContext.Provider");
    }
    const { clientWidth, setClientWidth } = context;
    const divisor = props.clientWidth; // Adjust this value as needed
    useEffect(() => {
        if (!clientWidth) {
            setClientWidth(topRef.current.clientWidth / divisor);
            return;
        }
        if (topRef.current) {
            topRef.current.style.minWidth = clientWidth + "px";
            topRef.current.style.maxWidth = clientWidth + "px";
        }
    }, [clientWidth, setClientWidth, divisor, topRef]);
    return _jsx("div", { ...props, className: "split-pane-left", ref: topRef });
};
export const SplitPaneRight = (props) => {
    return (_jsx("div", { ...props, className: "split-pane-right", children: props.children }));
};
export default SplitPane;
//# sourceMappingURL=index.js.map