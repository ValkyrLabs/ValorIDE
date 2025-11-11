import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
const OfflineBanner = ({ style }) => {
    const svc = useCommunicationService();
    const isNoop = !!svc?.isNoop;
    const [isVisible, setIsVisible] = useState(isNoop); // Banner is visible only if communication is not working
    useEffect(() => {
        let timer;
        if (isNoop) {
            timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000); // Hide after 5 seconds
        }
        return () => {
            if (timer)
                clearTimeout(timer); // Clear timeout on component unmount
        };
    }, [isNoop]); // Re-run effect if isNoop changes
    if (!isVisible)
        return null; // Do not render if not visible
    return (_jsx("div", { role: "status", "aria-live": "polite", style: {
            margin: "0 10px 6px 10px",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--vscode-editor-foreground)",
            background: "var(--vscode-editor-background)",
            border: "1px solid var(--vscode-inputValidation-warningBorder)",
            ...style,
        }, children: "Communication service unreachable. Features limited." }));
};
export default OfflineBanner;
//# sourceMappingURL=OfflineBanner.js.map