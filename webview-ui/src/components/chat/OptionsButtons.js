import { jsx as _jsx } from "react/jsx-runtime";
import styled from "styled-components";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import { vscode } from "@/utils/vscode";
const OptionButton = styled.button `
  padding: 8px 12px;
  background: ${(props) => props.isSelected ? "var(--vscode-focusBorder)" : CODE_BLOCK_BG_COLOR};
  color: ${(props) => props.isSelected ? "white" : "var(--vscode-input-foreground)"};
  border: 1px solid var(--vscode-editorGroup-border);
  border-radius: 2px;
  cursor: ${(props) => (props.isNotSelectable ? "default" : "pointer")};
  text-align: left;
  font-size: 12px;

  ${(props) => !props.isNotSelectable &&
    `
		&:hover {
			background: var(--vscode-focusBorder);
			color: white;
		}
	`}
`;
export const OptionsButtons = ({ options, selected, isActive, inputValue, onSelectOption, }) => {
    if (!options?.length)
        return null;
    const canSelect = Boolean(isActive) || Boolean(onSelectOption);
    return (_jsx("div", { style: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingTop: 15,
            // marginTop: "22px",
        }, children: options.map((option, index) => (_jsx(OptionButton, { isSelected: option === selected, isNotSelectable: !canSelect, onClick: () => {
                if (!canSelect) {
                    return;
                }
                const composedText = option + (inputValue ? `: ${inputValue?.trim()}` : "");
                if (onSelectOption) {
                    onSelectOption(composedText);
                    return;
                }
                vscode.postMessage({
                    type: "optionsResponse",
                    text: composedText,
                });
            }, children: option }, index))) }));
};
//# sourceMappingURL=OptionsButtons.js.map