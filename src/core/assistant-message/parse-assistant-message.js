import { toolParamNames, toolUseNames, } from ".";
function normalizeLegacyToolFormat(message) {
    if (!message.includes("<invoke")) {
        return message;
    }
    const toolNameSet = new Set(toolUseNames);
    const paramNameSet = new Set(toolParamNames);
    let normalized = message.replace(/<\/?function_calls>/g, "");
    normalized = normalized.replace(/<invoke\s+name=(["'])([^"']+)\1>([\s\S]*?)<\/invoke>/g, (match, _quote, rawToolName, inner) => {
        const toolName = rawToolName.trim();
        if (!toolNameSet.has(toolName)) {
            return match;
        }
        const convertedInner = inner.replace(/<parameter\s+name=(["'])([^"']+)\1>([\s\S]*?)<\/parameter>/g, (paramMatch, _paramQuote, rawParamName, paramInner) => {
            const paramName = rawParamName.trim();
            if (!paramNameSet.has(paramName)) {
                return paramMatch;
            }
            return `<${paramName}>${paramInner}</${paramName}>`;
        });
        return `<${toolName}>${convertedInner}</${toolName}>`;
    });
    return normalized;
}
export function parseAssistantMessage(assistantMessage) {
    const message = normalizeLegacyToolFormat(assistantMessage);
    const contentBlocks = [];
    let currentTextContent = undefined;
    let currentTextContentStartIndex = 0;
    let currentToolUse = undefined;
    let currentToolUseStartIndex = 0;
    let currentParamName = undefined;
    let currentParamValueStartIndex = 0;
    let accumulator = "";
    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        accumulator += char;
        // there should not be a param without a tool use
        if (currentToolUse && currentParamName) {
            const currentParamValue = accumulator.slice(currentParamValueStartIndex);
            const paramClosingTag = `</${currentParamName}>`;
            if (currentParamValue.endsWith(paramClosingTag)) {
                // end of param value
                currentToolUse.params[currentParamName] = currentParamValue
                    .slice(0, -paramClosingTag.length)
                    .trim();
                currentParamName = undefined;
                continue;
            }
            else {
                // partial param value is accumulating
                continue;
            }
        }
        // no currentParamName
        if (currentToolUse) {
            const currentToolValue = accumulator.slice(currentToolUseStartIndex);
            const toolUseClosingTag = `</${currentToolUse.name}>`;
            if (currentToolValue.endsWith(toolUseClosingTag)) {
                if (currentToolUse.name === "ask_followup_question" &&
                    !currentToolUse.params.question) {
                    const toolInnerContent = currentToolValue
                        .slice(0, -toolUseClosingTag.length)
                        .trim();
                    if (toolInnerContent) {
                        const paramTagPattern = toolParamNames.join("|");
                        const questionText = toolInnerContent
                            .replace(new RegExp(`<(${paramTagPattern})>[\\s\\S]*?<\\/\\1>`, "g"), "")
                            .trim();
                        if (questionText) {
                            currentToolUse.params.question = questionText;
                        }
                    }
                }
                // end of a tool use
                currentToolUse.partial = false;
                contentBlocks.push(currentToolUse);
                currentToolUse = undefined;
                continue;
            }
            else {
                const possibleParamOpeningTags = toolParamNames.map((name) => `<${name}>`);
                for (const paramOpeningTag of possibleParamOpeningTags) {
                    if (accumulator.endsWith(paramOpeningTag)) {
                        // start of a new parameter
                        currentParamName = paramOpeningTag.slice(1, -1);
                        currentParamValueStartIndex = accumulator.length;
                        break;
                    }
                }
                // there's no current param, and not starting a new param
                // special case for write_to_file where file contents could contain the closing tag, in which case the param would have closed and we end up with the rest of the file contents here. To work around this, we get the string between the starting content tag and the LAST content tag.
                const contentParamName = "content";
                if (currentToolUse.name === "write_to_file" &&
                    accumulator.endsWith(`</${contentParamName}>`)) {
                    const toolContent = accumulator.slice(currentToolUseStartIndex);
                    const contentStartTag = `<${contentParamName}>`;
                    const contentEndTag = `</${contentParamName}>`;
                    const contentStartIndex = toolContent.indexOf(contentStartTag) + contentStartTag.length;
                    const contentEndIndex = toolContent.lastIndexOf(contentEndTag);
                    if (contentStartIndex !== -1 &&
                        contentEndIndex !== -1 &&
                        contentEndIndex > contentStartIndex) {
                        currentToolUse.params[contentParamName] = toolContent
                            .slice(contentStartIndex, contentEndIndex)
                            .trim();
                    }
                }
                // partial tool value is accumulating
                continue;
            }
        }
        // no currentToolUse
        let didStartToolUse = false;
        const possibleToolUseOpeningTags = toolUseNames.map((name) => `<${name}>`);
        for (const toolUseOpeningTag of possibleToolUseOpeningTags) {
            if (accumulator.endsWith(toolUseOpeningTag)) {
                // start of a new tool use
                currentToolUse = {
                    type: "tool_use",
                    name: toolUseOpeningTag.slice(1, -1),
                    params: {},
                    partial: true,
                };
                currentToolUseStartIndex = accumulator.length;
                // this also indicates the end of the current text content
                if (currentTextContent) {
                    currentTextContent.partial = false;
                    // remove the partially accumulated tool use tag from the end of text (<tool)
                    currentTextContent.content = currentTextContent.content
                        .slice(0, -toolUseOpeningTag.slice(0, -1).length)
                        .trim();
                    contentBlocks.push(currentTextContent);
                    currentTextContent = undefined;
                }
                didStartToolUse = true;
                break;
            }
        }
        if (!didStartToolUse) {
            // no tool use, so it must be text either at the beginning or between tools
            if (currentTextContent === undefined) {
                currentTextContentStartIndex = i;
            }
            currentTextContent = {
                type: "text",
                content: accumulator.slice(currentTextContentStartIndex).trim(),
                partial: true,
            };
        }
    }
    if (currentToolUse) {
        // stream did not complete tool call, add it as partial
        if (currentParamName) {
            // tool call has a parameter that was not completed
            currentToolUse.params[currentParamName] = accumulator
                .slice(currentParamValueStartIndex)
                .trim();
        }
        contentBlocks.push(currentToolUse);
    }
    // Note: it doesn't matter if check for currentToolUse or currentTextContent, only one of them will be defined since only one can be partial at a time
    if (currentTextContent) {
        // stream did not complete text content, add it as partial
        contentBlocks.push(currentTextContent);
    }
    return contentBlocks;
}
//# sourceMappingURL=parse-assistant-message.js.map