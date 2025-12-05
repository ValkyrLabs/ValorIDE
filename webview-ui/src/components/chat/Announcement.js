import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { memo } from "react";
import { getAsVar, VSC_DESCRIPTION_FOREGROUND, VSC_INACTIVE_SELECTION_BACKGROUND, } from "@/utils/vscStyles";
import { FaRegWindowClose } from "react-icons/fa";
const containerStyle = {
    backgroundColor: getAsVar(VSC_INACTIVE_SELECTION_BACKGROUND),
    borderRadius: "3px",
    padding: "12px 16px",
    margin: "5px 15px 5px 15px",
    position: "relative",
    flexShrink: 0,
};
const closeIconStyle = {
    position: "absolute",
    top: "8px",
    right: "8px",
};
const h3TitleStyle = { margin: "0 0 8px" };
const ulStyle = { margin: "0 0 8px", paddingLeft: "12px" };
const accountIconStyle = { fontSize: 11 };
const hrStyle = {
    height: "1px",
    background: getAsVar(VSC_DESCRIPTION_FOREGROUND),
    opacity: 0.1,
    margin: "8px 0",
};
const linkContainerStyle = { margin: "0" };
const linkStyle = { display: "inline" };
/*
You must update the latestAnnouncementId in ValorIDEProvider for new announcements to show to users. This new id will be compared with what's in state for the 'last announcement shown', and if it's different then the announcement will render. As soon as an announcement is shown, the id will be updated in state. This ensures that announcements are not shown more than once, even if the user doesn't close it themselves.
*/
const Announcement = ({ version, hideAnnouncement }) => {
    const minorVersion = version.split(".").slice(0, 2).join("."); // 2.0.0 -> 2.0
    return (_jsxs("div", { style: containerStyle, children: [_jsx(VSCodeButton, { appearance: "icon", onClick: hideAnnouncement, style: closeIconStyle, children: _jsx(FaRegWindowClose, {}) }), _jsxs("h3", { style: h3TitleStyle, children: ["\uD83C\uDF89", "  ", "New in v", minorVersion] }), _jsxs("ul", { style: ulStyle, children: [_jsxs("li", { children: [_jsx("b", { children: "Global ValorIDE Rules:" }), " store multiple rules files in Documents/ValorIDE/Rules to share between projects."] }), _jsxs("li", { children: [_jsx("b", { children: "ValorIDE Rules Popup:" }), " New button in the chat area to view workspace and global valoride rules files to plug and play specific rules for the task"] }), _jsxs("li", { children: [_jsx("b", { children: "Slash Commands:" }), " Type ", _jsx("code", { children: "/" }), " in chat to see the list of quick actions, like starting a new task (more coming soon!)"] }), _jsxs("li", { children: [_jsx("b", { children: "Edit Messages:" }), " You can now edit a message you sent previously by clicking on it. Optionally restore your project when the message was sent!"] })] }), _jsx("h4", { style: { margin: "5px 0 5px" }, children: "Previous Updates:" }), _jsxs("ul", { style: ulStyle, children: [_jsxs("li", { children: [_jsx("b", { children: "Model Favorites:" }), " You can now mark your favorite models when using ValorIDE providers for quick access!"] }), _jsxs("li", { children: [_jsx("b", { children: "Faster Diff Editing:" }), " Improved animation performance for large files, plus a new indicator in chat showing the number of edits ValorIDE makes."] }), _jsxs("li", { children: [_jsx("b", { children: "New Auto-Approve Options:" }), " Turn off ValorIDE's ability to read and edit files outside your workspace."] })] }), _jsx("div", { style: hrStyle }), _jsxs("p", { style: linkContainerStyle, children: ["Join us on", " ", _jsx(VSCodeLink, { style: linkStyle, href: "https://x.com/valkyrlabs", children: "X" }), " ", _jsx(VSCodeLink, { style: linkStyle, href: "https://instagram.com/valkyrlabs", children: "Instagram" }), " ", "for more updates!"] })] }));
};
export default memo(Announcement);
//# sourceMappingURL=Announcement.js.map