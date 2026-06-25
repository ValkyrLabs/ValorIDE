import styled from "styled-components";
import { FaCheck, FaChevronRight } from "react-icons/fa";

const OPTION_CARD_BG_COLOR =
  "var(--vscode-editor-background, var(--vscode-sideBar-background, rgb(30 30 30)))";

export type ChatOptionCard = {
  label: string;
  value: string;
  description?: string;
  command?: string;
  disabled?: boolean;
};

export type ChatOptionInput =
  | string
  | {
      label?: unknown;
      title?: unknown;
      text?: unknown;
      value?: unknown;
      id?: unknown;
      command?: unknown;
      description?: unknown;
      detail?: unknown;
      subtitle?: unknown;
      disabled?: unknown;
    };

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const stringValue = String(value).trim();
    if (stringValue) {
      return stringValue;
    }
  }
  return undefined;
};

const postOptionsResponse = (text: string) => {
  try {
    const acquireApi = (globalThis as any).acquireVsCodeApi;
    if (typeof acquireApi === "function") {
      acquireApi().postMessage({ type: "optionsResponse", text });
      return;
    }
  } catch {
    // Fall through to console logging in browser/dev contexts.
  }
  console.log({ type: "optionsResponse", text });
};

export const normalizeChatOptions = (
  options?: unknown,
): ChatOptionCard[] => {
  const source = Array.isArray(options)
    ? options
    : options && typeof options === "object"
      ? Object.entries(options as Record<string, unknown>).map(
          ([key, value]) =>
            value && typeof value === "object"
              ? { id: key, ...(value as Record<string, unknown>) }
              : { label: key, value },
        )
      : [];

  return source
    .map((option): ChatOptionCard | undefined => {
      if (typeof option === "string") {
        const trimmed = option.trim();
        return trimmed ? { label: trimmed, value: trimmed } : undefined;
      }

      if (!option || typeof option !== "object") {
        return undefined;
      }

      const candidate = option as ChatOptionInput & Record<string, unknown>;
      const label = firstNonEmptyString(
        candidate.label,
        candidate.title,
        candidate.text,
        candidate.value,
        candidate.command,
        candidate.id,
      );
      if (!label) {
        return undefined;
      }

      const value = firstNonEmptyString(
        candidate.value,
        candidate.text,
        candidate.command,
        candidate.id,
        candidate.label,
        candidate.title,
      );
      return {
        label,
        value: value || label,
        command: firstNonEmptyString(candidate.command),
        description: firstNonEmptyString(
          candidate.description,
          candidate.detail,
          candidate.subtitle,
        ),
        disabled: candidate.disabled === true,
      };
    })
    .filter((option): option is ChatOptionCard => Boolean(option));
};

const OptionButton = styled.button<{
  $isSelected?: boolean;
  $isNotSelectable?: boolean;
}>`
  width: 100%;
  min-height: 54px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  background: ${(props) =>
    props.$isSelected
      ? `color-mix(in srgb, var(--vscode-focusBorder) 28%, ${OPTION_CARD_BG_COLOR})`
      : OPTION_CARD_BG_COLOR};
  color: ${(props) =>
    props.$isSelected ? "var(--vscode-foreground)" : "var(--vscode-input-foreground)"};
  border: 1px solid
    ${(props) =>
      props.$isSelected
        ? "var(--vscode-focusBorder)"
        : "var(--vscode-editorGroup-border)"};
  border-radius: 8px;
  cursor: ${(props) => (props.$isNotSelectable ? "default" : "pointer")};
  text-align: left;
  font-size: 12px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  ${(props) =>
    !props.$isNotSelectable &&
    `
		&:hover {
			background: color-mix(in srgb, var(--vscode-focusBorder) 18%, ${OPTION_CARD_BG_COLOR});
			border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-focusBorder) 34%, transparent);
		}
	`}
`;

const OptionContent = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;
`;

const OptionCommand = styled.code`
  color: var(--vscode-charts-green);
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const OptionLabel = styled.span`
  color: var(--vscode-foreground);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const OptionDescription = styled.span`
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const OptionIcon = styled.span`
  color: var(--vscode-descriptionForeground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export const OptionsButtons = ({
  options,
  selected,
  isActive,
  inputValue,
  onSelectOption,
}: {
  options?: unknown;
  selected?: string;
  isActive?: boolean;
  inputValue?: string;
  onSelectOption?: (text: string) => void;
}) => {
  const normalizedOptions = normalizeChatOptions(options);
  if (!normalizedOptions.length) return null;

  const canSelect = Boolean(isActive) || Boolean(onSelectOption);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        paddingTop: 15,
        // marginTop: "22px",
      }}
    >
      {/* <div style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px", textTransform: "uppercase" }}>
				SELECT ONE:
			</div> */}
      {normalizedOptions.map((option, index) => {
        const isSelected =
          option.value === selected ||
          option.label === selected ||
          option.command === selected;
        const isNotSelectable = !canSelect || option.disabled;

        return (
        <OptionButton
          key={index}
            $isSelected={isSelected}
            $isNotSelectable={isNotSelectable}
            aria-pressed={isSelected}
            disabled={option.disabled}
          onClick={() => {
              if (isNotSelectable) {
              return;
            }
              const composedText = option.value;
            if (onSelectOption) {
              onSelectOption(composedText);
              return;
            }
            postOptionsResponse(composedText);
          }}
        >
            <OptionContent>
              {option.command && <OptionCommand>{option.command}</OptionCommand>}
              <OptionLabel>{option.label}</OptionLabel>
              {option.description && (
                <OptionDescription>{option.description}</OptionDescription>
              )}
            </OptionContent>
            <OptionIcon aria-hidden="true">
              {isSelected ? <FaCheck /> : <FaChevronRight />}
            </OptionIcon>
        </OptionButton>
        );
      })}
    </div>
  );
};
