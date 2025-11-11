import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import VSCodeButtonLink from "@/components/common/VSCodeButtonLink";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import { FaCreditCard, FaRecycle } from "react-icons/fa";
const CreditLimitError = ({ currentBalance, totalSpent, totalPromotions, message, }) => {
    return (_jsxs("div", { style: {
            backgroundColor: "var(--vscode-textBlockQuote-background)",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "12px",
        }, children: [_jsx("div", { style: { color: "var(--vscode-errorForeground)", marginBottom: "8px" }, children: message }), _jsxs("div", { style: { marginBottom: "12px" }, children: [_jsxs("div", { style: { color: "var(--vscode-foreground)" }, children: ["Current Balance:", " ", _jsxs("span", { style: { fontWeight: "bold" }, children: ["$", currentBalance.toFixed(2)] })] }), _jsxs("div", { style: { color: "var(--vscode-foreground)" }, children: ["Total Spent: $", totalSpent.toFixed(2)] }), _jsxs("div", { style: { color: "var(--vscode-foreground)" }, children: ["Total Promotions: $", totalPromotions.toFixed(2)] })] }), _jsxs(VSCodeButtonLink, { href: "https://app.valkyrlabs.com/v1/credits/#buy", style: {
                    width: "100%",
                    marginBottom: "8px",
                }, children: [_jsx(FaCreditCard, {}), "Buy Credits"] }), _jsxs(VSCodeButton, { onClick: () => {
                    vscode.postMessage({
                        type: "invoke",
                        text: "primaryButtonClick",
                    });
                }, appearance: "secondary", style: {
                    width: "100%",
                }, children: [_jsx(FaRecycle, {}), "Retry Request"] })] }));
};
export default CreditLimitError;
//# sourceMappingURL=CreditLimitError.js.map