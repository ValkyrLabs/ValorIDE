import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import TelemetryBanner from "@/components/common/TelemetryBanner";
import Announcement from "@/components/chat/Announcement";
import HistoryPreview from "@/components/history/HistoryPreview";
import AutoApproveMenu from "@/components/chat/AutoApproveMenu";
const WelcomeScreen = ({ version, telemetrySetting, showAnnouncement, hideAnnouncement, taskHistory, showHistoryView }) => {
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                    flex: "1",
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    paddingBottom: "10px",
                }, children: [telemetrySetting === "unset" && _jsx(TelemetryBanner, {}), showAnnouncement && _jsx(Announcement, { version: version, hideAnnouncement: hideAnnouncement }), _jsxs("div", { style: { padding: "0 20px", flexShrink: 0 }, children: [_jsx("div", { style: { backgroundColor: "#222222", padding: "0 20px", flexShrink: 0 }, children: _jsx("a", { href: "https://valkyrlabs.com/valoride", children: _jsx("img", { alt: "Valkyr Labs", src: "https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png" }) }) }), _jsxs("p", { children: ["Agentic Coder Powered by", " ", _jsx(VSCodeLink, { href: "https://valkyrlabs.com/thorapi", style: { display: "inline" }, children: "ThorAPI Full-Stack CodeGen" })] })] }), taskHistory.length > 0 && _jsx(HistoryPreview, { showHistoryView: showHistoryView })] }), _jsx("div", { style: { display: "flex", justifyContent: "center", padding: "20px" }, children: _jsxs("form", { children: [_jsx("input", { type: "text", placeholder: "Username" }), _jsx("input", { type: "password", placeholder: "Password" }), _jsx("button", { type: "submit", children: "Login" })] }) }), _jsx(AutoApproveMenu, { style: {
                    marginBottom: -2,
                    flex: "0 1 auto",
                    minHeight: 0,
                } })] }));
};
export default WelcomeScreen;
//# sourceMappingURL=WelcomeScreen.js.map