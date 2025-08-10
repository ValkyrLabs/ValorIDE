import {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import FullSizeContainer from "../FullSizeContainer";
import SplitPaneContext from "./SplitPaneContext";

const footerOffset = 130; // Adjust this value based on footer height

interface SplitPaneProps {
  children?: React.ReactNode | React.ReactNode[];
  [key: string]: any;
}

const SplitPane = ({ children, ...props }: SplitPaneProps) => {
  const dispatch = useDispatch();
  const layout = useSelector(
    (state: { layout: { clientHeight?: number; clientWidth?: number } }) =>
      state.layout || {},
  );

  const [clientHeight, setClientHeight] = useState(
    (layout.clientHeight ?? undefined)
      ? layout.clientHeight
      : window.innerHeight - footerOffset,
  );
  const [clientWidth, setClientWidth] = useState(
    layout.clientWidth ?? window.innerWidth / 3,
  );
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
      setClientHeight((prevHeight) =>
        Math.min(prevHeight, window.innerHeight - footerOffset),
      );
      setClientHeight((prevHeight) =>
        Math.max(prevHeight, window.innerHeight - footerOffset),
      );
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

  return (
    <FullSizeContainer {...props} key={props.key}>
      <SplitPaneContext.Provider
        value={{
          clientHeight,
          setClientHeight,
          clientWidth,
          setClientWidth,
          onMouseHoldDown,
        }}
      >
        {children}
      </SplitPaneContext.Provider>
    </FullSizeContainer>
  );
};

export const Divider = (props) => {
  const { onMouseHoldDown } = useContext(SplitPaneContext);

  return (
    <div
      {...props}
      onMouseDown={onMouseHoldDown}
      style={{ cursor: "row-resize", userSelect: "none", ...props.style }} // Add visual cue for resizability
    />
  );
};

interface SplitPaneTopProps {
  children?: React.ReactNode | React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
}

export const SplitPaneTop = (props: SplitPaneTopProps) => {
  const topRef = createRef<HTMLDivElement>();
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

  return (
    <div {...props} className="split-pane-top" ref={topRef}>
      {/* Content can be added here */}
    </div>
  );
};

interface SplitPaneBottomProps {
  children?: React.ReactNode | React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
}

export const SplitPaneBottom = (props: SplitPaneBottomProps) => {
  return (
    <div {...props} className="split-pane-bottom">
      {props.children}
    </div>
  );
};

interface SplitPaneLeftProps {
  children?: React.ReactNode | React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  clientWidth?: number;
}

export const SplitPaneLeft = (props: SplitPaneLeftProps) => {
  const topRef = createRef<HTMLDivElement>();
  const context = useContext(SplitPaneContext);

  if (!context) {
    throw new Error(
      "SplitPaneLeft must be used within a SplitPaneContext.Provider",
    );
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

  return <div {...props} className="split-pane-left" ref={topRef} />;
};

interface SplitPaneRightProps {
  children?: React.ReactNode | React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
}

export const SplitPaneRight = (props: SplitPaneRightProps) => {
  return (
    <div {...props} className="split-pane-right">
      {props.children}
    </div>
  );
};

export default SplitPane;
