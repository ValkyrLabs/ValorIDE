import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { memo, useEffect, useRef, useState } from "react";
import { useRemark } from "react-remark";
import styled from "styled-components";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
const StyledMarkdown = styled.div `
  font-family:
    var(--vscode-font-family),
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    "Open Sans",
    "Helvetica Neue",
    sans-serif;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);

  p,
  li,
  ol,
  ul {
    line-height: 1.25;
    margin: 0;
  }

  ol,
  ul {
    padding-left: 1.5em;
    margin-left: 0;
  }

  p {
    white-space: pre-wrap;
  }

  a {
    text-decoration: none;
  }
  a {
    &:hover {
      text-decoration: underline;
    }
  }
`;
export const ModelDescriptionMarkdown = memo(({ markdown, key, isExpanded, setIsExpanded, isPopup, }) => {
    const [reactContent, setMarkdown] = useRemark();
    const [showSeeMore, setShowSeeMore] = useState(false);
    const textContainerRef = useRef(null);
    const textRef = useRef(null);
    useEffect(() => {
        setMarkdown(markdown || "");
    }, [markdown, setMarkdown]);
    useEffect(() => {
        if (textRef.current && textContainerRef.current) {
            const { scrollHeight } = textRef.current;
            const { clientHeight } = textContainerRef.current;
            const isOverflowing = scrollHeight > clientHeight;
            setShowSeeMore(isOverflowing);
        }
    }, [reactContent, setIsExpanded]);
    return (_jsx(StyledMarkdown, { style: { display: "inline-block", marginBottom: 0 }, children: _jsxs("div", { ref: textContainerRef, style: {
                overflowY: isExpanded ? "auto" : "hidden",
                position: "relative",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
            }, children: [_jsx("div", { ref: textRef, style: {
                        display: "-webkit-box",
                        WebkitLineClamp: isExpanded ? "unset" : 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }, children: reactContent }), !isExpanded && showSeeMore && (_jsxs("div", { style: {
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                    }, children: [_jsx("div", { style: {
                                width: 30,
                                height: "1.2em",
                                background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
                            } }), _jsx(VSCodeLink, { style: {
                                fontSize: "inherit",
                                paddingRight: 0,
                                paddingLeft: 3,
                                backgroundColor: isPopup
                                    ? CODE_BLOCK_BG_COLOR
                                    : "var(--vscode-sideBar-background)",
                            }, onClick: () => setIsExpanded(true), children: "See more" })] }))] }) }, key));
});
export default ModelDescriptionMarkdown;
//# sourceMappingURL=ModelDescriptionMarkdown.js.map