import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useEffect } from "react";
import { useRemark } from "react-remark";
import rehypeHighlight from "rehype-highlight";
import styled from "styled-components";
import { visit } from "unist-util-visit";
import { useExtensionState } from "@/context/ExtensionStateContext";
export const CODE_BLOCK_BG_COLOR = "var(--vscode-editor-background, --vscode-sideBar-background, rgb(30 30 30))";
const StyledMarkdown = styled.div `
  ${({ forceWrap }) => forceWrap &&
    `
    pre, code {
      white-space: pre-wrap;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
  `}

  pre {
    background-color: ${CODE_BLOCK_BG_COLOR};
    border-radius: 5px;
    margin: 0;
    min-width: ${({ forceWrap }) => (forceWrap ? "auto" : "max-content")};
    padding: 10px 10px;
  }

  pre > code {
    .hljs-deletion {
      background-color: var(--vscode-diffEditor-removedTextBackground);
      display: inline-block;
      width: 100%;
    }
    .hljs-addition {
      background-color: var(--vscode-diffEditor-insertedTextBackground);
      display: inline-block;
      width: 100%;
    }
  }

  code {
    span.line:empty {
      display: none;
    }
    word-wrap: break-word;
    border-radius: 5px;
    background-color: ${CODE_BLOCK_BG_COLOR};
    font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
    font-family: var(--vscode-editor-font-family);
  }

  code:not(pre > code) {
    font-family: var(--vscode-editor-font-family);
    color: #f78383;
  }

  background-color: ${CODE_BLOCK_BG_COLOR};
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
  font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
  color: var(--vscode-editor-foreground, #fff);

  p,
  li,
  ol,
  ul {
    line-height: 1.5;
  }
`;
const StyledPre = styled.pre `
  & .hljs {
    color: var(--vscode-editor-foreground, #fff);
  }

  ${(props) => Object.keys(props.theme)
    .map((key, index) => {
    return `
      & ${key} {
        color: ${props.theme[key]};
      }
    `;
})
    .join("")}
`;
const CodeBlock = memo(({ source, forceWrap = false }) => {
    const { theme } = useExtensionState();
    const [reactContent, setMarkdownSource] = useRemark({
        remarkPlugins: [
            () => {
                return (tree) => {
                    visit(tree, "code", (node) => {
                        if (!node.lang) {
                            node.lang = "javascript";
                        }
                        else if (node.lang.includes(".")) {
                            // if the language is a file, get the extension
                            node.lang = node.lang.split(".").slice(-1)[0];
                        }
                    });
                };
            },
        ],
        rehypePlugins: [
            rehypeHighlight,
            {
            // languages: {},
            },
        ],
        rehypeReactOptions: {
            components: {
                pre: ({ node, ...preProps }) => (_jsx(StyledPre, { ...preProps, theme: theme })),
            },
        },
    });
    useEffect(() => {
        setMarkdownSource(source || "");
    }, [source, setMarkdownSource, theme]);
    return (_jsx("div", { style: {
            overflowY: forceWrap ? "visible" : "auto",
            maxHeight: forceWrap ? "none" : "100%",
            backgroundColor: CODE_BLOCK_BG_COLOR,
        }, children: _jsx(StyledMarkdown, { forceWrap: forceWrap, children: reactContent }) }));
});
export default CodeBlock;
//# sourceMappingURL=CodeBlock.js.map